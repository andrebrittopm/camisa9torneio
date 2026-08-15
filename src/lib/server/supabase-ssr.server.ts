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
          // Hardening para o ambiente de preview
          // Em ambientes de iframe (Lovable preview), SameSite=None + Secure é essencial
          // mas exige HTTPS. Localhost/Preview do Lovable usa HTTPS.
          const cookieStr = serialize(name, value, {
            ...options,
            path: '/',
            sameSite: 'none',
            secure: true
          })
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
    // TanStack Start/Nitro tratam Set-Cookie; garantimos o valor exato da spec
    const ss = options.sameSite.toLowerCase() === 'none' ? 'None' : 
               options.sameSite.toLowerCase() === 'strict' ? 'Strict' : 'Lax';
    str += `; SameSite=${ss}`
  } else if (options.sameSite === true) {
    str += `; SameSite=Strict`
  }
  
  return str
}
