import { createFileRoute } from '@tanstack/react-router'
import { createSupabaseSSR } from '@/lib/server/supabase-ssr.server'

export const Route = createFileRoute('/api/admin/auth/recovery-callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const next = '/admin/reset-password'
        const origin = url.origin

        const responseHeaders = new Headers()
        const corsHeaders: Record<string, string> = {
          "Cache-Control": "no-store",
        }
        
        // CORS hardening (opcional para callback de redirecionamento, mas bom ter)
        if (origin) {
            responseHeaders.set("Access-Control-Allow-Origin", origin)
        }

        if (code) {
          const supabase = createSupabaseSSR(request, responseHeaders)
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (!error) {
            responseHeaders.set('Location', next)
            return new Response(null, {
              status: 303,
              headers: responseHeaders,
            })
          }
        }

        // Se falhar ou não houver código, redireciona com erro sanitizado
        responseHeaders.set('Location', `${next}?error=invalid_or_expired`)
        return new Response(null, {
          status: 303,
          headers: responseHeaders,
        })
      }
    }
  }
})
