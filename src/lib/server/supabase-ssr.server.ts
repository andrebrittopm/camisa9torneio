import { createServerClient, type CookieOptions, parseCookies, serializeCookie } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

/**
 * Supabase SSR Utility for TanStack Start
 * 
 * Central helper to create a Supabase client that reads and writes cookies
 * using standard @supabase/ssr implementation.
 */

export function createSupabaseSSR(request: Request, responseHeaders: Headers) {
  const supabaseUrl = process.env['SUPABASE_URL']!
  const supabaseAnonKey = process.env['VITE_SUPABASE_ANON_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY']!

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookies(request.headers.get('Cookie') ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Hardening for preview environments (iframe compatibility)
          // Essential for Lovable preview: SameSite=None + Secure
          const cookieStr = serializeCookie(name, value, {
            ...options,
            path: '/',
            sameSite: 'none',
            secure: true,
          })
          responseHeaders.append('Set-Cookie', cookieStr)
        })
      },
    },
  })
}

