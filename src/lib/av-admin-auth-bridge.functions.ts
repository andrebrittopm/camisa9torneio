import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getAdminContext } from './server/av-admin-auth.server'

/**
 * Ponte RPC para o Guard de Administração
 * Arquivo .functions.ts permite importação segura no client/router
 */
export const checkAdminAuth = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest();
    if (!request) {
      console.warn('[AV-ADMIN-AUTH] Request context not found in checkAdminAuth handler');
      return { authenticated: false, active: false };
    }
    
    return await getAdminContext(request);
  });
