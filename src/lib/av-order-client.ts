import { z } from 'zod';
import { AvShirtModel } from './av-catalog-client';

/**
 * Interface de resposta do servidor (Sanitizada)
 */
export interface AvCreatedOrder {
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
}

/**
 * Interface de resposta do servidor (Sanitizada)
 */
export interface AvCreateOrderResponse {
  success: boolean;
  data?: AvCreatedOrder;
  error?: string;
  code?: string;
  retry_after?: number | null;
  receipt_access_token?: string; 
  order_view_token?: string; 
}

/**
 * Resposta completa do helper (Separa o token do objeto oficial)
 */
export interface AvOrderSubmissionResult {
  order: AvCreateOrderResponse;
  receiptAccessToken: string | null;
  orderViewToken: string | null;
  orderViewExpiresAt: number | null;
}

/**
 * Payload para criação de pedido
 * HARDENED: model_name e shirt_type removidos (Regressão Etapa 4.3C)
 */
export interface AvCreateOrderPayload {
  event_id: string;
  customer_name: string;
  whatsapp: string;
  customer_email: string;
  notes: string | null;
  idempotency_key: string;
  // turnstile_token: string; // TURNSTILE TEMPORARILY DISABLED
  items: {
    shirt_model_id: string;
    size_option: string;
    custom_size: string | null;
    custom_name: string | null;
    custom_number: string | null;
    quantity: number;
  }[];
}

/**
 * Helper para submissão de pedido ao endpoint /api/public/av-create-order
 */
export async function submitAvOrder(payload: AvCreateOrderPayload): Promise<AvOrderSubmissionResult> {
  try {
    const response = await fetch('/api/public/av-create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        order: {
          success: false,
          error: data.error || 'Erro ao processar o pedido',
          code: data.code || 'UNKNOWN_ERROR',
          retry_after: response.status === 429 ? parseInt(response.headers.get('Retry-After') || '0', 10) : null
        },
        receiptAccessToken: null,
        orderViewToken: null,
        orderViewExpiresAt: null
      };
    }

    // Validar contrato da resposta
    const { 
      success, 
      data: orderData, 
      receipt_access_token, 
      order_view_token, 
      order_view_expires_at, 
      code, 
      error, 
      retry_after 
    } = data;

    const validOrderViewExpiresAt =
      typeof order_view_expires_at === 'number' &&
      Number.isSafeInteger(order_view_expires_at) &&
      order_view_expires_at > Date.now()
        ? order_view_expires_at
        : null;

    if (!success || !orderData) {
      return {
        order: {
          success: false,
          error: error || 'Resposta do servidor inválida',
          code: code || 'INVALID_SERVER_RESPONSE',
          retry_after
        },
        receiptAccessToken: null,
        orderViewToken: null,
        orderViewExpiresAt: null
      };
    }

    // Validação de contrato via Zod para evitar UI corrompida (Etapa 12.1-P12)
    const validation = z.object({
      order_id: z.string().uuid(),
      order_seq: z.number().int().positive(),
      display_order_number: z.string().min(1),
      event_year: z.number().int(),
      customer_name: z.string().min(1),
      total_quantity: z.number().int().nonnegative(),
      subtotal: z.number().finite(),
      total_amount: z.number().finite(),
      order_status: z.string().min(1),
      payment_status: z.string().min(1),
      is_duplicate: z.boolean()
    }).safeParse(orderData);

    if (!validation.success) {
      console.error('[AV-ORDER-CLIENT] Server response contract mismatch:', validation.error.format());
      return {
        order: {
          success: false,
          error: 'Resposta do servidor incompatível com o contrato esperado',
          code: 'INVALID_SERVER_RESPONSE',
          retry_after: null
        },
        receiptAccessToken: null,
        orderViewToken: null,
        orderViewExpiresAt: null
      };
    }

    const validatedOrder = validation.data as AvCreatedOrder;

    return {
      order: {
        success: true,
        data: validatedOrder,
        code,
        error,
        retry_after
      },
      receiptAccessToken: receipt_access_token || null,
      orderViewToken: order_view_token || null,
      orderViewExpiresAt: validOrderViewExpiresAt
    };
  } catch (error) {
    console.error('[AV-ORDER-CLIENT] Network error:', error);
    return {
      order: {
        success: false,
        error: 'Não foi possível confirmar se o pedido foi registrado. Tente novamente.',
        code: 'NETWORK_ERROR',
        retry_after: null
      },
      receiptAccessToken: null,
      orderViewToken: null,
      orderViewExpiresAt: null
    };
  }
}