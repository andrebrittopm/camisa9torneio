import { createFileRoute } from '@tanstack/react-router'
import { verifyReceiptAccessToken } from '@/lib/server/av-order-access.server';
import { sendReceiptConfirmationEmail, queueOrderEmail } from '@/lib/server/av-email.server';
import { createClient } from '@supabase/supabase-js';

/**
 * ETAPA 4.3B — SERVER ROUTE PARA UPLOAD PRIVADO DE COMPROVANTE
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (Arquivo Real)
const MAX_REQUEST_SIZE = 11 * 1024 * 1024; // 11MB (Request total com overhead multipart)
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];

function getAllowedOrigins(request: Request): string[] {
  const fromEnv = (process.env['ALLOWED_ORIGINS'] || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  
  let selfOrigin = '';
  try {
    const url = new URL(request.url);
    selfOrigin = url.origin;
  } catch {
    selfOrigin = '';
  }

  return Array.from(new Set([...fromEnv, ...(selfOrigin ? [selfOrigin] : [])]));
}

async function methodNotAllowed(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute('/api/public/av-payment-receipt')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);

        if (origin && allowedOrigins.includes(origin)) {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, x-av-order-id, x-av-receipt-token, x-av-submission-id",
              "Access-Control-Max-Age": "86400",
              "Vary": "Origin"
            },
          });
        }
        return new Response(null, { status: 204 });
      },
      POST: async ({ request }) => {
        const correlationId = crypto.randomUUID();
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);
        const corsHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        };

        if (origin && allowedOrigins.includes(origin)) {
          corsHeaders["Access-Control-Allow-Origin"] = origin;
          corsHeaders["Vary"] = "Origin";
        }

        try {
          // 1. Headers de Contexto
          const orderId = request.headers.get('x-av-order-id');
          const receiptToken = request.headers.get('x-av-receipt-token');
          const submissionId = request.headers.get('x-av-submission-id');

          if (!orderId || !receiptToken || !submissionId) {
            return new Response(JSON.stringify({ error: "MISSING_HEADERS", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          // 2. Verificar Capability Token (HMAC)
          const secret = process.env['AV_ORDER_ACCESS_SECRET'] || '';
          const isValid = await verifyReceiptAccessToken(orderId, receiptToken, secret);
          
          if (!isValid) {
            console.warn(`[AV] correlation=${correlationId} stage=auth code=ACCESS_DENIED order=${orderId}`);
            return new Response(JSON.stringify({ error: "ORDER_ACCESS_DENIED", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
          }

          // 3. Payload Limit & Content Type
          const contentType = request.headers.get('content-type') || '';
          if (!contentType.includes('multipart/form-data')) {
             return new Response(JSON.stringify({ error: "INVALID_CONTENT_TYPE" }), { status: 415, headers: corsHeaders });
          }

          const contentLength = parseInt(request.headers.get('content-length') || '0');
          if (contentLength > MAX_REQUEST_SIZE) {
            return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), { status: 413, headers: corsHeaders });
          }

          // 4. Processar Multipart
          const formData = await request.formData();
          const file = formData.get('file') as File;
          
          if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: "FILE_REQUIRED" }), { status: 400, headers: corsHeaders });
          }

          if (file.size > MAX_FILE_SIZE) {
            return new Response(JSON.stringify({ error: "FILE_TOO_LARGE", correlation_id: correlationId }), { status: 413, headers: corsHeaders });
          }

          // 5. Sniffing de Magic Bytes (Autoridade Final sobre MIME)
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer.slice(0, 8));
          let detectedMime = "";

          // JPEG: FF D8 FF
          if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            detectedMime = "image/jpeg";
          }
          // PNG: 89 50 4E 47 0D 0A 1A 0A
          else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && 
                   bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
            detectedMime = "image/png";
          }
          // PDF: 25 50 44 46 2D
          else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D) {
            detectedMime = "application/pdf";
          }

          if (!detectedMime || !ALLOWED_MIMES.includes(detectedMime)) {
            console.warn(`[AV] correlation=${correlationId} stage=validation code=INVALID_MAGIC_BYTES detected=${detectedMime || 'unknown'}`);
            return new Response(JSON.stringify({ error: "UNSUPPORTED_FILE_TYPE", correlation_id: correlationId }), { status: 415, headers: corsHeaders });
          }

          // 6. Integridade (SHA-256)
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

          // 7. Config Supabase Admin
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          // 8. Upload para Storage (Private Bucket)
          const fileExt = detectedMime.split('/')[1] || 'bin';
          const storagePath = `${orderId}/${submissionId}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('av-payment-receipts')
            .upload(storagePath, arrayBuffer, {
              contentType: detectedMime,
              upsert: true
            });

          if (uploadError) {
            console.error(`[AV] correlation=${correlationId} stage=storage code=UPLOAD_FAILED error=${uploadError.message}`);
            return new Response(JSON.stringify({ error: "UPLOAD_FAILED", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          // 9. Registro Atômico na Database via RPC
          const { data: rpcResult, error: rpcError } = await supabase.rpc('av_submit_payment_receipt', {
            p_submission_id: submissionId,
            p_order_id: orderId,
            p_storage_path: storagePath,
            p_mime_type: detectedMime,
            p_size_bytes: file.size,
            p_file_sha256: hashHex
          });

          if (rpcError) {
            // Compensação: Deletar arquivo se falhar no DB
            await supabase.storage.from('av-payment-receipts').remove([storagePath]);
            
            console.error(`[AV] correlation=${correlationId} stage=db code=RPC_FAILED error=${rpcError.message} sqlstate=${rpcError.code}`);
            
            // Mapear erros de negócio da RPC
            const status = rpcError.code === 'VR001' ? 409 : (rpcError.code.startsWith('VR') ? 400 : 500);
            return new Response(JSON.stringify({ 
              error: rpcError.message || "DB_REGISTRATION_FAILED", 
              code: rpcError.code,
              correlation_id: correlationId 
            }), { status, headers: corsHeaders });
          }

          // 10. Disparar E-mail de Recebimento (Async Outbox + Provider)
          const customerEmail = rpcResult?.customer_email || '';
          
          if (rpcResult && !rpcResult.is_duplicate) {
            // Enqueue na outbox via server-side helper (idempotência pelo submission_id)
            if (customerEmail) {
              queueOrderEmail(orderId, 'RECEIPT_SUBMITTED', submissionId, customerEmail)
                .catch(err => console.error(`[AV] correlation=${correlationId} stage=outbox code=QUEUE_FAILED error=${err}`));

              // Tentativa de envio imediato
              supabase.from('av_orders')
                .select('customer_name, order_seq, event_year')
                .eq('id', orderId)
                .single()
                .then(({ data: orderData }) => {
                  if (orderData) {
                    const displayNum = `AV-${orderData.event_year}-${String(orderData.order_seq).padStart(4, '0')}`;
                    sendReceiptConfirmationEmail(
                      customerEmail, 
                      orderData.customer_name, 
                      displayNum, 
                      correlationId,
                      orderId,
                      submissionId
                    ).catch(err => console.error(`[AV] correlation=${correlationId} stage=email_receipt code=ASYNC_FAILED error=${err}`));
                  }
                });
            }
          }

          // 11. Sanitizar Resposta Pública (Data Privacy)
          const publicReceiptResult = {
            payment_status: rpcResult?.payment_status,
            review_status: rpcResult?.review_status,
            is_duplicate: Boolean(rpcResult?.is_duplicate)
          };

          // 12. Validar Response Contract
          if (!publicReceiptResult.payment_status || !publicReceiptResult.review_status || typeof publicReceiptResult.is_duplicate !== 'boolean') {
            console.error(`[AV] correlation=${correlationId} stage=response_validation code=INVALID_RPC_RESPONSE data=${JSON.stringify(publicReceiptResult)}`);
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            success: true,
            data: publicReceiptResult,
            correlation_id: correlationId
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          console.error(`[AV] correlation=${correlationId} stage=fatal code=INTERNAL_ERROR error=${err instanceof Error ? err.message : 'Unknown'}`);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }
      },
      GET: async ({ request }) => methodNotAllowed({}),
      PUT: async ({ request }) => methodNotAllowed({}),
      PATCH: async ({ request }) => methodNotAllowed({}),
      DELETE: async ({ request }) => methodNotAllowed({}),
    }
  }
});
