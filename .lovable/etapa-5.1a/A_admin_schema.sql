-- ETAPA 5.1A — SCHEMA ADMINISTRATIVO

-- 1. Perfil Administrativo
CREATE TABLE public.av_admin_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT av_admin_profiles_role_check CHECK (role IN ('SUPERADMIN', 'ADMIN'))
);

-- Revogar acesso direto (FAIL-CLOSED)
REVOKE ALL ON public.av_admin_profiles FROM anon, authenticated;

-- RLS
ALTER TABLE public.av_admin_profiles ENABLE ROW LEVEL SECURITY;

-- Grants para service_role (Admin Backend)
GRANT ALL ON public.av_admin_profiles TO service_role;

-- 2. Auditoria Administrativa
CREATE TABLE public.av_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB,
    correlation_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Revogar acesso direto
REVOKE ALL ON public.av_admin_audit_logs FROM anon, authenticated;

-- RLS
ALTER TABLE public.av_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Grants para service_role
GRANT ALL ON public.av_admin_audit_logs TO service_role;

-- Índices de performance
CREATE INDEX idx_av_admin_audit_logs_user ON public.av_admin_audit_logs(admin_user_id);
CREATE INDEX idx_av_admin_audit_logs_action ON public.av_admin_audit_logs(action);
CREATE INDEX idx_av_admin_audit_logs_created ON public.av_admin_audit_logs(created_at);
