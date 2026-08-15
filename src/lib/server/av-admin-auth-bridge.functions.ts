import { createServerFn } from '@tanstack/react-start'
import { getAdminContext } from './av-admin-auth.server'

/**
 * Ponte RPC para o Guard de Administração
 * Permite que componentes client-side verifiquem o status da sessão 
 * sem importar lógica de servidor diretamente.
 */
export const checkAdminAuth = createServerFn({ method: 'GET' })
  .handler(async () => {
    // TanStack Start preenche o request no contexto global durante a execução do handler
    const request = (globalThis as any).getRequest?.();
    if (!request) return { authenticated: false };
    
    return await getAdminContext(request);
  });
