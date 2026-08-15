import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/admin/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const correlationId = crypto.randomUUID();
        const corsHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        };

        try {
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseKey = process.env['SUPABASE_PUBLISHABLE_KEY']!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          await supabase.auth.signOut();

          return new Response(JSON.stringify({ success: true, correlation_id: correlationId }), { 
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
