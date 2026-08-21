import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { verifyOrderViewToken } from '@/lib/server/av-order-access.server'

/**
 * ETAPA 4.3C-R1 — SERVER ROUTE PARA VISUALIZAÇÃO SEGURA DA CAMISA OFICIAL
 */

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

async function methodNotAllowed(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

export const Route = createFileRoute('/api/public/av-order-view')({
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
              "Access-Control-Allow-Headers": "Content-Type",
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
        const corsHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer"
        }

        if (origin && allowedOrigins.includes(origin)) {
          corsHeaders["Access-Control-Allow-Origin"] = origin
          corsHeaders["Vary"] = "Origin"
        }

        try {
          const url = new URL(request.url)
          const handle = url.searchParams.get('handle')
          const token = url.searchParams.get('token')
          const expiresStr = url.searchParams.get('expires')

          if (!handle || !token || !expiresStr) {
            return new Response(JSON.stringify({ error: "MISSING_PARAMETERS", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          const expiresAt = parseInt(expiresStr, 10)
          if (isNaN(expiresAt)) {
            return new Response(JSON.stringify({ error: "INVALID_EXPIRATION", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          // 1. Validar Token (HMAC + Expiration)
          const secret = process.env['AV_ORDER_ACCESS_SECRET'] || ''
          const isValid = await verifyOrderViewToken(handle, expiresAt, token, secret)
          
          if (!isValid) {
            console.warn(`[AV] correlation=${correlationId} stage=auth code=ACCESS_DENIED handle=${handle}`);
            return new Response(JSON.stringify({ error: "ACCESS_DENIED", correlation_id: correlationId }), { status: 403, headers: corsHeaders })
          }

          // 2. Validar Formato do Handle
          const handleMatch = handle.match(/^AV-(\d{4})-(\d+)$/)
          if (!handleMatch) {
            return new Response(JSON.stringify({ error: "INVALID_HANDLE", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          const eventYear = parseInt(handleMatch[1], 10)
          const orderSeq = parseInt(handleMatch[2], 10)

          if (isNaN(eventYear) || isNaN(orderSeq) || orderSeq <= 0) {
            return new Response(JSON.stringify({ error: "INVALID_HANDLE", correlation_id: correlationId }), { status: 400, headers: corsHeaders })
          }

          // 3. Buscar Dados Sanitizados (Server-Side)
          const supabaseUrl = process.env['SUPABASE_URL']!
          const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!
          const supabase = createClient(supabaseUrl, supabaseKey)

          // Buscar o pedido usando order_seq e verificar o ano do evento
          const { data: order, error: orderError } = await supabase
            .from('av_orders')
            .select(`
              id,
              order_seq,
              total_amount,
              order_status,
              payment_status,
              event:av_events(
                event_name,
                event_year
              )
            `)
            .eq('order_seq', orderSeq)
            .single()

          if (orderError || !order) {
            return new Response(JSON.stringify({ error: "ORDER_NOT_FOUND", correlation_id: correlationId }), { status: 404, headers: corsHeaders })
          }

          // Validar que o ano do evento corresponde ao handle
          // @ts-ignore - Supabase type inference might not catch the nested event object correctly here
          if (order.event?.event_year !== eventYear) {
            return new Response(JSON.stringify({ error: "ORDER_NOT_FOUND", correlation_id: correlationId }), { status: 404, headers: corsHeaders })
          }

          const internalOrderId = order.id

          // 4. Buscar itens sanitizados pelo order_id interno
          const { data: items, error: itemsError } = await supabase
            .from('av_order_items')
            .select('model_name, shirt_type, size_option, custom_size, custom_name, custom_number, quantity')
            .eq('order_id', internalOrderId)

          if (itemsError) {
            console.error(`[AV] correlation=${correlationId} stage=items_fetch error=${itemsError.message}`);
            return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders })
          }

          // 5. Calcular total_quantity server-side
          const totalQuantity = (items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

          // 6. Resposta Pública Sanitizada
          return new Response(JSON.stringify({
            success: true,
            order: {
              display_order_number: handle,
              total_quantity: totalQuantity,
              total_amount: order.total_amount,
              order_status: order.order_status,
              payment_status: order.payment_status,
              event: {
                // @ts-ignore
                event_name: order.event?.event_name
              },
              items: items || []
            },
            correlation_id: correlationId
          }), { status: 200, headers: corsHeaders })

        } catch (err) {
          console.error(`[AV] correlation=${correlationId} stage=fatal code=INTERNAL_ERROR error=${err}`);
          return new Response(JSON.stringify({ error: "INTERNAL_ERROR", correlation_id: correlationId }), { status: 500, headers: corsHeaders })
        }
      },
      POST: async ({ request }) => methodNotAllowed({}),
      PUT: async ({ request }) => methodNotAllowed({}),
      PATCH: async ({ request }) => methodNotAllowed({}),
      DELETE: async ({ request }) => methodNotAllowed({}),
    }
  }
})
