import { createClient } from "@supabase/supabase-js";

/**
 * MOTOR SEGURO DE PEDIDOS - ETAPA 3.1
 * 
 * Este arquivo contém a implementação completa da Edge Function
 * para processamento de pedidos do 9º Torneio Amigos do Vôlei.
 * 
 * SEGURANÇA:
 * - Limite de tamanho de body (64KB).
 * - CORS Allowlist rígida.
 * - Fingerprinting SHA-256 canônico.
 * - Chamada RPC via service_role.
 * - Validação exaustiva de tipos e valores.
 */

// 1. CONFIGURAÇÕES E LIMITES
const MAX_BODY_BYTES = 64 * 1024; // 64 KB
const MAX_ITEM_LINES = 50; // Proteção técnica
const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] || "http://localhost:8080").split(",").map(o => o.trim());

// 2. MAPA DE ERROS (AV-SQLSTATE -> HTTP)
const ERROR_MAP: Record<string, { message: string, status: number }> = {
  "AV001": { message: "IDEMPOTENCY_KEY_REUSED", status: 409 },
  "AV002": { message: "EVENT_NOT_FOUND", status: 404 },
  "AV003": { message: "EVENT_NOT_AVAILABLE", status: 409 },
  "AV004": { message: "ORDER_DEADLINE_EXCEEDED", status: 409 },
  "AV005": { message: "INVALID_REQUEST", status: 400 },
  "AV006": { message: "INVALID_QUANTITY", status: 400 },
  "AV007": { message: "INVALID_MODEL", status: 400 },
  "AV008": { message: "CUSTOM_SIZE_NOT_ALLOWED", status: 400 },
  "AV009": { message: "INVALID_SIZE_OPTION", status: 400 },
  // Erros da Edge Function
  "INVALID_JSON": { message: "INVALID_JSON", status: 400 },
  "PAYLOAD_TOO_LARGE": { message: "PAYLOAD_TOO_LARGE", status: 413 },
  "METHOD_NOT_ALLOWED": { message: "METHOD_NOT_ALLOWED", status: 405 },
  "CORS_ERROR": { message: "CORS_ERROR", status: 403 },
  "INTERNAL_ERROR": { message: "INTERNAL_ERROR", status: 500 },
};

// 3. HELPERS DE SEGURANÇA E VALIDAÇÃO

async function calculateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidUUID(uuid: any): boolean {
  if (typeof uuid !== "string") return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

function errorResponse(code: string, corsHeaders: any) {
  const err = ERROR_MAP[code] || ERROR_MAP["INTERNAL_ERROR"];
  return new Response(JSON.stringify({ success: false, error: err.message, code }), {
    status: err.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// 4. HANDLER PRINCIPAL (LÓGICA DA EDGE FUNCTION)

export async function handleCreateOrder(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validação de Método
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", corsHeaders);
  }

  // Validação de CORS
  if (!isAllowed) {
    return errorResponse("CORS_ERROR", corsHeaders);
  }

  // 5. VALIDAÇÃO DE TAMANHO DO BODY
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("PAYLOAD_TOO_LARGE", corsHeaders);
  }

  try {
    // Leitura segura do body (com limite técnico)
    const reader = req.body?.getReader();
    if (!reader) return errorResponse("INVALID_REQUEST", corsHeaders);

    let bodyText = "";
    let bytesRead = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      if (bytesRead > MAX_BODY_BYTES) {
        return errorResponse("PAYLOAD_TOO_LARGE", corsHeaders);
      }
      bodyText += new TextDecoder().decode(value);
    }

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return errorResponse("INVALID_JSON", corsHeaders);
    }

    // 6. VALIDAÇÃO TOP-LEVEL COMPLETA
    if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("INVALID_REQUEST", corsHeaders);

    // Campos Proibidos (Top Level)
    const forbidden = ["unit_price", "line_total", "subtotal", "total_amount", "model_code", "model_name", "shirt_type", "order_status", "payment_status", "request_fingerprint"];
    if (forbidden.some(field => field in body)) return errorResponse("INVALID_REQUEST", corsHeaders);

    // Campos Obrigatórios e Tipos
    if (!isValidUUID(body.event_id)) return errorResponse("INVALID_REQUEST", corsHeaders);
    if (!isValidUUID(body.idempotency_key)) return errorResponse("INVALID_REQUEST", corsHeaders);
    
    if (typeof body.customer_name !== "string" || body.customer_name.trim().length === 0) return errorResponse("INVALID_REQUEST", corsHeaders);
    if (typeof body.whatsapp !== "string" || body.whatsapp.trim().length === 0) return errorResponse("INVALID_REQUEST", corsHeaders);
    
    // Notes: null, undefined ou string
    if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") return errorResponse("INVALID_REQUEST", corsHeaders);

    // Items validation
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEM_LINES) return errorResponse("INVALID_REQUEST", corsHeaders);

    // 7. VALIDAÇÃO DE CADA ITEM
    const validatedItems = [];
    for (const item of body.items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return errorResponse("INVALID_REQUEST", corsHeaders);

      // Campos Proibidos dentro do Item
      const forbiddenItemFields = [...forbidden, "event_id", "order_id"];
      if (forbiddenItemFields.some(f => f in item)) return errorResponse("INVALID_REQUEST", corsHeaders);

      if (!isValidUUID(item.shirt_model_id)) return errorResponse("INVALID_REQUEST", corsHeaders);
      if (typeof item.size_option !== "string" || item.size_option.trim().length === 0) return errorResponse("INVALID_REQUEST", corsHeaders);

      // Quantity: rigoroso (number, finite, integer, > 0, <= integer limit)
      const qty = item.quantity;
      if (typeof qty !== "number" || !Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0 || qty > 2147483647) {
        return errorResponse("INVALID_QUANTITY", corsHeaders);
      }

      // Opcionais: null, undefined ou string
      const validateOptionalString = (val: any) => val === undefined || val === null || typeof val === "string";
      if (!validateOptionalString(item.custom_size)) return errorResponse("INVALID_REQUEST", corsHeaders);
      if (!validateOptionalString(item.custom_name)) return errorResponse("INVALID_REQUEST", corsHeaders);
      if (!validateOptionalString(item.custom_number)) return errorResponse("INVALID_REQUEST", corsHeaders);

      // Normalização consistente
      const normalize = (val: any) => (val === undefined ? null : val);

      validatedItems.push({
        shirt_model_id: item.shirt_model_id,
        size_option: item.size_option,
        custom_size: normalize(item.custom_size),
        custom_name: normalize(item.custom_name),
        custom_number: normalize(item.custom_number),
        quantity: qty
      });
    }

    // 8. FINGERPRINT CANÔNICO SHA-256
    // Ordenar itens por chave composta robusta (JSON stringified array)
    const sortedItems = [...validatedItems].sort((a, b) => {
      const keyA = JSON.stringify([a.shirt_model_id, a.size_option, a.custom_size, a.custom_name, a.custom_number, a.quantity]);
      const keyB = JSON.stringify([b.shirt_model_id, b.size_option, b.custom_size, b.custom_name, b.custom_number, b.quantity]);
      return keyA.localeCompare(keyB);
    });

    const canonicalPayload = {
      event_id: body.event_id,
      customer_name: body.customer_name,
      whatsapp: body.whatsapp,
      notes: body.notes === undefined ? null : body.notes,
      items: sortedItems
    };

    const fingerprint = await calculateHash(JSON.stringify(canonicalPayload));

    // 9. EXECUÇÃO RPC VIA SERVICE_ROLE
    const supabaseAdmin = createClient(
      process.env['SUPABASE_URL'] || "",
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.rpc("av_create_order", {
      p_event_id: body.event_id,
      p_customer_name: body.customer_name,
      p_whatsapp: body.whatsapp,
      p_notes: body.notes === undefined ? null : body.notes,
      p_idempotency_key: body.idempotency_key,
      p_request_fingerprint: fingerprint,
      p_items: validatedItems
    });

    if (error) {
      // Log seguro (sem PII)
      console.error(`[AV-RPC-ERROR] SQLSTATE: ${error.code} | IDEMP: ${body.idempotency_key}`);
      return errorResponse(error.code, corsHeaders);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[AV-INTERNAL-ERROR]", err);
    return errorResponse("INTERNAL_ERROR", corsHeaders);
  }
}
