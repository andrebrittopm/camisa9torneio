import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
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

    const request = getRequest();
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

    const request = getRequest();
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
    const request = getRequest();
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
    const request = getRequest();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    const adminContext = await requireAdmin(request);
    
    // 2. Executar Ação (IDOR validation inclusive no RPC)
    const { reviewAdminReceiptInternal } = await import('./server/av-admin-orders.server');
    return await reviewAdminReceiptInternal({
      orderId: input.orderId,
      receiptId: input.receiptId,
      action: input.action,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      adminId: adminContext.userId!
    });
  });

/**
 * RPC para atualizar o status operacional de um pedido.
 */
export const updateAdminOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({
    orderId: z.string(),
    newStatus: z.enum(['in_production', 'ready', 'delivered'])
  }).parse(data))
  .handler(async ({ data: input }) => {
    const request = getRequest();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    const adminContext = await requireAdmin(request);
    
    // 2. Executar Ação (IDOR e Transition Map validation inclusive no RPC)
    const { updateAdminOrderStatusInternal } = await import('./server/av-admin-orders.server');
    return await updateAdminOrderStatusInternal({
      orderId: input.orderId,
      newStatus: input.newStatus,
      adminId: adminContext.userId!
    });
  });

/**
 * RPC para cancelar administrativamente um pedido.
 */
export const cancelAdminOrder = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({
    orderId: z.string(),
    reasonCode: z.string().min(1),
    reasonText: z.string().max(500).nullable().optional()
  }).parse(data))
  .handler(async ({ data: input }) => {
    const request = getRequest();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard Administrativo
    const adminContext = await requireAdmin(request);
    
    // 2. Executar Ação (IDOR e Transition validation inclusive no RPC)
    const { cancelAdminOrderInternal } = await import('./server/av-admin-orders.server');
    return await cancelAdminOrderInternal({
      orderId: input.orderId,
      reasonCode: input.reasonCode,
      reasonText: input.reasonText ?? null,
      adminId: adminContext.userId!
    });
  });


/**
 * RPC para exclusão permanente de um pedido (SUPERADMIN ONLY).
 */
export const deleteAdminOrder = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({
    orderId: z.string().uuid(),
    expectedOrderCode: z.string()
      .trim()
      .min(10)
      .max(20)
      .regex(/^AV-\d{4}-\d{4,8}$/, "Formato inválido (AV-YYYY-SEQUÊNCIA)")
  }).parse(data))
  .handler(async ({ data: input }) => {
    const request = getRequest();
    if (!request) throw new Error('Request Context Missing');
    
    // 1. Validar Guard SUPERADMIN
    const { requireSuperAdmin } = await import('./server/av-admin-auth.server');
    const adminContext = await requireSuperAdmin(request);
    
    // 2. Executar Ação
    const { deleteAdminOrderInternal } = await import('./server/av-admin-orders.server');
    return await deleteAdminOrderInternal({
      orderId: input.orderId,
      expectedOrderCode: input.expectedOrderCode,
      adminId: adminContext.userId!
    });
  });

export type { AdminOrderListResponse, AdminOrderDetail };





