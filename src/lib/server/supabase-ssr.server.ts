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
  
  // Hardening do Path e SameSite para o ambiente de preview
  str += `; Path=/`
  
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`
  if (options.httpOnly) str += `; HttpOnly`
  if (options.secure) str += `; Secure`
  
  // IMPORTANTE: Em alguns ambientes de preview (iframes), SameSite=None + Secure é necessário.
  // No entanto, TanStack Start em localhost/preview Lovable funciona melhor com Lax ou sem SameSite explícito.
  // Vamos forçar Lax para navegação direta e garantir que o cookie não seja particionado incorretamente.
  str += `; SameSite=Lax`
  
  return str
}
