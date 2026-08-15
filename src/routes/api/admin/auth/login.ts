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
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);

        if (origin && allowedOrigins.includes(origin)) {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Allow-Credentials": "true",
              "Access-Control-Max-Age": "86400",
              "Vary": "Origin"
            },
          });
        }
        return new Response(null, { status: 204 });
      },
      POST: async ({ request }) => {
        const correlationId = crypto.randomUUID();
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);
        
        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", "application/json");
        responseHeaders.set("Cache-Control", "private, no-store");

        if (origin && allowedOrigins.includes(origin)) {
          responseHeaders.set("Access-Control-Allow-Origin", origin);
          responseHeaders.set("Vary", "Origin");
          responseHeaders.set("Access-Control-Allow-Credentials", "true");
        }

        try {
          if (origin && !allowedOrigins.includes(origin)) {
            return new Response(JSON.stringify({ error: "FORBIDDEN", correlation_id: correlationId }), { status: 403, headers: responseHeaders });
          }

          const rlResult = await checkRateLimit(request, correlationId, 'admin-login'); 
          if (!rlResult.allowed) {
            return new Response(JSON.stringify({ error: "TOO_MANY_ATTEMPTS", correlation_id: correlationId }), { status: 429, headers: responseHeaders });
          }

          const body = await request.json();
          const { email, password } = body;

          if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 400, headers: responseHeaders });
          }

          const supabase = createSupabaseSSR(request, responseHeaders);

          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
          });

          if (authError || !data.user) {
            console.warn(`[AV-ADMIN-LOGIN] Auth error: ${authError?.message}`);
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: responseHeaders });
          }

          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseAdmin = createClient(supabaseUrl, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
          const { data: profile } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('role, active, display_name')
            .eq('user_id', data.user.id)
            .single();

          if (!profile || !profile.active) {
            await supabase.auth.signOut();
            return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS", correlation_id: correlationId }), { status: 401, headers: responseHeaders });
          }

          await logAdminAction({
            adminUserId: data.user.id,
            action: 'ADMIN_LOGIN_SUCCESS',
            metadata: { role: profile.role },
            correlationId
          });

          const payload = JSON.stringify({
            success: true,
            user: { display_name: profile.display_name, role: profile.role },
            correlation_id: correlationId
          });

          return new Response(payload, { 
            status: 200, 
            headers: responseHeaders 
          });

        } catch (err) {
          console.error(`[AV-ADMIN-LOGIN] Fatal error:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: responseHeaders });
        }
      }
    }
  }
})
