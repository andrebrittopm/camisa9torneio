CREATE OR REPLACE FUNCTION public.av_admin_delete_order(
  p_order_id uuid,
  p_admin_id uuid,
  p_expected_order_code text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_order_seq BIGINT;
  v_event_year INTEGER;
  v_real_code TEXT;
  v_is_superadmin BOOLEAN;
BEGIN
  -- 1. Defesa em Profundidade: Verificar Superadmin Ativo
  SELECT
    (role::text = 'SUPERADMIN' AND active IS TRUE)
  INTO v_is_superadmin
  FROM public.av_admin_profiles
  WHERE user_id = p_admin_id;

  IF NOT FOUND OR v_is_superadmin IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'FORBIDDEN'
    );
  END IF;

  -- 2. Lock e Validação do Pedido
  SELECT
    o.order_seq,
    e.event_year
  INTO
    v_order_seq,
    v_event_year
  FROM public.av_orders o
  JOIN public.av_events e
    ON e.id = o.event_id
  WHERE o.id = p_order_id
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_NOT_FOUND'
    );
  END IF;

  -- 3. Validação do Código Público
  v_real_code :=
    'AV-' ||
    v_event_year::text ||
    '-' ||
    LPAD(v_order_seq::text, 4, '0');

  IF p_expected_order_code IS NULL
     OR v_real_code IS DISTINCT FROM TRIM(p_expected_order_code)
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_CODE_MISMATCH'
    );
  END IF;

  -- 4. Validação do Correlation ID
  IF p_correlation_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_REQUEST'
    );
  END IF;

  -- 5. Sanitização de logs antigos (PII Scrubbing)
  UPDATE public.av_admin_audit_logs
  SET metadata = jsonb_build_object(
    'pii_scrubbed', true,
    'original_action', action,
    'display_order_number', v_real_code
  )
  WHERE resource_id = p_order_id::text
    AND action <> 'ORDER_DELETED';

  -- 6. Exclusão Atômica (RLS Cascade via service_role ou direto via pg_temp)
  DELETE FROM public.av_orders
  WHERE id = p_order_id;

  -- 7. Registrar em Auditoria Final
  INSERT INTO public.av_admin_audit_logs (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    correlation_id,
    metadata
  )
  VALUES (
    p_admin_id,
    'ORDER_DELETED',
    'ORDER',
    p_order_id::text,
    p_correlation_id,
    jsonb_build_object(
      'display_order_number', v_real_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', 'ORDER_DELETED'
  );
END;
$function$;

-- Privilégios
REVOKE ALL ON FUNCTION public.av_admin_delete_order(uuid, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.av_admin_delete_order(uuid, uuid, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.av_admin_delete_order(uuid, uuid, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.av_admin_delete_order(uuid, uuid, text, uuid) TO service_role;
