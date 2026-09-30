-- ==============================================================================
-- PASSO 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Restringir Policy de SELECT em rides
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de corridas solicitadas ativas ou por token" ON public.rides;

DROP POLICY IF EXISTS "Leitura de corridas seguras" ON public.rides;
CREATE POLICY "Leitura de corridas seguras"
ON public.rides
FOR SELECT
TO anon, authenticated
USING (
  (status = 'REQUESTED' AND expires_at > now())
  OR (driver_id = auth.uid())
  OR (public_tracking_token::text = current_setting('request.headers', true)::json->>'x-tracking-token')
);

-- ------------------------------------------------------------------------------
-- 2. Migrar Autenticação do Motorista e Blindar RPCs
-- ------------------------------------------------------------------------------
-- 2.1 RPC: accept_ride
DROP FUNCTION IF EXISTS public.accept_ride(UUID, UUID);

CREATE OR REPLACE FUNCTION public.accept_ride(
    p_ride_id UUID
)
RETURNS TABLE (
    id UUID, passenger_name TEXT, passenger_phone TEXT, pickup_description TEXT,
    destination_description TEXT, passenger_count INTEGER, has_luggage BOOLEAN,
    notes TEXT, status TEXT, driver_id UUID, created_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, public_tracking_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_driver_id UUID := auth.uid();
    v_driver_exists BOOLEAN;
    v_driver_available BOOLEAN;
    v_ride_exists BOOLEAN;
BEGIN
    IF v_driver_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'O motorista precisa estar autenticado.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = v_driver_id) INTO v_driver_exists;
    IF NOT v_driver_exists THEN
        RAISE EXCEPTION 'DRIVER_NOT_FOUND' USING HINT = 'O bicitaxista especificado não existe no sistema.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.rides 
        WHERE rides.driver_id = v_driver_id 
          AND rides.status IN ('ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS')
    ) THEN
        RAISE EXCEPTION 'DRIVER_ALREADY_HAS_ACTIVE_RIDE' USING HINT = 'Você já possui uma corrida ativa.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.drivers 
        WHERE drivers.id = v_driver_id 
          AND (is_available IS TRUE OR is_available IS NULL)
    ) INTO v_driver_available;
    IF NOT v_driver_available THEN
        RAISE EXCEPTION 'DRIVER_NOT_AVAILABLE' USING HINT = 'O bicitaxista está indisponível para novos chamados.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.rides WHERE rides.id = p_ride_id) INTO v_ride_exists;
    IF NOT v_ride_exists THEN
        RAISE EXCEPTION 'RIDE_NOT_FOUND' USING HINT = 'A corrida solicitada não foi encontrada.';
    END IF;

    RETURN QUERY
    UPDATE public.rides R
    SET
        driver_id = v_driver_id,
        status = 'ACCEPTED',
        accepted_at = now(),
        updated_at = now()
    WHERE
        R.id = p_ride_id
        AND R.status = 'REQUESTED'
        AND R.driver_id IS NULL
        AND R.expires_at > now()
    RETURNING
        R.id, R.passenger_name, R.passenger_phone, R.pickup_description, R.destination_description,
        R.passenger_count, R.has_luggage, R.notes, R.status, R.driver_id, R.created_at, R.accepted_at,
        R.expires_at, R.public_tracking_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RIDE_NOT_AVAILABLE' USING HINT = 'A corrida já foi aceita por outro bicitaxista ou expirou.';
    END IF;

    UPDATE public.drivers SET is_available = false WHERE drivers.id = v_driver_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_ride(UUID) TO authenticated;

-- 2.2 RPC: update_driver_ride_status
DROP FUNCTION IF EXISTS public.update_driver_ride_status(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.update_driver_ride_status(
    p_ride_id UUID,
    p_new_status TEXT
)
RETURNS TABLE (
    id UUID, status TEXT, driver_id UUID, updated_at TIMESTAMPTZ,
    driver_arrived_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_driver_id UUID := auth.uid();
    v_current_status TEXT;
    v_actual_driver_id UUID;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    IF v_driver_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Acesso negado. Requer autenticação do motorista.';
    END IF;

    SELECT R.status, R.driver_id INTO v_current_status, v_actual_driver_id
    FROM public.rides R WHERE R.id = p_ride_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_FORBIDDEN' USING HINT = 'A corrida solicitada não foi encontrada.';
    END IF;

    IF v_actual_driver_id IS NULL OR v_actual_driver_id <> v_driver_id THEN
        RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_FORBIDDEN' USING HINT = 'Esta corrida não pertence a você.';
    END IF;

    IF v_current_status IN ('CANCELLED', 'COMPLETED', 'EXPIRED') THEN
        RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION' USING HINT = 'A corrida já foi encerrada e não pode ser alterada.';
    END IF;

    IF v_current_status = 'ACCEPTED' AND p_new_status = 'DRIVER_ARRIVING' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'DRIVER_ARRIVING' AND p_new_status = 'DRIVER_ARRIVED' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'DRIVER_ARRIVED' AND p_new_status = 'IN_PROGRESS' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'IN_PROGRESS' AND p_new_status = 'COMPLETED' THEN
        v_valid_transition := TRUE;
    END IF;

    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION' USING HINT = 'Transição de status inválida ou etapa pulada.';
    END IF;

    RETURN QUERY
    UPDATE public.rides R
    SET
        status = p_new_status,
        updated_at = now(),
        driver_arrived_at = CASE WHEN p_new_status = 'DRIVER_ARRIVED' THEN now() ELSE R.driver_arrived_at END,
        started_at = CASE WHEN p_new_status = 'IN_PROGRESS' THEN now() ELSE R.started_at END,
        completed_at = CASE WHEN p_new_status = 'COMPLETED' THEN now() ELSE R.completed_at END
    WHERE
        R.id = p_ride_id AND R.driver_id = v_driver_id AND R.status = v_current_status
    RETURNING
        R.id, R.status, R.driver_id, R.updated_at, R.driver_arrived_at, R.started_at, R.completed_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION' USING HINT = 'Não pôde atualizar a corrida.';
    END IF;

    IF p_new_status = 'COMPLETED' THEN
        UPDATE public.drivers SET is_available = true WHERE drivers.id = v_driver_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_driver_ride_status(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Bloquear SELECT direto na tabela drivers
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "leitura publica" ON public.drivers;

DROP POLICY IF EXISTS "Leitura do próprio perfil" ON public.drivers;
CREATE POLICY "Leitura do próprio perfil"
ON public.drivers
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_available_drivers()
RETURNS TABLE (
    id UUID,
    name TEXT,
    plate TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
      SELECT id, name, plate
    FROM public.drivers
    WHERE is_available = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_drivers() TO anon, authenticated;
