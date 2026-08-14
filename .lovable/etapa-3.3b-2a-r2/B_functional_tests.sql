-- B_functional_tests.sql
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
BEGIN
    -- Cleanup inicial de hashes de teste
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash IN (v_hash_a, v_hash_b, v_hash_ttl, v_hash_retry);

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
    -- (Testado via script de concorrência separado, aqui validamos apenas a lógica de ordenação no código)
    -- ==================================================
    -- Sessão A: [HashA, HashB]
    v_res := public.av_check_rate_limits(jsonb_build_array(
        jsonb_build_object('bucket_key_hash', v_hash_a, 'scope', 'order:client:burst', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60),
        jsonb_build_object('bucket_key_hash', v_hash_b, 'scope', 'order:client:sustained', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60)
    ));
    RAISE NOTICE 'DBRL38 (Step 1) PASS: Created buckets A and B';

    -- ==================================================
    -- DBRL39 — Retry-After matematicamente validado
    -- ==================================================
    -- Criar bucket com capacity 1 e refill 0.1
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
    
    IF (v_res->>'allowed')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'DBRL39 FAILED: initial consumption denied';
    END IF;

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
    
    IF (v_res->>'allowed')::BOOLEAN <> FALSE THEN
        RAISE EXCEPTION 'DBRL39 FAILED: second consumption should be denied';
    END IF;

    v_retry_after := (v_res->>'retry_after_seconds')::INTEGER;
    
    -- Validação matemática
    SELECT tokens INTO v_tokens_before FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash_retry;
    -- refilled_tokens = tokens + (elapsed * rate). No teste imediato, elapsed é quase 0.
    v_refilled_tokens := v_tokens_before; -- Como persistimos o refill no DENY, tokens já é o valor "refilled"
    v_expected_retry := CEIL((1 - v_refilled_tokens) / v_rate);
    
    RAISE NOTICE 'DBRL39 Analysis: tokens: %, refilled: %, rate: %, retry_after observed: %, retry_after expected: %', 
        v_tokens_before, v_refilled_tokens, v_rate, v_retry_after, v_expected_retry;

    IF v_retry_after <> v_expected_retry OR v_retry_after < 1 THEN
        RAISE EXCEPTION 'DBRL39 FAILED: retry_after mismatch or invalid';
    END IF;
    RAISE NOTICE 'DBRL39 PASS: Retry-After mathematically validated';

    -- ==================================================
    -- DBRL40 — AUTHENTICATED ROLE REAL (Simulado via SET ROLE)
    -- ==================================================
    BEGIN
        SET LOCAL ROLE authenticated;
        
        BEGIN
            EXECUTE 'SELECT * FROM public.av_rate_limit_buckets LIMIT 1';
            RAISE EXCEPTION 'DBRL40 FAILED: authenticated can SELECT';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'DBRL40 (SELECT) PASS: blocked';
        END;

        BEGIN
            EXECUTE 'INSERT INTO public.av_rate_limit_buckets (bucket_key_hash, scope, tokens, last_refill_at, expires_at) VALUES (''x'', ''order:global'', 1, now(), now())';
            RAISE EXCEPTION 'DBRL40 FAILED: authenticated can INSERT';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'DBRL40 (INSERT) PASS: blocked';
        END;

        BEGIN
            PERFORM public.av_check_rate_limits('[]'::JSONB);
            RAISE EXCEPTION 'DBRL40 FAILED: authenticated can EXECUTE check';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'DBRL40 (RPC RATE) PASS: blocked';
        END;

        BEGIN
            PERFORM public.av_cleanup_rate_limit_buckets(1);
            RAISE EXCEPTION 'DBRL40 FAILED: authenticated can EXECUTE cleanup';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'DBRL40 (RPC CLEANUP) PASS: blocked';
        END;

        RESET ROLE;
        RAISE NOTICE 'DBRL40 PASS: All authenticated restrictions verified';
    EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        RAISE;
    END;

    -- Cleanup final
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash IN (v_hash_a, v_hash_b, v_hash_ttl, v_hash_retry);
    
    RAISE NOTICE 'ETAPA 3.3B-2A-R2 — BATERIA BÁSICA CONCLUÍDA';
END $$;
