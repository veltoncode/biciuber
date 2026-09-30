-- ==============================================================================
-- PASSO 4: APROVAÇÃO MANUAL E SESSÕES CUSTOMIZADAS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Adicionar colunas na tabela drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 2. Tabela de sessões de motorista (já que não usaremos Supabase Auth)
CREATE TABLE IF NOT EXISTS public.driver_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

-- 3. Tabela de banimentos de passageiros (Rate Limiting)
CREATE TABLE IF NOT EXISTS public.passenger_bans (
    phone TEXT PRIMARY KEY,
    banned_until TIMESTAMPTZ NOT NULL,
    reason TEXT
);

-- 4. RPC para listar motoristas (agora exige approved)
CREATE OR REPLACE FUNCTION public.get_available_drivers()
RETURNS TABLE (id UUID, name TEXT, plate TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
      SELECT id, name, plate FROM public.drivers 
    WHERE is_available = true AND status = 'approved';
$$;

-- 5. RPC admin_approve_driver (Chamado pelo admin)
CREATE OR REPLACE FUNCTION public.admin_approve_driver(p_driver_id UUID, p_pin TEXT, p_admin_secret TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    -- Autenticação simples hardcoded para o MVP do admin
    IF p_admin_secret != 'biciadmin2026' THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
    
    UPDATE public.drivers SET 
        status = 'approved',
        pin_hash = crypt(p_pin, gen_salt('bf'))
    WHERE id = p_driver_id;
END;
$$;

-- 6. RPC driver_login (Chamado pelo motorista no App)
CREATE OR REPLACE FUNCTION public.driver_login(p_phone TEXT, p_pin TEXT)
RETURNS TABLE (session_token UUID, driver_id UUID, name TEXT, plate TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_driver RECORD;
    v_session_id UUID;
BEGIN
    SELECT * INTO v_driver FROM public.drivers 
    WHERE phone = regexp_replace(p_phone, '[^\d]', '', 'g');

    IF NOT FOUND THEN RAISE EXCEPTION 'DRIVER_NOT_FOUND'; END IF;
    IF v_driver.status != 'approved' THEN RAISE EXCEPTION 'DRIVER_NOT_APPROVED'; END IF;
    IF v_driver.pin_hash IS NULL OR v_driver.pin_hash != crypt(p_pin, v_driver.pin_hash) THEN 
        RAISE EXCEPTION 'INVALID_PIN'; 
    END IF;

    -- Criar sessão
    INSERT INTO public.driver_sessions (driver_id) VALUES (v_driver.id) RETURNING id INTO v_session_id;
    
    RETURN QUERY SELECT v_session_id, v_driver.id, v_driver.name, v_driver.plate;
END;
$$;

-- 7. RPC create_ride (Para rate limit do passageiro)
CREATE OR REPLACE FUNCTION public.create_ride(
    p_name TEXT, p_phone TEXT, p_pickup TEXT, p_dest TEXT, 
    p_count INT, p_luggage BOOLEAN, p_notes TEXT, p_lat FLOAT, p_lng FLOAT
)
RETURNS TABLE (
    id UUID, public_tracking_token UUID, status TEXT, 
    created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, pickup_lat FLOAT, pickup_lng FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_clean_phone TEXT;
    v_recent_cancellations INT;
    v_banned_until TIMESTAMPTZ;
BEGIN
    v_clean_phone := regexp_replace(p_phone, '[^\d]', '', 'g');

    -- 1. Checar banimento
    SELECT banned_until INTO v_banned_until FROM public.passenger_bans WHERE phone = v_clean_phone;
    IF v_banned_until IS NOT NULL AND v_banned_until > now() THEN
        RAISE EXCEPTION 'BANNED' USING HINT = 'Você está bloqueado temporariamente por excesso de cancelamentos.';
    END IF;

    -- 2. Checar cancelamentos recentes (3 em 1 hora)
    SELECT COUNT(*) INTO v_recent_cancellations 
    FROM public.rides 
    WHERE passenger_phone = v_clean_phone 
      AND status = 'CANCELLED' 
      AND cancelled_at > (now() - INTERVAL '1 hour');

    IF v_recent_cancellations >= 3 THEN
        -- Banir por 2 horas
        INSERT INTO public.passenger_bans (phone, banned_until, reason) 
        VALUES (v_clean_phone, now() + INTERVAL '2 hours', 'Abuso de cancelamentos')
        ON CONFLICT (phone) DO UPDATE SET banned_until = now() + INTERVAL '2 hours';
        
        RAISE EXCEPTION 'BANNED' USING HINT = 'Muitos cancelamentos. Você foi bloqueado por 2 horas.';
    END IF;

    -- 3. Inserir corrida
    RETURN QUERY
    INSERT INTO public.rides (
        passenger_name, passenger_phone, pickup_description, destination_description, 
        passenger_count, has_luggage, notes, pickup_lat, pickup_lng, status
    ) VALUES (
        trim(p_name), v_clean_phone, trim(p_pickup), trim(p_dest), 
        p_count, p_luggage, trim(p_notes), p_lat, p_lng, 'REQUESTED'
    ) RETURNING id, public_tracking_token, status, created_at, expires_at, pickup_lat, pickup_lng;
END;
$$;

-- 8. Alterar accept_ride para usar session_token
DROP FUNCTION IF EXISTS public.accept_ride(UUID);
CREATE OR REPLACE FUNCTION public.accept_ride(p_ride_id UUID, p_session_token UUID)
RETURNS TABLE (
    id UUID, passenger_name TEXT, passenger_phone TEXT, pickup_description TEXT,
    destination_description TEXT, passenger_count INTEGER, has_luggage BOOLEAN,
    notes TEXT, status TEXT, driver_id UUID, created_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, public_tracking_token UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_driver_id UUID;
    v_driver_exists BOOLEAN;
    v_driver_available BOOLEAN;
    v_ride_exists BOOLEAN;
BEGIN
    SELECT driver_sessions.driver_id INTO v_driver_id FROM public.driver_sessions 
    WHERE driver_sessions.id = p_session_token AND expires_at > now();

    IF v_driver_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Sessão inválida.'; END IF;

    SELECT EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = v_driver_id AND drivers.status = 'approved') INTO v_driver_exists;
    IF NOT v_driver_exists THEN RAISE EXCEPTION 'DRIVER_NOT_FOUND_OR_NOT_APPROVED'; END IF;

    IF EXISTS (
        SELECT 1 FROM public.rides 
        WHERE rides.driver_id = v_driver_id AND rides.status IN ('ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS')
    ) THEN
        RAISE EXCEPTION 'DRIVER_ALREADY_HAS_ACTIVE_RIDE';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = v_driver_id AND (is_available IS TRUE OR is_available IS NULL)) INTO v_driver_available;
    IF NOT v_driver_available THEN RAISE EXCEPTION 'DRIVER_NOT_AVAILABLE'; END IF;

    SELECT EXISTS (SELECT 1 FROM public.rides WHERE rides.id = p_ride_id) INTO v_ride_exists;
    IF NOT v_ride_exists THEN RAISE EXCEPTION 'RIDE_NOT_FOUND'; END IF;

    RETURN QUERY
    UPDATE public.rides R SET driver_id = v_driver_id, status = 'ACCEPTED', accepted_at = now(), updated_at = now()
    WHERE R.id = p_ride_id AND R.status = 'REQUESTED' AND R.driver_id IS NULL AND R.expires_at > now()
    RETURNING R.id, R.passenger_name, R.passenger_phone, R.pickup_description, R.destination_description,
        R.passenger_count, R.has_luggage, R.notes, R.status, R.driver_id, R.created_at, R.accepted_at,
        R.expires_at, R.public_tracking_token;

    IF NOT FOUND THEN RAISE EXCEPTION 'RIDE_NOT_AVAILABLE'; END IF;

    UPDATE public.drivers SET is_available = false WHERE drivers.id = v_driver_id;
END;
$$;

-- 9. Alterar update_driver_ride_status para usar session_token
DROP FUNCTION IF EXISTS public.update_driver_ride_status(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.update_driver_ride_status(p_ride_id UUID, p_new_status TEXT, p_session_token UUID)
RETURNS TABLE (
    id UUID, status TEXT, driver_id UUID, updated_at TIMESTAMPTZ,
    driver_arrived_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_driver_id UUID;
    v_current_status TEXT;
    v_actual_driver_id UUID;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    SELECT driver_sessions.driver_id INTO v_driver_id FROM public.driver_sessions 
    WHERE driver_sessions.id = p_session_token AND expires_at > now();

    IF v_driver_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Sessão inválida.'; END IF;

    SELECT R.status, R.driver_id INTO v_current_status, v_actual_driver_id
    FROM public.rides R WHERE R.id = p_ride_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_FORBIDDEN'; END IF;
    IF v_actual_driver_id IS NULL OR v_actual_driver_id <> v_driver_id THEN RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_FORBIDDEN'; END IF;
    IF v_current_status IN ('CANCELLED', 'COMPLETED', 'EXPIRED') THEN RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION'; END IF;

    IF v_current_status = 'ACCEPTED' AND p_new_status = 'DRIVER_ARRIVING' THEN v_valid_transition := TRUE;
    ELSIF v_current_status = 'DRIVER_ARRIVING' AND p_new_status = 'DRIVER_ARRIVED' THEN v_valid_transition := TRUE;
    ELSIF v_current_status = 'DRIVER_ARRIVED' AND p_new_status = 'IN_PROGRESS' THEN v_valid_transition := TRUE;
    ELSIF v_current_status = 'IN_PROGRESS' AND p_new_status = 'COMPLETED' THEN v_valid_transition := TRUE;
    END IF;

    IF NOT v_valid_transition THEN RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION'; END IF;

    RETURN QUERY
    UPDATE public.rides R
    SET status = p_new_status, updated_at = now(),
        driver_arrived_at = CASE WHEN p_new_status = 'DRIVER_ARRIVED' THEN now() ELSE R.driver_arrived_at END,
        started_at = CASE WHEN p_new_status = 'IN_PROGRESS' THEN now() ELSE R.started_at END,
        completed_at = CASE WHEN p_new_status = 'COMPLETED' THEN now() ELSE R.completed_at END
    WHERE R.id = p_ride_id AND R.driver_id = v_driver_id AND R.status = v_current_status
    RETURNING R.id, R.status, R.driver_id, R.updated_at, R.driver_arrived_at, R.started_at, R.completed_at;

    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION'; END IF;
    IF p_new_status = 'COMPLETED' THEN UPDATE public.drivers SET is_available = true WHERE drivers.id = v_driver_id; END IF;
END;
$$;

-- 10. Atualizar RLS da tabela rides para checar o session_token no header 
-- (para permitir leitura pelo motorista sem Supabase Auth)
DROP POLICY IF EXISTS "Leitura de corridas seguras" ON public.rides;

CREATE POLICY "Leitura de corridas seguras"
ON public.rides
FOR SELECT
TO anon, authenticated
USING (
  (status = 'REQUESTED' AND expires_at > now())
  OR (public_tracking_token::text = current_setting('request.headers', true)::json->>'x-tracking-token')
  OR (driver_id = (
       SELECT driver_id FROM public.driver_sessions 
       WHERE id::text = current_setting('request.headers', true)::json->>'x-session-token'
       AND expires_at > now()
     )
  )
);

-- 11. Permitir cadastro público de motoristas
DROP POLICY IF EXISTS "escrita so admin autenticado" ON public.drivers;

DROP POLICY IF EXISTS "Permitir cadastro publico" ON public.drivers;
CREATE POLICY "Permitir cadastro publico"
ON public.drivers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
