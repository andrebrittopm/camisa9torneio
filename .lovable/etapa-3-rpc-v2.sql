-- B. RPC SQL Completa
-- B.1 Função: public.av_create_order
-- B.2 Objetivo: Criação atômica de pedido e itens com validação de negócio e idempotência.

CREATE OR REPLACE FUNCTION public.av_create_order(
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
    v_order_seq INT;
    v_event_year INT;
    v_unit_price DECIMAL(10,2);
    v_item RECORD;
    v_model RECORD;
    v_subtotal DECIMAL(10,2) := 0;
    v_total_qty INT := 0;
    v_existing_order_id UUID;
    v_existing_fingerprint TEXT;
    v_result JSONB;
BEGIN
    -- 1. Verificação de Idempotência
    SELECT id, request_fingerprint INTO v_existing_order_id, v_existing_fingerprint
    FROM public.av_orders
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_fingerprint = p_request_fingerprint THEN
            -- Caso A: Mesma chave, mesmo fingerprint -> Retorno Idempotente
            SELECT jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'order_id', o.id,
                    'order_seq', o.order_seq,
                    'display_order_number', 'AV-' || e.event_year || '-' || LPAD(o.order_seq::text, 4, '0'),
                    'event_year', e.event_year,
                    'customer_name', o.customer_name,
                    'total_quantity', o.total_quantity,
                    'subtotal', o.total_amount,
                    'total_amount', o.total_amount,
                    'order_status', o.order_status,
                    'payment_status', o.payment_status,
                    'is_duplicate', true
                )
            ) INTO v_result
            FROM public.av_orders o
            JOIN public.av_events e ON e.id = o.event_id
            WHERE o.id = v_existing_order_id;
            
            RETURN v_result;
        ELSE
            -- Caso B: Mesma chave, fingerprint diferente -> Abuso de chave
            RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- 2. Validação do Evento
    SELECT event_year, unit_price INTO v_event_year, v_unit_price
    FROM public.av_events
    WHERE id = p_event_id
      AND active = true
      AND orders_open = true
      AND (order_deadline IS NULL OR NOW() <= order_deadline);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_AVAILABLE' USING ERRCODE = 'P0002';
    END IF;

    -- 3. Validação Básica de Itens
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'P0003';
    END IF;

    -- 4. Inserção do Cabeçalho do Pedido
    INSERT INTO public.av_orders (
        event_id,
        customer_name,
        whatsapp,
        notes,
        idempotency_key,
        request_fingerprint,
        order_status,
        payment_status,
        total_amount,
        total_quantity
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
        0, -- Temporário
        0  -- Temporário
    )
    RETURNING id, order_seq INTO v_order_id, v_order_seq;

    -- 5. Processamento dos Itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        shirt_model_id UUID,
        size_option TEXT,
        custom_size TEXT,
        custom_name TEXT,
        custom_number TEXT,
        quantity INT
    ) LOOP
        -- Validação de quantidade
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'P0004';
        END IF;

        -- Validação do Modelo
        SELECT model_code, model_name, shirt_type, available_sizes, allow_custom_size
        INTO v_model
        FROM public.av_shirt_models
        WHERE id = v_item.shirt_model_id
          AND event_id = p_event_id
          AND active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_MODEL' USING ERRCODE = 'P0005';
        END IF;

        -- Validação de Tamanho
        IF v_item.size_option = 'OUTRO' THEN
            IF NOT v_model.allow_custom_size OR v_item.custom_size IS NULL OR trim(v_item.custom_size) = '' THEN
                RAISE EXCEPTION 'CUSTOM_SIZE_NOT_ALLOWED' USING ERRCODE = 'P0006';
            END IF;
        ELSE
            IF NOT (v_item.size_option = ANY(v_model.available_sizes)) THEN
                RAISE EXCEPTION 'INVALID_SIZE_OPTION' USING ERRCODE = 'P0007';
            END IF;
            IF v_item.custom_size IS NOT NULL AND trim(v_item.custom_size) != '' THEN
                RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'P0003'; -- custom_size em tamanho padrão
            END IF;
        END IF;

        -- Inserção do Item
        INSERT INTO public.av_order_items (
            order_id,
            event_id,
            shirt_model_id,
            model_code_snapshot,
            model_name_snapshot,
            shirt_type_snapshot,
            size_option,
            custom_size,
            custom_name,
            custom_number,
            quantity,
            unit_price_snapshot
        )
        VALUES (
            v_order_id,
            p_event_id,
            v_item.shirt_model_id,
            v_model.model_code,
            v_model.model_name,
            v_model.shirt_type,
            v_item.size_option,
            v_item.custom_size,
            v_item.custom_name,
            v_item.custom_number,
            v_item.quantity,
            v_unit_price
        );

        v_subtotal := v_subtotal + (v_unit_price * v_item.quantity);
        v_total_qty := v_total_qty + v_item.quantity;
    END LOOP;

    -- 6. Atualização dos Totais no Pedido
    UPDATE public.av_orders
    SET total_amount = v_subtotal,
        total_quantity = v_total_qty
    WHERE id = v_order_id;

    -- 7. Retorno de Sucesso
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'order_id', v_order_id,
            'order_seq', v_order_seq,
            'display_order_number', 'AV-' || v_event_year || '-' || LPAD(v_order_seq::text, 4, '0'),
            'event_year', v_event_year,
            'customer_name', p_customer_name,
            'total_quantity', v_total_qty,
            'subtotal', v_subtotal,
            'total_amount', v_subtotal,
            'order_status', 'received',
            'payment_status', 'awaiting_payment',
            'is_duplicate', false
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        -- O PostgreSQL garante o rollback automático da transação em caso de EXCEPTION
        RAISE;
END;
$$;

-- C. GRANT/REVOKE Completos
REVOKE ALL ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO service_role;
