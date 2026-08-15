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
          // Hardening para o ambiente de preview (iframe + cross-domain)
          const cookieStr = serialize(name, value, {
            ...options,
            path: '/',
            sameSite: 'none', // Necessário para cookies em iframes de domínios diferentes
            secure: true      // SameSite=none exige Secure
          })
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
  if (options.path) str += `; Path=${options.path}`
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`
  if (options.httpOnly) str += `; HttpOnly`
  if (options.secure) str += `; Secure`
  
  if (typeof options.sameSite === 'string') {
    str += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`
  } else if (options.sameSite === true) {
    str += `; SameSite=Strict`
  }
  
  return str
}
