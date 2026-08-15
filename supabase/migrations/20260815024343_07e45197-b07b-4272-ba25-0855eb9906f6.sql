-- 1. Corrigir a Primary Key para ser composta (scope, bucket_key_hash)
-- Primeiro removemos a PK atual (que é apenas bucket_key_hash)
ALTER TABLE public.av_rate_limit_buckets DROP CONSTRAINT IF EXISTS av_rate_limit_buckets_pkey;
-- Adicionamos a nova PK composta
ALTER TABLE public.av_rate_limit_buckets ADD PRIMARY KEY (scope, bucket_key_hash);

-- 2. Atualizar a função de verificação para garantir que usa a PK correta no ON CONFLICT
CREATE OR REPLACE FUNCTION public.av_check_rate_limits(p_specs JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_check JSONB;
    v_scope TEXT;
    v_key_hash TEXT;
    v_capacity INT;
    v_refill_rate FLOAT;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_result JSONB := '[]'::JSONB;
    v_allowed BOOLEAN := TRUE;
    v_wait_time INT := 0;
    v_current_tokens FLOAT;
    v_last_refill TIMESTAMPTZ;
    v_new_tokens FLOAT;
    v_whitelist TEXT[] := ARRAY[
        'order:create', 
        'catalog:view', 
        'payment:info', 
        'payment:receipt', 
        'order:view', 
        'admin-login:account', 
        'admin-login:global',
        'admin-auth:account',
        'admin-auth:global',
        'order:client:burst'
    ];
BEGIN
    FOR v_check IN SELECT * FROM jsonb_array_elements(p_specs)
    LOOP
        v_scope := v_check->>'scope';
        v_key_hash := v_check->>'bucket_key_hash';
        v_capacity := (v_check->>'capacity')::INT;
        v_refill_rate := (v_check->>'refill_rate')::FLOAT;

        IF NOT (v_scope = ANY(v_whitelist)) THEN
            v_result := v_result || jsonb_build_object(
                'scope', v_scope,
                'allowed', false,
                'error', 'AV014'
            );
            v_allowed := false;
            CONTINUE;
        END IF;

        IF v_capacity > 1000 THEN v_capacity := 1000; END IF;

        -- O ON CONFLICT agora casa com a Primary Key (scope, bucket_key_hash)
        INSERT INTO public.av_rate_limit_buckets (scope, bucket_key_hash, tokens, last_refill_at)
        VALUES (v_scope, v_key_hash, v_capacity, v_now)
        ON CONFLICT (scope, bucket_key_hash) DO UPDATE
        SET updated_at = v_now -- Update inofensivo para forçar o RETURNING
        RETURNING tokens, last_refill_at INTO v_current_tokens, v_last_refill;

        SELECT tokens, last_refill_at INTO v_current_tokens, v_last_refill
        FROM public.av_rate_limit_buckets
        WHERE scope = v_scope AND bucket_key_hash = v_key_hash
        FOR UPDATE;

        v_new_tokens := LEAST(v_capacity::FLOAT, v_current_tokens + (v_refill_rate * EXTRACT(EPOCH FROM (v_now - v_last_refill))));

        IF v_new_tokens >= 1 THEN
            UPDATE public.av_rate_limit_buckets
            SET tokens = v_new_tokens - 1,
                last_refill_at = v_now,
                updated_at = v_now
            WHERE scope = v_scope AND bucket_key_hash = v_key_hash;

            v_result := v_result || jsonb_build_object(
                'scope', v_scope,
                'allowed', true,
                'tokens_left', floor(v_new_tokens - 1)
            );
        ELSE
            v_wait_time := ceil((1 - v_new_tokens) / v_refill_rate);
            v_result := v_result || jsonb_build_object(
                'scope', v_scope,
                'allowed', false,
                'wait_time', v_wait_time
            );
            v_allowed := false;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'results', v_result
    );
END;
$$;
