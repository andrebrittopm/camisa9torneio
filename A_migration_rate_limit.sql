-- A_migration_rate_limit.sql
-- ETAPA 3.3B-2A — MIGRATION DE INFRAESTRUTURA RATE LIMITING (TOKEN BUCKET)

-- 1. Tabela de Buckets
CREATE TABLE public.av_rate_limit_buckets (
    bucket_key_hash TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    tokens NUMERIC(20,9) NOT NULL,
    last_refill_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bucket_key_hash_format CHECK (bucket_key_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT scope_allowlist CHECK (scope IN ('order:client:burst', 'order:client:sustained', 'order:global')),
    CONSTRAINT tokens_non_negative CHECK (tokens >= 0)
);

-- 2. Índice de expiração para cleanup
CREATE INDEX idx_av_rate_limit_buckets_expires_at ON public.av_rate_limit_buckets(expires_at);

-- 3. Grants Iniciais
GRANT SELECT, INSERT, UPDATE, DELETE ON public.av_rate_limit_buckets TO service_role;
REVOKE ALL ON public.av_rate_limit_buckets FROM PUBLIC, anon, authenticated;

-- 4. RLS
ALTER TABLE public.av_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy para anon/authenticated. service_role ignora RLS.

-- A função será criada em B_function_rate_limit.sql e C_function_cleanup.sql
