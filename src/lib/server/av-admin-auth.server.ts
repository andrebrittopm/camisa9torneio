import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

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

export async function getAdminContext(request: Request): Promise<AdminContext> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  // 1. Extrair token da sessão
  const authHeader = request.headers.get('Authorization');
  let token = '';
  
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // 2. Tentar ler dos cookies (Supabase SSR padrão)
    const cookieHeader = request.headers.get('Cookie') || '';
    
    // Procura por tokens de auth do Supabase (padrão: sb-[project-ref]-auth-token)
    // Em ambientes TanStack Start com SSR, o adaptador de cookies pode usar outros nomes
    const cookies = cookieHeader.split(';').map(c => c.trim());
    
    // Tenta encontrar qualquer cookie que pareça um JWT do Supabase (3 partes)
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (value && value.split('.').length === 3) {
        token = value;
        break;
      }
    }
  }

  if (!token) {
    console.warn(`[AV-ADMIN-AUTH] No token found in headers or cookies for request to ${request.url}`);
    return { authenticated: false };
  }


  // 2. Validar Token com o Supabase Auth
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !user) {
    return { authenticated: false };
  }

  // 3. Buscar Perfil Administrativo (Source of Truth)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('av_admin_profiles')
    .select('role, active, display_name')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { authenticated: false };
  }

  // 4. Validar Status Ativo
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
