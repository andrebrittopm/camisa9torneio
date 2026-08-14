import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Será restringido ao domínio oficial em produção
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * E. Código TypeScript da Edge Function av-create-order
 * 
 * D. Configuração Necessária:
 * verify_jwt: false
 * auth: 'none' (chamada pública)
 */

serve(async (req) => {
  // Tratamento de CORS / OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();

    // 1. Validação de Idempotency Key (vinda do cliente)
    if (!body.idempotency_key) {
      return errorResponse("INVALID_REQUEST", 400);
    }

    // 2. Placeholder para Futura Validação de Turnstile
    // if (!await validateTurnstile(body.turnstile_token)) return errorResponse("UNAUTHORIZED", 401);

    // 3. Construção do Fingerprint Canônico (exclui preços e status)
    const canonicalPayload = {
      event_id: body.event_id,
      customer_name: body.customer_name,
      whatsapp: body.whatsapp,
      notes: body.notes || null,
      items: (body.items || []).map((item: any) => ({
        shirt_model_id: item.shirt_model_id,
        size_option: item.size_option,
        custom_size: item.custom_size || null,
        custom_name: item.custom_name || null,
        custom_number: item.custom_number || null,
        quantity: item.quantity
      })).sort((a: any, b: any) => a.shirt_model_id.localeCompare(b.shirt_model_id))
    };

    const fingerprint = await calculateHash(JSON.stringify(canonicalPayload));

    // 4. Chamada da RPC Transacional
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
      console.error("RPC Error:", error);
      return mapSqlError(error);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Unexpected Error:", err);
    return errorResponse("INTERNAL_ERROR", 500);
  }
});

async function calculateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: code }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function mapSqlError(error: any) {
  const codeMap: Record<string, { code: string; status: number }> = {
    "P0001": { code: "IDEMPOTENCY_KEY_REUSED", status: 409 },
    "P0002": { code: "EVENT_NOT_AVAILABLE", status: 409 },
    "P0003": { code: "INVALID_REQUEST", status: 400 },
    "P0004": { code: "INVALID_QUANTITY", status: 400 },
    "P0005": { code: "INVALID_MODEL", status: 400 },
    "P0006": { code: "CUSTOM_SIZE_NOT_ALLOWED", status: 400 },
    "P0007": { code: "INVALID_SIZE_OPTION", status: 400 },
  };

  const mapped = codeMap[error.code] || { code: "INTERNAL_ERROR", status: 500 };
  return errorResponse(mapped.code, mapped.status);
}
