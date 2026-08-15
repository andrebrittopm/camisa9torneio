import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/av-rate-limit'
import { logAdminAction } from '@/lib/server/av-admin-audit.server'

/**
 * ETAPA 5.1A — LOGIN ADMINISTRATIVO (SERVER ROUTE)
 */

const MAX_BODY_BYTES = 4096; // 4KB para login

function getAllowedOrigins(request: Request): string[] {
  const fromEnv = (process.env['ALLOWED_ORIGINS'] || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  
  let selfOrigin = '';
  try {
    const url = new URL(request.url);
    selfOrigin = url.origin;
  } catch {
    selfOrigin = '';
  }
  return Array.from(new Set([...fromEnv, ...(selfOrigin ? [selfOrigin] : [])]));
}

export const Route = createFileRoute('/api/admin/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const correlationId = crypto.randomUUID();
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);
        const corsHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        };

        if (origin && allowedOrigins.includes(origin)) {
          corsHeaders["Access-Control-Allow-Origin"] = origin;
          corsHeaders["Vary"] = "Origin";
        }

        try {
          // 1. Validar Origin
          if (!origin || !allowedOrigins.includes(origin)) {
            return new Response(JSON.stringify({ error: "FORBIDDEN", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
          }

          // 2. Rate Limit (Scope admin-login)
          // Isolado do fluxo de pedidos públicos
          const rlResult = await checkRateLimit(request, correlationId, 'admin-login'); 
          if (!rlResult.allowed) {
            return new Response(JSON.stringify({ error: "TOO_MANY_ATTEMPTS", correlation_id: correlationId }), { status: 429, headers: corsHeaders });
          }


          // 3. Ler Body (Limite 4KB)
          const body = await request.json();
          const { email, password } = body;

          if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          // 4. Autenticar Supabase Auth
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseKey = process.env['SUPABASE_PUBLISHABLE_KEY']!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
          });

          if (authError || !data.user) {
            await logAdminAction({
              action: 'ADMIN_LOGIN_FAILED',
              metadata: { reason: 'AUTH_FAILURE' },
              correlationId
            });
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: corsHeaders });
          }

          // 5. Validar Perfil Administrativo (Service Role)
          const supabaseAdmin = createClient(supabaseUrl, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('role, active, display_name')
            .eq('user_id', data.user.id)
            .single();

          if (profileError || !profile) {
            await logAdminAction({
              adminUserId: data.user.id,
              action: 'ADMIN_LOGIN_FAILED',
              metadata: { reason: 'NO_PROFILE' },
              correlationId
            });
            // Logout para limpar sessão auth parcial
            await supabase.auth.signOut();
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: corsHeaders });
          }

          if (!profile.active) {
            await logAdminAction({
              adminUserId: data.user.id,
              action: 'ADMIN_LOGIN_FAILED',
              metadata: { reason: 'INACTIVE_PROFILE' },
              correlationId
            });
            await supabase.auth.signOut();
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: corsHeaders });
          }

          // 6. Sucesso -> Registrar Auditoria
          await logAdminAction({
            adminUserId: data.user.id,
            action: 'ADMIN_LOGIN_SUCCESS',
            metadata: { role: profile.role },
            correlationId
          });

          // 7. Persistência de Sessão (TanStack Start / Supabase SSR)
          const responseHeaders = new Headers(corsHeaders);
          
          // Se o signInWithPassword foi bem sucedido, o objeto 'data.session' contém os tokens.
          // Em um Server Route manual, precisamos garantir que o browser receba os cookies.
          // O Supabase JS Client em Node não grava cookies automaticamente na Response.
          if (data.session) {
            const { access_token, refresh_token, expires_in } = data.session;
            
            // Definir cookies compatíveis com Supabase SSR
            // Usamos nomes genéricos que o getAdminContext vai tentar ler
            responseHeaders.append('Set-Cookie', `sb-access-token=${access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expires_in}; Secure`);
            responseHeaders.append('Set-Cookie', `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000; Secure`);
          }
          
          return new Response(JSON.stringify({
            success: true,
            user: {
              display_name: profile.display_name,
              role: profile.role
            },
            correlation_id: correlationId
          }), { 
            status: 200, 
            headers: responseHeaders 
          });



        } catch (err) {
          console.error(`[AV-ADMIN-LOGIN] Erro fatal:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
