CREATE OR REPLACE FUNCTION public.av_increment_outbox_attempts(
    p_order_id UUID,
    p_event_type TEXT,
    p_event_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.av_email_outbox
    SET attempt_count = attempt_count + 1,
        updated_at = NOW()
    WHERE order_id = p_order_id
      AND event_type = p_event_type
      AND event_key = p_event_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.av_increment_outbox_attempts TO service_role;