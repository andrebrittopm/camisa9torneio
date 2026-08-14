CREATE TABLE public.av_rate_limit_buckets (
    bucket_key_hash TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    tokens NUMERIC(20,9) NOT NULL,
    last_refill_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bucket_key_hash_format CHECK (bucket_key_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT scope_allowlist CHECK (scope IN ('order:client:burst', 'order:client:sustained', 'order:global')),
    CONSTRAINT tokens_non_negative CHECK (tokens >= 0)
);

CREATE INDEX idx_av_rate_limit_buckets_expires_at ON public.av_rate_limit_buckets(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.av_rate_limit_buckets TO service_role;
REVOKE ALL ON public.av_rate_limit_buckets FROM PUBLIC, anon, authenticated;

ALTER TABLE public.av_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.av_check_rate_limits(
    p_specs JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_spec JSONB;
    v_bucket_hash TEXT;
    v_scope TEXT;
    v_capacity NUMERIC;
    v_refill_rate NUMERIC;
    v_ttl_seconds INTEGER;
    v_current_tokens NUMERIC;
    v_last_refill TIMESTAMPTZ;
    v_elapsed_seconds NUMERIC;
    v_refilled_tokens NUMERIC;
    v_retry_after INTEGER := 0;
    v_allowed BOOLEAN := TRUE;
    v_max_retry INTEGER := 0;
    v_bucket_hashes TEXT[];
    v_results JSONB := '[]'::JSONB;
    v_item RECORD;
BEGIN
    v_now := clock_timestamp();

    IF jsonb_array_length(p_specs) < 1 OR jsonb_array_length(p_specs) > 3 THEN
        RAISE EXCEPTION 'INVALID_SPECS_COUNT';
    END IF;

    SELECT array_agg(hash ORDER BY hash) INTO v_bucket_hashes
    FROM (SELECT (value->>'bucket_key_hash') as hash FROM jsonb_array_elements(p_specs)) t;

    FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::INTEGER;

        IF v_bucket_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'INVALID_HASH'; END IF;
        IF v_scope NOT IN ('order:client:burst', 'order:client:sustained', 'order:global') THEN RAISE EXCEPTION 'INVALID_SCOPE'; END IF;
        IF v_capacity <= 0 OR (v_spec->>'refill_rate_per_second')::NUMERIC <= 0 THEN RAISE EXCEPTION 'INVALID_PARAMS'; END IF;

        INSERT INTO public.av_rate_limit_buckets (bucket_key_hash, scope, tokens, last_refill_at, expires_at)
        VALUES (v_bucket_hash, v_scope, v_capacity, v_now, v_now + (v_ttl_seconds || ' seconds')::INTERVAL)
        ON CONFLICT (bucket_key_hash) DO NOTHING;
    END LOOP;

    PERFORM 1 FROM public.av_rate_limit_buckets 
    WHERE bucket_key_hash = ANY(v_bucket_hashes)
    ORDER BY bucket_key_hash
    FOR UPDATE;

    FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        v_refill_rate := (v_spec->>'refill_rate_per_second')::NUMERIC;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::INTEGER;

        SELECT tokens, last_refill_at INTO v_current_tokens, v_last_refill
        FROM public.av_rate_limit_buckets
        WHERE bucket_key_hash = v_bucket_hash;

        v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_last_refill)));
        v_refilled_tokens := LEAST(v_capacity, v_current_tokens + (v_elapsed_seconds * v_refill_rate));

        IF v_refilled_tokens < 1 THEN
            v_allowed := FALSE;
            v_retry_after := CEIL((1 - v_refilled_tokens) / v_refill_rate);
            v_max_retry := GREATEST(v_max_retry, v_retry_after);
        END IF;

        v_results := v_results || jsonb_build_object(
            'hash', v_bucket_hash,
            'refilled', v_refilled_tokens,
            'ttl', v_ttl_seconds
        );
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_results) LOOP
        IF v_allowed THEN
            UPDATE public.av_rate_limit_buckets
            SET tokens = (v_item.value->>'refilled')::NUMERIC - 1,
                last_refill_at = v_now,
                expires_at = v_now + ((v_item.value->>'ttl') || ' seconds')::INTERVAL,
                updated_at = v_now
            WHERE bucket_key_hash = v_item.value->>'hash';
        ELSE
            UPDATE public.av_rate_limit_buckets
            SET tokens = (v_item.value->>'refilled')::NUMERIC,
                last_refill_at = v_now,
                expires_at = v_now + ((v_item.value->>'ttl') || ' seconds')::INTERVAL,
                updated_at = v_now
            WHERE bucket_key_hash = v_item.value->>'hash';
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'retry_after_seconds', CASE WHEN v_allowed THEN 0 ELSE v_max_retry END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.av_check_rate_limits(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_check_rate_limits(JSONB) TO service_role;

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