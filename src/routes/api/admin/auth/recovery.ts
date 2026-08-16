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
          const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
          const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

          const normalizedEmail = email.trim().toLowerCase();

          // 1. Verificar se o e-mail pertence a um administrador ativo (Anti-Enumeration interno)
          const { data: adminUser, error: userError } = await supabaseAdmin.auth.admin.listUsers();
          const targetUser = adminUser?.users.find(u => u.email?.toLowerCase() === normalizedEmail);

          if (targetUser) {
            const { data: profile } = await supabaseAdmin
              .from('av_admin_profiles')
              .select('role, active')
              .eq('user_id', targetUser.id)
              .single();

            if (profile?.active && ['ADMIN', 'SUPERADMIN'].includes(profile.role)) {
              // 2. Gerar link de recuperação via Admin API (Elimina dependência do SMTP do Supabase)
              const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: normalizedEmail,
                options: { redirectTo: `${origin}/api/admin/auth/recovery-callback` }
              });

              if (!linkError && linkData?.properties?.action_link) {
                // 3. Enviar via SendGrid API
                const recoveryLink = linkData.properties.action_link;
                
                const subject = "Redefinição de senha — Amigos do Vôlei";
                const htmlBody = `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
                    <h2 style="color: #0f172a; margin-bottom: 24px;">Olá,</h2>
                    <p>Recebemos uma solicitação para redefinir a senha do seu acesso ao painel administrativo do <strong>9º Torneio Amigos do Vôlei</strong>.</p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${recoveryLink}" style="display: inline-block; background: #b45309; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; letter-spacing: 0.025em;">REDEFINIR MINHA SENHA</a>
                    </div>
                    <p>Se você não solicitou esta alteração, ignore esta mensagem. O link é válido por tempo limitado e para apenas um uso.</p>
                    <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">Equipe Amigos do Vôlei</p>
                  </div>
                `;

                const apiKey = process.env['SENDGRID_API_KEY'];
                const from = process.env['EMAIL_FROM'];
                
                if (apiKey && from) {
                  // Bypass tracking para recovery links e tokens sensíveis
                  await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      personalizations: [{ to: [{ email: normalizedEmail }] }],
                      from: { email: from, name: "Amigos do Vôlei" },
                      subject: subject,
                      content: [{ type: 'text/html', value: htmlBody }],
                      tracking_settings: {
                        click_tracking: { enable: false, enable_text: false },
                        open_tracking: { enable: false }
                      }
                    })
                  });

                  await logAdminAction({
                    adminUserId: targetUser.id,
                    action: 'ADMIN_RECOVERY_REQUESTED',
                    metadata: { provider: 'SENDGRID_API' },
                    correlationId
                  });
                }
              }
            }
          }

          // Resposta sempre genérica para evitar enumeração
          return new Response(JSON.stringify({
            success: true,
            message: "Se o endereço estiver autorizado, você receberá instruções para redefinir sua senha.",
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
