-- =============================================================================
-- 1. MIGRATION: IDEMPOTENCY_KEY
-- =============================================================================

-- Adição da coluna idempotency_key para evitar pedidos duplicados
-- NOTA: Como ainda não existem pedidos reais, podemos adicionar como NOT NULL diretamente.
ALTER TABLE public.av_orders 
ADD COLUMN idempotency_key UUID NOT NULL;

-- Índice ÚNICO para garantir a proteção contra race conditions no nível do banco
CREATE UNIQUE INDEX idx_av_orders_idempotency_key ON public.av_orders(idempotency_key);

-- =============================================================================
-- 2. RPC: av_create_order
-- =============================================================================

CREATE OR REPLACE FUNCTION public.av_create_order(
  p_idempotency_key UUID,
  p_event_id UUID,
  p_customer_name TEXT,
  p_whatsapp TEXT,
  p_notes TEXT,
  p_items JSONB -- Array de objetos com os itens
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_id UUID;
  v_event_unit_price DECIMAL(10,2);
  v_event_year INT;
  v_order_seq INT;
  v_item RECORD;
  v_model RECORD;
  v_total_amount DECIMAL(10,2) := 0;
  v_total_quantity INT := 0;
  v_existing_order_id UUID;
  v_response JSONB;
BEGIN
  -- 1. Verificação de Idempotência (Race Condition Protection)
  SELECT id INTO v_existing_order_id 
  FROM public.av_orders 
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Se já existe, retorna os dados do pedido existente (Idempotência ativa)
    SELECT jsonb_build_object(
      'order_id', o.id,
      'order_seq', o.order_seq,
      'event_year', e.event_year,
      'customer_name', o.customer_name,
      'total_quantity', (SELECT SUM(quantity) FROM public.av_order_items WHERE order_id = o.id),
      'subtotal', o.subtotal,
      'total_amount', o.total_amount,
      'order_status', o.order_status,
      'payment_status', o.payment_status,
      'display_order_number', 'AV-' || e.event_year || '-' || LPAD(o.order_seq::text, 4, '0'),
      'is_duplicate', true
    ) INTO v_response
    FROM public.av_orders o
    JOIN public.av_events e ON e.id = o.event_id
    WHERE o.id = v_existing_order_id;
    
    RETURN v_response;
  END IF;

  -- 2. Validação do Evento
  SELECT unit_price, event_year, orders_open, active, order_deadline
  INTO v_event_unit_price, v_event_year, v_model -- usando v_model temporariamente para tipos simples se necessário, mas melhor declarar
  FROM public.av_events
  WHERE id = p_event_id;

  -- Re-declarando variáveis para clareza
  DECLARE
    v_ev_active BOOLEAN;
    v_ev_open BOOLEAN;
    v_ev_deadline TIMESTAMPTZ;
  BEGIN
    SELECT active, orders_open, order_deadline, unit_price, event_year
    INTO v_ev_active, v_ev_open, v_ev_deadline, v_event_unit_price, v_event_year
    FROM public.av_events WHERE id = p_event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_ev_active OR NOT v_ev_open THEN
      RAISE EXCEPTION 'EVENT_CLOSED' USING ERRCODE = 'L0001';
    END IF;

    IF v_ev_deadline IS NOT NULL AND NOW() > v_ev_deadline THEN
      RAISE EXCEPTION 'ORDER_DEADLINE_EXCEEDED' USING ERRCODE = 'L0002';
    END IF;
  END;

  -- 3. Criação do Cabeçalho do Pedido (av_orders)
  -- order_seq é serial, subtotal/total_amount serão atualizados após itens
  INSERT INTO public.av_orders (
    idempotency_key,
    event_id,
    customer_name,
    whatsapp,
    notes,
    order_status,
    payment_status,
    subtotal,
    total_amount
  ) VALUES (
    p_idempotency_key,
    p_event_id,
    p_customer_name,
    p_whatsapp,
    p_notes,
    'received',
    'awaiting_payment',
    0, -- placeholder
    0  -- placeholder
  ) RETURNING id, order_seq INTO v_order_id, v_order_seq;

  -- 4. Processamento dos Itens
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    shirt_model_id UUID,
    size_option TEXT,
    custom_size TEXT,
    custom_name TEXT,
    custom_number TEXT,
    quantity INT
  ) LOOP
    
    -- Validação básica de quantidade
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'L0003';
    END IF;

    -- Validação do Modelo
    SELECT id, code, name, category, available_sizes, allow_custom_size, active
    INTO v_model
    FROM public.av_shirt_models
    WHERE id = v_item.shirt_model_id AND event_id = p_event_id;

    IF NOT FOUND OR NOT (v_model.active) THEN
      RAISE EXCEPTION 'INVALID_MODEL' USING ERRCODE = 'L0004';
    END IF;

    -- Validação de Tamanhos
    IF v_item.size_option = 'OUTRO' THEN
      IF NOT (v_model.allow_custom_size) THEN
        RAISE EXCEPTION 'CUSTOM_SIZE_NOT_ALLOWED' USING ERRCODE = 'L0005';
      END IF;
      IF v_item.custom_size IS NULL OR trim(v_item.custom_size) = '' THEN
        RAISE EXCEPTION 'CUSTOM_SIZE_REQUIRED' USING ERRCODE = 'L0006';
      END IF;
    ELSE
      -- Tamanho padrão
      IF NOT (v_item.size_option = ANY(v_model.available_sizes)) THEN
        RAISE EXCEPTION 'INVALID_SIZE_OPTION' USING ERRCODE = 'L0007';
      END IF;
      -- Se for tamanho padrão, custom_size deve ser nulo (segurança de dados)
      v_item.custom_size := NULL;
    END IF;

    -- Inserção do Item
    -- line_total é gerado automaticamente pelo banco (unit_price * quantity)
    INSERT INTO public.av_order_items (
      order_id,
      event_id,
      shirt_model_id,
      model_code,
      model_name,
      shirt_type,
      unit_price,
      size_option,
      custom_size,
      custom_name,
      custom_number,
      quantity
    ) VALUES (
      v_order_id,
      p_event_id,
      v_item.shirt_model_id,
      v_model.code,
      v_model.name,
      v_model.category,
      v_event_unit_price,
      v_item.size_option,
      v_item.custom_size,
      v_item.custom_name,
      v_item.custom_number,
      v_item.quantity
    );

    v_total_quantity := v_total_quantity + v_item.quantity;
  END LOOP;

  -- 5. Atualização dos Totais no Pedido
  -- Lemos do banco para garantir que usamos o line_total calculado pelo Postgres
  SELECT SUM(line_total) INTO v_total_amount
  FROM public.av_order_items
  WHERE order_id = v_order_id;

  UPDATE public.av_orders
  SET subtotal = v_total_amount,
      total_amount = v_total_amount
  WHERE id = v_order_id;

  -- 6. Retorno de Sucesso
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_seq', v_order_seq,
    'event_year', v_event_year,
    'customer_name', p_customer_name,
    'total_quantity', v_total_quantity,
    'subtotal', v_total_amount,
    'total_amount', v_total_amount,
    'order_status', 'received',
    'payment_status', 'awaiting_payment',
    'display_order_number', 'AV-' || v_event_year || '-' || LPAD(v_order_seq::text, 4, '0'),
    'is_duplicate', false
  );

END;
$$;

-- =============================================================================
-- 3. PERMISSÕES
-- =============================================================================

-- Revoga acesso público por padrão
REVOKE EXECUTE ON FUNCTION public.av_create_order(UUID, UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.av_create_order(UUID, UUID, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.av_create_order(UUID, UUID, TEXT, TEXT, TEXT, JSONB) FROM authenticated;

-- Permissão explícita apenas para service_role (usada pela Edge Function)
GRANT EXECUTE ON FUNCTION public.av_create_order(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
