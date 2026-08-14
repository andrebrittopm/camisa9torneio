import { createFileRoute } from '@tanstack/react-router'
import { verifyReceiptAccessToken } from '@/lib/server/av-order-access.server';
import { createClient } from '@supabase/supabase-js';

/**
 * ETAPA 4.3B — SERVER ROUTE PARA UPLOAD PRIVADO DE COMPROVANTE
 */

const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
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
          if (contentLength > MAX_PAYLOAD_SIZE) {
            return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }), { status: 413, headers: corsHeaders });
          }

          // 4. Processar Multipart
          const formData = await request.formData();
          const file = formData.get('file') as File;
          
          if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: "FILE_REQUIRED" }), { status: 400, headers: corsHeaders });
          }

          if (!ALLOWED_MIMES.includes(file.type)) {
            return new Response(JSON.stringify({ error: "UNSUPPORTED_FILE_TYPE" }), { status: 415, headers: corsHeaders });
          }

          // 5. Integridade (SHA-256)
          const arrayBuffer = await file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

          // 6. Config Supabase Admin
          const supabaseUrl = process.env['SUPABASE_URL']!;
          const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          // 7. Upload para Storage (Private Bucket)
          const fileExt = file.type.split('/')[1] || 'bin';
          const storagePath = `${orderId}/${submissionId}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('av-payment-receipts')
            .upload(storagePath, arrayBuffer, {
              contentType: file.type,
              upsert: true
            });

          if (uploadError) {
            console.error(`[AV] correlation=${correlationId} stage=storage code=UPLOAD_FAILED error=${uploadError.message}`);
            return new Response(JSON.stringify({ error: "UPLOAD_FAILED", correlation_id: correlationId }), { status: 500, headers: corsHeaders });
          }

          // 8. Registro Atômico na Database via RPC
          const { data: rpcResult, error: rpcError } = await supabase.rpc('av_submit_payment_receipt', {
            p_submission_id: submissionId,
            p_order_id: orderId,
            p_storage_path: storagePath,
            p_mime_type: file.type,
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

          return new Response(JSON.stringify({
            success: true,
            data: rpcResult,
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
