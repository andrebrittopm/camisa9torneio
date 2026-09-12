-- Migration: av_admin_confirm_payment_status RPC
-- Atualiza payment_status para 'payment_confirmed' de forma atômica com auditoria

CREATE OR REPLACE FUNCTION av_admin_confirm_payment_status(
  p_order_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_record RECORD;
  v_result JSONB;
BEGIN
  -- Validar inputs
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_ORDER_ID');
  END IF;

  IF p_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_ADMIN_ID');
  END IF;

  -- Verificar se pedido existe e buscar status atual
  SELECT id, payment_status, order_status INTO v_order_record
  FROM av_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  -- Validar transição: só permite confirmar se estiver aguardando pagamento
  IF v_order_record.payment_status != 'awaiting_payment' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_TRANSITION',
      'message', 'Só é possível confirmar pagamento de pedidos com status Aguardando Pagamento'
    );
  END IF;

  -- Atualizar payment_status
  UPDATE av_orders
  SET
    payment_status = 'payment_confirmed',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Registrar na auditoria
  INSERT INTO av_admin_audit_log (
    admin_id,
    action_type,
    target_table,
    target_id,
    old_value,
    new_value,
    notes,
    created_at
  ) VALUES (
    p_admin_id,
    'PAYMENT_CONFIRMED',
    'av_orders',
    p_order_id,
    jsonb_build_object('payment_status', v_order_record.payment_status),
    jsonb_build_object('payment_status', 'payment_confirmed'),
    p_notes,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', 'PAYMENT_CONFIRMED',
    'order_id', p_order_id,
    'new_status', 'payment_confirmed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'code', 'INTERNAL_ERROR',
    'message', SQLERRM
  );
END;
$$;

-- Permitir execução para anon (via service role)
GRANT EXECUTE ON FUNCTION av_admin_confirm_payment_status TO anon;