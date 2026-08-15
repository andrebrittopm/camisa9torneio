import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

/**
 * Serviço de E-mail Transacional
 * ETAPA 4.3C-R1
 */

const ORDER_EVENT_TYPES = {
  ORDER_CREATED: 'ORDER_CREATED',
  RECEIPT_SUBMITTED: 'RECEIPT_SUBMITTED'
};

/**
 * Cria um evento na outbox para envio assíncrono idempotente
 */
export async function queueOrderEmail(orderId: string, eventType: string, recipientEmail: string) {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('av_email_outbox')
    .upsert({
      order_id: orderId,
      event_type: eventType,
      recipient_email: recipientEmail,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'order_id,event_type'
    });

  if (error) {
    console.error(`[AV] stage=email_queue code=OUTBOX_FAILED order=${orderId} error=${error.message}`);
    // Não lançamos erro para não quebrar a transação principal do pedido
  }
}

/**
 * Envia e-mail de confirmação de pedido (Simulação/Mock p/ Auditoria)
 */
export async function sendOrderConfirmationEmail(
  email: string, 
  name: string, 
  orderNumber: string,
  summary: string,
  viewUrl: string,
  correlationId: string
) {
  console.log(`[AV-EMAIL-PROVIDER] correlation=${correlationId} stage=send type=ORDER_CREATED to=${email}`);
  
  // LOG PARA AUDITORIA (Simulação de payload do provedor)
  console.log(`
===== EMAIL TEMPLATE: ORDER_CREATED =====
TO: ${email}
SUBJECT: Pedido Recebido - ${orderNumber}
BODY:
Olá ${name},
Seu pedido ${orderNumber} foi recebido com sucesso.

RESUMO:
${summary}

Acompanhe seu pedido pelo link seguro (válido por 30 dias):
${viewUrl}

Atenciosamente,
Equipe 9º Torneio Amigos do Vôlei
=========================================
  `);

  return { success: true, message_id: `sim_${crypto.randomUUID()}` };
}

/**
 * Envia e-mail de recebimento de comprovante
 */
export async function sendReceiptConfirmationEmail(
  email: string,
  name: string,
  orderNumber: string,
  correlationId: string
) {
  console.log(`[AV-EMAIL-PROVIDER] correlation=${correlationId} stage=send type=RECEIPT_SUBMITTED to=${email}`);
  
  console.log(`
===== EMAIL TEMPLATE: RECEIPT_SUBMITTED =====
TO: ${email}
SUBJECT: Comprovante Recebido - ${orderNumber}
BODY:
Olá ${name},
Recebemos o comprovante para o pedido ${orderNumber}.
O seu pagamento está agora EM ANÁLISE pela nossa equipe.

Você receberá uma nova notificação assim que for confirmado.
=============================================
  `);

  return { success: true, message_id: `sim_${crypto.randomUUID()}` };
}
