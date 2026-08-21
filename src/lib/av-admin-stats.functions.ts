import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requireAdmin } from './server/av-admin-auth.server'
import { getDashboardStatsInternal, type AdminDashboardStats } from './server/av-admin-stats.server'

/**
 * RPC para obter as estatísticas do Dashboard administrativo.
 * Protegido por autenticação administrativa rigorosa.
 */
export const getAdminDashboardStats = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest();
    if (!request) {
      console.error('[STATS] getRequest() returned undefined');
      throw new Error('Request Context Missing');
    }
    
    // 1. Validar Guard Administrativo
    await requireAdmin(request);
    
    // 2. Buscar Dados Reais
    return await getDashboardStatsInternal();
  });

export type { AdminDashboardStats };
