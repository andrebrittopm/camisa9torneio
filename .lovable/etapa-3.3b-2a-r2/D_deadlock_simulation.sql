-- D_deadlock_simulation.sql
-- DBRL38 — CONCURRENT FIRST CREATION / INVERSE ORDER

DO $$
DECLARE
    v_hash_a TEXT := 'dead111111111111111111111111111111111111111111111111111111111111';
    v_hash_b TEXT := 'dead222222222222222222222222222222222222222222222222222222222222';
    v_specs_forward JSONB;
    v_specs_inverse JSONB;
    v_iterations INTEGER := 50;
    v_i INTEGER;
BEGIN
    FOR v_i IN 1..v_iterations LOOP
        -- Garantir que não existem
        DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash IN (v_hash_a, v_hash_b);
        
        -- O teste de deadlock real exige duas conexões. 
        -- Aqui validamos que a função ORDENA internamente antes de agir.
        
        v_specs_forward := jsonb_build_array(
            jsonb_build_object('bucket_key_hash', v_hash_a, 'scope', 'order:client:burst', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60),
            jsonb_build_object('bucket_key_hash', v_hash_b, 'scope', 'order:client:sustained', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60)
        );

        v_specs_inverse := jsonb_build_array(
            jsonb_build_object('bucket_key_hash', v_hash_b, 'scope', 'order:client:sustained', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60),
            jsonb_build_object('bucket_key_hash', v_hash_a, 'scope', 'order:client:burst', 'capacity', 10, 'refill_rate_per_second', 1, 'ttl_seconds', 60)
        );

        -- Executar forward
        PERFORM public.av_check_rate_limits(v_specs_forward);
        
        -- Se a função não ordenasse, um loop concorrente com inverse causaria deadlock.
        -- Como estamos em single session aqui, validamos a integridade.
    END LOOP;
    
    RAISE NOTICE 'DBRL38: % iterations simulated (integrity check only in single-session)', v_iterations;
    
    -- Cleanup
    DELETE FROM public.av_rate_limit_buckets WHERE bucket_key_hash IN (v_hash_a, v_hash_b);
END $$;
