CREATE TABLE IF NOT EXISTS public.av_payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.av_orders(id) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    review_notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    submission_id UUID UNIQUE,
    file_sha256 TEXT CHECK (file_sha256 ~ '^[0-9a-f]{64}$')
);

GRANT ALL ON public.av_payment_receipts TO service_role;
REVOKE ALL ON public.av_payment_receipts FROM anon, authenticated;

ALTER TABLE public.av_payment_receipts ENABLE ROW LEVEL SECURITY;

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
    SELECT order_status, payment_status 
    INTO v_order_status, v_payment_status
    FROM public.av_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'VR002';
    END IF;

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
                'review_status', (SELECT review_status FROM public.av_payment_receipts WHERE id = v_existing_receipt_id)
            );
        ELSE
            RAISE EXCEPTION 'SUBMISSION_KEY_REUSED' USING ERRCODE = 'VR001';
        END IF;
    END IF;

    IF v_order_status = 'cancelled' THEN
        RAISE EXCEPTION 'RECEIPT_NOT_ALLOWED' USING ERRCODE = 'VR003';
    END IF;

    IF v_payment_status = 'payment_confirmed' THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_CONFIRMED' USING ERRCODE = 'VR004';
    END IF;

    IF v_payment_status NOT IN ('awaiting_payment', 'receipt_rejected') THEN
        RAISE EXCEPTION 'RECEIPT_NOT_ALLOWED' USING ERRCODE = 'VR003';
    END IF;

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
        IF SQLSTATE IN ('VR001', 'VR002', 'VR003', 'VR004') THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'INVALID_RECEIPT_METADATA' USING ERRCODE = 'VR005';
END;
$$;

REVOKE ALL ON FUNCTION public.av_submit_payment_receipt(UUID, UUID, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.av_submit_payment_receipt(UUID, UUID, TEXT, TEXT, BIGINT, TEXT) TO service_role;
