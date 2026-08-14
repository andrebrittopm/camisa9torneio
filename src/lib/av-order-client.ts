import { z } from 'zod';
import { AvShirtModel } from './av-catalog-client';

/**
 * Interface de resposta do servidor (Sanitizada)
 */
export interface AvCreateOrderResponse {
  success: boolean;
  order_id?: string;
  order_seq?: number;
  display_order_number?: string;
  event_year?: number;
  customer_name?: string;
  total_quantity?: number;
  subtotal?: number;
  total_amount?: number;
  order_status?: string;
  payment_status?: string;
  is_duplicate?: boolean;
  error?: string;
  code?: string;
  retry_after?: number | null;
  receipt_access_token?: string; // ETAPA 4.3B
}

/**
 * Resposta completa do helper (Separa o token do objeto oficial)
 */
export interface AvOrderSubmissionResult {
  order: AvCreateOrderResponse;
  receiptAccessToken: string | null;
}

/**
 * Payload para criação de pedido
 */
export interface AvCreateOrderPayload {
  event_id: string;
  customer_name: string;
  whatsapp: string;
  notes: string | null;
  idempotency_key: string;
  turnstile_token: string;
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
        receiptAccessToken: null
      };
    }

    const { receipt_access_token, ...orderData } = data;

    return {
      order: orderData,
      receiptAccessToken: receipt_access_token || null
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
      receiptAccessToken: null
    };
  }
}
