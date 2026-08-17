CREATE OR REPLACE FUNCTION public.av_admin_cancel_order(
    p_order_id UUID,
    p_admin_id UUID,
    p_reason_code TEXT,
    p_reason_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_order_seq INTEGER;
    v_metadata JSONB;
BEGIN
    -- 1. Obter estado atual e bloquear para update
    SELECT order_status, order_seq INTO v_current_status, v_order_seq
    FROM av_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Validar se o status permite cancelamento
    -- Permitidos: received, confirmed, in_production, ready
    -- Bloqueados: delivered, cancelled
    IF v_current_status = 'delivered' THEN
        RETURN jsonb_build_object('success', false, 'code', 'ORDER_DELIVERED_BLOCK');
    END IF;

    IF v_current_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'code', 'ORDER_ALREADY_CANCELLED');
    END IF;

    -- 3. Atualizar status
    UPDATE av_orders
    SET order_status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 4. Preparar metadados para o Audit Log
    v_metadata := jsonb_build_object(
        'previous_status', v_current_status,
        'new_status', 'cancelled',
        'reason_code', p_reason_code,
        'reason_text', LEFT(p_reason_text, 500)
    );

    -- 5. Registrar no Audit Log
    INSERT INTO av_admin_audit_logs (
        admin_user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        p_admin_id,
        'ORDER_CANCELLED',
        'ORDER',
        p_order_id::TEXT,
        v_metadata
    );

    RETURN jsonb_build_object(
        'success', true, 
        'code', 'OK', 
        'order_id', p_order_id, 
        'order_seq', v_order_seq
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'INTERNAL_ERROR', 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.av_admin_cancel_order(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.av_admin_cancel_order(UUID, UUID, TEXT, TEXT) TO service_role;
