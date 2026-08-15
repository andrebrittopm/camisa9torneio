import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

/**
 * Supabase SSR Utility for TanStack Start
 */

export function createSupabaseSSR(request: Request, responseHeaders: Headers) {
  const supabaseUrl = process.env['SUPABASE_URL']!
  const supabaseAnonKey = process.env['VITE_SUPABASE_ANON_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY']!

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('Cookie') ?? ''
        return cookieHeader.split(';').filter(Boolean).map((c) => {
          const parts = c.split('=')
          const name = parts[0]?.trim() || ''
          const value = parts.slice(1).join('=').trim()
          return { name, value }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieStr = serialize(name, value, options)
          console.log(`[AV-SSR-DEBUG] Appending Set-Cookie: ${name}`);
          responseHeaders.append('Set-Cookie', cookieStr)
        })
      },
    },
  })
}

function serialize(name: string, value: string, options: CookieOptions) {
  let str = `${name}=${value}`
  
  if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`
  if (options.domain) str += `; Domain=${options.domain}`
  
  // Hardening do Path para garantir visibilidade em /admin e /api
  str += `; Path=/`
  
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`
  if (options.httpOnly) str += `; HttpOnly`
  
  // IMPORTANTE: Em ambientes de preview Lovable, Secure=true é obrigatório
  // mas o preview as vezes roda em contextos onde o cookie precisa de relaxamento de SameSite.
  str += `; Secure`
  
  if (options.sameSite) {
    // Garantir formato correto: Lax, Strict ou None
    const ss = typeof options.sameSite === 'string' 
      ? options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1).toLowerCase()
      : 'Lax';
    str += `; SameSite=${ss}`
  } else {
    str += `; SameSite=Lax`
  }
  
  return str
}
