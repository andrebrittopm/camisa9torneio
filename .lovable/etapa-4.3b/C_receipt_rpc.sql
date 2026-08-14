/**
 * ETAPA 4.3B — RPC TRANSACIONAL DE SUBMISSÃO DE COMPROVANTE
 */

CREATE OR REPLACE FUNCTION public.av_submit_payment_receipt(
    p_submission_id UUID,
    p_order_id UUID,
    p_storage_path TEXT,
    p_mime_type TEXT,
    p_size_bytes BIGINT,
    p_file_sha256 TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order_status TEXT;
    v_payment_status TEXT;
    v_existing_receipt_id UUID;
    v_existing_sha TEXT;
    v_existing_order_id UUID;
BEGIN
    -- 1. Bloqueio pessimista do pedido
    SELECT order_status, payment_status 
    INTO v_order_status, v_payment_status
    FROM public.av_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'VR002';
    END IF;

    -- 2. Validar Idempotência (submission_id)
    SELECT id, file_sha256, order_id 
    INTO v_existing_receipt_id, v_existing_sha, v_existing_order_id
    FROM public.av_payment_receipts
    WHERE submission_id = p_submission_id;

    IF FOUND THEN
        -- Mesmo submission_id, validar se é o mesmo arquivo e pedido
        IF v_existing_sha = p_file_sha256 AND v_existing_order_id = p_order_id THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'payment_status', v_payment_status,
                'review_status', (SELECT review_status FROM public.av_payment_receipts WHERE id = v_existing_receipt_id)
            );
        ELSE
            RAISE EXCEPTION 'SUBMISSION_KEY_REUSED' USING ERRCODE = 'VR001';
        END IF;
    END IF;

    -- 3. Validar Status do Pedido
    IF v_order_status = 'cancelled' THEN
        RAISE EXCEPTION 'RECEIPT_NOT_ALLOWED' USING ERRCODE = 'VR003';
    END IF;

    IF v_payment_status = 'payment_confirmed' THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_CONFIRMED' USING ERRCODE = 'VR004';
    END IF;

    IF v_payment_status NOT IN ('awaiting_payment', 'receipt_rejected') THEN
        RAISE EXCEPTION 'RECEIPT_NOT_ALLOWED' USING ERRCODE = 'VR003';
    END IF;

    -- 4. Inserção do Comprovante e Update do Status (Atômico)
    INSERT INTO public.av_payment_receipts (
        order_id, 
        storage_path, 
        mime_type, 
        size_bytes, 
        submission_id, 
        file_sha256,
        review_status
    )
    VALUES (
        p_order_id, 
        p_storage_path, 
        p_mime_type, 
        p_size_bytes, 
        p_submission_id, 
        p_file_sha256,
        'pending'
    );

    UPDATE public.av_orders
    SET payment_status = 'receipt_submitted',
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'payment_status', 'receipt_submitted',
        'review_status', 'pending'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Mapeamento de erros genéricos
        IF SQLSTATE = 'VR001' OR SQLSTATE = 'VR002' OR SQLSTATE = 'VR003' OR SQLSTATE = 'VR004' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'INVALID_RECEIPT_METADATA' USING ERRCODE = 'VR005';
END;
$$;

-- Permissões
REVOKE ALL ON FUNCTION public.av_submit_payment_receipt(UUID, UUID, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.av_submit_payment_receipt(UUID, UUID, TEXT, TEXT, BIGINT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_submit_payment_receipt(UUID, UUID, TEXT, TEXT, BIGINT, TEXT) TO service_role;
