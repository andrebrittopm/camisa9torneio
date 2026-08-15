import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * ETAPA 5.1A — LAYOUT ADMINISTRATIVO
 * 
 * Removida toda lógica de 'beforeLoad' deste nível para eliminar 
 * o loop de redirecionamento causado pelo TanStack Router.
 * A proteção é aplicada individualmente nas rotas filhas que a exigem.
 */

export const Route = createFileRoute('/admin')({
  component: () => <Outlet />,
})
