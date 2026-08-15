import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/av-rate-limit'
import { logAdminAction } from '@/lib/server/av-admin-audit.server'

/**
 * ETAPA 5.1A — REDEFINIÇÃO DE SENHA ADMINISTRATIVA (SERVER ROUTE)
 * Valida a sessão de recuperação do Supabase e atualiza a senha.
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

export const Route = createFileRoute('/api/admin/auth/reset-password')({
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
          const { password, access_token } = body;

          if (!password || !access_token || typeof password !== 'string' || typeof access_token !== 'string') {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          if (password.length < 8) {
            return new Response(JSON.stringify({ error: "PASSWORD_TOO_SHORT", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseKey = process.env['SUPABASE_PUBLISHABLE_KEY']!;
          
          // Usar o access_token do cliente para validar a sessão de recuperação
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // 1. Validar e definir a sessão com o token recebido
          const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);
          
          if (authError || !user) {
            await logAdminAction({
              action: 'ADMIN_RESET_PASSWORD_FAILED',
              metadata: { reason: 'INVALID_TOKEN' },
              correlationId
            });
            return new Response(JSON.stringify({ error: "INVALID_TOKEN", correlation_id: correlationId }), { status: 401, headers: corsHeaders });
          }

          // 2. Verificar se o usuário possui perfil administrativo ATIVO
          const supabaseAdmin = createClient(supabaseUrl, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('role, active')
            .eq('user_id', user.id)
            .single();

          if (profileError || !profile || !profile.active) {
            await logAdminAction({
              adminUserId: user.id,
              action: 'ADMIN_RESET_PASSWORD_FAILED',
              metadata: { reason: 'NO_ADMIN_PROFILE' },
              correlationId
            });
            return new Response(JSON.stringify({ error: "UNAUTHORIZED", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
          }

          // 3. Atualizar a senha (usando o cliente autenticado pelo token)
          // Nota: O Supabase permite updateUser com a sessão do recovery token
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: password
          });

          if (updateError) {
            console.error(`[AV-ADMIN-RESET] Erro ao atualizar senha:`, updateError);
            return new Response(JSON.stringify({ error: "UPDATE_FAILED", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          // 4. Sucesso -> Registrar Auditoria
          await logAdminAction({
            adminUserId: user.id,
            action: 'ADMIN_PASSWORD_RESET_SUCCESS',
            metadata: { role: profile.role },
            correlationId
          });

          return new Response(JSON.stringify({
            success: true,
            message: "Senha atualizada com sucesso.",
            correlation_id: correlationId
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          console.error(`[AV-ADMIN-RESET] Erro fatal:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
