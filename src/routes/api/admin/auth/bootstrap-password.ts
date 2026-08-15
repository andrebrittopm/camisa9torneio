import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/av-rate-limit'
import { logAdminAction } from '@/lib/server/av-admin-audit.server'
import { verifyTurnstileToken } from '@/lib/server/av-turnstile'

/**
 * ETAPA 5.1A-B — BOOTSTRAP DE SENHA SUPERADMIN (SERVER ROUTE)
 * Permite a definição da primeira senha do Superadmin via Secret, sem SMTP.
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

export const Route = createFileRoute('/api/admin/auth/bootstrap-password')({
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
          // 1. Verificação de Origem e Content-Length
          if (!origin || !allowedOrigins.includes(origin)) {
            return new Response(JSON.stringify({ error: "FORBIDDEN", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
          }

          const contentLength = parseInt(request.headers.get('content-length') || '0');
          if (contentLength > 65536) { // 64KB limit
            return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), { status: 413, headers: corsHeaders });
          }

          // 2. Rate Limiting (admin-auth scope)
          const rlResult = await checkRateLimit(request, correlationId, 'admin-auth'); 
          if (!rlResult.allowed) {
            return new Response(JSON.stringify({ error: "TOO_MANY_ATTEMPTS", correlation_id: correlationId }), { status: 429, headers: corsHeaders });
          }

          // 3. Parsing e Validação Turnstile
          const body = await request.json();
          const { turnstileToken } = body;

          if (!turnstileToken) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          const turnstile = await verifyTurnstileToken(
            turnstileToken, 
            process.env['TURNSTILE_SECRET_KEY'], 
            correlationId,
            [], 
            'admin_bootstrap'
          );
          if (!turnstile.success) {
            return new Response(JSON.stringify({ error: "INVALID_CAPTCHA", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          // 4. Verificação do Secret (FAIL-CLOSED)
          const bootstrapSecret = process.env['SUPERADMIN_BOOTSTRAP_PASSWORD'];
          if (!bootstrapSecret || bootstrapSecret.length < 8) {
            console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=secret_check error=NOT_CONFIGURED`);
            return new Response(JSON.stringify({ error: "BOOTSTRAP_NOT_AVAILABLE", correlation_id: correlationId }), { status: 503, headers: corsHeaders });
          }

          // 5. Conexão Admin e Verificação de Superadmin Único
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

          const { data: superadmins, error: profileError } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('user_id, role, active, bootstrap_completed_at')
            .eq('role', 'SUPERADMIN')
            .eq('active', true);

          if (profileError) {
            console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=profile_lookup error=${profileError.message}`);
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          if (!superadmins || superadmins.length === 0) {
            console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=profile_lookup error=NO_SUPERADMIN_FOUND`);
            return new Response(JSON.stringify({ error: "BOOTSTRAP_NOT_AVAILABLE", correlation_id: correlationId }), { status: 503, headers: corsHeaders });
          }

          if (superadmins.length > 1) {
            console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=profile_lookup error=MULTIPLE_SUPERADMINS_FOUND`);
            return new Response(JSON.stringify({ error: "BOOTSTRAP_NOT_AVAILABLE", correlation_id: correlationId }), { status: 503, headers: corsHeaders });
          }

          const targetSuperadmin = superadmins[0];
          if (!targetSuperadmin) {
            return new Response(JSON.stringify({ error: "BOOTSTRAP_NOT_AVAILABLE", correlation_id: correlationId }), { status: 503, headers: corsHeaders });
          }

          // 6. One-time Guard: bootstrap_completed_at
          if (targetSuperadmin.bootstrap_completed_at) {
            console.warn(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=guard error=ALREADY_COMPLETED`);
            return new Response(JSON.stringify({ error: "GONE", correlation_id: correlationId }), { status: 410, headers: corsHeaders });
          }

          // 7. Atualizar Senha no Auth (Usando apenas o Secret do Servidor)
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetSuperadmin.user_id, {
            password: bootstrapSecret,
            email_confirm: true 
          });

          if (updateError) {
            console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=auth_update error=${updateError.message}`);
            return new Response(JSON.stringify({ error: "UPDATE_FAILED", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          // 8. Marcar como Completo no Perfil
          const { error: markError } = await supabaseAdmin
            .from('av_admin_profiles')
            .update({ bootstrap_completed_at: new Date().toISOString() })
            .eq('user_id', targetSuperadmin.user_id);

          if (markError) {
             console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} stage=mark_completed error=${markError.message}`);
          }

          // 9. Auditoria de Sucesso
          await logAdminAction({
            adminUserId: targetSuperadmin.user_id,
            action: 'ADMIN_BOOTSTRAP_SUCCESS',
            metadata: { method: 'server_side_secret_only' },
            correlationId
          });

          return new Response(JSON.stringify({
            success: true,
            message: "Senha de bootstrap aplicada com sucesso via Server Secret.",
            correlation_id: correlationId
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          console.error(`[AV-ADMIN-BOOTSTRAP] correlation=${correlationId} fatal_error:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }


      }
    }
  }
})
