import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

/**
 * ETAPA 4.1A — ENDPOINT PÚBLICO READ-ONLY DO CATÁLOGO
 */

// 1. Configurações
const TARGET_EVENT_NUMBER = 9
const TARGET_EVENT_YEAR = 2026

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

          // 1. Evento
          const { data: eventRow, error: eventError } = await supabase
            .from('av_events')
            .select('*')
            .eq('event_number', TARGET_EVENT_NUMBER)
            .eq('event_year', TARGET_EVENT_YEAR)
            .eq('active', true)
            .single()

          if (eventError || !eventRow) {
            return new Response(JSON.stringify({ error: "CATALOG_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 404,
              headers,
            })
          }

          // 2. Modelos
          const { data: modelRows, error: modelsError } = await supabase
            .from('av_shirt_models')
            .select('*')
            .eq('event_id', eventRow.id)
            .eq('active', true)
            .order('sort_order', { ascending: true })
            .order('code', { ascending: true })

          if (modelsError || !modelRows || modelRows.length === 0) {
            return new Response(JSON.stringify({ error: "CATALOG_NOT_AVAILABLE", correlation_id: correlationId }), {
              status: 404,
              headers,
            })
          }

          // 3. Disponibilidade
          const now = new Date()
          let orders_available = !!eventRow.active && !!eventRow.orders_open
          if (eventRow.order_deadline) {
            const deadline = new Date(eventRow.order_deadline)
            if (now > deadline) {
              orders_available = false
            }
          }

          // 4. Resposta
          const response = {
            success: true,
            data: {
              event: {
                id: eventRow.id,
                event_number: eventRow.event_number,
                event_year: eventRow.event_year,
                event_name: eventRow.event_name,
                location: eventRow.location,
                unit_price: eventRow.unit_price,
                orders_available,
                order_deadline: eventRow.order_deadline,
              },
              models: modelRows.map((m: any) => ({
                id: m.id,
                code: m.code,
                name: m.name,
                category: m.category,
                image_url: m.front_image_url,
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
          console.error(`[AV-CATALOG] correlation=${correlationId} error=${err instanceof Error ? err.message : 'Unknown'}`)
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
