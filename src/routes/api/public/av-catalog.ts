import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

/**
 * ETAPA 4.1A — ENDPOINT PÚBLICO READ-ONLY DO CATÁLOGO
 */

// 1. Configurações
const TARGET_EVENT_NUMBER = 9
const TARGET_EVENT_YEAR = 2026

// 2. Esquemas de Validação (Zod) para dados do banco
const EventSchema = z.object({
  id: z.string().uuid(),
  event_number: z.literal(TARGET_EVENT_NUMBER),
  event_year: z.literal(TARGET_EVENT_YEAR),
  event_name: z.string().min(1),
  location: z.string(),
  unit_price: z.number().finite().nonnegative(),
  active: z.boolean(),
  orders_open: z.boolean(),
  order_deadline: z.string().datetime({ offset: true }).nullable(),
})

const ModelCategorySchema = z.enum(['tshirt', 'tank'])
const ShirtModelSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  category: ModelCategorySchema,
  image_url: z.string().nullable(),
  model_3d_url: z.string().nullable(),
  available_sizes: z.array(z.string()),
  allow_custom_size: z.boolean(),
  sort_order: z.number().int(),
})

type EventData = z.infer<typeof EventSchema>
type ModelData = z.infer<typeof ShirtModelSchema>

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

export const Route = createFileRoute('/api/public/av-catalog')({
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
          // 1. Secrets
          const supabaseUrl = process.env['SUPABASE_URL']
          const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

          if (!supabaseUrl || !supabaseServiceKey) {
            console.error(`[AV-CATALOG] correlation=${correlationId} stage=catalog_config code=CONFIG_MISSING`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers,
            })
          }

          const supabase = createClient(supabaseUrl, supabaseServiceKey)

          // 2. Consulta do Evento
          const { data: eventRow, error: eventError } = await supabase
            .from('av_events')
            .select('*')
            .eq('event_number', TARGET_EVENT_NUMBER)
            .eq('event_year', TARGET_EVENT_YEAR)
            .eq('active', true)
            .single()

          if (eventError || !eventRow) {
            if (eventError && eventError.code !== 'PGRST116') {
              console.error(`[AV-CATALOG] correlation=${correlationId} stage=event_query error=${eventError.message}`)
            }
            return new Response(JSON.stringify({ error: "CATALOG_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 404,
              headers,
            })
          }

          // Validar dados do evento
          let validatedEvent: EventData
          try {
            validatedEvent = EventSchema.parse(eventRow)
          } catch (err) {
            console.error(`[AV-CATALOG] correlation=${correlationId} stage=catalog_response code=INVALID_DATA context=event`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers,
            })
          }

          // 3. Consulta dos Modelos
          const { data: modelRows, error: modelsError } = await supabase
            .from('av_shirt_models')
            .select('*')
            .eq('event_id', validatedEvent.id)
            .eq('active', true)
            .order('sort_order', { ascending: true })
            .order('code', { ascending: true })

          if (modelsError || !modelRows || modelRows.length === 0) {
            return new Response(JSON.stringify({ error: "CATALOG_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 404,
              headers,
            })
          }

          // Validar dados dos modelos
          let validatedModels: ModelData[]
          try {
            validatedModels = z.array(ShirtModelSchema).parse(modelRows)
          } catch (err) {
            console.error(`[AV-CATALOG] correlation=${correlationId} stage=catalog_response code=INVALID_DATA context=models`)
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), {
              status: 500,
              headers,
            })
          }

          // 4. Derivar disponibilidade
          const now = new Date()
          let orders_available = validatedEvent.active && validatedEvent.orders_open
          if (validatedEvent.order_deadline) {
            const deadline = new Date(validatedEvent.order_deadline)
            if (now > deadline) {
              orders_available = false
            }
          }

          // 5. Montar resposta sanitizada
          const response = {
            success: true,
            data: {
              event: {
                id: validatedEvent.id,
                event_number: validatedEvent.event_number,
                event_year: validatedEvent.event_year,
                event_name: validatedEvent.event_name,
                location: validatedEvent.location,
                unit_price: validatedEvent.unit_price,
                orders_available,
                order_deadline: validatedEvent.order_deadline,
              },
              models: validatedModels.map(m => ({
                id: m.id,
                code: m.code,
                name: m.name,
                category: m.category,
                image_url: m.image_url,
                model_3d_url: m.model_3d_url,
                available_sizes: m.available_sizes,
                allow_custom_size: m.allow_custom_size,
                sort_order: m.sort_order,
              }))
            }
          }

          return new Response(JSON.stringify(response), {
            status: 200,
            headers,
          })

        } catch (err) {
          console.error(`[AV-CATALOG] correlation=${correlationId} stage=unexpected error=${err instanceof Error ? err.message : 'Unknown'}`)
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
  const origin = request.headers.get("origin")
  const allowedOrigins = getAllowedOrigins(request)
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }
  return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", correlation_id: correlationId }), {
    status: 405,
    headers,
  })
}
