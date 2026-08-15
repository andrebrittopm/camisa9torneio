import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

/**
 * Supabase SSR Utility for TanStack Start
 * 
 * Provides a unified way to handle auth across:
 * - Server Routes (GET/POST)
 * - Server Functions (createServerFn)
 * - Loaders / Guards
 */

export function createSupabaseSSR(request: Request, responseHeaders: Headers) {
  const supabaseUrl = process.env['SUPABASE_URL']!
  const supabaseAnonKey = process.env['VITE_SUPABASE_ANON_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY']!

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('Cookie') ?? ''
        const cookies = cookieHeader.split(';').filter(Boolean).map((c) => {
          const parts = c.split('=')
          const name = parts[0]?.trim() || ''
          const value = parts.slice(1).join('=').trim()
          return { name, value }
        })
        return cookies
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieStr = serializeCookie(name, value, options)
          responseHeaders.append('Set-Cookie', cookieStr)
        })
      },
    },
  })
}

/**
 * Serializes cookie options into a string for Set-Cookie header.
 */
function serializeCookie(name: string, value: string, options: CookieOptions) {
  let str = `${name}=${value}`
  if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`
  if (options.domain) str += `; Domain=${options.domain}`
  if (options.path) str += `; Path=${options.path}`
  else str += `; Path=/`
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`
  if (options.httpOnly) str += `; HttpOnly`
  if (options.secure) str += `; Secure`
  
  // Hardening para permitir cookies em frames/previews se necessário, 
  // mas mantendo SameSite=Lax para navegação direta.
  if (options.sameSite) {
    str += `; SameSite=${options.sameSite}`
  } else {
    str += `; SameSite=Lax`
  }
  
  // Se estivermos em ambiente de preview (lovable.app / lovableproject.com),
  // e não for produção final, podemos precisar de Partitioned ou omitir SameSite 
  // se o browser bloquear cookies de terceiro.
  // No entanto, TanStack Start normalmente roda no mesmo domínio do preview.
  
  return str
}
