BEGIN;

-- 1. PREFLIGHT OBRIGATÓRIO
-- A. Verificar tabela
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'av_orders') THEN
        RAISE EXCEPTION 'ERRO: Tabela public.av_orders não existe.';
    END IF;
END $$;

-- B. Verificar pedidos existentes (SELECT count(*) via ferramenta já confirmou 0, mas faremos no script também)
DO $$
DECLARE
    order_count INTEGER;
BEGIN
    SELECT count(*) INTO order_count FROM public.av_orders;
    IF order_count > 0 THEN
        RAISE EXCEPTION 'ERRO: Existem % pedidos em public.av_orders. Preflight falhou.', order_count;
    END IF;
END $$;

-- C. Verificar colunas (information_schema já confirmou ausência, mas faremos no script para garantir a transação)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'av_orders' AND column_name = 'idempotency_key') THEN
        RAISE EXCEPTION 'ERRO: Coluna idempotency_key já existe.';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'av_orders' AND column_name = 'request_fingerprint') THEN
        RAISE EXCEPTION 'ERRO: Coluna request_fingerprint já existe.';
    END IF;
END $$;

-- 2. ALTERAÇÃO APROVADA
ALTER TABLE public.av_orders
ADD COLUMN idempotency_key UUID NOT NULL,
ADD COLUMN request_fingerprint TEXT NOT NULL;

-- 3. UNIQUE
ALTER TABLE public.av_orders
ADD CONSTRAINT av_orders_idempotency_key_key
UNIQUE (idempotency_key);

-- 4. FINGERPRINT CHECK
ALTER TABLE public.av_orders
ADD CONSTRAINT av_orders_fingerprint_check
CHECK (
  request_fingerprint ~ '^[0-9a-f]{64}$'
);

COMMIT;