import { verifyReceiptAccessToken } from '@/lib/server/av-order-access';
import { createClient } from '@supabase/supabase-js';

/**
 * ETAPA 4.3B — SERVER ROUTE PARA UPLOAD PRIVADO DE COMPROVANTE
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_REQUEST_SIZE = 11 * 1024 * 1024; // 11 MB (overhead multipart)

const ALLOWED_MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2D] // %PDF-
};

function getFileExtension(type: string): string {
  switch (type) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'application/pdf': return 'pdf';
    default: return 'bin';
  }
}

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

export const Route = {
  server: {
    handlers: {
      OPTIONS: async ({ request }: { request: Request }) => {
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);

        if (origin && allowedOrigins.includes(origin)) {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "content-type, x-av-order-id, x-av-receipt-token, x-av-submission-id",
              "Access-Control-Max-Age": "86400",
              "Vary": "Origin"
            },
          });
        }
        return new Response(null, { status: 403 });
      },
      POST: async ({ request }: { request: Request }) => {
        const correlationId = crypto.randomUUID();
        const origin = request.headers.get("origin");
        const allowedOrigins = getAllowedOrigins(request);

        if (!origin || !allowedOrigins.includes(origin)) {
          return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const corsHeaders = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
          "Vary": "Origin"
        };

        // 1. Headers de Autorização (Pre-parsing)
        const orderId = request.headers.get("x-av-order-id");
        const receiptToken = request.headers.get("x-av-receipt-token");
        const submissionId = request.headers.get("x-av-submission-id");

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!orderId || !receiptToken || !submissionId || !uuidRegex.test(orderId) || !uuidRegex.test(submissionId)) {
          return new Response(JSON.stringify({ error: "ORDER_ACCESS_DENIED", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
        }

        // 2. Validar Capability Token
        const isAuthorized = await verifyReceiptAccessToken(orderId, receiptToken);
        if (!isAuthorized) {
          console.warn(`[AV] correlation=${correlationId} stage=auth code=DENIED order=${orderId.substring(0,8)}`);
          return new Response(JSON.stringify({ error: "ORDER_ACCESS_DENIED", correlation_id: correlationId }), { status: 403, headers: corsHeaders });
        }

        // 3. Request Size Limit
        const contentLength = parseInt(request.headers.get("content-length") || "-1");
        if (contentLength > MAX_REQUEST_SIZE) {
          return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), { status: 413, headers: corsHeaders });
        }

        try {
          const formData = await request.formData();
          const file = formData.get("file");

          if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          if (file.size === 0) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders });
          }

          if (file.size > MAX_FILE_SIZE) {
            return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), { status: 413, headers: corsHeaders });
          }

          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);

          // 4. Magic Bytes Validation
          let detectedMime = "";
          const check = (magic: number[]) => magic.every((b, i) => bytes[i] === b);

          if (check(ALLOWED_MAGIC_BYTES.jpeg)) detectedMime = "image/jpeg";
          else if (check(ALLOWED_MAGIC_BYTES.png)) detectedMime = "image/png";
          else if (check(ALLOWED_MAGIC_BYTES.pdf)) detectedMime = "application/pdf";

          if (!detectedMime) {
            return new Response(JSON.stringify({ error: "UNSUPPORTED_FILE_TYPE", correlation_id: correlationId }), { status: 415, headers: corsHeaders });
          }

          // 5. SHA-256
          const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
          const fileSha256 = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

          const ext = getFileExtension(detectedMime);
          const storagePath = `orders/${orderId}/${submissionId}-${fileSha256}.${ext}`;

          const supabaseUrl = process.env['SUPABASE_URL'];
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

          if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

          // 6. Upload to Private Storage
          const { error: uploadError } = await supabaseAdmin.storage
            .from('av-payment-receipts')
            .upload(storagePath, bytes, {
              contentType: detectedMime,
              upsert: true
            });

          if (uploadError) {
            console.error(`[AV] correlation=${correlationId} stage=storage code=UPLOAD_FAILED`);
            return new Response(JSON.stringify({ error: "RECEIPT_STORAGE_UNAVAILABLE", correlation_id: correlationId }), { status: 503, headers: corsHeaders });
          }

          // 7. Call RPC
          const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("av_submit_payment_receipt", {
            p_submission_id: submissionId,
            p_order_id: orderId,
            p_storage_path: storagePath,
            p_mime_type: detectedMime,
            p_size_bytes: bytes.length,
            p_file_sha256: fileSha256
          });

          if (rpcError) {
            // Mapeamento de erros VR
            const sqlState = rpcError.code;
            const vrMap: Record<string, { status: number, code: string, definitive: boolean }> = {
              'VR001': { status: 409, code: 'SUBMISSION_KEY_REUSED', definitive: true },
              'VR002': { status: 404, code: 'ORDER_NOT_FOUND', definitive: true },
              'VR003': { status: 409, code: 'RECEIPT_NOT_ALLOWED', definitive: true },
              'VR004': { status: 409, code: 'PAYMENT_ALREADY_CONFIRMED', definitive: true },
              'VR005': { status: 400, code: 'INVALID_RECEIPT_METADATA', definitive: false }
            };

            const mapped = vrMap[sqlState] || { status: 500, code: 'INTERNAL_ERROR', definitive: false };

            if (mapped.definitive) {
              // Compensação: remover objeto se o erro for de negócio definitivo
              await supabaseAdmin.storage.from('av-payment-receipts').remove([storagePath]);
            }

            return new Response(JSON.stringify({ error: mapped.code, correlation_id: correlationId }), { status: mapped.status, headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            success: true,
            data: {
              payment_status: rpcResult.payment_status,
              review_status: rpcResult.review_status,
              is_duplicate: rpcResult.is_duplicate === true
            }
          }), { status: 200, headers: corsHeaders });

        } catch (err) {
          console.error(`[AV] correlation=${correlationId} stage=fatal code=INTERNAL_ERROR`);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
        }
      }
    }
  }
};
