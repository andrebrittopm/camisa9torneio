ALTER TABLE public.av_rate_limit_buckets DROP CONSTRAINT scope_allowlist;
ALTER TABLE public.av_rate_limit_buckets ADD CONSTRAINT scope_allowlist CHECK (scope = ANY (ARRAY['order:client:burst'::text, 'order:client:sustained'::text, 'order:global'::text, 'admin-login:account'::text, 'admin-login:global'::text]));

DO $do$
DECLARE
  v_src text;
  v_new text;
BEGIN
  SELECT prosrc INTO v_src FROM pg_proc WHERE proname = 'av_check_rate_limits' AND pronamespace = 'public'::regnamespace;
  v_new := replace(
    v_src,
    $old$v_scope NOT IN ('order:client:burst', 'order:client:sustained', 'order:global')$old$,
    $new$v_scope NOT IN ('order:client:burst', 'order:client:sustained', 'order:global', 'admin-login:account', 'admin-login:global')$new$
  );
  IF v_new = v_src THEN
    RAISE EXCEPTION 'scope allowlist pattern not found in av_check_rate_limits';
  END IF;
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.av_check_rate_limits(p_specs jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = %L AS $f$%s$f$',
    '', v_new
  );
END
$do$;

REVOKE ALL ON FUNCTION public.av_check_rate_limits(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_check_rate_limits(jsonb) TO service_role;