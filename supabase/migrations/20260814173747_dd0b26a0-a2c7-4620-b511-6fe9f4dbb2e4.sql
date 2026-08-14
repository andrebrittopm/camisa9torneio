DO $$
DECLARE
    -- Variáveis do Evento 9/2026
    v_event_id UUID := 'ba5036d2-eb2d-4a1a-96f6-8c586eeede10';
    v_model_id UUID := '68b9babb-d4e3-40d3-bb1a-f76dc1a512b7';
    
    -- Chaves e Fingerprints de Teste
    v_idempotency_t01 UUID := gen_random_uuid();
    v_fingerprint_t01 TEXT := 'a123456789012345678901234567890123456789012345678901234567890123'; -- 64 hex
    
    v_idempotency_t02 UUID := gen_random_uuid();
    v_fingerprint_t02 TEXT := 'b123456789012345678901234567890123456789012345678901234567890123';
    
    v_idempotency_t21 UUID := gen_random_uuid();
    v_fingerprint_t21 TEXT := 'c123456789012345678901234567890123456789012345678901234567890123';
    
    v_idempotency_t26 UUID := gen_random_uuid();
    v_fingerprint_t26 TEXT := 'd123456789012345678901234567890123456789012345678901234567890123';
    
    v_idempotency_t27 UUID := gen_random_uuid();
    v_fingerprint_t27 TEXT := 'e123456789012345678901234567890123456789012345678901234567890123';
    
    v_idempotency_t28 UUID := gen_random_uuid();
    v_fingerprint_t28 TEXT := 'f123456789012345678901234567890123456789012345678901234567890123';
    
    v_idempotency_t34 UUID := gen_random_uuid();
    v_fingerprint_t34 TEXT := '1123456789012345678901234567890123456789012345678901234567890123';
    
    -- Variáveis de Retorno
    v_res JSONB;
    v_order_id UUID;
    v_sqlstate TEXT;
BEGIN
    -- T01: Pedido Valido 1 Unidade
    v_res := public.av_create_order(
        v_event_id, 'TESTE RPC 01', '67999999999', 'Nota T01',
        v_idempotency_t01, v_fingerprint_t01,
        jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1))
    );
    IF NOT (v_res->>'success')::boolean OR (v_res->>'is_duplicate')::boolean OR (v_res->'data'->>'total_quantity')::int != 1 THEN
        RAISE EXCEPTION 'FALHA T01: %', v_res;
    END IF;

    -- T02: Pedido Valido 3 Unidades
    v_res := public.av_create_order(
        v_event_id, 'TESTE RPC 02', '67999999999', 'Nota T02',
        v_idempotency_t02, v_fingerprint_t02,
        jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'M', 'quantity', 3))
    );
    IF (v_res->'data'->>'subtotal')::numeric != 105.00 THEN
        RAISE EXCEPTION 'FALHA T02: %', v_res;
    END IF;

    -- T04-T06: Validation
    BEGIN v_res := public.av_create_order(v_event_id, 'T04', '679', '', gen_random_uuid(), v_fingerprint_t01, NULL); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV005' THEN RAISE EXCEPTION 'T04 FAIL: %', v_sqlstate; END IF; END;
    BEGIN v_res := public.av_create_order(v_event_id, 'T05', '679', '', gen_random_uuid(), v_fingerprint_t01, '{}'::jsonb); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV005' THEN RAISE EXCEPTION 'T05 FAIL: %', v_sqlstate; END IF; END;
    BEGIN v_res := public.av_create_order(v_event_id, 'T06', '679', '', gen_random_uuid(), v_fingerprint_t01, '[]'::jsonb); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV005' THEN RAISE EXCEPTION 'T06 FAIL: %', v_sqlstate; END IF; END;

    -- T10-T15: Quantity Validation
    BEGIN v_res := public.av_create_order(v_event_id, 'T10', '679', '', gen_random_uuid(), v_fingerprint_t01, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P'))); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV006' THEN RAISE EXCEPTION 'T10 FAIL: %', v_sqlstate; END IF; END;
    BEGIN v_res := public.av_create_order(v_event_id, 'T11', '679', '', gen_random_uuid(), v_fingerprint_t01, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', '1'))); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV006' THEN RAISE EXCEPTION 'T11 FAIL: %', v_sqlstate; END IF; END;
    BEGIN v_res := public.av_create_order(v_event_id, 'T13', '679', '', gen_random_uuid(), v_fingerprint_t01, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 0))); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV006' THEN RAISE EXCEPTION 'T13 FAIL: %', v_sqlstate; END IF; END;

    -- T20: Size Not Available
    BEGIN v_res := public.av_create_order(v_event_id, 'T20', '679', '', gen_random_uuid(), v_fingerprint_t01, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'TAMANHO_INEXISTENTE', 'quantity', 1))); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV009' THEN RAISE EXCEPTION 'T20 FAIL: %', v_sqlstate; END IF; END;

    -- T21: OUTRO Valido
    v_res := public.av_create_order(v_event_id, 'T21', '679', '', v_idempotency_t21, v_fingerprint_t21, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'OUTRO', 'custom_size', 'G3', 'quantity', 1)));
    IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'FALHA T21: %', v_res; END IF;

    -- T26-T28: Custom Number
    v_res := public.av_create_order(v_event_id, 'T26', '679', '', v_idempotency_t26, v_fingerprint_t26, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1, 'custom_number', '07')));
    v_res := public.av_create_order(v_event_id, 'T27', '679', '', v_idempotency_t27, v_fingerprint_t27, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1, 'custom_number', '00')));
    v_res := public.av_create_order(v_event_id, 'T28', '679', '', v_idempotency_t28, v_fingerprint_t28, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1, 'custom_number', '10A')));

    -- T34-T35: Idempotencia
    v_res := public.av_create_order(v_event_id, 'T34', '679', '', v_idempotency_t34, v_fingerprint_t34, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1)));
    v_order_id := (v_res->'data'->>'id')::uuid;
    v_res := public.av_create_order(v_event_id, 'T34', '679', '', v_idempotency_t34, v_fingerprint_t34, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1)));
    IF NOT (v_res->>'is_duplicate')::boolean OR (v_res->'data'->>'id')::uuid != v_order_id THEN RAISE EXCEPTION 'FALHA T34 RETRY: %', v_res; END IF;
    
    -- T35: Fingerprint diferente com mesma idempotency_key
    BEGIN 
        v_res := public.av_create_order(v_event_id, 'T34', '679', '', v_idempotency_t34, '2123456789012345678901234567890123456789012345678901234567890123', jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1))); 
    EXCEPTION WHEN OTHERS THEN 
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; 
        IF v_sqlstate != 'AV001' THEN RAISE EXCEPTION 'T35 FAIL: %', v_sqlstate; END IF; 
    END;

    -- T39: Atomicidade
    BEGIN v_res := public.av_create_order(v_event_id, 'T39', '679', '', gen_random_uuid(), v_fingerprint_t01, jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1), jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 0))); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV006' THEN RAISE EXCEPTION 'T39 FAIL: %', v_sqlstate; END IF; END;

    -- T41: Fingerprint Invalid Length
    BEGIN v_res := public.av_create_order(v_event_id, 'T41', '679', '', gen_random_uuid(), 'abc', jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1))); EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE; IF v_sqlstate != 'AV005' THEN RAISE EXCEPTION 'T41 FAIL: %', v_sqlstate; END IF; END;

    RAISE EXCEPTION 'TEST_BATT_COMPLETE_FORCING_ROLLBACK';
EXCEPTION 
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0001' AND SQLERRM = 'TEST_BATT_COMPLETE_FORCING_ROLLBACK' THEN
            RAISE NOTICE 'BATERIA CONCLUIDA E DADOS REVERTIDOS.';
        ELSE
            RAISE EXCEPTION 'ERRO BATERIA: % (SQLSTATE %)', SQLERRM, v_sqlstate;
        END IF;
END $$;