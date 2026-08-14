import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validate Method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse and Validate Payload Structure
    const body = await req.json()
    const { idempotency_key, event_id, customer_name, whatsapp, notes, items } = body

    if (!idempotency_key || !event_id || !customer_name || !whatsapp || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'INVALID_REQUEST_STRUCTURE', message: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Initialize Supabase Client with service_role
    // This key is server-side only and never exposed to the client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Call PostgreSQL RPC
    // We send only commercial data. Logic/Prices/Validation happen in the DB.
    const { data, error } = await supabaseAdmin.rpc('av_create_order', {
      p_idempotency_key: idempotency_key,
      p_event_id: event_id,
      p_customer_name: customer_name,
      p_whatsapp: whatsapp,
      p_notes: notes,
      p_items: items,
    })

    // 6. Handle Database Errors
    if (error) {
      console.error('[av-create-order] RPC Error:', error)
      
      // Map custom database exceptions to HTTP status codes
      const errorMap: Record<string, { status: number; code: string }> = {
        'P0002': { status: 404, code: 'EVENT_NOT_FOUND' },
        'L0001': { status: 400, code: 'EVENT_CLOSED' },
        'L0002': { status: 400, code: 'ORDER_DEADLINE_EXCEEDED' },
        'L0003': { status: 400, code: 'INVALID_QUANTITY' },
        'L0004': { status: 400, code: 'INVALID_MODEL' },
        'L0005': { status: 400, code: 'CUSTOM_SIZE_NOT_ALLOWED' },
        'L0006': { status: 400, code: 'CUSTOM_SIZE_REQUIRED' },
        'L0007': { status: 400, code: 'INVALID_SIZE_OPTION' },
      }

      const mapped = errorMap[error.code] || { status: 500, code: 'INTERNAL_SERVER_ERROR' }
      
      return new Response(JSON.stringify({ error: mapped.code }), {
        status: mapped.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 7. Success Response
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[av-create-order] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
