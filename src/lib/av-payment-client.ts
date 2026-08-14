export interface AvPaymentInfoResponse {
  success: boolean;
  data?: {
    event_name: string;
    pix: {
      type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
      key: string;
      holder: string;
    };
  };
  error?: string;
  correlation_id?: string;
}

export async function fetchAvPaymentInfo(): Promise<AvPaymentInfoResponse> {
  try {
    const response = await fetch('/api/public/av-payment-info', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'UNKNOWN_ERROR',
        correlation_id: data.correlation_id,
      };
    }

    return data;
  } catch (error) {
    console.error('[AV-PAYMENT-CLIENT] Network error:', error);
    return {
      success: false,
      error: 'NETWORK_ERROR',
    };
  }
}
