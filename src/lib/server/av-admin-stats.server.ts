import { Database } from "@/integrations/supabase/types";

export type AdminDashboardStats = {
  totalOrders: number;
  awaitingPayment: number;
  receiptsPending: number;
  paymentsConfirmed: number;
  shirtsSold: number;
  totalOrderValue: number;
  confirmedValue: number;
  // Status Operacionais
  inProduction: number;
  ready: number;
  delivered: number;
  cancelled: number;
  // Pedidos Recentes
  recentOrders: Array<{
    id: string;
    orderSeq: number;
    customerName: string;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
    createdAt: string;
    itemCount: number;
  }>;
};

/**
 * Helper Server-Side para queries agregadas do Dashboard.
 * Utiliza o Supabase Admin para garantir acesso a todas as tabelas.
 */
export async function getDashboardStatsInternal(): Promise<AdminDashboardStats> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  // 1. Contagens de Status de Pedidos e Totais Financeiros
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('av_orders')
    .select('id, order_status, payment_status, total_amount');

  if (ordersError) throw ordersError;

  // 2. Comprovantes em Análise
  const { data: receipts, error: receiptsError } = await supabaseAdmin
    .from('av_payment_receipts')
    .select('order_id, review_status')
    .eq('review_status', 'pending');

  if (receiptsError) throw receiptsError;

  // 3. Total de Camisas Vendidas
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('av_order_items')
    .select('quantity');

  if (itemsError) throw itemsError;

  // 4. Pedidos Recentes
  const { data: recent, error: recentError } = await supabaseAdmin
    .from('av_orders')
    .select(`
      id, 
      order_seq, 
      customer_name, 
      total_amount, 
      payment_status, 
      order_status, 
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) throw recentError;

  // 5. Item counts for recent orders (to avoid N+1 we could join, but for 10 orders a separate query is fine or we can aggregate from items)
  const recentOrderIds = recent.map(r => r.id);
  const { data: recentItems, error: recentItemsError } = await supabaseAdmin
    .from('av_order_items')
    .select('order_id, quantity')
    .in('order_id', recentOrderIds);

  if (recentItemsError) throw recentItemsError;

  const recentItemCounts = recentItems.reduce((acc, item) => {
    acc[item.order_id] = (acc[item.order_id] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Processamento
  const stats: AdminDashboardStats = {
    totalOrders: orders.length,
    awaitingPayment: orders.filter(o => o.payment_status === 'awaiting_payment').length,
    receiptsPending: orders.filter(o => o.payment_status === 'receipt_submitted').length,
    paymentsConfirmed: orders.filter(o => o.payment_status === 'payment_confirmed').length,
    shirtsSold: items.reduce((sum, item) => sum + item.quantity, 0),
    totalOrderValue: orders.reduce((sum, o) => sum + o.total_amount, 0),
    confirmedValue: orders.filter(o => o.payment_status === 'payment_confirmed').reduce((sum, o) => sum + o.total_amount, 0),
    
    inProduction: orders.filter(o => o.order_status === 'in_production').length,
    ready: orders.filter(o => o.order_status === 'ready').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    
    recentOrders: recent.map(r => ({
      id: r.id,
      orderSeq: r.order_seq,
      customerName: r.customer_name,
      totalAmount: r.total_amount,
      paymentStatus: r.payment_status,
      orderStatus: r.order_status,
      createdAt: r.created_at,
      itemCount: recentItemCounts[r.id] || 0
    }))
  };

  return stats;
}
