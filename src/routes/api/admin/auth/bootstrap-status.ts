import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

/**
 * ETAPA 5.1A-B — VERIFICAÇÃO DE DISPONIBILIDADE DO BOOTSTRAP (SERVER ROUTE)
 * Retorna se o bootstrap está disponível (secret configurado e não executado).
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

export const Route = createFileRoute('/api/admin/auth/bootstrap-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
          // 1. Verificação do Secret (FAIL-CLOSED)
          const bootstrapSecret = process.env['SUPERADMIN_BOOTSTRAP_PASSWORD'];
          if (!bootstrapSecret || bootstrapSecret.length < 8) {
            return new Response(JSON.stringify({ 
              available: false, 
              reason: 'SECRET_NOT_CONFIGURED' 
            }), { status: 200, headers: corsHeaders });
          }

          // 2. Conexão Admin e Verificação de Superadmin
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

          const { data: superadmins, error: profileError } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('bootstrap_completed_at')
            .eq('role', 'SUPERADMIN')
            .eq('active', true);

          if (profileError || !superadmins || superadmins.length !== 1) {
            return new Response(JSON.stringify({ 
              available: false, 
              reason: 'PROFILE_ERROR' 
            }), { status: 200, headers: corsHeaders });
          }

          const targetSuperadmin = superadmins[0];
          
          if (targetSuperadmin.bootstrap_completed_at) {
            return new Response(JSON.stringify({ 
              available: false, 
              reason: 'ALREADY_COMPLETED' 
            }), { status: 200, headers: corsHeaders });
          }

          return new Response(JSON.stringify({ 
            available: true 
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          return new Response(JSON.stringify({ available: false, error: 'INTERNAL_ERROR' }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
