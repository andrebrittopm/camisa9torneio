import { createFileRoute } from '@tanstack/react-router'
import { getAdminContext } from '@/lib/server/av-admin-auth.server'
import { getRequest } from '@tanstack/react-start/server'

/**
 * Endpoint para validar a sessão imediatamente após o login.
 * Garante que o SSR client consegue ler os cookies recém-setados.
 */

export const Route = createFileRoute('/api/admin/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
          const context = await getAdminContext(request);

          if (!context.authenticated) {
             return new Response(JSON.stringify({ 
               authenticated: false,
               debug: {
                 cookie_header_present: !!request.headers.get('Cookie'),
                 cookie_count: request.headers.get('Cookie')?.split(';').length || 0
               }
             }), { status: 200, headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            authenticated: true,
            user: {
              userId: context.userId,
              role: context.role,
              displayName: context.displayName
            }
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          console.error(`[AV-ADMIN-ME] Error:`, err);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
})
