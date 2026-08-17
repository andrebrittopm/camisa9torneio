import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { createSupabaseSSR } from './supabase-ssr.server';

/**
 * Helper Server-Side para autenticação administrativa.
 * Implementa Fail-Closed e isolamento de PII.
 */

export interface AdminContext {
  authenticated: boolean;
  userId?: string | undefined;
  displayName?: string | undefined;
  role?: 'SUPERADMIN' | 'ADMIN' | undefined;
  active?: boolean | undefined;
}

/**
 * Obtém o contexto administrativo usando o cliente SSR unificado.
 */
export async function getAdminContext(request: Request, responseHeaders?: Headers): Promise<AdminContext> {
  const dummyHeaders = new Headers();
  const headers = responseHeaders || dummyHeaders;
  
  const supabase = createSupabaseSSR(request, headers);

  // 1. Obter usuário (Source of Truth)
  // Hardened for preview: tenta cookies primeiro, depois Authorization header (Bearer)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user || authError) {
    const authHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('Cookie');
    
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: jwtUser }, error: jwtError } = await supabase.auth.getUser(token);
      if (!jwtError && jwtUser) {
        return await fetchAdminProfile(jwtUser.id, (jwtUser.user_metadata as any)?.['display_name'] || jwtUser.email);
      }
    }
    return { authenticated: false };
  }

  return await fetchAdminProfile(user.id, (user.user_metadata as any)?.['display_name']);
}

/**
 * Helper interno para buscar perfil administrativo via Service Role
 */
async function fetchAdminProfile(userId: string, defaultDisplayName?: string): Promise<AdminContext> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  
  // Import dinâmico para evitar bundle bloat no client se este arquivo for importado (mesmo que via server helper)
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('av_admin_profiles')
    .select('role, active, display_name')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    return { authenticated: false };
  }

  if (!profile.active) {
    return { authenticated: false, active: false };
  }

  return {
    authenticated: true,
    userId: userId,
    displayName: profile.display_name || defaultDisplayName || undefined,
    role: (profile.role as 'SUPERADMIN' | 'ADMIN') || undefined,
    active: !!profile.active
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
