import { createFileRoute } from '@tanstack/react-router'
import { createSupabaseSSR } from '@/lib/server/supabase-ssr.server'
import { logAdminAction } from '@/lib/server/av-admin-audit.server'
import { getAdminContext } from '@/lib/server/av-admin-auth.server'

/**
 * ETAPA 5.1A — LOGOUT ADMINISTRATIVO (SERVER ROUTE)
 */

export const Route = createFileRoute('/api/admin/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corsHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        };

        const origin = request.headers.get("origin");
        if (origin) {
          corsHeaders["Access-Control-Allow-Origin"] = origin;
          corsHeaders["Vary"] = "Origin";
        }

        try {
          const responseHeaders = new Headers(corsHeaders);
          
          // 1. Identificar usuário para auditoria antes de destruir a sessão
          const context = await getAdminContext(request);
          
          // 2. Destruir sessão usando SSR Client
          const supabase = createSupabaseSSR(request, responseHeaders);
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error(`[AV-ADMIN-LOGOUT] signOut error:`, error);
          }

          // 3. Registrar auditoria se autenticado
          if (context.authenticated && context.userId) {
            await logAdminAction({
              adminUserId: context.userId,
              action: 'ADMIN_LOGOUT',
              metadata: { success: !error },
              correlationId: crypto.randomUUID()
            });
          }

          return new Response(JSON.stringify({ success: true }), { 
            status: 200, 
            headers: responseHeaders 
          });

        } catch (err) {
          console.error(`[AV-ADMIN-LOGOUT] Fatal error:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
