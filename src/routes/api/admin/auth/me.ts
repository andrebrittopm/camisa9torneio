import { createFileRoute } from '@tanstack/react-router'
import { createSupabaseSSR } from '@/lib/server/supabase-ssr.server'

/**
 * Endpoint para validar a sessão administrativa no SSR
 */

export const Route = createFileRoute('/api/admin/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", "application/json");
        responseHeaders.set("Cache-Control", "private, no-store");

        try {
          const supabase = createSupabaseSSR(request, responseHeaders);
          
          // Debugging cookies no servidor
          const cookies = request.headers.get('Cookie');

          const { data: { user }, error } = await supabase.auth.getUser();

          if (error || !user) {
            console.warn(`[AV-ADMIN-ME] Unauthorized: ${error?.message || 'No user'}`);
            return new Response(JSON.stringify({ 
              authenticated: false,
            }), { 
              status: 200, // Retornamos 200 para o client tratar o dado
              headers: responseHeaders 
            });
          }

          // Se chegamos aqui, o token é válido e o adapter pode ter atualizado o token (Set-Cookie)
          return new Response(JSON.stringify({
            authenticated: true,
            user: {
              id: user.id,
              email: user.email
            }
          }), { 
            status: 200, 
            headers: responseHeaders 
          });

        } catch (err) {
          console.error(`[AV-ADMIN-ME] Fatal:`, err);
          return new Response(JSON.stringify({ authenticated: false, error: "INTERNAL_ERROR" }), { status: 500, headers: responseHeaders });
        }
      }
    }
  }
})
