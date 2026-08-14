/**
 * ETAPA 4.3B — HARDENING DA TABELA av_payment_receipts
 */

-- 1. Adicionar colunas de integridade e idempotência se não existirem
ALTER TABLE public.av_payment_receipts 
ADD COLUMN IF NOT EXISTS submission_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS file_sha256 TEXT;

-- 2. Constraints de validação
ALTER TABLE public.av_payment_receipts
ALTER COLUMN submission_id SET NOT NULL,
ALTER COLUMN file_sha256 SET NOT NULL,
ADD CONSTRAINT check_sha256_format CHECK (file_sha256 ~ '^[0-9a-f]{64}$');

-- 3. Limpeza de colunas desnecessárias (se houver PII)
ALTER TABLE public.av_payment_receipts DROP COLUMN IF EXISTS original_file_name;

-- 4. Garantir RLS fechado
ALTER TABLE public.av_payment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.av_payment_receipts FROM anon, authenticated;
GRANT ALL ON public.av_payment_receipts TO service_role;
