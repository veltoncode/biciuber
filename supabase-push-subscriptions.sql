-- =================================================================================
-- BiciTaxi - Push Subscriptions (Web Push)
-- Criação da tabela, RLS e RPCs para gerenciar assinaturas.
-- =================================================================================

-- 1. Criação da Tabela
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_type text not null,
    driver_id uuid, -- assumindo que drivers.id é uuid
    passenger_ride_id uuid references public.rides(id) on delete cascade,
    public_tracking_token uuid,
    user_agent text,
    language text not null default 'pt-BR',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_used_at timestamptz
);

-- Regras de Constraints
ALTER TABLE public.push_subscriptions 
    ADD CONSTRAINT check_user_type 
    CHECK (user_type IN ('DRIVER', 'PASSENGER'));

ALTER TABLE public.push_subscriptions 
    ADD CONSTRAINT check_driver_fields 
    CHECK (
        (user_type = 'DRIVER' AND driver_id IS NOT NULL AND passenger_ride_id IS NULL AND public_tracking_token IS NULL) OR
        (user_type = 'PASSENGER' AND passenger_ride_id IS NOT NULL AND public_tracking_token IS NOT NULL AND driver_id IS NULL)
    );

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_push_subs_driver_id ON public.push_subscriptions (driver_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_ride_id ON public.push_subscriptions (passenger_ride_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user_type ON public.push_subscriptions (user_type);
CREATE INDEX IF NOT EXISTS idx_push_subs_is_active ON public.push_subscriptions (is_active);

-- 3. RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Ninguém pode fazer SELECT (nem anon, nem auth). Apenas a Service Role pode ler na Edge Function.
CREATE POLICY "Deny all SELECT on push_subscriptions" 
ON public.push_subscriptions FOR SELECT USING (false);

-- Ninguém pode fazer INSERT/UPDATE/DELETE diretamente pela API.
CREATE POLICY "Deny all INSERT on push_subscriptions" 
ON public.push_subscriptions FOR INSERT WITH CHECK (false);

CREATE POLICY "Deny all UPDATE on push_subscriptions" 
ON public.push_subscriptions FOR UPDATE USING (false);

CREATE POLICY "Deny all DELETE on push_subscriptions" 
ON public.push_subscriptions FOR DELETE USING (false);

-- 4. Funções RPC Seguras

-- Registrar / Atualizar assinatura
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_type text,
    p_driver_id uuid,
    p_passenger_ride_id uuid,
    p_public_tracking_token uuid,
    p_user_agent text,
    p_language text
) RETURNS void AS $$
DECLARE
    v_ride_exists boolean;
    v_driver_exists boolean;
BEGIN
    -- Validação DRIVER
    IF p_user_type = 'DRIVER' THEN
        IF p_driver_id IS NULL THEN
            RAISE EXCEPTION 'driver_id é obrigatório para DRIVER';
        END IF;
        
        -- Verificar se motorista existe
        SELECT EXISTS(SELECT 1 FROM public.drivers WHERE id = p_driver_id) INTO v_driver_exists;
        IF NOT v_driver_exists THEN
            RAISE EXCEPTION 'Driver não encontrado';
        END IF;
        
        p_passenger_ride_id := NULL;
        p_public_tracking_token := NULL;
    
    -- Validação PASSENGER
    ELSIF p_user_type = 'PASSENGER' THEN
        IF p_passenger_ride_id IS NULL OR p_public_tracking_token IS NULL THEN
            RAISE EXCEPTION 'passenger_ride_id e public_tracking_token são obrigatórios para PASSENGER';
        END IF;
        
        -- Verificar token público da corrida
        SELECT EXISTS(
            SELECT 1 FROM public.rides 
            WHERE id = p_passenger_ride_id AND public_tracking_token = p_public_tracking_token
        ) INTO v_ride_exists;
        
        IF NOT v_ride_exists THEN
            RAISE EXCEPTION 'Corrida não encontrada ou token inválido';
        END IF;
        
        p_driver_id := NULL;
    ELSE
        RAISE EXCEPTION 'Tipo de usuário inválido: %', p_user_type;
    END IF;

    -- Inserir ou Atualizar (Upsert via ON CONFLICT)
    INSERT INTO public.push_subscriptions (
        endpoint, p256dh, auth, user_type, driver_id, 
        passenger_ride_id, public_tracking_token, user_agent, language, is_active, updated_at
    )
    VALUES (
        p_endpoint, p_p256dh, p_auth, p_user_type, p_driver_id, 
        p_passenger_ride_id, p_public_tracking_token, p_user_agent, p_language, true, now()
    )
    ON CONFLICT (endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_type = EXCLUDED.user_type,
        driver_id = EXCLUDED.driver_id,
        passenger_ride_id = EXCLUDED.passenger_ride_id,
        public_tracking_token = EXCLUDED.public_tracking_token,
        user_agent = EXCLUDED.user_agent,
        language = EXCLUDED.language,
        is_active = true,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Desativar assinatura
CREATE OR REPLACE FUNCTION public.disable_push_subscription(
    p_endpoint text
) RETURNS void AS $$
BEGIN
    UPDATE public.push_subscriptions
    SET is_active = false, updated_at = now()
    WHERE endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
