-- ETAPA 3.3B-2A-R1 — APLICAÇÃO DE HARDENING

-- 1. Hardening av_check_rate_limits
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
    v_existing_scope TEXT;
    v_elapsed_seconds NUMERIC;
    v_refilled_tokens NUMERIC;
    v_retry_after INTEGER := 0;
    v_allowed BOOLEAN := TRUE;
    v_max_retry INTEGER := 0;
    v_bucket_hashes TEXT[] := '{}';
    v_scopes TEXT[] := '{}';
    v_results JSONB := '[]'::JSONB;
    v_item RECORD;
BEGIN
    v_now := clock_timestamp();

    -- 1. Validação de Tipo e Presença
    IF p_specs IS NULL OR jsonb_typeof(p_specs) <> 'array' THEN
        RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV010', HINT = 'p_specs must be a JSON array';
    END IF;

    -- 2. Validação de Quantidade (1 a 3 specs)
    IF jsonb_array_length(p_specs) < 1 OR jsonb_array_length(p_specs) > 3 THEN
        RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV011', HINT = 'p_specs length must be between 1 and 3';
    END IF;

    -- 3. Loop de Validação e Detecção de Duplicatas
    FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
        -- Verificar campos obrigatórios
        IF NOT (v_spec ? 'bucket_key_hash' AND v_spec ? 'scope' AND v_spec ? 'capacity' AND v_spec ? 'refill_rate_per_second' AND v_spec ? 'ttl_seconds') THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV012', HINT = 'Missing required fields';
        END IF;

        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        
        -- Validar Hash (64 chars, hex, lowercase)
        IF v_bucket_hash IS NULL OR v_bucket_hash !~ '^[0-9a-f]{64}$' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV013', HINT = 'Invalid hash format';
        END IF;

        -- Validar Scope
        IF v_scope IS NULL OR v_scope NOT IN ('order:client:burst', 'order:client:sustained', 'order:global') THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV014', HINT = 'Invalid scope';
        END IF;

        -- Validar Capacity (numérico, finito, > 0, <= 100000)
        IF jsonb_typeof(v_spec->'capacity') <> 'number' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV015', HINT = 'capacity must be a number';
        END IF;
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        IF v_capacity <= 0 OR v_capacity > 100000 OR v_capacity IS NULL THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV015', HINT = 'capacity out of range';
        END IF;

        -- Validar Refill Rate (numérico, finito, > 0, <= 100000)
        IF jsonb_typeof(v_spec->'refill_rate_per_second') <> 'number' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV016', HINT = 'refill_rate must be a number';
        END IF;
        v_refill_rate := (v_spec->>'refill_rate_per_second')::NUMERIC;
        IF v_refill_rate <= 0 OR v_refill_rate > 100000 OR v_refill_rate IS NULL THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV016', HINT = 'refill_rate out of range';
        END IF;

        -- Validar TTL (integer, > 0, <= 604800)
        IF jsonb_typeof(v_spec->'ttl_seconds') <> 'number' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV017', HINT = 'ttl must be a number';
        END IF;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::NUMERIC;
        IF v_ttl_seconds::INTEGER <> v_ttl_seconds OR v_ttl_seconds <= 0 OR v_ttl_seconds > 604800 THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV017', HINT = 'ttl out of range';
        END IF;

        -- Detectar Duplicatas (Hash ou Scope)
        IF v_bucket_hash = ANY(v_bucket_hashes) THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV018', HINT = 'Duplicate hash';
        END IF;
        IF v_scope = ANY(v_scopes) THEN
            RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV019', HINT = 'Duplicate scope';
        END IF;

        v_bucket_hashes := array_append(v_bucket_hashes, v_bucket_hash);
        v_scopes := array_append(v_scopes, v_scope);
    END LOOP;

    -- 4. Garantir existência (UPSERT safely)
    FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::INTEGER;

        INSERT INTO public.av_rate_limit_buckets (bucket_key_hash, scope, tokens, last_refill_at, expires_at)
        VALUES (v_bucket_hash, v_scope, v_capacity, v_now, v_now + (v_ttl_seconds || ' seconds')::INTERVAL)
        ON CONFLICT (bucket_key_hash) DO NOTHING;
    END LOOP;

    -- 5. Lock determinístico
    SELECT array_agg(h ORDER BY h) INTO v_bucket_hashes FROM unnest(v_bucket_hashes) AS h;
    
    PERFORM 1 FROM public.av_rate_limit_buckets 
    WHERE bucket_key_hash = ANY(v_bucket_hashes)
    ORDER BY bucket_key_hash
    FOR UPDATE;

    -- 6. Fase de Avaliação
    FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        v_refill_rate := (v_spec->>'refill_rate_per_second')::NUMERIC;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::INTEGER;

        SELECT tokens, last_refill_at, scope INTO v_current_tokens, v_last_refill, v_existing_scope
        FROM public.av_rate_limit_buckets
        WHERE bucket_key_hash = v_bucket_hash;

        IF v_existing_scope <> v_scope THEN
            RAISE EXCEPTION 'INTEGRITY_ERROR' USING ERRCODE = 'AV020', HINT = 'Hash scope mismatch';
        END IF;

        v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_last_refill)));
        v_refilled_tokens := LEAST(v_capacity, v_current_tokens + (v_elapsed_seconds * v_refill_rate));

        IF v_refilled_tokens < 1 THEN
            v_allowed := FALSE;
            v_retry_after := CEIL((1 - v_refilled_tokens) / v_refill_rate);
            IF v_retry_after < 1 THEN v_retry_after := 1; END IF;
            v_max_retry := GREATEST(v_max_retry, v_retry_after);
        END IF;

        v_results := v_results || jsonb_build_object(
            'hash', v_bucket_hash,
            'refilled', v_refilled_tokens,
            'ttl', v_ttl_seconds
        );
    END LOOP;

    -- 7. Fase de Persistência
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

ALTER FUNCTION public.av_check_rate_limits(JSONB) OWNER TO postgres;

-- 2. Hardening av_cleanup_rate_limit_buckets
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

    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 5000 THEN
        RAISE EXCEPTION 'INVALID_PARAMETER' USING ERRCODE = 'AV030', HINT = 'p_limit out of range (1-5000)';
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

-- 3. Reforço de Privilégios (ACLs)
REVOKE ALL ON TABLE public.av_rate_limit_buckets FROM PUBLIC, anon, authenticated;
-- DML direto desativado para service_role (usar RPC)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.av_rate_limit_buckets FROM service_role;
GRANT ALL ON TABLE public.av_rate_limit_buckets TO postgres;

REVOKE ALL ON FUNCTION public.av_check_rate_limits(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_check_rate_limits(JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_cleanup_rate_limit_buckets(INTEGER) TO service_role;