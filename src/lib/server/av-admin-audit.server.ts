import { Database } from "@/integrations/supabase/types";
import { formatPublicId } from "./av-admin-orders.server";

export type AdminAuditLog = {
  id: string;
  adminId: string | null;
  adminDisplayName: string | null;
  adminEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  resourcePublicId: string | null;
  correlationId: string;
  createdAt: string;
  metadata: any | null;
};

export type AdminAuditListResponse = {
  logs: AdminAuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Busca paginada de logs de auditoria administrativa.
 */
export async function getAdminAuditLogsInternal(params: {
  page: number;
  pageSize: number;
  search?: string | null | undefined;
  adminFilter?: string | null | undefined;
  actionFilter?: string | null | undefined;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
}): Promise<AdminAuditListResponse> {

  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  let query = supabaseAdmin
    .from('av_admin_audit_logs')
    .select('*', { count: 'exact' });

  // 1. Busca (Search)
  if (params.search) {
    const search = params.search.trim();
    query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%,resource_id.ilike.%${search}%`);
  }

  // 2. Filtros
  if (params.adminFilter && params.adminFilter !== 'all') {
    query = query.eq('admin_user_id', params.adminFilter);
  }

  if (params.actionFilter && params.actionFilter !== 'all') {
    // Mapeamento de categorias de filtros visuais para eventos técnicos
    if (params.actionFilter === 'auth') {
      query = query.ilike('action', 'ADMIN_LOG%');
    } else if (params.actionFilter === 'payment') {
      query = query.or('action.ilike.PAYMENT%,action.ilike.%RECEIPT%');
    } else if (params.actionFilter === 'order') {
      query = query.ilike('action', 'ORDER_%');
    } else if (params.actionFilter === 'cancellation') {
      query = query.eq('action', 'ORDER_CANCELLED');
    } else {
      query = query.eq('action', params.actionFilter);
    }
  }

  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte('created_at', params.dateTo);
  }

  // 3. Ordenação (Sempre mais recente primeiro para auditoria)
  query = query.order('created_at', { ascending: false }).order('id', { ascending: false });

  // 4. Paginação
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / params.pageSize);

  // 5. Enriquecer logs com dados de outras tabelas (sem embedded relation)
  const logs: AdminAuditLog[] = [];
  
  // A) Buscar perfis administrativos em lote
  const adminUserIds = Array.from(new Set((data || [])
    .filter(r => r.admin_user_id)
    .map(r => r.admin_user_id as string)));
    
  let adminProfileMap: Record<string, string> = {};
  if (adminUserIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('av_admin_profiles')
      .select('user_id, display_name')
      .in('user_id', adminUserIds);
      
    if (profiles) {
      profiles.forEach(p => {
        adminProfileMap[p.user_id] = p.display_name;
      });
    }
  }

  // B) Coletar IDs de pedidos para buscar Public IDs em lote
  const orderIds = (data || [])
    .filter(r => r.resource_type === 'order' && r.resource_id)
    .map(r => r.resource_id as string);
    
  let orderMap: Record<string, string> = {};
  if (orderIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from('av_orders')
      .select('id, order_seq')
      .in('id', orderIds);
      
    if (orders) {
      orders.forEach(o => {
        orderMap[o.id] = formatPublicId(o.order_seq);
      });
    }
  }

  (data || []).forEach(r => {
    // Buscar adminDisplayName do mapa de perfis
    const adminDisplayName = r.admin_user_id ? adminProfileMap[r.admin_user_id] : null;
    
    logs.push({
      id: r.id,
      adminId: r.admin_user_id,
      adminDisplayName: adminDisplayName || 'Administrador',
      adminEmail: null, // Mascarado ou omitido por PII
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      resourcePublicId: r.resource_type === 'order' && r.resource_id ? (orderMap[r.resource_id] || null) : null,
      correlationId: r.correlation_id,
      createdAt: r.created_at,
      metadata: r.metadata
    });
  });

  return {
    logs,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages
  };
}

/**
 * Busca lista de administradores para o filtro.
 */
export async function getAdminListForFilterInternal(): Promise<Array<{ id: string, name: string }>> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabaseAdmin
    .from('av_admin_profiles')
    .select('user_id, display_name')
    .eq('active', true)
    .order('display_name');

  if (error) throw error;

  return (data || []).map(p => ({
    id: p.user_id,
    name: p.display_name
  }));
}

/**

 * Registra uma ação administrativa na auditoria.
 */
export async function logAdminAction(params: {
  adminUserId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: any;
  correlationId: string;
}): Promise<void> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  const { error } = await supabaseAdmin.from('av_admin_audit_logs').insert({
    admin_user_id: params.adminUserId || null,
    action: params.action,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    metadata: params.metadata || {},
    correlation_id: params.correlationId
  });

  if (error) {
    console.error(`[logAdminAction] Error inserting audit log:`, error);
    // Não lançamos erro aqui para não interromper o fluxo principal por falha na auditoria
  }
}

