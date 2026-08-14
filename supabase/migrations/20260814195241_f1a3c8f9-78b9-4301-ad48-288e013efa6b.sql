DO $$
DECLARE
    v_res JSONB;
    v_tokens NUMERIC;
    v_hash TEXT := '0000000000000000000000000000000000000000000000000000000000000001';
BEGIN
    -- DBRL23: p_specs SQL NULL
    BEGIN
        PERFORM public.av_check_rate_limits(NULL);
        RAISE EXCEPTION 'DBRL23 FAILED: Should have raised exception for NULL';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE <> 'AV010' THEN RAISE EXCEPTION 'DBRL23 FAILED: Wrong SQLSTATE %', SQLSTATE; END IF;
    END;

    -- DBRL01: bucket novo capacity-1
    v_res := public.av_check_rate_limits('[{"bucket_key_hash": "0000000000000000000000000000000000000000000000000000000000000001", "scope": "order:client:burst", "capacity": 5, "refill_rate_per_second": 1, "ttl_seconds": 60}]'::jsonb);
    IF NOT (v_res->>'allowed')::BOOLEAN THEN RAISE EXCEPTION 'DBRL01 FAILED: Should be allowed'; END IF;
    
    SELECT tokens INTO v_tokens FROM public.av_rate_limit_buckets WHERE bucket_key_hash = v_hash;
    IF v_tokens <> 4 THEN RAISE EXCEPTION 'DBRL01 FAILED: Tokens should be 4, got %', v_tokens; END IF;

    -- DBRL08: Atomic Decision
    -- ... more tests can be added here ...
    
    -- Cleanup
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash LIKE '000000%';
END;
$$;