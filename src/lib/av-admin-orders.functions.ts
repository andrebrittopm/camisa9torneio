import { createServerFn } from '@tanstack/react-start'
import { requireAdmin } from './server/av-admin-auth.server'
import { 
  getAdminOrdersInternal, 
  getAdminOrderDetailInternal,
  type AdminOrderListResponse,
  type AdminOrderDetail
} from './server/av-admin-orders.server'
import { z } from 'zod'

/**
 * RPC para listagem paginada de pedidos com filtros e busca.
 */
export const getAdminOrders = createServerFn({ method: 'GET' })
  .input(z.object({
    page: z.number().default(1),
    pageSize: z.number().default(20),
    search: z.string().optional(),
    paymentFilter: z.string().optional(),
    orderFilter: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }))
  .handler(async ({ input }) => {
    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    await requireAdmin(request);
    
    // 2. Buscar Dados Reais
    return await getAdminOrdersInternal(input);
  });

/**
 * RPC para obter os detalhes de um pedido específico.
 */
export const getAdminOrderDetail = createServerFn({ method: 'GET' })
  .input(z.object({
    orderId: z.string()
  }))
  .handler(async ({ input }) => {
    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    await requireAdmin(request);
    
    // 2. Buscar Detalhes
    return await getAdminOrderDetailInternal(input.orderId);
  });

export type { AdminOrderListResponse, AdminOrderDetail };
