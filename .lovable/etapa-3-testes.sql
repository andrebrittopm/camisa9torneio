-- TESTES DE INTEGRIDADE E SEGURANÇA (ETAPA 3.1)
-- Todos os testes mutáveis devem ser rodados em transação com ROLLBACK.

BEGIN;

-- 1. SETUP: Variáveis para os testes
DO $$
DECLARE
    v_event_id UUID;
    v_model_id UUID;
    v_idempotency_key UUID := gen_random_uuid();
    v_fingerprint TEXT := 'a' || repeat('0', 63); -- Mock SHA-256
    v_res JSONB;
BEGIN
    -- Pegar dados reais do seed
    SELECT id INTO v_event_id FROM public.av_events LIMIT 1;
    SELECT id INTO v_model_id FROM public.av_shirt_models WHERE event_id = v_event_id LIMIT 1;

    -- T1: Items ausente
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test', '123', NULL, v_idempotency_key, v_fingerprint, NULL);
        RAISE EXCEPTION 'T1 falhou: deveria rejeitar items NULL';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV005' THEN RAISE; END IF;
    END;

    -- T2: Items vazio []
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test', '123', NULL, v_idempotency_key, v_fingerprint, '[]'::jsonb);
        RAISE EXCEPTION 'T2 falhou: deveria rejeitar items vazio';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV005' THEN RAISE; END IF;
    END;

    -- T3: Quantity string "1"
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test', '123', NULL, v_idempotency_key, v_fingerprint, 
            jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', '1')));
        RAISE EXCEPTION 'T3 falhou: deveria rejeitar quantity string';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV006' THEN RAISE; END IF;
    END;

    -- T4: Quantity decimal 1.5
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test', '123', NULL, v_idempotency_key, v_fingerprint, 
            jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1.5)));
        RAISE EXCEPTION 'T4 falhou: deveria rejeitar quantity decimal';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV006' THEN RAISE; END IF;
    END;

    -- T5: Quantity 0
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test', '123', NULL, v_idempotency_key, v_fingerprint, 
            jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 0)));
        RAISE EXCEPTION 'T5 falhou: deveria rejeitar quantity 0';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV006' THEN RAISE; END IF;
    END;

    -- T6: Custom size indevido (tamanho padrão com custom_size preenchido)
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test', '123', NULL, v_idempotency_key, v_fingerprint, 
            jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1, 'custom_size', 'G3')));
        RAISE EXCEPTION 'T6 falhou: deveria rejeitar custom_size em tamanho padrão';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV005' THEN RAISE; END IF;
    END;

    -- T7: Sucesso e Retry (Mesmo Fingerprint)
    v_res := public.av_create_order(v_event_id, 'Test User', '123', NULL, v_idempotency_key, v_fingerprint, 
        jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1)));
    
    IF (v_res -> 'data' ->> 'is_duplicate')::BOOLEAN = true THEN RAISE EXCEPTION 'T7 falhou: primeiro insert não deve ser duplicate'; END IF;

    v_res := public.av_create_order(v_event_id, 'Test User', '123', NULL, v_idempotency_key, v_fingerprint, 
        jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1)));

    IF (v_res -> 'data' ->> 'is_duplicate')::BOOLEAN = false THEN RAISE EXCEPTION 'T7 falhou: retry deve ser duplicate'; END IF;

    -- T8: Retry (Fingerprint Diferente -> AV001)
    BEGIN
        PERFORM public.av_create_order(v_event_id, 'Test User', '123', NULL, v_idempotency_key, 'b' || repeat('0', 63), 
            jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1)));
        RAISE EXCEPTION 'T8 falhou: deveria rejeitar fingerprint diferente com mesma chave';
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE != 'AV001' THEN RAISE; END IF;
    END;

    -- T9: Retry após fechamento do evento (deve continuar funcionando)
    UPDATE public.av_events SET orders_open = false WHERE id = v_event_id;
    
    v_res := public.av_create_order(v_event_id, 'Test User', '123', NULL, v_idempotency_key, v_fingerprint, 
        jsonb_build_array(jsonb_build_object('shirt_model_id', v_model_id, 'size_option', 'P', 'quantity', 1)));
    
    IF (v_res -> 'data' ->> 'is_duplicate')::BOOLEAN = false THEN RAISE EXCEPTION 'T9 falhou: retry deve funcionar mesmo com orders_open=false'; END IF;

    RAISE NOTICE 'TODOS OS TESTES SQL PASSARAM COM SUCESSO.';
END $$;

ROLLBACK;
