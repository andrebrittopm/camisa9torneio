import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { verifyTurnstileToken } from '@/lib/server/av-turnstile'
import { checkRateLimit } from '@/lib/server/av-rate-limit'
import { generateReceiptAccessToken, generateOrderViewToken } from '@/lib/server/av-order-access.server'
import { sendOrderConfirmationEmail, queueOrderEmail } from '@/lib/server/av-email.server'



/**
 * ETAPA 3.3B-2B — TANSTACK SERVER ROUTE INTEGRADA COM TURNSTILE E RATE LIMITING
 */

const MAX_BODY_BYTES = 64 * 1024 // 64 KB
const MAX_ITEM_LINES = 50

const ALLOWED_FIELDS = [
  'event_id',
  'customer_name',
  'whatsapp',
  'customer_email',
  'notes',
  'idempotency_key',
  'items',
  'turnstile_token',
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

        // 1. Origin
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
          // 2.1 Validate Access Token Secret Config
          const orderAccessSecret = process.env['AV_ORDER_ACCESS_SECRET']
          if (!orderAccessSecret || orderAccessSecret.length < 32) {
            console.error(`[AV] correlation=${correlationId} stage=config code=AV_ORDER_ACCESS_SECRET_INVALID`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          // 2. Body size

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

          // 3. JSON parse
          let payload: any
          try {
            payload = JSON.parse(bodyText)
          } catch {
            return new Response(JSON.stringify({ error: "INVALID_JSON", correlation_id: correlationId }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          // 4. Payload objeto
          if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          // 5. Allowlist top-level
          const payloadKeys = Object.keys(payload)
          if (payloadKeys.some(k => !ALLOWED_FIELDS.includes(k) || PROHIBITED_FIELDS.includes(k))) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          const { event_id, customer_name, whatsapp, customer_email, notes, idempotency_key, items, turnstile_token } = payload

          // 6. event_id UUID
          if (!isValidUuid(event_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          // 7. idempotency_key UUID
          if (!isValidUuid(idempotency_key)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          
          // 8. turnstile_token: string, trim, <= 2048
          if (typeof turnstile_token !== "string" || turnstile_token.trim() === "" || turnstile_token.length > 2048) {
             return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          // 9. customer_name
          if (typeof customer_name !== "string" || customer_name.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          // 10. whatsapp
          if (typeof whatsapp !== "string" || whatsapp.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          
          // 10.1 customer_email (Etapa 4.3C)
          const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (typeof customer_email !== "string" || !EMAIL_REGEX.test(customer_email)) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }
          
          // 11. notes
          if (notes !== undefined && notes !== null && typeof notes !== "string") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })

          // 12. items array & 13. MAX_ITEM_LINES
          if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEM_LINES) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          const validatedItems = []
          for (const item of items) {
            // 14. cada item é objeto
            if (typeof item !== "object" || item === null || Array.isArray(item)) {
              return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            }
            // 15. allowlist item
            const itemKeys = Object.keys(item)
            if (itemKeys.some(k => !ITEM_ALLOWED_FIELDS.includes(k) || ITEM_PROHIBITED_FIELDS.includes(k))) {
              return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            }
            const { shirt_model_id, size_option, custom_size, custom_name, custom_number, quantity } = item
            // 16. shirt_model_id UUID
            if (!isValidUuid(shirt_model_id)) return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            // 17. size_option
            if (typeof size_option !== "string" || size_option.trim() === "") return new Response(JSON.stringify({ error: "INVALID_REQUEST", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            // 18. quantity
            if (typeof quantity !== "number" || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
              return new Response(JSON.stringify({ error: "INVALID_QUANTITY", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
            }
            // 19. custom_size/custom_name/custom_number
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

          // 20. RATE LIMITING
          try {
            const rlResult = await checkRateLimit(request, correlationId)
            
            if (!rlResult.allowed) {
              console.warn(`[AV] correlation=${correlationId} stage=rate_limit code=DENY`)
              return new Response(JSON.stringify({ 
                error: "RATE_LIMITED", 
                correlation_id: correlationId 
              }), { 
                status: 429, 
                headers: {
                  ...corsHeaders,
                  "Retry-After": rlResult.retry_after_seconds.toString()
                } 
              })
            }
          } catch (err: any) {
            // Fail-Closed para erros de config/hardened SQLSTATE
            console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=FAIL_CLOSED`)
            return new Response(JSON.stringify({ 
              error: "INTERNAL_ERROR", 
              correlation_id: correlationId 
            }), { 
              status: 500, 
              headers: corsHeaders 
            })
          }

          // 21. TURNSTILE Siteverify (Só ocorre se permitido pelo Rate Limit ou Fail-Open)
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
            process.env['TURNSTILE_TEST_MODE'] === 'true' ? "test" : "create_order"
          )

          if (!turnstileResult.success) {
            const statusMap: Record<string, number> = {
              "TURNSTILE_UNAVAILABLE": 503,
              "CONFIG_MISSING": 500,
              "CONFIG_ERROR": 500,
              "TURNSTILE_FAILED": 403
            }
            const status = statusMap[turnstileResult.error] || 403
            const error = turnstileResult.error === "TURNSTILE_UNAVAILABLE" ? "TURNSTILE_UNAVAILABLE" : 
                          (turnstileResult.error === "TURNSTILE_FAILED" ? "TURNSTILE_FAILED" : "INTERNAL_ERROR")
            
            return new Response(JSON.stringify({ error, correlation_id: correlationId }), { status, headers: corsHeaders })
          }

          // 22. fingerprint (Excludes turnstile_token)
          const sortedItems = [...validatedItems].sort((a, b) => {
            const keyA = JSON.stringify([a.shirt_model_id, a.size_option, a.custom_size, a.custom_name, a.custom_number, a.quantity])
            const keyB = JSON.stringify([b.shirt_model_id, b.size_option, b.custom_size, b.custom_name, b.custom_number, b.quantity])
            return keyA.localeCompare(keyB)
          })


          const canonicalPayload = {
            event_id,
            customer_name: customer_name.trim(),
            whatsapp: whatsapp.trim(),
            customer_email: customer_email.trim(),
            notes: notes === undefined ? null : notes,
            items: sortedItems
          }

          const encoder = new TextEncoder()
          const dataToHash = encoder.encode(JSON.stringify(canonicalPayload))
          const hashBuffer = await crypto.subtle.digest("SHA-256", dataToHash)
          const fingerprint = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")

          // 23. secrets Supabase
          const supabaseUrl = process.env['SUPABASE_URL']
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

          if (!supabaseUrl || !supabaseServiceKey) {
            console.error(`[AV] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers: corsHeaders,
            })
          }

          // 24. RPC (Service Role)
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
          const { data, error } = await supabaseAdmin.rpc("av_create_order", {
            p_event_id: event_id,
            p_customer_name: customer_name.trim(),
            p_whatsapp: whatsapp.trim(),
            p_customer_email: customer_email.trim(),
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

          // 25. Capability Tokens (Etapa 4.3C-R1)
          const receiptAccessToken = await generateReceiptAccessToken(rpcData.order_id)
          
          // Expiração em 30 dias para visualização
          const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000)
          const orderViewToken = await generateOrderViewToken(rpcData.display_order_number, expiresAt)

          // 26. Notificação via Outbox e Envio (Async)
          if (!rpcData.is_duplicate) {
            // Registrar na outbox para persistência e retry
            await queueOrderEmail(rpcData.order_id, 'ORDER_CREATED', customer_email.trim())

            // Recuperar snapshots confiáveis do DB para o e-mail (Autoridade Server-Side)
            const { data: itemSnapshots } = await supabaseAdmin
              .from('av_order_items')
              .select('model_name, shirt_type, size_option, custom_name, custom_number, quantity')
              .eq('order_id', rpcData.order_id)

            const summary = (itemSnapshots || []).map(i => 
              `${i.quantity}x ${i.model_name} (${i.size_option})${i.custom_name ? ` [${i.custom_name}]` : ''}`
            ).join('\n')

            const viewUrl = `${origin}/order-view?handle=${rpcData.display_order_number}&token=${orderViewToken}&expires=${expiresAt}`
            
            sendOrderConfirmationEmail(
              customer_email.trim(), 
              rpcData.customer_name,
              rpcData.display_order_number,
              summary,
              viewUrl,
              correlationId
            ).catch(err => {
              console.error(`[AV] correlation=${correlationId} stage=email code=ASYNC_FAILED error=${err}`);
            });
          }


          return new Response(JSON.stringify({
            success: true,
            receipt_access_token: receiptAccessToken,
            order_view_token: orderViewToken,

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
      GET: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)
        const isAllowed = origin && allowedOrigins.includes(origin)
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (isAllowed) {
          headers["Access-Control-Allow-Origin"] = origin!
          headers["Vary"] = "Origin"
        }
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), { status: 405, headers })
      },
      PUT: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)
        const isAllowed = origin && allowedOrigins.includes(origin)
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (isAllowed) {
          headers["Access-Control-Allow-Origin"] = origin!
          headers["Vary"] = "Origin"
        }
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), { status: 405, headers })
      },
      PATCH: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)
        const isAllowed = origin && allowedOrigins.includes(origin)
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (isAllowed) {
          headers["Access-Control-Allow-Origin"] = origin!
          headers["Vary"] = "Origin"
        }
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), { status: 405, headers })
      },
      DELETE: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)
        const isAllowed = origin && allowedOrigins.includes(origin)
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (isAllowed) {
          headers["Access-Control-Allow-Origin"] = origin!
          headers["Vary"] = "Origin"
        }
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), { status: 405, headers })
      }
    }
  }
})
