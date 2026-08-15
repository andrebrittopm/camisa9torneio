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
    // 1. ISOLAMENTO ESTRITÍSSIMO: Não executar lógica se a rota for de login
    // TanStack Router processa beforeLoad de pais mesmo para filhos.
    const isLoginPage = location.pathname === '/admin/login' || location.pathname === '/admin/login/';
    
    if (isLoginPage) {
      return;
    }

    // 2. PROTEÇÃO ATRAVÉS DE SERVER FUNCTION
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
  component: () => <Outlet />,
})
