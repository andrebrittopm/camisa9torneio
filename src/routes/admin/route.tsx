import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminContext } from '@/lib/server/av-admin-auth.server'

/**
 * ETAPA 5.1A — LAYOUT ADMINISTRATIVO PROTEGIDO
 */

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ request, location }) => {
    // PROTEÇÃO SERVER-SIDE (FAIL-CLOSED)
    const context = await getAdminContext(request);
    
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
