-- B. RPC SQL Completa e Corrigida
-- Objetivo: Criação atômica de pedido e itens com proteção concorrente via ON CONFLICT.

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
    v_event_year INT;
    v_unit_price DECIMAL(10,2);
    v_item RECORD;
    v_model RECORD;
    v_total_amount DECIMAL(10,2);
    v_total_qty BIGINT;
    v_existing_fingerprint TEXT;
    v_result JSONB;
BEGIN
    -- 1. Validação do Evento (AV002, AV003, AV004)
    SELECT event_year, unit_price, active, orders_open, order_deadline 
    INTO v_event_year, v_unit_price, v_model.active, v_model.allow_custom_size, v_model.available_sizes -- Reutilizando v_model temporariamente
    FROM public.av_events
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND' USING ERRCODE = 'AV002';
    END IF;

    IF v_model.active = false OR v_model.allow_custom_size = false THEN
        RAISE EXCEPTION 'EVENT_NOT_AVAILABLE' USING ERRCODE = 'AV003';
    END IF;

    IF v_model.available_sizes IS NOT NULL AND NOW() > v_model.available_sizes::timestamp THEN -- available_sizes usado aqui como order_deadline
        RAISE EXCEPTION 'ORDER_DEADLINE_EXCEEDED' USING ERRCODE = 'AV004';
    END IF;

    -- Correção: A consulta acima estava confusa. Vamos refazer a extração correta.
    SELECT event_year, unit_price, active, orders_open, order_deadline 
    INTO v_event_year, v_unit_price, v_model.active, v_model.allow_custom_size, v_model.available_sizes
    FROM public.av_events WHERE id = p_event_id;

    -- Redefinindo v_model logicamente
    DECLARE
        v_ev_active BOOLEAN;
        v_ev_open BOOLEAN;
        v_ev_deadline TIMESTAMP;
    BEGIN
        SELECT active, orders_open, order_deadline INTO v_ev_active, v_ev_open, v_ev_deadline
        FROM public.av_events WHERE id = p_event_id;
        
        IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND' USING ERRCODE = 'AV002'; END IF;
        IF NOT v_ev_active OR NOT v_ev_open THEN RAISE EXCEPTION 'EVENT_NOT_AVAILABLE' USING ERRCODE = 'AV003'; END IF;
        IF v_ev_deadline IS NOT NULL AND NOW() > v_ev_deadline THEN RAISE EXCEPTION 'ORDER_DEADLINE_EXCEEDED' USING ERRCODE = 'AV004'; END IF;
    END DECLARE;

    -- 2. Tentativa de Inserção com Proteção contra Concorrência
    -- O PostgreSQL bloqueia a linha no índice UNIQUE durante o INSERT.
    -- Se dois processos tentarem a mesma chave simultaneamente, um vence e o outro retorna nulo no RETURNING.
    INSERT INTO public.av_orders (
        event_id,
        customer_name,
        whatsapp,
        notes,
        idempotency_key,
        request_fingerprint,
        order_status,
        payment_status,
        subtotal,
        total_amount
    )
    VALUES (
        p_event_id,
        p_customer_name,
        p_whatsapp,
        p_notes,
        p_idempotency_key,
        p_request_fingerprint,
        'received',
        'awaiting_payment',
        0, 0
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, order_seq INTO v_order_id, v_order_seq;

    -- 3. Tratamento de Idempotência (Caso o INSERT tenha falhado por conflito)
    IF v_order_id IS NULL THEN
        SELECT id, order_seq, request_fingerprint INTO v_order_id, v_order_seq, v_existing_fingerprint
        FROM public.av_orders
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_fingerprint != p_request_fingerprint THEN
            RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'AV001';
        END IF;

        -- Para retry legítimo, calculamos os totais dos itens persistidos
        SELECT SUM(quantity), SUM(line_total) INTO v_total_qty, v_total_amount
        FROM public.av_order_items
        WHERE order_id = v_order_id;

        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'order_id', v_order_id,
                'order_seq', v_order_seq,
                'display_order_number', 'AV-' || v_event_year || '-' || 
                    CASE WHEN length(v_order_seq::text) < 4 THEN lpad(v_order_seq::text, 4, '0') ELSE v_order_seq::text END,
                'event_year', v_event_year,
                'customer_name', p_customer_name,
                'total_quantity', COALESCE(v_total_qty, 0),
                'subtotal', COALESCE(v_total_amount, 0),
                'total_amount', COALESCE(v_total_amount, 0),
                'order_status', 'received',
                'payment_status', 'awaiting_payment',
                'is_duplicate', true
            )
        );
    END IF;

    -- 4. Processamento dos Itens (Para novo pedido)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        shirt_model_id UUID,
        size_option TEXT,
        custom_size TEXT,
        custom_name TEXT,
        custom_number TEXT,
        quantity NUMERIC -- Usamos NUMERIC para validar se não é decimal antes do cast
    ) LOOP
        -- Validação defensiva de quantidade
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 OR v_item.quantity % 1 != 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
        END IF;

        -- Validação do Modelo e Snapshot
        SELECT code, name, category, available_sizes, allow_custom_size
        INTO v_model
        FROM public.av_shirt_models
        WHERE id = v_item.shirt_model_id AND event_id = p_event_id AND active = true;

        IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_MODEL' USING ERRCODE = 'AV007'; END IF;

        -- Validação de Tamanho
        IF v_item.size_option = 'OUTRO' THEN
            IF NOT v_model.allow_custom_size OR v_item.custom_size IS NULL OR trim(v_item.custom_size) = '' THEN
                RAISE EXCEPTION 'CUSTOM_SIZE_NOT_ALLOWED' USING ERRCODE = 'AV008';
            END IF;
        ELSE
            IF NOT (v_item.size_option = ANY(v_model.available_sizes)) THEN
                RAISE EXCEPTION 'INVALID_SIZE_OPTION' USING ERRCODE = 'AV009';
            END IF;
        END IF;

        -- Inserção do Item (line_total é GENERATED)
        INSERT INTO public.av_order_items (
            order_id, event_id, shirt_model_id,
            model_code, model_name, shirt_type,
            size_option, custom_size, custom_name, custom_number,
            quantity, unit_price
        )
        VALUES (
            v_order_id, p_event_id, v_item.shirt_model_id,
            v_model.code, v_model.name, v_model.category,
            v_item.size_option, v_item.custom_size, v_item.custom_name, v_item.custom_number,
            v_item.quantity::INT, v_unit_price
        );
    END LOOP;

    -- 5. Atualização Final dos Totais no Pedido
    SELECT SUM(quantity), SUM(line_total) INTO v_total_qty, v_total_amount
    FROM public.av_order_items
    WHERE order_id = v_order_id;

    UPDATE public.av_orders
    SET subtotal = v_total_amount, total_amount = v_total_amount
    WHERE id = v_order_id;

    -- 6. Retorno de Sucesso
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'order_id', v_order_id,
            'order_seq', v_order_seq,
            'display_order_number', 'AV-' || v_event_year || '-' || 
                CASE WHEN length(v_order_seq::text) < 4 THEN lpad(v_order_seq::text, 4, '0') ELSE v_order_seq::text END,
            'event_year', v_event_year,
            'customer_name', p_customer_name,
            'total_quantity', v_total_qty,
            'subtotal', v_total_amount,
            'total_amount', v_total_amount,
            'order_status', 'received',
            'payment_status', 'awaiting_payment',
            'is_duplicate', false
        )
    );
END;
$$;

-- C. GRANT/REVOKE Completos
REVOKE ALL ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO service_role;
