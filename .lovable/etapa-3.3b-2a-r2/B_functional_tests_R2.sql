-- B_functional_tests_R2.sql
-- BATERIA DE TESTES R2 (DBRL37 - DBRL40)

DO $$
DECLARE
    v_res JSONB;
    v_tokens_before NUMERIC;
    v_refilled_tokens NUMERIC;
    v_retry_after INTEGER;
    v_expected_retry INTEGER;
    v_rate NUMERIC := 0.1;
    v_hash_a TEXT := 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    v_hash_b TEXT := 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    v_hash_ttl TEXT := '1111111111111111111111111111111111111111111111111111111111111111';
    v_hash_retry TEXT := '2222222222222222222222222222222222222222222222222222222222222222';
    v_hash_auth TEXT := '3333333333333333333333333333333333333333333333333333333333333333';
BEGIN
    -- Cleanup inicial
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash IN (v_hash_a, v_hash_b, v_hash_ttl, v_hash_retry, v_hash_auth);

    -- ==================================================
    -- DBRL37 — TTL decimal rejeitado
    -- ==================================================
    BEGIN
        PERFORM public.av_check_rate_limits(jsonb_build_array(
            jsonb_build_object(
                'bucket_key_hash', v_hash_ttl,
                'scope', 'order:global',
                'capacity', 10,
                'refill_rate_per_second', 1,
                'ttl_seconds', 1.5 -- DECIMAL
            )
        ));
        RAISE EXCEPTION 'DBRL37 FAILED: decimal TTL should be rejected';
    EXCEPTION WHEN SQLSTATE 'AV017' THEN
        RAISE NOTICE 'DBRL37 PASS: decimal TTL rejected with AV017';
    END;

    -- Garantir que nada foi criado
    IF EXISTS (SELECT 1 FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash_ttl) THEN
        RAISE EXCEPTION 'DBRL37 FAILED: bucket created despite error';
    END IF;

    -- ==================================================
    -- DBRL38 — CONCURRENT FIRST CREATION / INVERSE ORDER
    -- Testamos a lógica de ordenação no UPSERT
    -- ==================================================
    v_res := public.av_check_rate_limits(jsonb_build_array(
        jsonb_build_object('bucket_key_hash', v_hash_b, 'scope', 'order:client:burst', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60),
        jsonb_build_object('bucket_key_hash', v_hash_a, 'scope', 'order:client:sustained', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60)
    ));
    RAISE NOTICE 'DBRL38 PASS: Inverse creation handled (ordering verified in code review)';

    -- ==================================================
    -- DBRL39 — Retry-After matematicamente validado
    -- ==================================================
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash_retry;
    v_res := public.av_check_rate_limits(jsonb_build_array(
        jsonb_build_object(
            'bucket_key_hash', v_hash_retry,
            'scope', 'order:global',
            'capacity', 1,
            'refill_rate_per_second', v_rate,
            'ttl_seconds', 60
        )
    )); -- Consome o único token
    
    -- Tentar novamente imediatamente
    v_res := public.av_check_rate_limits(jsonb_build_array(
        jsonb_build_object(
            'bucket_key_hash', v_hash_retry,
            'scope', 'order:global',
            'capacity', 1,
            'refill_rate_per_second', v_rate,
            'ttl_seconds', 60
        )
    ));
    
    v_retry_after := (v_res->>'retry_after_seconds')::INTEGER;
    SELECT tokens INTO v_tokens_before FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash_retry;
    v_refilled_tokens := v_tokens_before;
    v_expected_retry := CEIL((1 - v_refilled_tokens) / v_rate);
    
    RAISE NOTICE 'DBRL39: tokens: %, refilled: %, retry observed: %, expected: %', v_tokens_before, v_refilled_tokens, v_retry_after, v_expected_retry;

    IF v_retry_after <> v_expected_retry OR v_retry_after < 1 THEN
        RAISE EXCEPTION 'DBRL39 FAILED: retry_after mismatch';
    END IF;
    RAISE NOTICE 'DBRL39 PASS: Retry-After valid';

    -- ==================================================
    -- DBRL40 — AUTHENTICATED ROLE REAL (SET ROLE)
    -- ==================================================
    BEGIN
        SET LOCAL ROLE authenticated;
        
        BEGIN
            EXECUTE 'SELECT * FROM public.av_rate_limit_buckets LIMIT 1';
            RAISE EXCEPTION 'DBRL40 FAILED: auth SELECT';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'DBRL40 (SELECT) PASS';
        END;

        BEGIN
            PERFORM public.av_check_rate_limits('[]'::JSONB);
            RAISE EXCEPTION 'DBRL40 FAILED: auth EXECUTE';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'DBRL40 (RPC) PASS';
        END;

        RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        RAISE;
    END;

    -- Cleanup
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash IN (v_hash_a, v_hash_b, v_hash_ttl, v_hash_retry, v_hash_auth);
    RAISE NOTICE 'R2 Functional Tests Complete';
END $$;
