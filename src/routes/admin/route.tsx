import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminContext } from '@/lib/server/av-admin-auth.server'

/**
 * ETAPA 5.1A — LAYOUT ADMINISTRATIVO PROTEGIDO
 */

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Para TanStack Start, podemos precisar acessar o request via getRequest de @tanstack/react-start/server
    // Mas no beforeLoad (client/server), usamos context ou injetamos helpers.
    // Vamos usar import dinâmico do getRequest se estivermos no servidor, 
    // ou assumir que a proteção real é nas Server Functions/Routes e aqui é apenas o redirect de UX.
    
    // Simplificado para esta etapa: O TanStack Start anexa o request no context se configurado,
    // ou usamos getRequest() dentro de server functions.
    // Aqui usaremos uma abordagem segura de redirect.

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
