CREATE OR REPLACE FUNCTION public.av_admin_review_receipt(
  p_order_id UUID,
  p_receipt_id UUID,
  p_admin_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt_current_status TEXT;
  v_receipt_order_id UUID;
  v_order_current_status TEXT;
  v_order_payment_status TEXT;
  v_audit_action TEXT;
  v_metadata JSONB;
BEGIN
  -- 1. Buscar estado atual e validar IDOR
  SELECT review_status, order_id 
  INTO v_receipt_current_status, v_receipt_order_id
  FROM public.av_payment_receipts
  WHERE id = p_receipt_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'RECEIPT_NOT_FOUND');
  END IF;

  IF v_receipt_order_id != p_order_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'IDOR_VIOLATION');
  END IF;

  IF v_receipt_current_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'RECEIPT_ALREADY_REVIEWED', 'status', v_receipt_current_status);
  END IF;

  -- 2. Buscar estado do pedido
  SELECT order_status, payment_status
  INTO v_order_current_status, v_order_payment_status
  FROM public.av_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  -- 3. Executar Ação
  IF p_action = 'approve' THEN
    -- Aprovar Recibo
    UPDATE public.av_payment_receipts
    SET 
      review_status = 'approved',
      reviewed_at = NOW(),
      reviewed_by = p_admin_id
    WHERE id = p_receipt_id;

    -- Atualizar Pedido
    UPDATE public.av_orders
    SET 
      payment_status = 'payment_confirmed',
      order_status = CASE WHEN order_status = 'received' THEN 'confirmed' ELSE order_status END,
      updated_at = NOW()
    WHERE id = p_order_id;

    v_audit_action := 'PAYMENT_CONFIRMED';
    v_metadata := jsonb_build_object('order_id', p_order_id, 'receipt_id', p_receipt_id);

  ELSIF p_action = 'reject' THEN
    IF p_reason IS NULL OR p_reason = '' THEN
      RETURN jsonb_build_object('success', false, 'code', 'REJECTION_REASON_REQUIRED');
    END IF;

    -- Rejeitar Recibo
    UPDATE public.av_payment_receipts
    SET 
      review_status = 'rejected',
      review_notes = CASE 
        WHEN p_notes IS NOT NULL AND p_notes != '' THEN p_reason || ': ' || p_notes
        ELSE p_reason
      END,
      reviewed_at = NOW(),
      reviewed_by = p_admin_id
    WHERE id = p_receipt_id;

    -- Atualizar Pedido
    UPDATE public.av_orders
    SET 
      payment_status = 'receipt_rejected',
      updated_at = NOW()
    WHERE id = p_order_id;

    v_audit_action := 'PAYMENT_RECEIPT_REJECTED';
    v_metadata := jsonb_build_object(
      'order_id', p_order_id, 
      'receipt_id', p_receipt_id,
      'reason_code', p_reason,
      'reason_text', p_notes
    );

  ELSE
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_ACTION');
  END IF;

  -- 4. Registrar Auditoria
  INSERT INTO public.av_admin_audit_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    correlation_id,
    metadata
  ) VALUES (
    p_admin_id,
    v_audit_action,
    'av_payment_receipts',
    p_receipt_id,
    gen_random_uuid(),
    v_metadata
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.av_admin_review_receipt TO service_role;
