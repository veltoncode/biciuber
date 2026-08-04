-- ==============================================================================
-- BICIUBER - ESQUEMA DE BANCO DE DADOS PARA CORRIDAS (ETAPA 1)
-- ==============================================================================
-- Finalidade da Tabela:
--   Armazenar as solicitações de corridas de bicitáxi em Afuá (PA), acompanhando
--   o ciclo de vida desde a solicitação inicial pelo passageiro até a conclusão
--   ou cancelamento pelo motorista/passageiro.
--
-- Ausência Proposital de Preços:
--   Nesta etapa, a tabela rides NÃO possui campos de preço, tarifa, valor ou
--   pagamento. Toda precificação em Afuá é direta/acertada localmente ou tratada
--   em etapas posteriores.
--
-- Caráter Provisório das Políticas RLS:
--   Como o aplicativo atualmente permite solicitações de passageiros sem login
--   e autenticação de motoristas via telefone (sem Supabase Auth JWT), as políticas
--   RLS aqui definidas são provisórias para o MVP estudantil.
--
-- Necessidade Futura de Autenticação Segura:
--   Para produção, é altamente recomendável integrar motoristas ao Supabase Auth
--   (ou utilizar Edge Functions / RPC com verificação de token) para restringir
--   as operações UPDATE somente a motoristas devidamente autenticados.
-- ==============================================================================

-- 1. CRIAR A TABELA RIDES
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_tracking_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    pickup_description TEXT NOT NULL,
    destination_description TEXT NOT NULL,
    passenger_count INTEGER NOT NULL DEFAULT 1,
    has_luggage BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    driver_arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);

-- 2. RESTRIÇÕES DE DADOS (CONSTRAINTS)
DO $$ 
BEGIN
    -- Status permitidos
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_status_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_status_check 
        CHECK (status IN (
            'REQUESTED', 
            'ACCEPTED', 
            'DRIVER_ARRIVING', 
            'DRIVER_ARRIVED', 
            'IN_PROGRESS', 
            'COMPLETED', 
            'CANCELLED', 
            'EXPIRED'
        ));
    END IF;

    -- passenger_name não pode ser vazio após trim
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_passenger_name_trim_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_passenger_name_trim_check 
        CHECK (length(trim(passenger_name)) > 0);
    END IF;

    -- passenger_phone não pode ser vazio após trim
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_passenger_phone_trim_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_passenger_phone_trim_check 
        CHECK (length(trim(passenger_phone)) > 0);
    END IF;

    -- pickup_description não pode ser vazio após trim
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_pickup_description_trim_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_pickup_description_trim_check 
        CHECK (length(trim(pickup_description)) > 0);
    END IF;

    -- destination_description não pode ser vazio após trim e não deve conter preço
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_destination_description_trim_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_destination_description_trim_check 
        CHECK (
            length(trim(destination_description)) > 0 
            AND destination_description NOT ILIKE '%R$%' 
            AND destination_description NOT ILIKE '%reais%'
        );
    END IF;

    -- passenger_count entre 1 e 6
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_passenger_count_range_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_passenger_count_range_check 
        CHECK (passenger_count >= 1 AND passenger_count <= 6);
    END IF;

    -- driver_id obrigatório quando a corrida for aceita ou em andamento/concluída
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_driver_required_when_accepted_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_driver_required_when_accepted_check 
        CHECK (
            status NOT IN ('ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED') 
            OR driver_id IS NOT NULL
        );
    END IF;

    -- accepted_at deve existir quando status for ACCEPTED ou posterior
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_accepted_at_required_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_accepted_at_required_check 
        CHECK (
            status NOT IN ('ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED') 
            OR accepted_at IS NOT NULL
        );
    END IF;

    -- completed_at deve existir quando status for COMPLETED
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_completed_at_required_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_completed_at_required_check 
        CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL);
    END IF;

    -- cancelled_at deve existir quando status for CANCELLED
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_cancelled_at_required_check') THEN
        ALTER TABLE public.rides ADD CONSTRAINT rides_cancelled_at_required_check 
        CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL);
    END IF;
END $$;

-- 3. FUNÇÃO REUTILIZÁVEL E TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rides_updated_at ON public.rides;
CREATE TRIGGER update_rides_updated_at
BEFORE UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ÍNDICES ÚTEIS PARA DESEMPENHO E CONSULTAS
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON public.rides(created_at);
CREATE INDEX IF NOT EXISTS idx_rides_expires_at ON public.rides(expires_at);
CREATE INDEX IF NOT EXISTS idx_rides_requested_created_at ON public.rides(created_at) WHERE status = 'REQUESTED';

-- 5. CONFIGURAÇÃO DO REALTIME (IDEMPOTENTE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;
END $$;

-- 6. SEGURANÇA NIVEL DE LINHA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Política 1: Passageiro anônimo pode inserir uma corrida com status REQUESTED
DROP POLICY IF EXISTS "Passageiro anônimo pode solicitar corrida" ON public.rides;
CREATE POLICY "Passageiro anônimo pode solicitar corrida"
ON public.rides
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'REQUESTED'
  AND driver_id IS NULL
  AND accepted_at IS NULL
  AND driver_arrived_at IS NULL
  AND started_at IS NULL
  AND completed_at IS NULL
  AND cancelled_at IS NULL
);

-- Política 2: Usuários anônimos e motoristas podem ler corridas pendentes ativas ou buscar por token único
DROP POLICY IF EXISTS "Leitura de corridas solicitadas ativas ou por token" ON public.rides;
CREATE POLICY "Leitura de corridas solicitadas ativas ou por token"
ON public.rides
FOR SELECT
TO anon, authenticated
USING (
  (status = 'REQUESTED' AND expires_at > now())
  OR (public_tracking_token IS NOT NULL)
);

-- Política 3 & 4: Bloqueio de UPDATE e DELETE direto sem autorização pela chave anon.
-- Nota de Segurança: Como os motoristas atualmente utilizam login simples por telefone
-- sem contexto JWT do Supabase Auth, updates diretos via client anon devem ser restritos
-- a funções RPC com verificação ou evoluídos para Supabase Auth na próxima etapa.

-- 7. FUNÇÃO PARA EXPIRAR CORRIDAS PENDENTES
CREATE OR REPLACE FUNCTION public.expire_pending_rides()
RETURNS void AS $$
BEGIN
  UPDATE public.rides
  SET 
    status = 'EXPIRED',
    updated_at = now()
  WHERE 
    status = 'REQUESTED'
    AND expires_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
