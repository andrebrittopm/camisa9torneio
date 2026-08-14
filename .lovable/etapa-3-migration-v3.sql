-- A. Migration SQL Completa
-- Revisão Final Corrigida (Etapa 3.1)
-- Preflight: SELECT count(*) FROM public.av_orders; (Esperado: 0)

DO $$ 
BEGIN
    -- Verificação de Preflight
    IF (SELECT count(*) FROM public.av_orders) > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT_FAILED: av_orders must be empty before adding NOT NULL columns.';
    END IF;

    -- Adição das colunas de idempotência
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='av_orders' AND column_name='idempotency_key') THEN
        ALTER TABLE public.av_orders 
        ADD COLUMN idempotency_key UUID NOT NULL,
        ADD COLUMN request_fingerprint TEXT NOT NULL;

        -- Proteção UNIQUE para idempotency_key
        -- A UNIQUE constraint é a proteção definitiva do PostgreSQL contra race conditions.
        -- Em caso de INSERT simultâneo com a mesma chave, o segundo falha imediatamente no índice.
        ALTER TABLE public.av_orders ADD CONSTRAINT av_orders_idempotency_key_key UNIQUE (idempotency_key);

        -- CHECK constraint para o fingerprint SHA-256
        ALTER TABLE public.av_orders ADD CONSTRAINT av_orders_fingerprint_check 
        CHECK (request_fingerprint ~ '^[0-9a-f]{64}$');
    END IF;
END $$;
