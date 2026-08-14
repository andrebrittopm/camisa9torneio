-- A. MIGRATION SQL (ETAPA 3.1 - REVISÃO FINAL AUDITADA)
-- NÃO EXECUTAR AINDA.

/* 
   PREFLIGHT AUDIT:
   1. SELECT count(*) FROM public.av_orders; -- DEVE SER 0
   2. SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'av_orders' 
      AND column_name IN ('idempotency_key', 'request_fingerprint'); -- DEVE SER VAZIO
*/

DO $$ 
BEGIN
    -- Adição das colunas de idempotência e fingerprint
    -- request_fingerprint é TEXT com CHECK para SHA-256 (64 hex chars)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='av_orders' AND column_name='idempotency_key') THEN
        ALTER TABLE public.av_orders 
        ADD COLUMN idempotency_key UUID NOT NULL,
        ADD COLUMN request_fingerprint TEXT NOT NULL;

        -- Proteção UNIQUE para idempotency_key (Proteção definitiva contra race conditions)
        ALTER TABLE public.av_orders ADD CONSTRAINT av_orders_idempotency_key_key UNIQUE (idempotency_key);

        -- CHECK constraint para o fingerprint SHA-256
        ALTER TABLE public.av_orders ADD CONSTRAINT av_orders_fingerprint_check 
        CHECK (request_fingerprint ~ '^[0-9a-f]{64}$');
        
        -- Nota: Não criar índice comum para request_fingerprint conforme solicitado.
    END IF;
END $$;

-- B. RPC SQL (ETAPA 3.1 - REVISÃO FINAL AUDITADA)

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
SET search_path = 'public' -- Restrito ao schema public
AS $$
DECLARE
    v_order_id UUID;
    v_order_seq BIGINT;
    v_event_year INT;
    v_unit_price NUMERIC(12,2);
    v_ev_active BOOLEAN;
    v_ev_open BOOLEAN;
    v_ev_deadline TIMESTAMPTZ; -- Corrigido para TIMESTAMPTZ
    v_total_amount NUMERIC(12,2); -- Corrigido para NUMERIC(12,2)
    v_total_qty BIGINT;
    v_existing_fingerprint TEXT;
    v_existing_order_status TEXT;
    v_existing_payment_status TEXT;
    v_existing_subtotal NUMERIC(12,2);
    v_existing_total_amount NUMERIC(12,2);
    v_existing_customer_name TEXT;
    v_existing_event_id UUID;
    v_item JSONB;
    v_model RECORD;
    v_temp_qty NUMERIC;
BEGIN
    -- 1. FAST-PATH RETRY (Verificação inicial de idempotência persistida)
    SELECT 
        id, order_seq, request_fingerprint, event_id, customer_name, 
        subtotal, total_amount, order_status, payment_status
    INTO 
        v_order_id, v_order_seq, v_existing_fingerprint, v_existing_event_id, v_existing_customer_name,
        v_existing_subtotal, v_existing_total_amount, v_existing_order_status, v_existing_payment_status
    FROM public.av_orders
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        -- Verificar se o fingerprint coincide
        IF v_existing_fingerprint != p_request_fingerprint THEN
            RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'AV001';
        END IF;

        -- Retry legítimo: Retornar dados reais do pedido existente
        -- Calcular total_quantity a partir dos itens persistidos
        SELECT COALESCE(SUM(quantity), 0) INTO v_total_qty
        FROM public.av_order_items
        WHERE order_id = v_order_id;

        -- Obter o ano do evento para o display_order_number
        SELECT event_year INTO v_event_year FROM public.av_events WHERE id = v_existing_event_id;

        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'order_id', v_order_id,
                'order_seq', v_order_seq,
                'display_order_number', 'AV-' || v_event_year || '-' || 
                    CASE WHEN v_order_seq > 9999 THEN v_order_seq::text ELSE lpad(v_order_seq::text, 4, '0') END,
                'event_year', v_event_year,
                'customer_name', v_existing_customer_name,
                'total_quantity', v_total_qty,
                'subtotal', v_existing_subtotal,
                'total_amount', v_existing_total_amount,
                'order_status', v_existing_order_status,
                'payment_status', v_existing_payment_status,
                'is_duplicate', true
            )
        );
    END IF;

    -- 2. VALIDAÇÃO DE INPUT (p_items)
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
    END IF;

    -- 3. VALIDAÇÃO DO EVENTO (Para novas vendas)
    SELECT event_year, unit_price, active, orders_open, order_deadline 
    INTO v_event_year, v_unit_price, v_ev_active, v_ev_open, v_ev_deadline
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

    -- 4. INSERÇÃO COM ON CONFLICT (Proteção concorrente)
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

    -- Se houve conflito concorrente (v_order_id é nulo)
    IF v_order_id IS NULL THEN
        -- Repetir lógica do retry
        SELECT id, order_seq, request_fingerprint, customer_name, subtotal, total_amount, order_status, payment_status
        INTO v_order_id, v_order_seq, v_existing_fingerprint, v_existing_customer_name, v_existing_subtotal, v_existing_total_amount, v_existing_order_status, v_existing_payment_status
        FROM public.av_orders WHERE idempotency_key = p_idempotency_key;

        IF v_existing_fingerprint != p_request_fingerprint THEN
            RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'AV001';
        END IF;

        SELECT COALESCE(SUM(quantity), 0) INTO v_total_qty FROM public.av_order_items WHERE order_id = v_order_id;

        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'order_id', v_order_id,
                'order_seq', v_order_seq,
                'display_order_number', 'AV-' || v_event_year || '-' || 
                    CASE WHEN v_order_seq > 9999 THEN v_order_seq::text ELSE lpad(v_order_seq::text, 4, '0') END,
                'event_year', v_event_year,
                'customer_name', v_existing_customer_name,
                'total_quantity', v_total_qty,
                'subtotal', v_existing_subtotal,
                'total_amount', v_existing_total_amount,
                'order_status', v_existing_order_status,
                'payment_status', v_existing_payment_status,
                'is_duplicate', true
            )
        );
    END IF;

    -- 5. PROCESSAMENTO DE CADA ITEM
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Validação real do JSON para quantity
        -- Deve existir, ser number, > 0, sem decimal e <= max integer
        IF jsonb_typeof(v_item -> 'quantity') != 'number' THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
        END IF;
        
        v_temp_qty := (v_item ->> 'quantity')::NUMERIC;
        
        IF v_temp_qty <= 0 OR v_temp_qty % 1 != 0 OR v_temp_qty > 2147483647 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'AV006';
        END IF;

        -- Validação do Modelo
        SELECT code, name, category, available_sizes, allow_custom_size
        INTO v_model
        FROM public.av_shirt_models
        WHERE id = (v_item ->> 'shirt_model_id')::UUID AND event_id = p_event_id AND active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_MODEL' USING ERRCODE = 'AV007';
        END IF;

        -- Validação de Custom Size e Size Option
        IF (v_item ->> 'size_option') = 'OUTRO' THEN
            IF NOT v_model.allow_custom_size 
               OR (v_item -> 'custom_size') IS NULL 
               OR jsonb_typeof(v_item -> 'custom_size') != 'string'
               OR trim(v_item ->> 'custom_size') = '' 
            THEN
                RAISE EXCEPTION 'CUSTOM_SIZE_NOT_ALLOWED' USING ERRCODE = 'AV008';
            END IF;
        ELSE
            -- Tamanho padrão: size_option deve estar na lista e custom_size deve ser nulo
            IF NOT ((v_item ->> 'size_option') = ANY(v_model.available_sizes)) THEN
                RAISE EXCEPTION 'INVALID_SIZE_OPTION' USING ERRCODE = 'AV009';
            END IF;
            
            IF (v_item -> 'custom_size') IS NOT NULL AND jsonb_typeof(v_item -> 'custom_size') != 'null' THEN
                RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = 'AV005';
            END IF;
        END IF;

        -- Inserção do Item (line_total é GENERATED STORED)
        INSERT INTO public.av_order_items (
            order_id, event_id, shirt_model_id,
            model_code, model_name, shirt_type,
            size_option, custom_size, custom_name, custom_number,
            quantity, unit_price
        )
        VALUES (
            v_order_id, p_event_id, (v_item ->> 'shirt_model_id')::UUID,
            v_model.code, v_model.name, v_model.category,
            (v_item ->> 'size_option'), (v_item ->> 'custom_size'), 
            (v_item ->> 'custom_name'), (v_item ->> 'custom_number'),
            v_temp_qty::INT, v_unit_price
        );
    END LOOP;

    -- 6. ATUALIZAÇÃO FINAL DOS TOTAIS
    SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(line_total), 0)
    INTO v_total_qty, v_total_amount
    FROM public.av_order_items
    WHERE order_id = v_order_id;

    UPDATE public.av_orders
    SET subtotal = v_total_amount, total_amount = v_total_amount
    WHERE id = v_order_id;

    -- 7. RETORNO DE SUCESSO
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'order_id', v_order_id,
            'order_seq', v_order_seq,
            'display_order_number', 'AV-' || v_event_year || '-' || 
                CASE WHEN v_order_seq > 9999 THEN v_order_seq::text ELSE lpad(v_order_seq::text, 4, '0') END,
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

-- C. GRANTS/REVOKES
REVOKE ALL ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_create_order(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO service_role;
