-- 1. CLEANUP TEST DATA
DELETE FROM public.av_orders WHERE customer_name = 'Test TUR16';

-- 2. HARDEN AV_ORDERS
ALTER TABLE public.av_orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
-- All rows deleted above, but for safety in case of concurrent insert
UPDATE public.av_orders SET customer_email = 'suporte@torneio.com.br' WHERE customer_email IS NULL;
ALTER TABLE public.av_orders ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE public.av_orders DROP CONSTRAINT IF EXISTS av_orders_email_check;
ALTER TABLE public.av_orders ADD CONSTRAINT av_orders_email_check 
    CHECK (length(customer_email) <= 254 AND customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

-- 3. CREATE OUTBOX
CREATE TABLE IF NOT EXISTS public.av_email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.av_orders(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    event_key TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempt_count INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    provider_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, event_type, event_key)
);

GRANT ALL ON public.av_email_outbox TO service_role;
REVOKE ALL ON public.av_email_outbox FROM anon, authenticated;
ALTER TABLE public.av_email_outbox ENABLE ROW LEVEL SECURITY;

-- 4. UPDATE AV_CREATE_ORDER
CREATE OR REPLACE FUNCTION public.av_create_order(
    p_event_id uuid,
    p_customer_name text,
    p_whatsapp text,
    p_customer_email text, -- NOVO
    p_notes text,
    p_idempotency_key uuid,
    p_request_fingerprint text,
    p_items jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_order_id UUID;
    v_order_seq BIGINT;
    v_event_year INTEGER;
    v_unit_price NUMERIC(12,2);
    v_ev_active BOOLEAN;
    v_ev_open BOOLEAN;
    v_ev_deadline TIMESTAMPTZ;
    v_item JSONB;
    v_shirt_model_id UUID;
    v_model_record RECORD;
    v_qty_numeric NUMERIC;
    v_qty_int INTEGER;
    v_total_qty_calc BIGINT := 0;
    v_total_amount_raw NUMERIC;
    v_total_amount_calc NUMERIC(12,2);
    v_display_number TEXT;
    v_response_data JSONB;
    v_normalized_email TEXT;
    -- Variáveis de concorrência
    v_existing_event_id UUID;
    v_existing_fingerprint TEXT;
    v_existing_customer_name TEXT;
    v_existing_subtotal NUMERIC(12,2);
    v_existing_total_amount NUMERIC(12,2);
    v_existing_order_status TEXT;
    v_existing_payment_status TEXT;
BEGIN
    -- 1. VALIDAÇÃO INICIAL
    IF p_event_id IS NULL 
       OR p_idempotency_key IS NULL 
       OR p_request_fingerprint IS NULL 
       OR p_request_fingerprint !~ '^[0-9a-f]{64}$' 
    THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;

    -- Normalização do E-mail
    IF p_customer_email IS NULL OR trim(p_customer_email) = '' THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;
    v_normalized_email := lower(trim(p_customer_email));
    
    -- Validação básica de formato (o DB aplicará a constraint final)
    IF v_normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' OR length(v_normalized_email) > 254 THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;

    -- 2. FAST-PATH IDEMPOTENCY
    SELECT 
        jsonb_build_object(
            'order_id', o.id,
            'order_seq', o.order_seq,
            'display_order_number', 'AV-' || e.event_year || '-' || (
                CASE 
                    WHEN length(o.order_seq::text) < 4 THEN lpad(o.order_seq::text, 4, '0')
                    ELSE o.order_seq::text
                END
            ),
            'event_year', e.event_year,
            'customer_name', o.customer_name,
            'total_quantity', (SELECT COALESCE(SUM(quantity), 0) FROM public.av_order_items WHERE order_id = o.id),
            'subtotal', o.subtotal,
            'total_amount', o.total_amount,
            'order_status', o.order_status,
            'payment_status', o.payment_status,
            'is_duplicate', true,
            'request_fingerprint', o.request_fingerprint,
            'event_id', o.event_id
        )
    INTO v_response_data
    FROM public.av_orders o
    JOIN public.av_events e ON e.id = o.event_id
    WHERE o.idempotency_key = p_idempotency_key;

    IF v_response_data IS NOT NULL THEN
        IF (v_response_data ->> 'request_fingerprint') != p_request_fingerprint 
           OR (v_response_data ->> 'event_id')::UUID != p_event_id 
        THEN
            RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = 'AV001';
        END IF;
        RETURN jsonb_build_object('success', true, 'data', v_response_data - 'request_fingerprint' - 'event_id');
    END IF;

    -- 3. VALIDAÇÃO PARA NOVO PEDIDO
    IF p_customer_name IS NULL 
       OR trim(p_customer_name) = '' 
       OR p_whatsapp IS NULL 
       OR trim(p_whatsapp) = ''
    THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;

    IF p_items IS NULL 
       OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' 
    THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;

    -- 4. DADOS DO EVENTO
    SELECT 
        event_year, unit_price, active, orders_open, order_deadline
    INTO 
        v_event_year, v_unit_price, v_ev_active, v_ev_open, v_ev_deadline
    FROM public.av_events
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND' USING ERRCODE = 'AV002';
    END IF;

    IF NOT v_ev_active OR NOT v_ev_open THEN
        RAISE EXCEPTION 'EVENT_NOT_AVAILABLE' USING ERRCODE = 'AV003';
    END IF;

    IF v_ev_deadline IS NOT NULL AND NOW() > v_ev_deadline THEN
        RAISE EXCEPTION 'ORDER_DEADLINE_EXCEEDED' USING ERRCODE = 'AV004';
    END IF;

    -- 5. INSERT CABEÇALHO
    INSERT INTO public.av_orders (
        event_id, customer_name, whatsapp, customer_email, notes, order_status, payment_status,
        subtotal, total_amount, idempotency_key, request_fingerprint
    ) VALUES (
        p_event_id, p_customer_name, p_whatsapp, v_normalized_email, p_notes, 'received', 'awaiting_payment',
        0, 0, p_idempotency_key, p_request_fingerprint
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, order_seq INTO v_order_id, v_order_seq;

    -- 6. CONCORRÊNCIA
    IF v_order_id IS NULL THEN
        SELECT 
            id, order_seq, event_id, request_fingerprint, customer_name, subtotal, total_amount, order_status, payment_status
        INTO 
            v_order_id, v_order_seq, v_existing_event_id, v_existing_fingerprint, v_existing_customer_name, 
            v_existing_subtotal, v_existing_total_amount, v_existing_order_status, v_existing_payment_status
        FROM public.av_orders
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_event_id != p_event_id OR v_existing_fingerprint != p_request_fingerprint THEN
            RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = 'AV001';
        END IF;

        SELECT COALESCE(SUM(quantity), 0) INTO v_total_qty_calc
        FROM public.av_order_items WHERE order_id = v_order_id;

        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'order_id', v_order_id,
                'order_seq', v_order_seq,
                'display_order_number', 'AV-' || v_event_year || '-' || (
                    CASE 
                        WHEN length(v_order_seq::text) < 4 THEN lpad(v_order_seq::text, 4, '0')
                        ELSE v_order_seq::text
                    END
                ),
                'event_year', v_event_year,
                'customer_name', v_existing_customer_name,
                'total_quantity', v_total_qty_calc,
                'subtotal', v_existing_subtotal,
                'total_amount', v_existing_total_amount,
                'order_status', v_existing_order_status,
                'payment_status', v_existing_payment_status,
                'is_duplicate', true
            )
        );
    END IF;

    -- 7. PROCESSAR ITENS
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Validação Simplificada
        v_shirt_model_id := (v_item ->> 'shirt_model_id')::UUID;
        v_qty_numeric := (v_item ->> 'quantity')::NUMERIC;
        v_qty_int := v_qty_numeric::INTEGER;

        SELECT code, name, category, available_sizes, allow_custom_size, unit_price -- Considerar unit_price do modelo se existir, caso contrário do evento
        INTO v_model_record
        FROM public.av_shirt_models
        WHERE id = v_shirt_model_id AND event_id = p_event_id AND active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_MODEL' USING ERRCODE = 'AV007';
        END IF;

        INSERT INTO public.av_order_items (
            order_id, event_id, shirt_model_id, model_code, model_name, shirt_type,
            size_option, custom_size, custom_name, custom_number, quantity, unit_price
        ) VALUES (
            v_order_id, p_event_id, v_shirt_model_id, v_model_record.code, v_model_record.name, v_model_record.category,
            v_item ->> 'size_option', v_item ->> 'custom_size', v_item ->> 'custom_name', v_item ->> 'custom_number',
            v_qty_int, v_unit_price
        );

        v_total_qty_calc := v_total_qty_calc + v_qty_int;
    END LOOP;

    -- 8. TOTAIS
    SELECT SUM(line_total) INTO v_total_amount_calc
    FROM public.av_order_items WHERE order_id = v_order_id;

    UPDATE public.av_orders
    SET subtotal = v_total_amount_calc,
        total_amount = v_total_amount_calc
    WHERE id = v_order_id;

    -- 9. ENQUEUE EMAIL (Idempotent)
    INSERT INTO public.av_email_outbox (
        order_id, event_type, event_key, recipient_email, status
    ) VALUES (
        v_order_id, 'ORDER_CREATED', 'order-created', v_normalized_email, 'pending'
    ) ON CONFLICT (order_id, event_type, event_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'order_id', v_order_id,
            'order_seq', v_order_seq,
            'display_order_number', 'AV-' || v_event_year || '-' || (
                CASE 
                    WHEN length(v_order_seq::text) < 4 THEN lpad(v_order_seq::text, 4, '0')
                    ELSE v_order_seq::text
                END
            ),
            'event_year', v_event_year,
            'customer_name', p_customer_name,
            'total_quantity', v_total_qty_calc,
            'subtotal', v_total_amount_calc,
            'total_amount', v_total_amount_calc,
            'order_status', 'received',
            'payment_status', 'awaiting_payment',
            'is_duplicate', false
        )
    );
END;
$function$;

-- 5. UPDATE AV_SUBMIT_PAYMENT_RECEIPT
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