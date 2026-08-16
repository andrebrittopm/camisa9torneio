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
        responseHeaders.set("Cache-Control", "no-store, max-age=0");

        try {
          const supabase = createSupabaseSSR(request, responseHeaders);
          
          // auth.getUser() is the most reliable check and triggers refresh if needed
          const { data: { user }, error } = await supabase.auth.getUser();

          if (error || !user) {
            return new Response(JSON.stringify({ 
              authenticated: false,
              message: error?.message || 'No session'
            }), { 
              status: 200, 
              headers: responseHeaders 
            });
          }

          // Check profile via admin client to ensure active status
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(supabaseUrl, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
          
          const { data: profile } = await supabaseAdmin
            .from('av_admin_profiles')
            .select('role, active')
            .eq('user_id', user.id)
            .single();

          if (!profile || !profile.active) {
            return new Response(JSON.stringify({ 
              authenticated: false,
              message: 'Inactive profile'
            }), { 
              status: 200, 
              headers: responseHeaders 
            });
          }

          return new Response(JSON.stringify({
            authenticated: true,
            role: profile.role,
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
