CREATE OR REPLACE FUNCTION public.av_submit_payment_receipt(
    p_submission_id uuid,
    p_order_id uuid,
    p_storage_path text,
    p_mime_type text,
    p_size_bytes bigint,
    p_file_sha256 text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_order_status TEXT;
    v_payment_status TEXT;
    v_customer_email TEXT;
    v_existing_receipt_id UUID;
    v_existing_sha TEXT;
    v_existing_order_id UUID;
BEGIN
    -- Bloquear pedido e obter email
    SELECT order_status, payment_status, customer_email 
    INTO v_order_status, v_payment_status, v_customer_email
    FROM public.av_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'VR002';
    END IF;

    -- Fast-path idempotency para o recibo
    SELECT id, file_sha256, order_id 
    INTO v_existing_receipt_id, v_existing_sha, v_existing_order_id
    FROM public.av_payment_receipts
    WHERE submission_id = p_submission_id;

    IF FOUND THEN
        IF v_existing_sha = p_file_sha256 AND v_existing_order_id = p_order_id THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'payment_status', v_payment_status,
                'customer_email', v_customer_email, -- RETORNA EMAIL
                'review_status', (SELECT review_status FROM public.av_payment_receipts WHERE id = v_existing_receipt_id)
            );
        ELSE
            RAISE EXCEPTION 'SUBMISSION_KEY_REUSED' USING ERRCODE = 'VR001';
        END IF;
    END IF;

    -- Regras de negócio
    IF v_order_status = 'cancelled' THEN
        RAISE EXCEPTION 'RECEIPT_NOT_ALLOWED' USING ERRCODE = 'VR003';
    END IF;

    IF v_payment_status = 'payment_confirmed' THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_CONFIRMED' USING ERRCODE = 'VR004';
    END IF;

    IF v_payment_status NOT IN ('awaiting_payment', 'receipt_rejected') THEN
        RAISE EXCEPTION 'RECEIPT_NOT_ALLOWED' USING ERRCODE = 'VR003';
    END IF;

    -- Registrar recibo
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

    -- Enqueue Email (Idempotent por submission_id)
    INSERT INTO public.av_email_outbox (
        order_id, event_type, event_key, recipient_email, status
    ) VALUES (
        p_order_id, 'RECEIPT_SUBMITTED', p_submission_id::TEXT, v_customer_email, 'pending'
    ) ON CONFLICT (order_id, event_type, event_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'payment_status', 'receipt_submitted',
        'customer_email', v_customer_email, -- RETORNA EMAIL
        'review_status', 'pending'
    );

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE IN ('VR001', 'VR002', 'VR003', 'VR004') THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'INVALID_RECEIPT_METADATA' USING ERRCODE = 'VR005';
END;
$function$;