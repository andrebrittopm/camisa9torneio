import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// ETAPA 3.2B-2A — TANSTACK SERVER ROUTE (Pivoted from Edge Function)
// OBJETIVO: Implementar a rota de API segura para criação de pedidos.

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

export const Route = createFileRoute('/api/public/av-create-order')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const method = request.method
        
        // 1. CORS check (Preflight & Handlers)
        const origin = request.headers.get("origin")
        const allowedOriginsStr = process.env['ALLOWED_ORIGINS'] || ""
        const allowedOrigins = allowedOriginsStr.split(",").map(o => o.trim()).filter(Boolean)
        
        const isAllowed = origin && allowedOrigins.includes(origin)
        
        // Config validation early check (for CORS_ERROR vs CONFIG_MISSING)
        if (allowedOrigins.length === 0) {
          console.error(`[AV] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        if (method === "OPTIONS") {
          if (isAllowed) {
            return new Response(null, {
              status: 204,
              headers: {
                "Access-Control-Allow-Origin": origin!,
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
                "Vary": "Origin"
              },
            })
          }
          return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), { status: 403, headers: { "Content-Type": "application/json" } })
        }

        if (method !== "POST") {
          const headers = isAllowed ? { "Access-Control-Allow-Origin": origin!, "Vary": "Origin" } : {}
          return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } })
        }

        if (!isAllowed) {
          return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), { status: 403, headers: { "Content-Type": "application/json" } })
        }

        const corsHeaders = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin!,
          "Vary": "Origin"
        }

        // 2. Body Limit & UTF-8 Stream
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

          // 5. JSON Parsing & Structure Validation
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
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          // 6. Field Validations (Top-Level)
          const payloadKeys = Object.keys(payload)
          if (payloadKeys.some(k => !ALLOWED_FIELDS.includes(k) || PROHIBITED_FIELDS.includes(k))) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          const { event_id, customer_name, whatsapp, notes, idempotency_key, items } = payload

          if (!isValidUuid(event_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          if (!isValidUuid(idempotency_key)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          
          if (typeof customer_name !== "string" || customer_name.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          if (typeof whatsapp !== "string" || whatsapp.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          
          if (notes !== undefined && notes !== null && typeof notes !== "string") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })

          if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEM_LINES) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          // 7. Items Validation & Normalization
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

          // 8. Canonical Fingerprint Generation
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

          // 9. RPC Call (Service Role)
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
                headers: corsHeaders,
              })
            }
            console.error(`[AV] correlation=${correlationId} stage=rpc code=UNKNOWN_ERROR`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          // 10. RPC Response Validation
          if (
            !data ||
            typeof data !== "object" ||
            data.success !== true ||
            !data.data ||
            !isValidRpcData(data.data)
          ) {
            console.error(`[AV] correlation=${correlationId} stage=rpc_response code=INVALID_RPC_RESPONSE`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          const rpcData = data.data

          // 11. Success Response (Sanitized)
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
      OPTIONS: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOriginsStr = process.env['ALLOWED_ORIGINS'] || ""
        const allowedOrigins = allowedOriginsStr
          .split(",")
          .map(o => o.trim())
          .filter(Boolean)

        if (origin && allowedOrigins.includes(origin)) {
          return new Response("ok", {
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
              "Vary": "Origin"
            },
          })
        }
        return new Response(JSON.stringify({ error: "CORS_ERROR", correlation_id: correlationId }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }
    }
  }
})
