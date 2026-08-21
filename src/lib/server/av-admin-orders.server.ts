import { Database } from "@/integrations/supabase/types";

export type AdminOrderSummary = {
  id: string;
  orderSeq: number;
  publicId: string;
  customerName: string;
  whatsapp: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  receiptStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  itemCount: number;
};

export type AdminOrderListResponse = {
  orders: AdminOrderSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminOrderDetail = {
  id: string;
  orderSeq: number;
  publicId: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  notes: string | null;
  cancellationReason: string | null;
  customer: {
    name: string;
    whatsapp: string;
    email: string;
  };
  items: Array<{
    id: string;
    modelName: string;
    modelCode: string;
    shirtType: string;
    sizeOption: string;
    customSize: string | null;
    customName: string | null;
    customNumber: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  summary: {
    totalQuantity: number;
    subtotal: number;
    totalAmount: number;
  };
  payment: {
    hasReceipt: boolean;
    receipts: Array<{
      id: string;
      uploadedAt: string;
      reviewStatus: string;
      reviewNotes: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      originalFileName: string | null;
    }>;
  };
};



/**
 * Converte o sequencial do pedido para o formato público AV-2026-XXXX
 */
export function formatPublicId(orderSeq: number): string {
  return `AV-2026-${orderSeq.toString().padStart(4, '0')}`;
}

export async function getAdminOrdersInternal(params: {
  page: number;
  pageSize: number;
  search?: string | null | undefined;
  paymentFilter?: string | null | undefined;
  orderFilter?: string | null | undefined;
  sortOrder?: 'asc' | 'desc';
}): Promise<AdminOrderListResponse> {


  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  let query = supabaseAdmin
    .from('av_orders')
    .select(`
      id,
      order_seq,
      customer_name,
      whatsapp,
      total_amount,
      payment_status,
      order_status,
      created_at,
      av_order_items(quantity),
      av_payment_receipts(review_status)
    `, { count: 'exact' });

  // 1. Busca (Busca por Public ID, Nome ou WhatsApp)
  if (params.search) {
    const search = params.search.trim();
    // Tenta detectar se é um Public ID (AV-2026-XXXX)
    const matchPublicId = search.match(/AV-2026-(\d+)/i);
    if (matchPublicId && matchPublicId[1]) {
      const seq = parseInt(matchPublicId[1]);
      query = query.eq('order_seq', seq);

    } else {
      query = query.or(`customer_name.ilike.%${search}%,whatsapp.ilike.%${search}%`);
    }
  }

  // 2. Filtros de Status
  if (params.orderFilter && params.orderFilter !== 'all') {
    query = query.eq('order_status', params.orderFilter);
  }

  if (params.paymentFilter && params.paymentFilter !== 'all') {
    query = query.eq('payment_status', params.paymentFilter);
  }

  // 3. Ordenação
  query = query.order('created_at', { ascending: params.sortOrder === 'asc' });

  // 4. Paginação
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / params.pageSize);

  const orders: AdminOrderSummary[] = (data || []).map(r => {
    const items = r.av_order_items as any[];
    const receipts = r.av_payment_receipts as any[];
    
    let receiptStatus: AdminOrderSummary['receiptStatus'] = 'none';
    if (receipts && receipts.length > 0) {
      receiptStatus = receipts[0].review_status as any;
    }

    return {
      id: r.id,
      orderSeq: r.order_seq,
      publicId: formatPublicId(r.order_seq),
      customerName: r.customer_name,
      whatsapp: r.whatsapp,
      totalAmount: r.total_amount,
      paymentStatus: r.payment_status,
      orderStatus: r.order_status,
      receiptStatus,
      createdAt: r.created_at,
      itemCount: items.reduce((sum, i) => sum + (i.quantity || 0), 0)
    };
  });

  return {
    orders,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages
  };
}

export async function getAdminOrderDetailInternal(orderId: string): Promise<AdminOrderDetail> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { data: order, error } = await supabaseAdmin
    .from('av_orders')
    .select(`
      *,
      av_order_items(*),
      av_payment_receipts(*)
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new Error('ORDER_NOT_FOUND');
    throw error;
  }

  const items = order.av_order_items as any[];
  const rawReceipts = (order.av_payment_receipts as any[]) || [];
  
  // Ordenar recibos por data de envio (mais recente primeiro)
  const receipts = rawReceipts.sort((a, b) => 
    new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  ).map(r => ({
    id: r.id,
    uploadedAt: r.uploaded_at,
    reviewStatus: r.review_status,
    reviewNotes: r.review_notes,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    originalFileName: r.original_file_name
  }));


  return {
    id: order.id,
    orderSeq: order.order_seq,
    publicId: formatPublicId(order.order_seq),
    createdAt: order.created_at,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    notes: order.notes,
    cancellationReason: order.order_status === 'cancelled' ? order.notes : null,
    customer: {
      name: order.customer_name,
      whatsapp: order.whatsapp,
      email: order.customer_email
    },
    items: items.map(i => ({
      id: i.id,
      modelName: i.model_name,
      modelCode: i.model_code,
      shirtType: i.shirt_type,
      sizeOption: i.size_option,
      customSize: i.custom_size,
      customName: i.custom_name,
      customNumber: i.custom_number,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total
    })),
    summary: {
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: order.subtotal,
      totalAmount: order.total_amount
    },
    payment: {
      hasReceipt: receipts.length > 0,
      receipts
    }
  };
}

/**
 * Gera uma Signed URL segura para visualização de um comprovante.
 * Executa validação de IDOR e privilégios administrativos.
 */
export async function getAdminReceiptSignedUrlInternal(orderId: string, receiptId: string): Promise<string> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  // 1. Validar IDOR: O comprovante pertence ao pedido solicitado?
  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from('av_payment_receipts')
    .select('order_id, storage_path, mime_type')
    .eq('id', receiptId)
    .single();

  if (receiptError || !receipt) {
    throw new Error('RECEIPT_NOT_FOUND');
  }

  if (receipt.order_id !== orderId) {
    throw new Error('IDOR_VIOLATION');
  }

  // 2. Validar tipo de conteúdo (segurança extra)
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!receipt.mime_type || !allowedTypes.includes(receipt.mime_type)) {
    throw new Error('UNSUPPORTED_FILE_TYPE');
  }

  // 3. Gerar Signed URL (60 segundos de expiração)
  const { data, error: storageError } = await supabaseAdmin
    .storage
    .from('av-payment-receipts')
    .createSignedUrl(receipt.storage_path, 60);


  if (storageError || !data?.signedUrl) {
    throw new Error('FAILED_TO_GENERATE_SIGNED_URL');
  }

  return data.signedUrl;
}

/**
 * Executa a revisão (aprovação ou rejeição) de um comprovante via RPC atômico.
 */
export async function reviewAdminReceiptInternal(params: {
  orderId: string;
  receiptId: string;
  adminId: string;
  action: 'approve' | 'reject';
  reason?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; code?: string }> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabaseAdmin.rpc('av_admin_review_receipt' as any, {
    p_order_id: params.orderId,
    p_receipt_id: params.receiptId,
    p_admin_id: params.adminId,
    p_action: params.action,
    p_reason: params.reason || null,
    p_notes: params.notes || null
  });



  if (error) {
    console.error('[reviewAdminReceiptInternal] RPC Error:', error);
    throw new Error('FAILED_TO_REVIEW_RECEIPT');
  }

  return data as { success: boolean; code?: string };
}

/**
 * Executa a transição de status operacional de um pedido via RPC atômico.
 */
export async function updateAdminOrderStatusInternal(params: {
  orderId: string;
  adminId: string;
  newStatus: string;
}): Promise<{ success: boolean; code?: string }> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabaseAdmin.rpc('av_admin_update_order_status' as any, {
    p_order_id: params.orderId,
    p_admin_id: params.adminId,
    p_new_status: params.newStatus
  });

  if (error) {
    console.error('[updateAdminOrderStatusInternal] RPC Error:', error);
    throw new Error('FAILED_TO_UPDATE_ORDER_STATUS');
  }

  return data as { success: boolean; code?: string };
}

/**
 * Executa o cancelamento administrativo de um pedido via RPC atômico.
 */
export async function cancelAdminOrderInternal(params: {
  orderId: string;
  adminId: string;
  reasonCode: string;
  reasonText?: string | null;
}): Promise<{ success: boolean; code?: string }> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabaseAdmin.rpc('av_admin_cancel_order' as any, {
    p_order_id: params.orderId,
    p_admin_id: params.adminId,
    p_reason_code: params.reasonCode,
    p_reason_text: params.reasonText || null
  });

  if (error) {
    console.error('[cancelAdminOrderInternal] RPC Error:', error);
    throw new Error('FAILED_TO_CANCEL_ORDER');
  }

  return data as { success: boolean; code?: string };
}




