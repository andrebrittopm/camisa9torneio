/**
 * D. Configuração da Função (Supabase config.toml)
 * 
 * [functions.av-create-order]
 * verify_jwt = false
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || ["http://localhost:8080"];

const MAX_BODY_BYTES = 100 * 1024; // 100KB
const MAX_ITEM_LINES = 50;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app"));
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 19. Edge Function — HTTP Methods
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", 405, corsHeaders);
  if (!isAllowed) return errorResponse("CORS_ERROR", 403, corsHeaders);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();

    // 10 & 11. Validação de Campos Obrigatórios e Proibidos
    const forbidden = ["unit_price", "line_total", "subtotal", "total_amount", "model_code", "model_name", "shirt_type", "order_status", "payment_status", "request_fingerprint"];
    if (forbidden.some(field => field in body)) return errorResponse("INVALID_REQUEST", 400, corsHeaders);

    if (!body.event_id || !body.idempotency_key || !body.customer_name || !body.whatsapp || !Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse("INVALID_REQUEST", 400, corsHeaders);
    }
    
    if (body.items.length > MAX_ITEM_LINES) return errorResponse("TOO_MANY_ITEMS", 400, corsHeaders);

    // 8. Validação Defensiva de Quantity
    for (const item of body.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return errorResponse("INVALID_QUANTITY", 400, corsHeaders);
      }
    }

    // 24. PONTO DE VALIDAÇÃO TURNSTILE (Obrigatório antes de Produção)
    // if (!await validateTurnstile(body.turnstile_token)) return errorResponse("BOT_DETECTED", 403, corsHeaders);

    // 15. G. Fingerprint Canônico Determinístico
    const normalizedItems = body.items.map((item: any) => ({
      shirt_model_id: String(item.shirt_model_id),
      size_option: String(item.size_option),
      custom_size: item.custom_size || null,
      custom_name: item.custom_name || null,
      custom_number: item.custom_number || null,
      quantity: Number(item.quantity)
    })).sort((a: any, b: any) => {
      const keyA = `${a.shirt_model_id}-${a.size_option}-${a.custom_size}-${a.custom_name}-${a.custom_number}-${a.quantity}`;
      const keyB = `${b.shirt_model_id}-${b.size_option}-${b.custom_size}-${b.custom_name}-${b.custom_number}-${b.quantity}`;
      return keyA.localeCompare(keyB);
    });

    const canonicalData = {
      event_id: body.event_id,
      customer_name: body.customer_name,
      whatsapp: body.whatsapp,
      notes: body.notes || null,
      items: normalizedItems
    };

    const fingerprint = await calculateHash(JSON.stringify(canonicalData));

    // 16. Chamada da RPC Atômica
    const { data, error } = await supabaseAdmin.rpc("av_create_order", {
      p_event_id: body.event_id,
      p_customer_name: body.customer_name,
      p_whatsapp: body.whatsapp,
      p_notes: body.notes,
      p_idempotency_key: body.idempotency_key,
      p_request_fingerprint: fingerprint,
      p_items: body.items,
    });

    if (error) {
      // 23. Logs Mínimos (Segurança)
      console.error(`[AV-ERROR] Code: ${error.code} | Key: ${body.idempotency_key}`);
      return mapSqlError(error, corsHeaders);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return errorResponse("INTERNAL_ERROR", 500, corsHeaders);
  }
});

async function calculateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function errorResponse(code: string, status: number, headers: any) {
  return new Response(JSON.stringify({ success: false, error: code }), {
    headers: { ...headers, "Content-Type": "application/json" },
    status,
  });
}

function mapSqlError(error: any, headers: any) {
  const codes: Record<string, number> = {
    "AV001": 409, "AV002": 404, "AV003": 409, "AV004": 409,
    "AV005": 400, "AV006": 400, "AV007": 400, "AV008": 400, "AV009": 400
  };
  return errorResponse(error.code || "INTERNAL_ERROR", codes[error.code] || 500, headers);
}
