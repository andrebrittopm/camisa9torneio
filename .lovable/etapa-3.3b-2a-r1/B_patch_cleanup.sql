-- B_patch_cleanup.sql
-- ETAPA 3.3B-2A-R1 — HARDENING DA FUNÇÃO DE CLEANUP

CREATE OR REPLACE FUNCTION public.av_cleanup_rate_limit_buckets(
    p_limit INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    v_now := clock_timestamp();

    -- Validação do p_limit
    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 5000 THEN
        RAISE EXCEPTION 'INVALID_PARAMETER: p_limit must be between 1 and 5000' USING ERRCODE = 'AV030';
    END IF;

    WITH to_delete AS (
        SELECT bucket_key_hash 
        FROM public.av_rate_limit_buckets
        WHERE expires_at < v_now
        ORDER BY expires_at ASC, bucket_key_hash ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.av_rate_limit_buckets
    WHERE bucket_key_hash IN (SELECT bucket_key_hash FROM to_delete);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

ALTER FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) TO service_role;
