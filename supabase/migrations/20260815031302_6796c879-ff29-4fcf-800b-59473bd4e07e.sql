ALTER TABLE public.av_admin_profiles ADD COLUMN IF NOT EXISTS bootstrap_completed_at TIMESTAMPTZ;

-- Re-grant privileges
GRANT SELECT, UPDATE ON public.av_admin_profiles TO authenticated;
GRANT ALL ON public.av_admin_profiles TO service_role;