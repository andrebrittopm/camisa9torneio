-- C_function_cleanup.sql
-- ETAPA 3.3B-2A — FUNÇÃO DE CLEANUP OPORTUNÍSTICO/CONTROLADO

CREATE OR REPLACE FUNCTION public.av_cleanup_rate_limit_buckets(
    p_limit INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH to_delete AS (
        SELECT bucket_key_hash 
        FROM public.av_rate_limit_buckets
        WHERE expires_at < clock_timestamp()
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.av_rate_limit_buckets
    WHERE bucket_key_hash IN (SELECT bucket_key_hash FROM to_delete);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) TO service_role;
