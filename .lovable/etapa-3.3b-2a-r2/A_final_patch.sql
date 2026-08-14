-- A_final_patch.sql
-- ETAPA 3.3B-2A-R2 — CORREÇÕES FINAIS DO TOKEN BUCKET POSTGRES

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
    v_ttl_numeric NUMERIC; -- Adicionado em R2
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
        RAISE EXCEPTION 'INVALID_PARAMETER: p_specs must be a non-null JSONB array' USING ERRCODE = 'AV010';
    END IF;

    -- 2. Validação de Quantidade (1 a 3 specs)
    IF jsonb_array_length(p_specs) < 1 OR jsonb_array_length(p_specs) > 3 THEN
        RAISE EXCEPTION 'INVALID_PARAMETER: p_specs length must be between 1 and 3' USING ERRCODE = 'AV011';
    END IF;

    -- 3. Loop de Validação e Detecção de Duplicatas
    FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
        -- Verificar campos obrigatórios
        IF NOT (v_spec ? 'bucket_key_hash' AND v_spec ? 'scope' AND v_spec ? 'capacity' AND v_spec ? 'refill_rate_per_second' AND v_spec ? 'ttl_seconds') THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: Missing required fields in spec' USING ERRCODE = 'AV012';
        END IF;

        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        
        -- Validar Hash (64 chars, hex, lowercase)
        IF v_bucket_hash IS NULL OR v_bucket_hash !~ '^[0-9a-f]{64}$' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: Invalid bucket_key_hash format' USING ERRCODE = 'AV013';
        END IF;

        -- Validar Scope
        IF v_scope IS NULL OR v_scope NOT IN ('order:client:burst', 'order:client:sustained', 'order:global') THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: Invalid scope' USING ERRCODE = 'AV014';
        END IF;

        -- Validar Capacity (numérico, finito, > 0, <= 100000)
        IF jsonb_typeof(v_spec->'capacity') <> 'number' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: capacity must be a number' USING ERRCODE = 'AV015';
        END IF;
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        IF v_capacity <= 0 OR v_capacity > 100000 OR v_capacity IS NULL THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: capacity out of range (0, 100000]' USING ERRCODE = 'AV015';
        END IF;

        -- Validar Refill Rate (numérico, finito, > 0, <= 100000)
        IF jsonb_typeof(v_spec->'refill_rate_per_second') <> 'number' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: refill_rate_per_second must be a number' USING ERRCODE = 'AV016';
        END IF;
        v_refill_rate := (v_spec->>'refill_rate_per_second')::NUMERIC;
        IF v_refill_rate <= 0 OR v_refill_rate > 100000 OR v_refill_rate IS NULL THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: refill_rate_per_second out of range (0, 100000]' USING ERRCODE = 'AV016';
        END IF;

        -- Validar TTL (R2: Validar ANTES do cast para INTEGER)
        IF jsonb_typeof(v_spec->'ttl_seconds') <> 'number' THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: ttl_seconds must be a number' USING ERRCODE = 'AV017';
        END IF;
        
        v_ttl_numeric := (v_spec->>'ttl_seconds')::NUMERIC;
        
        IF v_ttl_numeric <= 0 OR v_ttl_numeric > 604800 OR trunc(v_ttl_numeric) <> v_ttl_numeric THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: ttl_seconds must be an integer between 1 and 604800' USING ERRCODE = 'AV017';
        END IF;
        
        v_ttl_seconds := v_ttl_numeric::INTEGER;

        -- Detectar Duplicatas (Hash ou Scope)
        IF v_bucket_hash = ANY(v_bucket_hashes) THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: Duplicate bucket_key_hash in request' USING ERRCODE = 'AV018';
        END IF;
        IF v_scope = ANY(v_scopes) THEN
            RAISE EXCEPTION 'INVALID_PARAMETER: Duplicate scope in request' USING ERRCODE = 'AV019';
        END IF;

        v_bucket_hashes := array_append(v_bucket_hashes, v_bucket_hash);
        v_scopes := array_append(v_scopes, v_scope);
    END LOOP;

    -- 4. Garantir existência (UPSERT safely) - R2: Ordenar criação por bucket_key_hash
    FOR v_spec IN 
        SELECT value 
        FROM jsonb_array_elements(p_specs) 
        ORDER BY value->>'bucket_key_hash' ASC 
    LOOP
        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::INTEGER;

        INSERT INTO public.av_rate_limit_buckets (bucket_key_hash, scope, tokens, last_refill_at, expires_at)
        VALUES (v_bucket_hash, v_scope, v_capacity, v_now, v_now + (v_ttl_seconds || ' seconds')::INTERVAL)
        ON CONFLICT (bucket_key_hash) DO NOTHING;
    END LOOP;

    -- 5. Lock determinístico
    -- Re-ordenar hashes para garantir ordem consistente em todas as transações
    SELECT array_agg(h ORDER BY h) INTO v_bucket_hashes FROM unnest(v_bucket_hashes) AS h;
    
    PERFORM 1 FROM public.av_rate_limit_buckets 
    WHERE bucket_key_hash = ANY(v_bucket_hashes)
    ORDER BY bucket_key_hash ASC
    FOR UPDATE;

    -- 6. Fase de Avaliação e Verificação de Integridade
    -- R2: Processar em ordem determinística para manter v_results previsível se necessário
    FOR v_spec IN 
        SELECT value 
        FROM jsonb_array_elements(p_specs) 
        ORDER BY value->>'bucket_key_hash' ASC 
    LOOP
        v_bucket_hash := v_spec->>'bucket_key_hash';
        v_scope := v_spec->>'scope';
        v_capacity := (v_spec->>'capacity')::NUMERIC;
        v_refill_rate := (v_spec->>'refill_rate_per_second')::NUMERIC;
        v_ttl_seconds := (v_spec->>'ttl_seconds')::INTEGER;

        SELECT tokens, last_refill_at, scope INTO v_current_tokens, v_last_refill, v_existing_scope
        FROM public.av_rate_limit_buckets
        WHERE bucket_key_hash = v_bucket_hash;

        -- Verificar se o scope diverge
        IF v_existing_scope <> v_scope THEN
            RAISE EXCEPTION 'INTEGRITY_ERROR: Hash % already assigned to scope %', v_bucket_hash, v_existing_scope USING ERRCODE = 'AV020';
        END IF;

        v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_last_refill)));
        v_refilled_tokens := LEAST(v_capacity, v_current_tokens + (v_elapsed_seconds * v_refill_rate));

        IF v_refilled_tokens < 1 THEN
            v_allowed := FALSE;
            -- Retry-After: ceil((1 - refilled_tokens) / rate)
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
            -- ALLOW: Consumir 1 token
            UPDATE public.av_rate_limit_buckets
            SET tokens = (v_item.value->>'refilled')::NUMERIC - 1,
                last_refill_at = v_now,
                expires_at = v_now + ((v_item.value->>'ttl') || ' seconds')::INTERVAL,
                updated_at = v_now
            WHERE bucket_key_hash = v_item.value->>'hash';
        ELSE
            -- DENY: Apenas persistir o refill
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
REVOKE ALL ON FUNCTION public.av_check_rate_limits(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.av_check_rate_limits(JSONB) TO service_role;

-- Manter Cleanup Hardened (inalterado em R2, mas incluído para completude conforme solicitado no ponto 7)
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
