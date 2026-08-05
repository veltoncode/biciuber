-- ==============================================================================
-- BICIUBER - CANCELAMENTO REAL DE CORRIDA PELO PASSAGEIRO
-- ==============================================================================
-- Finalidade:
--   Permite que o passageiro cancele uma solicitação de corrida ativa própria
--   utilizando o ID da corrida e o public_tracking_token associado.
--
-- Regras de Negócio:
--   - Permitido apenas nos status: REQUESTED, ACCEPTED, DRIVER_ARRIVING, DRIVER_ARRIVED
--   - Não permitido nos status: IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED
--   - Se não for possível cancelar, lança a exceção RIDE_NOT_CANCELLABLE
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cancel_ride(
    p_ride_id UUID,
    p_public_tracking_token UUID
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    cancelled_at TIMESTAMPTZ,
    driver_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- 1. Buscar status atual da corrida e verificar se existe e token confere
    SELECT R.status INTO v_current_status
    FROM public.rides R
    WHERE R.id = p_ride_id
      AND R.public_tracking_token = p_public_tracking_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RIDE_NOT_CANCELLABLE' USING HINT = 'A corrida solicitada não foi encontrada ou o token é inválido.';
    END IF;

    -- 2. Validar se o status permite cancelamento
    IF v_current_status NOT IN ('REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED') THEN
        RAISE EXCEPTION 'RIDE_NOT_CANCELLABLE' USING HINT = 'A corrida não pode mais ser cancelada no status atual.';
    END IF;

    -- 3. Executar UPDATE atômico
    RETURN QUERY
    UPDATE public.rides R
    SET
        status = 'CANCELLED',
        cancelled_at = now(),
        updated_at = now()
    WHERE
        R.id = p_ride_id
        AND R.public_tracking_token = p_public_tracking_token
        AND R.status IN ('REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED')
    RETURNING
        R.id,
        R.status,
        R.cancelled_at,
        R.driver_id;

    -- 4. Garantia final caso concorrência altere o status antes do UPDATE
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RIDE_NOT_CANCELLABLE' USING HINT = 'Não foi possível cancelar a corrida devido a alteração de status simultânea.';
    END IF;

END;
$$;

-- Conceder permissão de execução para anon e authenticated
GRANT EXECUTE ON FUNCTION public.cancel_ride(UUID, UUID) TO anon, authenticated;
