import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/av-rate-limit'
import { logAdminAction } from '@/lib/server/av-admin-audit.server'

/**
 * ETAPA 5.1A — RECUPERAÇÃO DE SENHA ADMINISTRATIVA (SERVER ROUTE)
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

export const Route = createFileRoute('/api/admin/auth/recovery')({
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
          if (!origin || !allowedOrigins.includes(origin)) {
            return new Response(JSON.stringify({ error: "FORBIDDEN", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
          }

          const rlResult = await checkRateLimit(request, correlationId, 'admin-auth'); 
          if (!rlResult.allowed) {
            return new Response(JSON.stringify({ error: "TOO_MANY_ATTEMPTS", correlation_id: correlationId }), { status: 429, headers: corsHeaders });
          }

          const body = await request.json();
          const { email } = body;

          if (!email || typeof email !== 'string') {
            return new Response(JSON.stringify({ error: "INVALID_EMAIL", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseKey = process.env['SUPABASE_PUBLISHABLE_KEY']!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Disparar e-mail de recuperação
          // O link deve apontar para /admin/reset-password
          const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: `${origin}/admin/reset-password`,
          });

          if (recoveryError) {
            console.error(`[AV-ADMIN-RECOVERY] Erro Supabase:`, recoveryError);
            // Retornamos sucesso genérico por segurança (evitar enumeração de usuários)
            // mas logamos internamente
            await logAdminAction({
              action: 'ADMIN_RECOVERY_FAILED',
              metadata: { reason: 'SUPABASE_ERROR', email: email.replace(/^(.)(.*)(@.*)$/, "$1***$3") },
              correlationId
            });
          } else {
            await logAdminAction({
              action: 'ADMIN_RECOVERY_REQUESTED',
              metadata: { email: email.replace(/^(.)(.*)(@.*)$/, "$1***$3") },
              correlationId
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: "Se o e-mail estiver cadastrado, as instruções foram enviadas.",
            correlation_id: correlationId
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          console.error(`[AV-ADMIN-RECOVERY] Erro fatal:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
