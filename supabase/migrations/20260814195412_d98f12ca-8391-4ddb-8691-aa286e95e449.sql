DO $$
DECLARE
    v_res JSONB;
    v_tokens NUMERIC;
    v_hash1 TEXT := '0000000000000000000000000000000000000000000000000000000000000001';
    v_hash2 TEXT := '0000000000000000000000000000000000000000000000000000000000000002';
    v_hash_sustained TEXT := '0000000000000000000000000000000000000000000000000000000000000004';
BEGIN
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash LIKE '000000%';

    -- DBRL01: bucket novo capacity-1
    v_res := public.av_check_rate_limits(jsonb_build_array(jsonb_build_object('bucket_key_hash', v_hash1, 'scope', 'order:client:burst', 'capacity', 5, 'refill_rate_per_second', 0.0001, 'ttl_seconds', 60)));
    SELECT tokens INTO v_tokens FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash1;
    IF v_tokens < 3.9 OR v_tokens > 4.1 THEN RAISE EXCEPTION 'DBRL01 tokens mismatch: %', v_tokens; END IF;

    -- DBRL02: Consumo até zero (ou quase zero dependendo do refill)
    PERFORM public.av_check_rate_limits(jsonb_build_array(jsonb_build_object('bucket_key_hash', v_hash1, 'scope', 'order:client:burst', 'capacity', 5, 'refill_rate_per_second', 0.0001, 'ttl_seconds', 60))) FROM generate_series(1, 4);
    SELECT tokens INTO v_tokens FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash1;
    IF v_tokens > 0.1 THEN RAISE EXCEPTION 'DBRL02 tokens mismatch: %', v_tokens; END IF;

    -- DBRL08: Burst ALLOW, Sustained BLOCK -> BURST NÃO consome
    INSERT INTO public.av_rate_limit_buckets (bucket_key_hash, scope, tokens, last_refill_at, expires_at) VALUES (v_hash_sustained, 'order:client:sustained', 0, now(), now() + interval '1h');
    v_res := public.av_check_rate_limits(jsonb_build_array(
        jsonb_build_object('bucket_key_hash', v_hash2, 'scope', 'order:client:burst', 'capacity', 5, 'refill_rate_per_second', 0.0001, 'ttl_seconds', 60),
        jsonb_build_object('bucket_key_hash', v_hash_sustained, 'scope', 'order:client:sustained', 'capacity', 5, 'refill_rate_per_second', 0.0001, 'ttl_seconds', 60)
    ));
    IF (v_res->>'allowed')::BOOLEAN THEN RAISE EXCEPTION 'DBRL08 failed: should block'; END IF;
    SELECT tokens INTO v_tokens FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash2;
    IF v_tokens < 4.9 THEN RAISE EXCEPTION 'DBRL08 tokens burst consumed in error: %', v_tokens; END IF;

    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash LIKE '000000%';
END;
$$;