-- supabase-passenger-geolocation.sql
-- Adiciona campos opcionais de geolocalização do passageiro à tabela de corridas

ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS pickup_lat double precision NULL,
ADD COLUMN IF NOT EXISTS pickup_lng double precision NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_pickup_lat' 
        AND conrelid = 'public.rides'::regclass
    ) THEN
        ALTER TABLE public.rides
        ADD CONSTRAINT valid_pickup_lat CHECK (pickup_lat IS NULL OR (pickup_lat >= -90 AND pickup_lat <= 90));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_pickup_lng' 
        AND conrelid = 'public.rides'::regclass
    ) THEN
        ALTER TABLE public.rides
        ADD CONSTRAINT valid_pickup_lng CHECK (pickup_lng IS NULL OR (pickup_lng >= -180 AND pickup_lng <= 180));
    END IF;
END $$;
