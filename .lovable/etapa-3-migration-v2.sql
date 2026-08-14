-- A. Migration SQL Completa
-- Revisão 2: Adição de Idempotência e Fingerprint
-- Preflight: SELECT count(*) FROM public.av_orders; (Esperado: 0)

-- A escolha por UNIQUE INDEX em vez de CONSTRAINT permite maior flexibilidade 
-- e é a prática recomendada para chaves de idempotência em sistemas distribuídos.

ALTER TABLE public.av_orders 
ADD COLUMN idempotency_key UUID NOT NULL,
ADD COLUMN request_fingerprint TEXT NOT NULL;

CREATE UNIQUE INDEX idx_av_orders_idempotency_key ON public.av_orders (idempotency_key);

-- Índices auxiliares para performance na busca de duplicatas
CREATE INDEX idx_av_orders_fingerprint ON public.av_orders (request_fingerprint);
