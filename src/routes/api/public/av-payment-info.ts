import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

/**
 * ETAPA 4.3A — ENDPOINT PÚBLICO DE INFORMAÇÕES DE PAGAMENTO PIX
 */

const TARGET_EVENT_NUMBER = 9
const TARGET_EVENT_YEAR = 2026

const PixInfoSchema = z.object({
  type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']),
  key: z.string().min(1),
  holder: z.string().min(1),
})

const PaymentInfoResponseSchema = z.object({
  id: z.string().uuid(),
  event_number: z.literal(TARGET_EVENT_NUMBER),
  event_year: z.literal(TARGET_EVENT_YEAR),
  event_name: z.string().min(1),
  pix_key: z.string().min(1),
  pix_holder: z.string().min(1),
  pix_type: z.string().min(1),
  active: z.literal(true),
})

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

  return Array.from(new Set([...fromEnv, ...(selfOrigin ? [selfOrigin] : [])]))
}

export const Route = createFileRoute('/api/public/av-payment-info')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)

        if (origin && allowedOrigins.includes(origin)) {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Max-Age": "86400",
              "Vary": "Origin"
            },
          })
        }
        return new Response(null, { status: 204 })
      },
      GET: async ({ request }) => {
        const correlationId = crypto.randomUUID()
        const origin = request.headers.get("origin")
        const allowedOrigins = getAllowedOrigins(request)

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        }

        if (origin && allowedOrigins.includes(origin)) {
          headers["Access-Control-Allow-Origin"] = origin
          headers["Vary"] = "Origin"
        }

        try {
          const supabaseUrl = process.env['SUPABASE_URL']
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

          if (!supabaseUrl || !supabaseServiceKey) {
            console.error(`[AV-PAYMENT-INFO] correlation=${correlationId} stage=config code=CONFIG_MISSING`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers,
            })
          }

          const supabase = createClient(supabaseUrl, supabaseServiceKey)

          const { data: eventRows, error: eventError } = await supabase
            .from('av_events')
            .select('id, event_number, event_year, event_name, pix_key, pix_holder, pix_type, active')
            .eq('event_number', TARGET_EVENT_NUMBER)
            .eq('event_year', TARGET_EVENT_YEAR)
            .eq('active', true)

          if (eventError) {
            console.error(`[AV-PAYMENT-INFO] correlation=${correlationId} stage=query code=QUERY_ERROR`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers,
            })
          }

          if (!eventRows || eventRows.length === 0) {
            console.error(`[AV-PAYMENT-INFO] correlation=${correlationId} stage=query code=NOT_FOUND`)
            return new Response(JSON.stringify({ error: "PAYMENT_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 404,
              headers,
            })
          }

          const eventRow = eventRows[0]
          if (!eventRow) {
            console.error(`[AV-PAYMENT-INFO] correlation=${correlationId} stage=query code=NOT_FOUND`)
            return new Response(JSON.stringify({ error: "PAYMENT_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 404,
              headers,
            })
          }

          // Validação rigorosa dos dados PIX
          try {
            PaymentInfoResponseSchema.parse(eventRow)
            // Validação secundária do pix_type
            PixInfoSchema.shape.type.parse((eventRow as any).pix_type)
          } catch (err) {
            console.error(`[AV-PAYMENT-INFO] correlation=${correlationId} stage=validation code=INVALID_PIX_CONFIG`)
            return new Response(JSON.stringify({ error: "PAYMENT_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 503,
              headers,
            })
          }

          const response = {
            success: true,
            data: {
              event_name: (eventRow as any).event_name,
              pix: {
                type: (eventRow as any).pix_type,
                key: (eventRow as any).pix_key,
                holder: (eventRow as any).pix_holder
              }
            }
          }

          return new Response(JSON.stringify(response), {
            status: 200,
            headers,
          })

        } catch (err) {
          console.error(`[AV-PAYMENT-INFO] correlation=${correlationId} error=${err instanceof Error ? err.message : 'Unknown'}`)
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
            status: 500,
            headers,
          })
        }
      },
      POST: async ({ request }) => methodNotAllowed(request),
      PUT: async ({ request }) => methodNotAllowed(request),
      PATCH: async ({ request }) => methodNotAllowed(request),
      DELETE: async ({ request }) => methodNotAllowed(request),
    }
  }
})

async function methodNotAllowed(request: Request) {
  const correlationId = crypto.randomUUID()
  return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  })
}
