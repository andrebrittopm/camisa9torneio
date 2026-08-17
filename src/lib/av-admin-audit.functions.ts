import { createServerFn } from '@tanstack/react-start'
import { requireAdmin } from './server/av-admin-auth.server'
import { z } from 'zod'
import { 
  getAdminAuditLogsInternal, 
  getAdminListForFilterInternal,
  type AdminAuditListResponse 
} from './server/av-admin-audit.server'

/**
 * RPC para listagem paginada de auditoria.
 */
export const getAdminAuditLogs = createServerFn({ method: 'GET' })
  .validator((data: any) => z.object({
    page: z.number().default(1),
    pageSize: z.number().default(25),
    search: z.string().nullable().optional(),
    adminFilter: z.string().nullable().optional(),
    actionFilter: z.string().nullable().optional(),
    dateFrom: z.string().nullable().optional(),
    dateTo: z.string().nullable().optional()
  }).parse(data))
  .handler(async ({ data: input }) => {
    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    await requireAdmin(request);
    
    return await getAdminAuditLogsInternal(input);
  });

/**
 * RPC para obter lista de admins para filtros.
 */
export const getAdminListForFilter = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    await requireAdmin(request);
    
    return await getAdminListForFilterInternal();
  });

export type { AdminAuditListResponse, AdminAuditLog } from './server/av-admin-audit.server';
