/**
 * Helper para upload de comprovantes PIX
 * ETAPA 4.3B
 */

export interface AvReceiptUploadResponse {
  success: boolean;
  data?: {
    payment_status: string;
    review_status: string;
    is_duplicate: boolean;
  };
  error?: string;
  code?: string;
  correlation_id?: string;
}

export async function uploadAvPaymentReceipt(
  orderId: string,
  token: string,
  submissionId: string,
  file: File
): Promise<AvReceiptUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/public/av-payment-receipt', {
      method: 'POST',
      headers: {
        'x-av-order-id': orderId,
        'x-av-receipt-token': token,
        'x-av-submission-id': submissionId,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao enviar comprovante',
        code: data.error || 'UNKNOWN_ERROR',
        correlation_id: data.correlation_id
      };
    }

    return data;
  } catch (error) {
    console.error('[AV-RECEIPT-CLIENT] Network error:', error);
    return {
      success: false,
      error: 'Não foi possível confirmar o envio. Tente novamente.',
      code: 'NETWORK_ERROR'
    };
  }
}
