import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

/**
 * ETAPA 3.3A-1 — PROPOSTA DE SERVER ROUTE COM TURNSTILE
 * AUDITORIA: Somente para visualização do código final integrado.
 */

const MAX_BODY_BYTES = 64 * 1024 // 64 KB
const MAX_ITEM_LINES = 50

const ALLOWED_FIELDS = [
  'event_id',
  'customer_name',
  'whatsapp',
  'notes',
  'idempotency_key',
  'items',
  'turnstile_token', // 2. CAMPO NOVO
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

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UUID_REGEX.test(value)
  )
}

function isValidRpcData(value: unknown): value is {
  order_id: string;
  order_seq: number;
  display_order_number: string;
  event_year: number;
  customer_name: string;
  total_quantity: number;
  subtotal: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  is_duplicate: boolean;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as any;
  return (
    isValidUuid(v.order_id) &&
    typeof v.order_seq === 'number' && Number.isSafeInteger(v.order_seq) && v.order_seq > 0 &&
    typeof v.display_order_number === 'string' && v.display_order_number !== '' &&
    typeof v.event_year === 'number' && Number.isInteger(v.event_year) &&
    typeof v.customer_name === 'string' &&
    typeof v.total_quantity === 'number' && Number.isSafeInteger(v.total_quantity) && v.total_quantity >= 0 &&
    typeof v.subtotal === 'number' && Number.isFinite(v.subtotal) &&
    typeof v.total_amount === 'number' && Number.isFinite(v.total_amount) &&
    typeof v.order_status === 'string' && v.order_status !== '' &&
    typeof v.payment_status === 'string' && v.payment_status !== '' &&
    typeof v.is_duplicate === 'boolean'
  );
}

function getAllowedOrigins(request: Request): string[] {
  const fromEnv = (process.env['ALLOWED_ORIGINS'] || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  
  let selfOrigin = ''
  try {
    const url = new URL(request.url)
    selfOrigin = url.origin
  } catch {
    selfOrigin = ''
  }

  const allowed = Array.from(new Set([
    ...fromEnv, 
    ...(selfOrigin ? [selfOrigin] : [])
  ]))
  return allowed
}

// ---------------------------------------------------------
// TURNSTILE VERIFICATION HELPER (INLINED OR IMPORTED)
// ---------------------------------------------------------
async function verifyTurnstileToken(
  token: string,
  secretKey: string | undefined,
  correlationId: string,
  expectedHostnames: string[] = [],
  expectedAction: string = "create_order"
) {
  if (!secretKey) {
    console.error(`[AV] correlation=${correlationId} stage=turnstile_config code=CONFIG_MISSING`)
    return { success: false, error: "CONFIG_MISSING" }
  }

  const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (!response.ok) return { success: false, error: "TURNSTILE_UNAVAILABLE" }

    const result: any = await response.json()
    if (typeof result !== "object" || result === null) return { success: false, error: "TURNSTILE_UNAVAILABLE" }

    if (result.success !== true) {
      console.warn(`[AV] correlation=${correlationId} stage=turnstile code=FAILED`)
      return { success: false, error: "TURNSTILE_FAILED" }
    }

    if (result.action !== expectedAction) {
      console.warn(`[AV] correlation=${correlationId} stage=turnstile code=ACTION_MISMATCH`)
      return { success: false, error: "TURNSTILE_FAILED" }
    }

    if (expectedHostnames.length > 0) {
      if (!result.hostname || !expectedHostnames.includes(result.hostname)) {
        console.warn(`[AV] correlation=${correlationId} stage=turnstile code=HOSTNAME_MISMATCH`)
        return { success: false, error: "TURNSTILE_FAILED" }
      }
    }

    return { success: true }
  } catch (err: any) {
    clearTimeout(timeoutId)
    const code = err.name === "AbortError" ? "TIMEOUT" : "FATAL"
    console.error(`[AV] correlation=${correlationId} stage=turnstile code=${code}`)
    return { success: false, error: err.name === "AbortError" ? "TURNSTILE_UNAVAILABLE" : "TURNSTILE_UNAVAILABLE" }
  }
}
// ---------------------------------------------------------

export const Route = createFileRoute('/api/public/av-create-order')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)

        if (allowedOrigins.length === 0) {
          console.error(`[AV] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        if (origin) {
          if (allowedOrigins.includes(origin)) {
            return new Response(null, {
              status: 204,
              headers: {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin"
              },
            })
          }
          return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          })
        }

        return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      },
      POST: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)

        // 1. ORIGIN VALIDATION
        if (allowedOrigins.length === 0) {
          console.error(`[AV] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        if (!origin || !allowedOrigins.includes(origin)) {
          return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          })
        }

        const corsHeaders = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
          "Vary": "Origin"
        }

        try {
          // 2. BODY LIMIT & UTF-8 STREAM
          const contentLength = parseInt(request.headers.get("content-length") || "-1")
          if (contentLength > MAX_BODY_BYTES) {
            return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE", correlation_id: correlationId }), { status: 413, headers: corsHeaders })
          }

          const reader = request.body?.getReader()
          if (!reader) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
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
                headers: corsHeaders,
              })
            }
            bodyText += decoder.decode(value, { stream: true })
          }

          // 3. JSON PARSE
          let payload: any
          try {
            payload = JSON.parse(bodyText)
          } catch {
            return new Response(JSON.stringify({ error: "INVALID_JSON", correlation_id: correlationId }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          // 4. TOP-LEVEL STRUCTURE BASIC VALIDATION
          const payloadKeys = Object.keys(payload)
          if (payloadKeys.some(k => !ALLOWED_FIELDS.includes(k) || PROHIBITED_FIELDS.includes(k))) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          const { event_id, customer_name, whatsapp, notes, idempotency_key, items, turnstile_token } = payload

          if (!isValidUuid(event_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          if (!isValidUuid(idempotency_key)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          
          // 6. TURNSTILE TOKEN VALIDATION
          if (typeof turnstile_token !== "string" || turnstile_token.trim() === "" || turnstile_token.length > 2048) {
             return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          // 7. TURNSTILE SITEVERIFY (FAIL CLOSED)
          const turnstileSecret = process.env['TURNSTILE_SECRET_KEY']
          const expectedHostnames = (process.env['TURNSTILE_EXPECTED_HOSTNAMES'] || '')
            .split(',')
            .map(h => h.trim())
            .filter(Boolean)

          const turnstileResult = await verifyTurnstileToken(
            turnstile_token,
            turnstileSecret,
            correlationId,
            expectedHostnames,
            "create_order"
          )

          if (!turnstileResult.success) {
            const status = turnstileResult.error === "TURNSTILE_UNAVAILABLE" ? 503 : (turnstileResult.error === "CONFIG_MISSING" ? 500 : 403)
            const error = turnstileResult.error === "TURNSTILE_UNAVAILABLE" ? "TURNSTILE_UNAVAILABLE" : (turnstileResult.error === "CONFIG_MISSING" ? "INTERNAL_ERROR" : "TURNSTILE_FAILED")
            return new Response(JSON.stringify({ error, correlation_id: correlationId }), { status, headers: corsHeaders })
          }

          // 8. PAYLOAD FIELDS/ITEMS VALIDATION
          if (typeof customer_name !== "string" || customer_name.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          if (typeof whatsapp !== "string" || whatsapp.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          if (notes !== undefined && notes !== null && typeof notes !== "string") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })

          if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEM_LINES) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          const validatedItems = []
          for (const item of items) {
            if (typeof item !== "object" || item === null || Array.isArray(item)) {
              return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            }
            const itemKeys = Object.keys(item)
            if (itemKeys.some(k => !ITEM_ALLOWED_FIELDS.includes(k) || ITEM_PROHIBITED_FIELDS.includes(k))) {
              return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            }
            const { shirt_model_id, size_option, custom_size, custom_name, custom_number, quantity } = item
            if (!isValidUuid(shirt_model_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            if (typeof size_option !== "string" || size_option.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            if (typeof quantity !== "number" || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
              return new Response(JSON.stringify({ error: "INVALID_QUANTITY", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            }
            const validateOptionalString = (v: any) => (v === undefined || v === null || typeof v === "string")
            if (!validateOptionalString(custom_size) || !validateOptionalString(custom_name) || !validateOptionalString(custom_number)) {
              return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
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

          // 9. FINGERPRINT (Excludes turnstile_token)
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

          // 10. SUPABASE SECRETS
          const supabaseUrl = process.env['SUPABASE_URL']
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

          if (!supabaseUrl || !supabaseServiceKey) {
            console.error(`[AV] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          // 11. RPC (Service Role)
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
          const { data, error } = await supabaseAdmin.rpc("av_create_order", {
            p_event_id: event_id,
            p_customer_name: customer_name.trim(),
            p_whatsapp: whatsapp.trim(),
            p_notes: notes === undefined ? null : notes,
            p_idempotency_key: idempotency_key,
            p_request_fingerprint: fingerprint,
            p_items: sortedItems as any
          })

          if (error) {
            const mapped = SQLSTATE_MAP[error.code]
            if (mapped) {
              console.warn(`[AV] correlation=${correlationId} stage=rpc code=${error.code}`)
              return new Response(JSON.stringify({ error: mapped.code, correlation_id: correlationId }), {
                status: mapped.status,
                headers: corsHeaders,
              })
            }
            console.error(`[AV] correlation=${correlationId} stage=rpc code=UNKNOWN_ERROR`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          if (!data || typeof data !== "object" || data.success !== true || !data.data || !isValidRpcData(data.data)) {
            console.error(`[AV] correlation=${correlationId} stage=rpc_response code=INVALID_RPC_RESPONSE`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          const rpcData = data.data
          return new Response(JSON.stringify({
            success: true,
            data: {
              order_id: rpcData.order_id,
              order_seq: rpcData.order_seq,
              display_order_number: rpcData.display_order_number,
              event_year: rpcData.event_year,
              customer_name: rpcData.customer_name,
              total_quantity: rpcData.total_quantity,
              subtotal: rpcData.subtotal,
              total_amount: rpcData.total_amount,
              order_status: rpcData.order_status,
              payment_status: rpcData.payment_status,
              is_duplicate: rpcData.is_duplicate === true
            }
          }), {
            status: 200,
            headers: corsHeaders,
          })

        } catch (err) {
          console.error(`[AV] correlation=${correlationId} stage=fatal code=INTERNAL_ERROR`)
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
            status: 500,
            headers: corsHeaders,
          })
        }
      },
    },
  },
})
