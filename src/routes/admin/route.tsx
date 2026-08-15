import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getAdminContext } from '@/lib/server/av-admin-auth.server'
import { getRequest } from '@tanstack/react-start/server'

/**
 * ETAPA 5.1A — LAYOUT ADMINISTRATIVO PROTEGIDO
 */

const checkAdminAuth = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    if (!request) return { authenticated: false }
    return await getAdminContext(request)
  })

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // PROTEÇÃO ATRAVÉS DE SERVER FUNCTION
    const context = await checkAdminAuth()
    
    if (!context.authenticated || !context.active) {
      throw redirect({
        to: '/admin/login',
        search: {
          redirect: location.href,
        },
      });
    }

    return {
      adminContext: context
    };
  },
})
