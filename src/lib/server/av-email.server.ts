import { createClient } from '@supabase/supabase-js';

/**
 * Serviço de E-mail Transacional
 * ETAPA 7.3 — ATIVAÇÃO DE E-MAIL REAL COM SENDGRID
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
 * Helper para escapar HTML básico e prevenir injeção
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Envia e-mail via SendGrid API v3 (Edge Compatible)
 * Implementa timeout e segurança de template
 */
async function sendEmailViaProvider(
  to: string,
  subject: string,
  htmlBody: string,
  eventKey: string,
  correlationId: string
): Promise<ProviderResponse> {
  const apiKey = process.env['SENDGRID_API_KEY'];
  const from = process.env['EMAIL_FROM'];

  if (!apiKey || !from) {
    console.error(`[AV] correlation=${correlationId} stage=config code=SENDGRID_CREDENTIALS_MISSING`);
    return { success: false, error: 'SENDGRID_CREDENTIALS_REQUIRED', retryable: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // API SendGrid v3 Mail Send
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            // SendGrid não tem um header customizado nativo de idempotência como o Resend
            // Mas podemos usar custom_args para rastreamento
            custom_args: {
              event_key: eventKey,
              correlation_id: correlationId
            }
          }
        ],
        from: { email: from, name: "9º Torneio Amigos do Vôlei" },
        subject: subject,
        content: [
          {
            type: 'text/html',
            value: htmlBody
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 202) {
      // SendGrid retorna 202 Accepted em sucesso, mas sem ID de mensagem no body
      // O ID costuma vir no header X-Message-Id se disponível
      const messageId = response.headers.get('X-Message-Id') || `sg-${eventKey}`;
      return { success: true, message_id: messageId };
    }

    // Se houver erro, o corpo contém detalhes
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Failed to parse error response' };
    }
    
    const status = response.status;
    const isRetryable = status >= 500 || status === 429;

    console.error(`[AV] correlation=${correlationId} stage=provider_error code=${status} error=${JSON.stringify(errorData)}`);
    return { success: false, error: `SG_HTTP_${status}`, retryable: isRetryable };

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
  }

  await supabase
    .from('av_email_outbox')
    .update(updates)
    .match({ order_id: orderId, event_type: eventType, event_key: eventKey });
  
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
  
  // Escapando entradas dinâmicas para segurança contra HTML Injection
  const safeName = escapeHtml(name);
  const safeSummary = escapeHtml(summary);
  
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-bottom: 24px;">Olá ${safeName},</h2>
      <p>Seu pedido da <strong>CAMISA OFICIAL</strong> do 9º Torneio Amigos do Vôlei foi recebido com sucesso.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Resumo do Pedido</h3>
        <p style="margin: 8px 0;"><strong>Número:</strong> ${orderNumber}</p>
        <p style="margin: 8px 0;"><strong>Status:</strong> AGUARDANDO PAGAMENTO</p>
        <div style="white-space: pre-wrap; margin-top: 16px; font-family: monospace; font-size: 14px; background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">${safeSummary}</div>
      </div>

      <p style="margin-bottom: 32px;">Para concluir seu pedido, realize o pagamento via PIX conforme as instruções na tela de sucesso ou no link abaixo:</p>
      
      <div style="text-align: center;">
        <a href="${viewUrl}" style="display: inline-block; background: #b45309; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; letter-spacing: 0.025em; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">VISUALIZAR PEDIDO E PAGAR</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; pt-20px;">
        Este link é exclusivo para o seu acesso e é válido por 30 dias.<br />
        Por favor, não compartilhe este e-mail.
      </p>
      <p style="font-size: 14px; font-weight: bold; color: #0f172a;">Equipe 9º Torneio Amigos do Vôlei</p>
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
  const safeName = escapeHtml(name);
  
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-bottom: 24px;">Olá ${safeName},</h2>
      <p>Recebemos o comprovante para o pedido <strong>${orderNumber}</strong>.</p>
      
      <div style="background: #f0fdf4; padding: 24px; border-radius: 12px; border: 1px solid #dcfce7; margin: 24px 0; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">Comprovante recebido e EM ANÁLISE.</p>
        <p style="margin: 8px 0 0; color: #166534; font-size: 14px;">Nossa equipe validará o pagamento em breve.</p>
      </div>

      <p>Você receberá uma nova notificação assim que o pagamento for confirmado e o pedido seguir para produção.</p>
      
      <p style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; font-weight: bold; color: #0f172a;">
        Atenciosamente,<br />Equipe 9º Torneio Amigos do Vôlei
      </p>
    </div>
  `;

  const result = await sendEmailViaProvider(email, subject, htmlBody, eventKey, correlationId);
  
  await updateOutboxStatus(orderId, 'RECEIPT_SUBMITTED', eventKey, result);

  return result;
}
