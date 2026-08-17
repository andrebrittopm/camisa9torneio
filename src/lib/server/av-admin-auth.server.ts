import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { createSupabaseSSR } from './supabase-ssr.server';

/**
 * Helper Server-Side para autenticação administrativa.
 * Implementa Fail-Closed e isolamento de PII.
 */

export interface AdminContext {
  authenticated: boolean;
  userId?: string;
  displayName?: string;
  role?: 'SUPERADMIN' | 'ADMIN';
  active?: boolean;
}

/**
 * Obtém o contexto administrativo usando o cliente SSR unificado.
 */
export async function getAdminContext(request: Request, responseHeaders?: Headers): Promise<AdminContext> {
  const dummyHeaders = new Headers();
  const headers = responseHeaders || dummyHeaders;
  
  const supabase = createSupabaseSSR(request, headers);

  // 1. Obter usuário (Source of Truth)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { authenticated: false };
  }

  // 2. Buscar Perfil Administrativo (Service Role para garantir bypass de RLS na validação de permissão)
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);


  const { data: profile, error: profileError } = await supabaseAdmin
    .from('av_admin_profiles')
    .select('role, active, display_name')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.warn(`[AV-ADMIN-AUTH] Profile fetch failed for user ${user.id}: ${profileError?.message || 'Not found'}`);
    return { authenticated: false };
  }

  // 3. Validar Status Ativo
  if (!profile.active) {
    return { authenticated: false, active: false };
  }

  return {
    authenticated: true,
    userId: user.id,
    displayName: profile.display_name,
    role: profile.role as 'SUPERADMIN' | 'ADMIN',
    active: profile.active
  };
}

/**
 * Middleware para exigir role ADMIN ou SUPERADMIN
 */
export async function requireAdmin(request: Request) {
  const context = await getAdminContext(request);
  if (!context.authenticated || !context.active) {
    throw new Error('UNAUTHORIZED_ADMIN');
  }
  return context;
}

/**
 * Middleware para exigir role SUPERADMIN
 */
export async function requireSuperAdmin(request: Request) {
  const context = await getAdminContext(request);
  if (!context.authenticated || context.role !== 'SUPERADMIN' || !context.active) {
    throw new Error('UNAUTHORIZED_SUPERADMIN');
  }
  return context;
}
