-- ETAPA 5.1A-B — BOOTSTRAP CONTROLADO DO PRIMEIRO SUPERADMIN (CORREÇÃO 5)

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'andrebrittocoxim@gmail.com';
    v_display_name TEXT := 'André Luis';
BEGIN
    -- 1. Verificar perfil
    IF EXISTS (SELECT 1 FROM public.av_admin_profiles) THEN
        RAISE EXCEPTION 'Bootstrap abortado: av_admin_profiles já contém registros.';
    END IF;

    -- 2. Obter ou Criar usuário
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, is_super_admin
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
            v_email, '', now(), '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object('display_name', v_display_name), now(), now(), '', '', FALSE
        )
        RETURNING id INTO v_user_id;
        
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id, 'email', v_email),
            'email', v_email, now(), now(), now()
        );
    END IF;

    -- 3. Criar perfil
    INSERT INTO public.av_admin_profiles (user_id, display_name, role, active)
    VALUES (v_user_id, v_display_name, 'SUPERADMIN', TRUE);

    -- 4. Audit Log (correlation_id = random uuid for system bootstrap)
    INSERT INTO public.av_admin_audit_logs (admin_user_id, action, resource_type, resource_id, metadata, correlation_id)
    VALUES (v_user_id, 'BOOTSTRAP_SUPERADMIN', 'av_admin_profiles', v_user_id::text, 
            jsonb_build_object('message', 'Primeiro Superadmin provisionado.', 'email', v_email),
            gen_random_uuid());

END $$;