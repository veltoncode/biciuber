-- 1. Tabela de Inscries de Push Notification
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_type text not null,
    driver_id uuid, -- assumindo que drivers.id  uuid
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
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS check_user_type;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT check_user_type CHECK (user_type IN ('DRIVER', 'PASSENGER'));

ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS check_driver_fields;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT check_driver_fields CHECK (
    (user_type = 'DRIVER' AND driver_id IS NOT NULL AND passenger_ride_id IS NULL AND public_tracking_token IS NULL) OR
    (user_type = 'PASSENGER' AND passenger_ride_id IS NOT NULL AND public_tracking_token IS NOT NULL AND driver_id IS NULL)
);

-- 2. ndices
CREATE INDEX IF NOT EXISTS idx_push_subs_driver_id ON public.push_subscriptions (driver_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_ride_id ON public.push_subscriptions (passenger_ride_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_token ON public.push_subscriptions (public_tracking_token);

-- 3. Trigger de Updated At
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_subs_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subs_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_push_subscriptions_updated_at_column();

-- 4. Funo utilitria para limpar inscries inativas (pode ser chamada via cron)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_push_subscriptions(days_inactive integer default 30)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.push_subscriptions
    WHERE (not is_active) 
       OR (last_used_at < (now() - (days_inactive || ' days')::interval));
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Ningum pode fazer SELECT (nem anon, nem auth). Apenas a Service Role pode ler na Edge Function.
DROP POLICY IF EXISTS "Deny all SELECT on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Deny all SELECT on push_subscriptions" 
ON public.push_subscriptions FOR SELECT USING (false);

-- Ningum pode fazer INSERT/UPDATE/DELETE diretamente pela API.
DROP POLICY IF EXISTS "Deny all INSERT on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Deny all INSERT on push_subscriptions" 
ON public.push_subscriptions FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all UPDATE on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Deny all UPDATE on push_subscriptions" 
ON public.push_subscriptions FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Deny all DELETE on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Deny all DELETE on push_subscriptions" 
ON public.push_subscriptions FOR DELETE USING (false);

-- Habilita Realtime
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'push_subscriptions') THEN ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions; END IF; END $$;



