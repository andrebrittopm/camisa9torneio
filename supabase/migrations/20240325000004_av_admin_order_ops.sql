-- ETAPA 10.4A: RPC para Fluxo Operacional de Produção e Entrega

CREATE OR REPLACE FUNCTION public.av_admin_update_order_status(
  p_order_id UUID,
  p_admin_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_order_status TEXT;
  v_payment_status TEXT;
  v_allowed BOOLEAN := FALSE;
  v_event_type TEXT;
BEGIN
  -- 1. Obter estado atual
  SELECT order_status, payment_status 
  INTO v_current_order_status, v_payment_status
  FROM av_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  -- 2. Validar Pagamento (Fail Closed)
  IF v_payment_status != 'payment_confirmed' THEN
    RETURN jsonb_build_object('success', false, 'code', 'PAYMENT_NOT_CONFIRMED');
  END IF;

  -- 3. Validar Transição (Transition Map)
  IF v_current_order_status = 'confirmed' AND p_new_status = 'in_production' THEN
    v_allowed := TRUE;
    v_event_type := 'ORDER_PRODUCTION_STARTED';
  ELSIF v_current_order_status = 'in_production' AND p_new_status = 'ready' THEN
    v_allowed := TRUE;
    v_event_type := 'ORDER_MARKED_READY';
  ELSIF v_current_order_status = 'ready' AND p_new_status = 'delivered' THEN
    v_allowed := TRUE;
    v_event_type := 'ORDER_DELIVERED';
  END IF;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_STATUS_TRANSITION_INVALID');
  END IF;

  -- 4. Executar Update Atômico com verificação de concorrência
  UPDATE av_orders
  SET 
    order_status = p_new_status,
    updated_at = NOW()
  WHERE id = p_order_id
    AND order_status = v_current_order_status;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_STATUS_CHANGED');
  END IF;

  -- 5. Registrar Auditoria
  INSERT INTO av_admin_audit_logs (
    admin_id,
    order_id,
    event_type,
    metadata
  ) VALUES (
    p_admin_id,
    p_order_id,
    v_event_type,
    jsonb_build_object(
      'old_status', v_current_order_status,
      'new_status', p_new_status
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Garantir acesso ao service_role
GRANT EXECUTE ON FUNCTION public.av_admin_update_order_status TO service_role;
