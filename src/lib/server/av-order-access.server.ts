import { createHmac } from 'crypto';

/**
 * Helper para geração e validação de Capability Tokens determinísticos
 * ETAPA 4.3B & 4.3C-R1
 */

/**
 * Gera um token de acesso determinístico para o pedido (UPLOAD).
 */
export async function generateReceiptAccessToken(orderId: string, secretOverride?: string): Promise<string> {
  return generateCapabilityToken(`v1|receipt-upload|${orderId}`, secretOverride);
}

/**
 * Valida o token de acesso de upload.
 */
export async function verifyReceiptAccessToken(orderId: string, token: string, secretOverride?: string): Promise<boolean> {
  return verifyCapabilityToken(`v1|receipt-upload|${orderId}`, token, secretOverride);
}

/**
 * Gera um token de acesso determinístico para visualização do pedido (ORDER-VIEW).
 * Inclui expiração no material assinado (Etapa 4.3C-R1).
 */
export async function generateOrderViewToken(orderHandle: string, expiresAt: number, secretOverride?: string): Promise<string> {
  return generateCapabilityToken(`v1|order-view|${orderHandle}|${expiresAt}`, secretOverride);
}

/**
 * Valida o token de visualização do pedido.
 */
export async function verifyOrderViewToken(orderHandle: string, expiresAt: number, token: string, secretOverride?: string): Promise<boolean> {
  // Verificar expiração primeiro
  if (Date.now() > expiresAt) return false;
  return verifyCapabilityToken(`v1|order-view|${orderHandle}|${expiresAt}`, token, secretOverride);
}

/**
 * Base central de tokens HMAC-SHA-256
 */
async function generateCapabilityToken(message: string, secretOverride?: string): Promise<string> {
  const secret = secretOverride || process.env['AV_ORDER_ACCESS_SECRET'];
  if (!secret || secret.length < 32) {
    throw new Error('AV_ORDER_ACCESS_SECRET is missing or weak');
  }

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
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function verifyCapabilityToken(message: string, token: string, secretOverride?: string): Promise<boolean> {
  const secret = secretOverride || process.env['AV_ORDER_ACCESS_SECRET'];
  if (!secret || secret.length < 32) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

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

