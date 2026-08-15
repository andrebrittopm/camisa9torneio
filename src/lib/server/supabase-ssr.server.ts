import { createServerClient, type CookieOptions, serializeCookie } from '@supabase/ssr'
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
          // Usamos a função serialize oficial do @supabase/ssr se disponível,
          // ou implementamos uma que garanta a propagação correta.
          const cookieStr = serialize(name, value, options)
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
  else str += `; Path=/`
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`
  if (options.httpOnly) str += `; HttpOnly`
  if (options.secure) str += `; Secure`
  
  // Hardening: Forçar SameSite=Lax para garantir persistência em navegação direta
  if (options.sameSite) {
    str += `; SameSite=${options.sameSite}`
  } else {
    str += `; SameSite=Lax`
  }
  
  return str
}
