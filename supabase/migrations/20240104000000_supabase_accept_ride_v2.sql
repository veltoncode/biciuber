-- ==============================================================================
-- BICIUBER - ACEITE ATÔMICO DE CORRIDAS V2 (ETAPA 6)
-- ==============================================================================
-- Finalidade:
--   Permite que um bicitaxista aceite uma corrida pendente de forma atômica.
--   V2: Impede que o motorista aceite uma nova corrida se já possuir outra 
--   corrida ativa (ACCEPTED, DRIVER_ARRIVING, DRIVER_ARRIVED, IN_PROGRESS).
--   V2: Atualiza a tabela drivers marcando is_available = false.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.accept_ride(
    p_ride_id UUID,
    p_driver_id UUID
)
RETURNS TABLE (
    id UUID,
    passenger_name TEXT,
    passenger_phone TEXT,
    pickup_description TEXT,
    destination_description TEXT,
    passenger_count INTEGER,
    has_luggage BOOLEAN,
    notes TEXT,
    status TEXT,
    driver_id UUID,
    created_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    public_tracking_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_driver_exists BOOLEAN;
    v_driver_available BOOLEAN;
    v_ride_exists BOOLEAN;
BEGIN
    -- 1. Validar se o motorista existe
    SELECT EXISTS (
        SELECT 1 FROM public.drivers WHERE drivers.id = p_driver_id
    ) INTO v_driver_exists;

    IF NOT v_driver_exists THEN
        RAISE EXCEPTION 'DRIVER_NOT_FOUND' USING HINT = 'O bicitaxista especificado não existe no sistema.';
    END IF;

    -- 1.1 Validar se o motorista JÁ possui uma corrida ativa
    IF EXISTS (
        SELECT 1 FROM public.rides 
        WHERE rides.driver_id = p_driver_id 
          AND rides.status IN ('ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS')
    ) THEN
        RAISE EXCEPTION 'DRIVER_ALREADY_HAS_ACTIVE_RIDE' USING HINT = 'Você já possui uma corrida ativa.';
    END IF;

    -- 2. Validar se o motorista está disponível (apenas checagem passiva, a corrida ativa já bloqueia acima, mas is_available pode ser admin-controlled)
    SELECT EXISTS (
        SELECT 1 FROM public.drivers 
        WHERE drivers.id = p_driver_id 
          AND (is_available IS TRUE OR is_available IS NULL)
    ) INTO v_driver_available;

    IF NOT v_driver_available THEN
        RAISE EXCEPTION 'DRIVER_NOT_AVAILABLE' USING HINT = 'O bicitaxista está indisponível para novos chamados.';
    END IF;

    -- 3. Validar se a corrida existe
    SELECT EXISTS (
        SELECT 1 FROM public.rides WHERE rides.id = p_ride_id
    ) INTO v_ride_exists;

    IF NOT v_ride_exists THEN
        RAISE EXCEPTION 'RIDE_NOT_FOUND' USING HINT = 'A corrida solicitada não foi encontrada.';
    END IF;

    -- 4. Executar UPDATE atômico da corrida
    RETURN QUERY
    UPDATE public.rides R
    SET
        driver_id = p_driver_id,
        status = 'ACCEPTED',
        accepted_at = now(),
        updated_at = now()
    WHERE
        R.id = p_ride_id
        AND R.status = 'REQUESTED'
        AND R.driver_id IS NULL
        AND R.expires_at > now()
    RETURNING
        R.id,
        R.passenger_name,
        R.passenger_phone,
        R.pickup_description,
        R.destination_description,
        R.passenger_count,
        R.has_luggage,
        R.notes,
        R.status,
        R.driver_id,
        R.created_at,
        R.accepted_at,
        R.expires_at,
        R.public_tracking_token;

    -- 5. Se nenhuma linha foi atualizada (corrida já aceita por outro motorista ou expirada)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RIDE_NOT_AVAILABLE' USING HINT = 'A corrida já foi aceita por outro bicitaxista ou expirou.';
    END IF;

    -- 6. Atualizar a disponibilidade do motorista para false
    UPDATE public.drivers
    SET is_available = false
    WHERE drivers.id = p_driver_id;

END;
$$;

-- Conceder permissão de execução para funções/papeis do MVP
GRANT EXECUTE ON FUNCTION public.accept_ride(UUID, UUID) TO anon, authenticated;
