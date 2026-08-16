import { createClient } from '@supabase/supabase-js';

/**
 * Serviço de E-mail Transacional
 * ETAPA 4.3C-R3 — PROVIDER REAL + OUTBOX IDEMPOTENTE
 */

/**
 * Interface para o resultado do envio pelo provedor
 */
interface ProviderResponse {
  success: boolean;
  message_id?: string;
  error?: string;
  retryable?: boolean;
}

/**
 * Envia e-mail via Resend API (Edge Compatible)
 * Implementa timeout e idempotência via header X-Entity-Ref-ID
 */
async function sendEmailViaProvider(
  to: string,
  subject: string,
  htmlBody: string,
  eventKey: string,
  correlationId: string
): Promise<ProviderResponse> {
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'];

  if (!apiKey || !from) {
    return { success: false, error: 'EMAIL_PROVIDER_REQUIRED', retryable: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: htmlBody,
        headers: {
          'X-Entity-Ref-ID': eventKey
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as { id: string };
      return { success: true, message_id: data.id };
    }

    const errorData = await response.json() as any;
    const status = response.status;
    const isRetryable = status >= 500 || status === 429;

    console.error(`[AV] correlation=${correlationId} stage=provider_error code=${status} error=${JSON.stringify(errorData)}`);
    return { success: false, error: `HTTP_${status}`, retryable: isRetryable };

  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    console.error(`[AV] correlation=${correlationId} stage=provider_fatal error=${isTimeout ? 'TIMEOUT' : err.message}`);
    return { success: false, error: isTimeout ? 'TIMEOUT' : 'FATAL', retryable: true };
  }
}

/**
 * Atualiza o status da outbox após tentativa de envio
 */
async function updateOutboxStatus(
  orderId: string,
  eventType: string,
  eventKey: string,
  result: ProviderResponse
) {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const updates: any = {
    updated_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString()
  };

  if (result.success) {
    updates.status = 'sent';
    updates.sent_at = new Date().toISOString();
    updates.provider_message_id = result.message_id;
  } else {
    updates.status = result.retryable ? 'retryable' : 'failed';
    // Incremento de attempt_count deve ser feito via RPC ou lido/somado
    // Como estamos em server side, faremos um select rápido ou usaremos o supabase.rpc se existir
    // Simplificando para este contexto de hardening:
  }

  await supabase
    .from('av_email_outbox')
    .update(updates)
    .match({ order_id: orderId, event_type: eventType, event_key: eventKey });
  
  // Nota: O attempt_count incrementado idealmente seria via RPC para atomicidade
  if (!result.success) {
     await supabase.rpc('av_increment_outbox_attempts', {
       p_order_id: orderId,
       p_event_type: eventType,
       p_event_key: eventKey
     });
  }
}

/**
 * Cria um evento na outbox para envio assíncrono idempotente
 */
export async function queueOrderEmail(
  orderId: string, 
  eventType: string, 
  eventKey: string,
  recipientEmail: string
) {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('av_email_outbox')
    .upsert({
      order_id: orderId,
      event_type: eventType,
      event_key: eventKey,
      recipient_email: recipientEmail,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'order_id,event_type,event_key'
    });

  if (error) {
    console.error(`[AV] stage=email_queue code=OUTBOX_FAILED order=${orderId} event=${eventType}:${eventKey}`);
  }
}

/**
 * Envia e-mail de confirmação de pedido
 */
export async function sendOrderConfirmationEmail(
  email: string, 
  name: string, 
  orderNumber: string,
  summary: string,
  viewUrl: string,
  correlationId: string,
  orderId: string,
  eventKey: string
) {
  const subject = `Pedido Recebido - ${orderNumber}`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Olá ${name},</h2>
      <p>Seu pedido da <strong>CAMISA OFICIAL</strong> (${orderNumber}) foi recebido com sucesso.</p>
      <hr />
      <h3>Resumo do Pedido:</h3>
      <pre style="background: #f4f4f4; pading: 15px; border-radius: 8px;">${summary}</pre>
      <hr />
      <p>Acompanhe seu pedido pelo link seguro (válido por 30 dias):</p>
      <p><a href="${viewUrl}" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visualizar Pedido</a></p>
      <p>Atenciosamente,<br />Equipe 9º Torneio Amigos do Vôlei</p>
    </div>
  `;

  const result = await sendEmailViaProvider(email, subject, htmlBody, eventKey, correlationId);
  
  await updateOutboxStatus(orderId, 'ORDER_CREATED', eventKey, result);

  return result;
}

/**
 * Envia e-mail de recebimento de comprovante
 */
export async function sendReceiptConfirmationEmail(
  email: string,
  name: string,
  orderNumber: string,
  correlationId: string,
  orderId: string,
  eventKey: string
) {
  const subject = `Comprovante Recebido - ${orderNumber}`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Olá ${name},</h2>
      <p>Recebemos o comprovante para o pedido <strong>${orderNumber}</strong>.</p>
      <p>O seu pagamento está agora <strong>EM ANÁLISE</strong> pela nossa equipe.</p>
      <p>Você receberá uma nova notificação assim que for confirmado.</p>
      <p>Atenciosamente,<br />Equipe 9º Torneio Amigos do Vôlei</p>
    </div>
  `;

  const result = await sendEmailViaProvider(email, subject, htmlBody, eventKey, correlationId);
  
  await updateOutboxStatus(orderId, 'RECEIPT_SUBMITTED', eventKey, result);

  return result;
}
