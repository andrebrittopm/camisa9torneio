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
        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", "application/json");
        responseHeaders.set("Cache-Control", "no-store, max-age=0");

        const origin = request.headers.get("origin");
        const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || '').split(',').map(o => o.trim()).filter(Boolean);
        
        if (origin && (allowedOrigins.includes(origin) || new URL(request.url).origin === origin)) {
          responseHeaders.set("Access-Control-Allow-Origin", origin);
          responseHeaders.set("Vary", "Origin");
          responseHeaders.set("Access-Control-Allow-Credentials", "true");
        }

        try {
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
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), { status: 500, headers: responseHeaders });
        }

      }
    }
  }
})
