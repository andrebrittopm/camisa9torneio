import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/av-rate-limit'
import { logAdminAction } from '@/lib/server/av-admin-audit.server'
import { createSupabaseSSR } from '@/lib/server/supabase-ssr.server'

/**
 * ETAPA 5.1A — LOGIN ADMINISTRATIVO (SERVER ROUTE)
 */

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
          "Cache-Control": "private, no-store",
        };

        if (origin && allowedOrigins.includes(origin)) {
          corsHeaders["Access-Control-Allow-Origin"] = origin;
          corsHeaders["Vary"] = "Origin";
        }

        try {
          // 1. Validar Origin (Opcional em preview, mandatório em prod)
          if (origin && !allowedOrigins.includes(origin)) {
            return new Response(JSON.stringify({ error: "FORBIDDEN", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
          }

          // 2. Rate Limit
          const rlResult = await checkRateLimit(request, correlationId, 'admin-login'); 
          if (!rlResult.allowed) {
            return new Response(JSON.stringify({ error: "TOO_MANY_ATTEMPTS", correlation_id: correlationId }), { status: 429, headers: corsHeaders });
          }

          // 3. Body
          const body = await request.json();
          const { email, password } = body;

          if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          // 4. Supabase SSR Auth
          const responseHeaders = new Headers(corsHeaders);
          const supabase = createSupabaseSSR(request, responseHeaders);

          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
          });

          if (authError || !data.user) {
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: corsHeaders });
          }

          // 5. Profile Check (Service Role para bypass RLS)
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseAdmin = createClient(supabaseUrl, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
          const { data: profile } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('role, active, display_name')
            .eq('user_id', data.user.id)
            .single();

          if (!profile || !profile.active) {
            await supabase.auth.signOut();
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: corsHeaders });
          }

          // 6. Sucesso -> Auditoria
          await logAdminAction({
            adminUserId: data.user.id,
            action: 'ADMIN_LOGIN_SUCCESS',
            metadata: { role: profile.role },
            correlationId
          });

          // 7. Retornar resposta com Headers que contém os Set-Cookie
          return new Response(JSON.stringify({
            success: true,
            user: { display_name: profile.display_name, role: profile.role },
            correlation_id: correlationId
          }), { 
            status: 200, 
            headers: responseHeaders 
          });

        } catch (err) {
          console.error(`[AV-ADMIN-LOGIN] Fatal:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
