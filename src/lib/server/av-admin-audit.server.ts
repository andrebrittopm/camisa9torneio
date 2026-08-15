import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * Helper para registro de auditoria administrativa.
 * Centralizado para garantir consistência e evitar PII/Segredos.
 */

export async function logAdminAction(params: {
  adminUserId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: any;
  correlationId: string;
}) {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Sanitização de metadados: remover chaves sensíveis conhecidas
  const sanitizedMetadata = { ...params.metadata };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'refresh_token', 'access_token', 'jwt'];
  
  Object.keys(sanitizedMetadata).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      delete sanitizedMetadata[key];
    }
  });

  const { error } = await supabase
    .from('av_admin_audit_logs')
    .insert({
      admin_user_id: params.adminUserId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      metadata: sanitizedMetadata,
      correlation_id: params.correlationId
    });

  if (error) {
    console.error(`[AV-AUDIT] Falha ao registrar log: ${error.message}`, { action: params.action, correlationId: params.correlationId });
  }
}
