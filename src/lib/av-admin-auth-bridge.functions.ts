import { createServerFn } from '@tanstack/react-start'
import { getAdminContext } from './av-admin-auth.server'

/**
 * Ponte RPC para o Guard de Administração
 */
export const checkAdminAuth = createServerFn({ method: 'GET' })
  .handler(async () => {
    // getRequest() injeta o objeto Request atual do TanStack Start
    const request = (globalThis as any).getRequest?.();
    if (!request) {
      return { authenticated: false, active: false };
    }
    
    return await getAdminContext(request);
  });
