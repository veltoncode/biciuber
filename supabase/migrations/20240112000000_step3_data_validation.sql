-- ==============================================================================
-- PASSO 3: VALIDAÇÃO DE CPF E TELEFONE
-- ==============================================================================

-- 1. Função PL/pgSQL para validar o dígito verificador do CPF
CREATE OR REPLACE FUNCTION public.is_valid_cpf(cpf TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_cpf TEXT;
    v_sum INTEGER;
    v_remainder INTEGER;
    v_digit1 INTEGER;
    v_digit2 INTEGER;
    i INTEGER;
BEGIN
    -- Remover pontuação
    v_cpf := regexp_replace(cpf, '[^\d]', '', 'g');

    -- Tamanho deve ser 11
    IF length(v_cpf) != 11 THEN
        RETURN FALSE;
    END IF;

    -- CPFs conhecidos inválidos com todos os dígitos iguais
    IF v_cpf ~ '^(\d)\1{10}$' THEN
        RETURN FALSE;
    END IF;

    -- Cálculo do 1º dígito
    v_sum := 0;
    FOR i IN 1..9 LOOP
        v_sum := v_sum + CAST(substring(v_cpf FROM i FOR 1) AS INTEGER) * (11 - i);
    END LOOP;
    v_remainder := (v_sum * 10) % 11;
    IF v_remainder = 10 THEN
        v_remainder := 0;
    END IF;
    v_digit1 := v_remainder;

    IF v_digit1 != CAST(substring(v_cpf FROM 10 FOR 1) AS INTEGER) THEN
        RETURN FALSE;
    END IF;

    -- Cálculo do 2º dígito
    v_sum := 0;
    FOR i IN 1..10 LOOP
        v_sum := v_sum + CAST(substring(v_cpf FROM i FOR 1) AS INTEGER) * (12 - i);
    END LOOP;
    v_remainder := (v_sum * 10) % 11;
    IF v_remainder = 10 THEN
        v_remainder := 0;
    END IF;
    v_digit2 := v_remainder;

    IF v_digit2 != CAST(substring(v_cpf FROM 11 FOR 1) AS INTEGER) THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Adicionar coluna CPF na tabela de drivers, caso ainda não exista
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE;

-- 3. Constraints de Validação

-- Valida CPF do Motorista
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_cpf_check;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_cpf_check CHECK (cpf IS NULL OR is_valid_cpf(cpf));

-- Valida Telefone do Motorista (pelo menos 10 digitos, permite +)
-- Limpa os telefones existentes (remove tudo que não for número ou '+')
UPDATE public.drivers
SET phone = regexp_replace(phone, '[^\+0-9]', '', 'g')
WHERE phone IS NOT NULL;

ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_phone_check;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_phone_check CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$');

-- Valida Telefone do Passageiro
-- Remove constraints restritivas legadas e permite NULL para históricos inválidos
ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_passenger_phone_trim_check;
ALTER TABLE public.rides ALTER COLUMN passenger_phone DROP NOT NULL;

-- Limpa os telefones existentes em rides e converte inválidos/vazios para NULL
UPDATE public.rides
SET passenger_phone = CASE 
    WHEN regexp_replace(passenger_phone, '[^\+0-9]', '', 'g') ~ '^\+?[0-9]{10,15}$' 
    THEN regexp_replace(passenger_phone, '[^\+0-9]', '', 'g')
    ELSE NULL
END
WHERE passenger_phone IS NOT NULL;

ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_passenger_phone_check;
ALTER TABLE public.rides ADD CONSTRAINT rides_passenger_phone_check CHECK (passenger_phone IS NULL OR passenger_phone ~ '^\+?[0-9]{10,15}$');

