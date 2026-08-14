
-- 6. CREATE FUNCTION (RPC APROVADA COM PATCH DE p_items)
CREATE FUNCTION public.av_create_order(
    p_event_id UUID,
    p_customer_name TEXT,
    p_whatsapp TEXT,
    p_notes TEXT,
    p_idempotency_key UUID,
    p_request_fingerprint TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    -- Variáveis de concorrência
    v_existing_event_id UUID;
    v_existing_fingerprint TEXT;
    v_existing_customer_name TEXT;
    v_existing_subtotal NUMERIC(12,2);
    v_existing_total_amount NUMERIC(12,2);
    v_existing_order_status TEXT;
    v_existing_payment_status TEXT;
BEGIN
    -- 1. VALIDAÇÃO INICIAL (APENAS PARÂMETROS DE IDEMPOTÊNCIA)
    IF p_event_id IS NULL 
       OR p_idempotency_key IS NULL 
       OR p_request_fingerprint IS NULL 
       OR p_request_fingerprint !~ '^[0-9a-f]{64}$' 
    THEN
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

    -- 3. VALIDAÇÃO PARA NOVO PEDIDO (PÓS FAST-PATH)
    -- Patch Final de p_items e validação em blocos
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

    -- 5. INSERT CABEÇALHO (ON CONFLICT)
    INSERT INTO public.av_orders (
        event_id, customer_name, whatsapp, notes, order_status, payment_status,
        subtotal, total_amount, idempotency_key, request_fingerprint
    ) VALUES (
        p_event_id, p_customer_name, p_whatsapp, p_notes, 'received', 'awaiting_payment',
        0, 0, p_idempotency_key, p_request_fingerprint
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, order_seq INTO v_order_id, v_order_seq;

    -- 6. CONCORRÊNCIA - TRATAR CONFLITO
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
        -- Validação de shirt_model_id
        IF NOT (v_item ? 'shirt_model_id') 
           OR jsonb_typeof(v_item -> 'shirt_model_id') IS DISTINCT FROM 'string'
        THEN
            RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
        END IF;

        IF (v_item ->> 'shirt_model_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'INVALID_MODEL_UUID' USING ERRCODE = 'AV005';
        END IF;

        v_shirt_model_id := (v_item ->> 'shirt_model_id')::UUID;

        -- Validação de size_option
        IF NOT (v_item ? 'size_option')
           OR jsonb_typeof(v_item -> 'size_option') IS DISTINCT FROM 'string'
           OR trim(v_item ->> 'size_option') = ''
        THEN
            RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
        END IF;

        -- Validação de Strings Opcionais
        IF ( (v_item ? 'custom_name') AND jsonb_typeof(v_item -> 'custom_name') NOT IN ('string','null') )
           OR ( (v_item ? 'custom_number') AND jsonb_typeof(v_item -> 'custom_number') NOT IN ('string','null') )
           OR ( (v_item ? 'custom_size') AND jsonb_typeof(v_item -> 'custom_size') NOT IN ('string','null') )
        THEN
           RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
        END IF;

        -- Validação de quantity
        IF NOT (v_item ? 'quantity') 
           OR jsonb_typeof(v_item -> 'quantity') IS DISTINCT FROM 'number' 
        THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
        END IF;

        v_qty_numeric := (v_item ->> 'quantity')::NUMERIC;
        IF v_qty_numeric <= 0 OR (v_qty_numeric % 1) != 0 OR v_qty_numeric > 2147483647 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
        END IF;

        -- Proteção técnica contra overflow de line_total (NUMERIC 12,2)
        IF (v_unit_price * v_qty_numeric) > 9999999999.99 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
        END IF;
        
        v_qty_int := v_qty_numeric::INTEGER;

        -- Buscar Modelo (AV007 INVALID_MODEL)
        SELECT code, name, category, available_sizes, allow_custom_size
        INTO v_model_record
        FROM public.av_shirt_models
        WHERE id = v_shirt_model_id AND event_id = p_event_id AND active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_MODEL' USING ERRCODE = 'AV007';
        END IF;

        -- Regras de Tamanho
        IF (v_item ->> 'size_option') = 'OUTRO' THEN
            IF NOT v_model_record.allow_custom_size THEN
                RAISE EXCEPTION 'CUSTOM_SIZE_NOT_ALLOWED' USING ERRCODE = 'AV008';
            END IF;
            IF NOT (v_item ? 'custom_size') 
               OR jsonb_typeof(v_item -> 'custom_size') IS DISTINCT FROM 'string'
               OR trim(v_item ->> 'custom_size') = '' 
            THEN
                RAISE EXCEPTION 'CUSTOM_SIZE_REQUIRED' USING ERRCODE = 'AV008';
            END IF;
        ELSE
            IF NOT ( (v_item ->> 'size_option') = ANY(v_model_record.available_sizes) ) THEN
                RAISE EXCEPTION 'INVALID_SIZE_OPTION' USING ERRCODE = 'AV009';
            END IF;
            IF (v_item ? 'custom_size') AND jsonb_typeof(v_item -> 'custom_size') IS DISTINCT FROM 'null' THEN
                RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
            END IF;
        END IF;

        -- Inserir Item
        INSERT INTO public.av_order_items (
            event_id, order_id, shirt_model_id, model_code, model_name, shirt_type,
            size_option, custom_size, custom_name, custom_number, quantity, unit_price
        ) VALUES (
            p_event_id, v_order_id, v_shirt_model_id, v_model_record.code, v_model_record.name, v_model_record.category,
            v_item ->> 'size_option', v_item ->> 'custom_size', trim(v_item ->> 'custom_name'), v_item ->> 'custom_number',
            v_qty_int, v_unit_price
        );
    END LOOP;

    -- 8. TOTAIS E PROTEÇÃO CONTRA OVERFLOW AGREGADO (Patch 4)
    SELECT 
        COALESCE(SUM(quantity), 0), 
        COALESCE(SUM(line_total), 0)
    INTO 
        v_total_qty_calc, 
        v_total_amount_raw
    FROM public.av_order_items WHERE order_id = v_order_id;

    IF v_total_amount_raw > 9999999999.99 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
    END IF;

    v_total_amount_calc := v_total_amount_raw;

    UPDATE public.av_orders SET subtotal = v_total_amount_calc, total_amount = v_total_amount_calc
    WHERE id = v_order_id;

    -- 9. RETORNO FINAL
    v_display_number := 'AV-' || v_event_year || '-' || (
        CASE 
            WHEN length(v_order_seq::text) < 4 THEN lpad(v_order_seq::text, 4, '0')
            ELSE v_order_seq::text
        END
    );

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'order_id', v_order_id,
            'order_seq', v_order_seq,
            'display_order_number', v_display_number,
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
$$;

-- 7. PRIVILÉGIOS (DENTRO DA TRANSAÇÃO)
REVOKE ALL ON FUNCTION public.av_create_order(uuid,text,text,text,uuid,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.av_create_order(uuid,text,text,text,uuid,text,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.av_create_order(uuid,text,text,text,uuid,text,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.av_create_order(uuid,text,text,text,uuid,text,jsonb) TO service_role;
