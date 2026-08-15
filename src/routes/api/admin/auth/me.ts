import { createFileRoute } from '@tanstack/react-router'
import { getAdminContext } from '@/lib/server/av-admin-auth.server'

export const Route = createFileRoute('/api/admin/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const correlationId = crypto.randomUUID();
        const corsHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        };

        try {
          const context = await getAdminContext(request);

          if (!context.authenticated) {
            return new Response(JSON.stringify({ authenticated: false, correlation_id: correlationId }), { 
              status: 200, 
              headers: corsHeaders 
            });
          }

          return new Response(JSON.stringify({
            authenticated: true,
            user: {
              display_name: context.displayName,
              role: context.role
            },
            correlation_id: correlationId
          }), { 
            status: 200, 
            headers: corsHeaders 
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { 
            status: 500, 
            headers: corsHeaders 
          });
        }
      }
    }
  }
})
