INSERT INTO public.av_admin_audit_logs (admin_user_id, action, correlation_id, metadata) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'andrebrittocoxim@gmail.com'), 
  'ADMIN_BOOTSTRAP_DISABLED', 
  gen_random_uuid(), 
  '{"reason": "Stage 7.2 finalization"}'::jsonb
);