import { createHmac } from 'crypto';

/**
 * Helper para geração e validação de Capability Tokens determinísticos
 * ETAPA 4.3B
 */

/**
 * Gera um token de acesso determinístico para o pedido.
 * v1|receipt-upload|<order_id>
 */
export async function generateReceiptAccessToken(orderId: string): Promise<string> {
  const secret = process.env['AV_ORDER_ACCESS_SECRET'];
  
  if (!secret || secret.length < 32) {
    throw new Error('AV_ORDER_ACCESS_SECRET is missing or weak');
  }

  const message = `v1|receipt-upload|${orderId}`;
  
  // Usamos createHmac do Node (disponível via nodejs_compat em Workers)
  // ou crypto.subtle. Aqui usaremos crypto.subtle conforme requisito 3.
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  
  // Base64URL sem padding
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Valida o token de acesso de forma constant-time.
 */
export async function verifyReceiptAccessToken(orderId: string, token: string): Promise<boolean> {
  const secret = process.env['AV_ORDER_ACCESS_SECRET'];
  
  if (!secret || secret.length < 32) {
    return false;
  }

  const message = `v1|receipt-upload|${orderId}`;
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    // Converte token base64url de volta para buffer
    const binaryStr = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const signature = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      signature[i] = binaryStr.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify('HMAC', key, signature, msgData);
  } catch (e) {
    return false;
  }
}
