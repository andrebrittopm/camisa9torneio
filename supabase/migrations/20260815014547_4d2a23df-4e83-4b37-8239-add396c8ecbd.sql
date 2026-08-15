-- Create av_admin_profiles table
CREATE TABLE public.av_admin_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT av_admin_profiles_role_check CHECK (role IN ('SUPERADMIN', 'ADMIN'))
);

-- Revoke direct access
REVOKE ALL ON public.av_admin_profiles FROM anon, authenticated;

-- Enable RLS
ALTER TABLE public.av_admin_profiles ENABLE ROW LEVEL SECURITY;

-- Grants for service_role
GRANT ALL ON public.av_admin_profiles TO service_role;

-- Create av_admin_audit_logs table
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

-- Revoke direct access
REVOKE ALL ON public.av_admin_audit_logs FROM anon, authenticated;

-- Enable RLS
ALTER TABLE public.av_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Grants for service_role
GRANT ALL ON public.av_admin_audit_logs TO service_role;

-- Index for audit logs
CREATE INDEX idx_av_admin_audit_logs_user ON public.av_admin_audit_logs(admin_user_id);
CREATE INDEX idx_av_admin_audit_logs_action ON public.av_admin_audit_logs(action);
CREATE INDEX idx_av_admin_audit_logs_created ON public.av_admin_audit_logs(created_at);