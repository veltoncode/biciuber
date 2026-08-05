-- ==============================================================================
-- BICIUBER - ATUALIZAÇÃO SEGURA DE STATUS DA CORRIDA PELO MOTORISTA (ETAPA 6)
-- ==============================================================================
-- Finalidade:
--   Permite que o motorista avance os estágios da corrida respeitando a
--   máquina de estados estrita.
--
-- Transições Permitidas:
--   ACCEPTED -> DRIVER_ARRIVING
--   DRIVER_ARRIVING -> DRIVER_ARRIVED
--   DRIVER_ARRIVED -> IN_PROGRESS
--   IN_PROGRESS -> COMPLETED
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_driver_ride_status(
    p_ride_id UUID,
    p_driver_id UUID,
    p_new_status TEXT
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    driver_id UUID,
    updated_at TIMESTAMPTZ,
    driver_arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_status TEXT;
    v_actual_driver_id UUID;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    -- 1. Validar se a corrida existe e capturar status atual
    SELECT R.status, R.driver_id INTO v_current_status, v_actual_driver_id
    FROM public.rides R
    WHERE R.id = p_ride_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_FORBIDDEN' USING HINT = 'A corrida solicitada não foi encontrada.';
    END IF;

    -- 2. Validar se pertence ao motorista correto
    IF v_actual_driver_id IS NULL OR v_actual_driver_id <> p_driver_id THEN
        RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_FORBIDDEN' USING HINT = 'Esta corrida não pertence a você.';
    END IF;

    -- 3. Impedir alteração de estados finais
    IF v_current_status IN ('CANCELLED', 'COMPLETED', 'EXPIRED') THEN
        RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION' USING HINT = 'A corrida já foi encerrada e não pode ser alterada.';
    END IF;

    -- 4. Validar as transições permitidas estritamente
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

    -- 5. Atualizar a corrida de forma segura
    RETURN QUERY
    UPDATE public.rides R
    SET
        status = p_new_status,
        updated_at = now(),
        driver_arrived_at = CASE WHEN p_new_status = 'DRIVER_ARRIVED' THEN now() ELSE R.driver_arrived_at END,
        started_at = CASE WHEN p_new_status = 'IN_PROGRESS' THEN now() ELSE R.started_at END,
        completed_at = CASE WHEN p_new_status = 'COMPLETED' THEN now() ELSE R.completed_at END
    WHERE
        R.id = p_ride_id
        AND R.driver_id = p_driver_id
        AND R.status = v_current_status
    RETURNING
        R.id,
        R.status,
        R.driver_id,
        R.updated_at,
        R.driver_arrived_at,
        R.started_at,
        R.completed_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_RIDE_STATUS_TRANSITION' USING HINT = 'A corrida não pôde ser atualizada (estado possivelmente alterado concorremente).';
    END IF;

    -- 6. Se concluída, liberar o motorista
    IF p_new_status = 'COMPLETED' THEN
        UPDATE public.drivers
        SET is_available = true
        WHERE drivers.id = p_driver_id;
    END IF;

END;
$$;

-- Conceder permissão de execução para anon e authenticated (provisório para MVP)
GRANT EXECUTE ON FUNCTION public.update_driver_ride_status(UUID, UUID, TEXT) TO anon, authenticated;
