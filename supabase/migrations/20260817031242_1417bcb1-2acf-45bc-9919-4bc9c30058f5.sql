
-- 1. GRANTS
GRANT SELECT ON public.av_events TO anon, authenticated;
GRANT SELECT ON public.av_shirt_models TO anon, authenticated;
GRANT ALL ON public.av_events TO service_role;
GRANT ALL ON public.av_shirt_models TO service_role;
GRANT ALL ON public.av_orders TO service_role;
GRANT ALL ON public.av_order_items TO service_role;
GRANT ALL ON public.av_payment_receipts TO service_role;
GRANT ALL ON public.av_admin_profiles TO service_role;
GRANT ALL ON public.av_admin_audit_logs TO service_role;
GRANT ALL ON public.av_rate_limit_buckets TO service_role;
GRANT ALL ON public.av_email_outbox TO service_role;

-- 2. POLICIES
DROP POLICY IF EXISTS "Public events are viewable by anyone" ON public.av_events;
CREATE POLICY "Public events are viewable by anyone" ON public.av_events 
FOR SELECT TO anon, authenticated 
USING (active = true);

DROP POLICY IF EXISTS "Public models are viewable by anyone" ON public.av_shirt_models;
CREATE POLICY "Public models are viewable by anyone" ON public.av_shirt_models 
FOR SELECT TO anon, authenticated 
USING (active = true);
