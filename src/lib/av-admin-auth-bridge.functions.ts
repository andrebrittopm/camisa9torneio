import { createServerFn } from '@tanstack/react-start'
import { getAdminContext } from './server/av-admin-auth.server'

/**
 * Ponte RPC para o Guard de Administração
 * Arquivo .functions.ts permite importação segura no client/router
 */
export const checkAdminAuth = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = (globalThis as any).getRequest?.();
    if (!request) return { authenticated: false, active: false };
    
    return await getAdminContext(request);
  });
