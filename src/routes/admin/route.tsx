import { createFileRoute, Outlet, useRouterState, redirect } from '@tanstack/react-router'
import { AdminHeader } from '@/components/AdminHeader'

/**
 * ETAPA 5.1A-B — LAYOUT ADMINISTRATIVO HARDENED
 * 
 * Removida toda lógica de 'beforeLoad' deste nível para eliminar 
 * o loop de redirecionamento causado pelo TanStack Router.
 * A proteção é aplicada individualmente nas rotas filhas que a exigem.
 */

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/admin') {
      throw redirect({ to: '/admin/', replace: true });
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const routerState = useRouterState();
  const isLoginPage = routerState.location.pathname === '/admin/login' || routerState.location.pathname === '/admin/reset-password';

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-gold-500/30">
      {!isLoginPage && <AdminHeader />}
      <main className={!isLoginPage ? "container mx-auto px-6 py-12" : ""}>
        <Outlet />
      </main>
    </div>
  );
}

