import { createClient } from 'npm:@supabase/supabase-js@2'

// ETAPA 3.2B-1 — CONSTRUÇÃO ESTÁTICA DA EDGE FUNCTION
// OBJETIVO: Criar o código local completo da função: av-create-order

const MAX_BODY_BYTES = 64 * 1024 // 64 KB
const MAX_ITEM_LINES = 50

const ALLOWED_FIELDS = [
  'event_id',
  'customer_name',
  'whatsapp',
  'notes',
  'idempotency_key',
  'items',
]

const PROHIBITED_FIELDS = [
  'unit_price',
  'line_total',
  'subtotal',
  'total_amount',
  'model_code',
  'model_name',
  'shirt_type',
  'order_status',
  'payment_status',
  'request_fingerprint',
]

const ITEM_ALLOWED_FIELDS = [
  'shirt_model_id',
  'size_option',
  'custom_size',
  'custom_name',
  'custom_number',
  'quantity',
]

const ITEM_PROHIBITED_FIELDS = [
  'unit_price',
  'line_total',
  'model_code',
  'model_name',
  'shirt_type',
  'event_id',
  'order_id',
  'request_fingerprint',
  'subtotal',
  'total_amount',
  'order_status',
  'payment_status',
]

const SQLSTATE_MAP: Record<string, { status: number; code: string }> = {
  'AV001': { status: 409, code: 'IDEMPOTENCY_KEY_REUSED' },
  'AV002': { status: 404, code: 'EVENT_NOT_FOUND' },
  'AV003': { status: 409, code: 'EVENT_NOT_AVAILABLE' },
  'AV004': { status: 409, code: 'ORDER_DEADLINE_EXCEEDED' },
  'AV005': { status: 400, code: 'INVALID_REQUEST' },
  'AV006': { status: 400, code: 'INVALID_QUANTITY' },
  'AV007': { status: 400, code: 'INVALID_MODEL' },
  'AV008': { status: 400, code: 'CUSTOM_SIZE_NOT_ALLOWED' },
  'AV009': { status: 400, code: 'INVALID_SIZE_OPTION' },
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID()

  // 1. CORS Preflight
  const origin = req.headers.get("origin")
  const allowedOriginsStr = Deno.env.get("ALLOWED_ORIGINS") || ""
  const allowedOrigins = allowedOriginsStr.split(",").filter(Boolean)

  if (req.method === "OPTIONS") {
    if (origin && allowedOrigins.includes(origin)) {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
        },
      })
    }
    return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. CORS & Origin Validation
  if (!origin || !allowedOrigins.includes(origin)) {
    console.error(`[AV] correlation=${correlationId} stage=cors code=CORS_ERROR origin=${origin}`)
    return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 3. Method Validation
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), {
      status: 405,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin 
      },
    })
  }

  try {
    // 4. Secrets Validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[AV] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
      return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    // 5. Body Limit & UTF-8 Stream
    const contentLength = parseInt(req.headers.get("content-length") || "-1")
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), {
        status: 413,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    const reader = req.body?.getReader()
    if (!reader) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    let bodyText = ""
    let bytesRead = 0
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        bodyText += decoder.decode()
        break
      }
      bytesRead += value.length
      if (bytesRead > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), {
          status: 413,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin 
          },
        })
      }
      bodyText += decoder.decode(value, { stream: true })
    }

    // 6. JSON Parsing & Structure Validation
    let payload: any
    try {
      payload = JSON.parse(bodyText)
    } catch {
      return new Response(JSON.stringify({ error: "INVALID_JSON", correlation_id: correlationId }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    // 7. Field Validations (Top-Level)
    const payloadKeys = Object.keys(payload)
    if (payloadKeys.some(k => !ALLOWED_FIELDS.includes(k) || PROHIBITED_FIELDS.includes(k))) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    // SECURITY GATE:
    // TODO ETAPA 3.3 — validar Cloudflare Turnstile
    // server-side ANTES da chamada à RPC.

    // TODO ETAPA 3.3 — rate limiting server-side.

    const { event_id, customer_name, whatsapp, notes, idempotency_key, items } = payload

    if (!event_id || !UUID_REGEX.test(event_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
    if (!idempotency_key || !UUID_REGEX.test(idempotency_key)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
    
    if (typeof customer_name !== "string" || customer_name.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
    if (typeof whatsapp !== "string" || whatsapp.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
    
    if (notes !== undefined && notes !== null && typeof notes !== "string") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEM_LINES) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    // 8. Items Validation & Normalization
    const validatedItems = []
    for (const item of items) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
      }

      const itemKeys = Object.keys(item)
      if (itemKeys.some(k => !ITEM_ALLOWED_FIELDS.includes(k) || ITEM_PROHIBITED_FIELDS.includes(k))) {
        return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
      }

      const { shirt_model_id, size_option, custom_size, custom_name, custom_number, quantity } = item

      if (!shirt_model_id || !UUID_REGEX.test(shirt_model_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
      if (typeof size_option !== "string" || size_option.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })

      if (typeof quantity !== "number" || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
        return new Response(JSON.stringify({ error: "INVALID_QUANTITY", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
      }

      const validateOptionalString = (v: any) => (v === undefined || v === null || typeof v === "string")
      if (!validateOptionalString(custom_size) || !validateOptionalString(custom_name) || !validateOptionalString(custom_number)) {
        return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } })
      }

      validatedItems.push({
        shirt_model_id,
        size_option: size_option.trim(),
        custom_size: custom_size === undefined ? null : custom_size,
        custom_name: custom_name === undefined ? null : custom_name,
        custom_number: custom_number === undefined ? null : custom_number,
        quantity
      })
    }

    // 9. Canonical Fingerprint Generation
    const sortedItems = [...validatedItems].sort((a, b) => {
      const keyA = JSON.stringify([a.shirt_model_id, a.size_option, a.custom_size, a.custom_name, a.custom_number, a.quantity])
      const keyB = JSON.stringify([b.shirt_model_id, b.size_option, b.custom_size, b.custom_name, b.custom_number, b.quantity])
      return keyA.localeCompare(keyB)
    })

    const canonicalPayload = {
      event_id,
      customer_name: customer_name.trim(),
      whatsapp: whatsapp.trim(),
      notes: notes === undefined ? null : notes,
      items: sortedItems
    }

    const encoder = new TextEncoder()
    const dataToHash = encoder.encode(JSON.stringify(canonicalPayload))
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataToHash)
    const fingerprint = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    // 10. RPC Call (Service Role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabaseAdmin.rpc("av_create_order", {
      p_event_id: event_id,
      p_customer_name: customer_name.trim(),
      p_whatsapp: whatsapp.trim(),
      p_notes: notes === undefined ? null : notes,
      p_idempotency_key: idempotency_key,
      p_request_fingerprint: fingerprint,
      p_items: validatedItems
    })

    if (error) {
      const mapped = SQLSTATE_MAP[error.code]
      if (mapped) {
        console.warn(`[AV] correlation=${correlationId} stage=rpc code=${error.code}`)
        return new Response(JSON.stringify({ error: mapped.code, correlation_id: correlationId }), {
          status: mapped.status,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin 
          },
        })
      }
      console.error(`[AV] correlation=${correlationId} stage=rpc code=UNKNOWN_ERROR sqlstate=${error.code}`)
      return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      })
    }

    // 11. Success Response (Sanitized)
    return new Response(JSON.stringify({
      success: true,
      data: {
        order_id: data.order_id,
        order_seq: data.order_seq,
        display_order_number: data.display_order_number,
        event_year: data.event_year,
        customer_name: data.customer_name,
        total_quantity: data.total_quantity,
        subtotal: data.subtotal,
        total_amount: data.total_amount,
        order_status: data.order_status,
        payment_status: data.payment_status,
        is_duplicate: data.is_duplicate || false
      }
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin 
      },
    })

  } catch (err) {
    console.error(`[AV] correlation=${correlationId} stage=fatal code=INTERNAL_ERROR`)
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin 
      },
    })
  }
})
