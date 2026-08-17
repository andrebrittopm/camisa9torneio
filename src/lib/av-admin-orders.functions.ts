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
  .inputValidator((data) => z.object({
    page: z.number().default(1),
    pageSize: z.number().default(20),
    search: z.string().nullable().optional(),
    paymentFilter: z.string().nullable().optional(),
    orderFilter: z.string().nullable().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }).parse(data))

  .handler(async ({ data: input }) => {

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
  .inputValidator((data) => z.object({
    orderId: z.string()
  }).parse(data))
  .handler(async ({ data: input }) => {

    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    await requireAdmin(request);
    
    // 2. Buscar Detalhes
    return await getAdminOrderDetailInternal(input.orderId);
  });

/**
 * RPC para gerar uma URL temporária e segura para visualização do comprovante.
 */
export const getAdminReceiptViewUrl = createServerFn({ method: 'GET' })
  .inputValidator((data) => z.object({
    orderId: z.string(),
    receiptId: z.string()
  }).parse(data))
  .handler(async ({ data: input }) => {
    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    await requireAdmin(request);
    
    // 2. Gerar URL com internal helper (IDOR validation inclusive)
    const { getAdminReceiptSignedUrlInternal } = await import('./server/av-admin-orders.server');
    const signedUrl = await getAdminReceiptSignedUrlInternal(input.orderId, input.receiptId);
    
    return { signedUrl };
  });

/**
 * RPC para aprovar ou rejeitar um comprovante de pagamento.
 */
export const reviewAdminReceipt = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({
    orderId: z.string(),
    receiptId: z.string(),
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
    notes: z.string().max(500).optional()
  }).parse(data))
  .handler(async ({ data: input }) => {
    const request = (globalThis as any).getRequest?.();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    const adminContext = await requireAdmin(request);
    
    // 2. Executar Ação (IDOR validation inclusive no RPC)
    const { reviewAdminReceiptInternal } = await import('./server/av-admin-orders.server');
    return await reviewAdminReceiptInternal({
      ...input,
      adminId: adminContext.userId!
    });
  });

export type { AdminOrderListResponse, AdminOrderDetail };


