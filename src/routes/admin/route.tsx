import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
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
    // Debug visual para identificar loop
    console.log(`[AV-ADMIN-AUTH] Path: ${location.pathname}`);

    // TanStack Router: children herdam beforeLoad do pai.
    // O redirect deve ser condicional apenas para rotas que NÃO sejam o login.
    const isLoginFlow = location.pathname.includes('/admin/login');
    
    if (isLoginFlow) {
      return;
    }

    const context = await checkAdminAuth()
    
    if (!context.authenticated || !context.active) {
      console.log(`[AV-ADMIN-AUTH] Não autenticado, redirecionando para login.`);
      throw redirect({
        to: '/admin/login',
      });
    }

    return {
      adminContext: context
    };
  },
  component: () => <Outlet />,
})
