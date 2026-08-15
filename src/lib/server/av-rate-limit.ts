import { createClient } from '@supabase/supabase-js'

/**
 * ETAPA 3.3B-2B — SERVER-ONLY RATE LIMIT HELPER
 * Responsável por extrair o IP, normalizar, gerar HMAC e chamar o PostgreSQL.
 */

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retry_after_seconds: number }
  | { allowed: true; fail_open: true; code: string }; // Fail-Open para storage

export type RateLimitScope = 'order' | 'admin-login';

export interface RateLimitConfig {
  mode: 'global_only' | 'global_and_client';
  secret: string;
}


/**
 * Normaliza IPv4 para A.B.C.D estrito.
 */
function normalizeIPv4(ip: string): string | null {
  const trimmed = ip.trim();
  // Rejeitar caracteres inválidos, vírgulas (listas), quebras de linha
  if (/[^0-9.]/.test(trimmed)) return null;
  
  const parts = trimmed.split('.');
  if (parts.length !== 4) return null;
  
  const normalizedParts = [];
  for (const part of parts) {
    if (part === '' || part.length > 3) return null;
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    // Evitar octais ou outros formatos
    // Cada octeto deve ser '0' ou [1-9][0-9]{0,2}
    if (part !== '0' && !/^[1-9][0-9]{0,2}$/.test(part)) return null;
    if (num > 255) return null;
    normalizedParts.push(num.toString());
  }
  
  return normalizedParts.join('.');
}

/**
 * Normaliza IPv6 usando o URL parser do runtime.
 */
function normalizeIPv6(ip: string): string | null {
  const trimmed = ip.trim();
  // Rejeitar listas ou caracteres de controle antes do parse
  if (trimmed.includes(',') || /[\r\n\t]/.test(trimmed)) return null;

  try {
    // Tenta fazer o parse como hostname
    // IPv6 precisa estar entre colchetes para o URL parser
    const url = new URL(`http://[${trimmed}]`);
    const hostname = url.hostname;
    
    // Remove colchetes se o parser os manteve
    const clean = hostname.replace(/^\[|\]$/g, '');
    
    // Verifica se é realmente um IPv6 (contém dois pontos)
    if (!clean.includes(':')) return null;
    
    return clean.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Gera HMAC-SHA-256 usando Web Crypto API.
 */
async function generateHMAC(secret: string, scope: string, identifier: string, endpoint: string = 'av-create-order'): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`v1|${scope}|${endpoint}|${identifier}`);


  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Executa a lógica de Rate Limiting.
 */
export async function checkRateLimit(
  request: Request,
  correlationId: string,
  scope: RateLimitScope = 'order'
): Promise<RateLimitResult> {

  // 1. Ler Config
  const mode = process.env['AV_RATE_LIMIT_MODE'];
  const secret = process.env['AV_RATE_LIMIT_HASH_SECRET'];

  if (mode !== 'global_only' && mode !== 'global_and_client') {
    console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=CONFIG_INVALID`);
    throw new Error('CONFIG_INVALID');
  }

  if (!secret || secret.trim().length === 0) {
    console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=CONFIG_MISSING`);
    throw new Error('CONFIG_MISSING');
  }

  const specs = [];

  // 2. Identificação do Cliente (se necessário)
  let identifier = 'global';
  const cfIp = request.headers.get('CF-Connecting-IP');
  
  if (mode === 'global_and_client') {
    if (!cfIp) {
      console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=IP_MISSING`);
      throw new Error('CONFIG_MISSING');
    }

    const normalized = cfIp.includes(':') ? normalizeIPv6(cfIp) : normalizeIPv4(cfIp);
    if (!normalized) {
      console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=IP_INVALID`);
      throw new Error('CONFIG_INVALID');
    }
    identifier = normalized;
  }

  // 3. Gerar Specs Baseadas no Escopo
  const endpoint = scope === 'admin-login' ? 'av-admin-login' : 'av-create-order';

  if (scope === 'admin-login') {
    // Escopo Administrativo: admin-login:account e admin-login:global
    // Bucket por conta (usar identifier se disponível, ou global)
    specs.push({
      bucket_key_hash: await generateHMAC(secret, 'admin-login:account', identifier, endpoint),
      scope: 'admin-login:account',
      capacity: 5,
      refill_rate_per_second: 5 / 900, // 5 a cada 15m
      ttl_seconds: 3600
    });

    specs.push({
      bucket_key_hash: await generateHMAC(secret, 'admin-login:global', 'global', endpoint),
      scope: 'admin-login:global',
      capacity: 100,
      refill_rate_per_second: 100 / 900,
      ttl_seconds: 3600
    });
  } else {
    // Escopo Público: order:client e order:global
    if (mode === 'global_and_client') {
      specs.push({
        bucket_key_hash: await generateHMAC(secret, 'order:client:burst', identifier, endpoint),
        scope: 'order:client:burst',
        capacity: 5,
        refill_rate_per_second: 5 / 60,
        ttl_seconds: 86400
      });

      specs.push({
        bucket_key_hash: await generateHMAC(secret, 'order:client:sustained', identifier, endpoint),
        scope: 'order:client:sustained',
        capacity: 20,
        refill_rate_per_second: 20 / 900,
        ttl_seconds: 86400
      });
    }

    specs.push({
      bucket_key_hash: await generateHMAC(secret, 'order:global', 'global', endpoint),
      scope: 'order:global',
      capacity: 100,
      refill_rate_per_second: 100 / 60,
      ttl_seconds: 86400
    });
  }


  // 3. Chamar Banco
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=CONFIG_MISSING`);
    throw new Error('CONFIG_MISSING');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        fetch: (url, options) => fetch(url, { ...options, signal: controller.signal })
      }
    });

    const { data, error, status } = await supabaseAdmin.rpc('av_check_rate_limits', {
      p_specs: specs
    });

    if (error) {
      // 401/403 -> FAIL-CLOSED
      if (status === 401 || status === 403) {
        console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=AUTH_ERROR status=${status}`);
        throw new Error('AUTH_ERROR');
      }

      // 404/RPC inexistente -> FAIL-CLOSED
      if (status === 404) {
        console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=RPC_NOT_FOUND`);
        throw new Error('RPC_NOT_FOUND');
      }

      // SQLSTATEs Hardening AV010-AV020 -> FAIL-CLOSED
      if (error.code && /^AV0(1[0-9]|20)$/.test(error.code)) {
        console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=${error.code}`);
        throw new Error(error.code);
      }

      // Erros transitórios conhecidos -> FAIL-OPEN
      if (status === 502 || status === 503 || status === 504) {
        console.warn(`[AV] correlation=${correlationId} stage=rate_limit code=STORAGE_TRANSIENT status=${status}`);
        return { allowed: true, fail_open: true, code: 'STORAGE_UNAVAILABLE' };
      }

      // unknown = closed
      console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=UNKNOWN_DB_ERROR status=${status}`);
      throw new Error('UNKNOWN_DB_ERROR');
    }

    if (!data || typeof data !== 'object' || typeof data.allowed !== 'boolean') {
      console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=INVALID_RPC_RESPONSE`);
      throw new Error('INVALID_RPC_RESPONSE');
    }

    if (data.allowed) {
      return { allowed: true };
    } else {
      const retryAfter = data.retry_after_seconds;
      if (!Number.isFinite(retryAfter) || retryAfter <= 0) {
        console.error(`[AV] correlation=${correlationId} stage=rate_limit_config code=INVALID_RPC_RESPONSE`);
        throw new Error('INVALID_RPC_RESPONSE');
      }
      // Retry-After clamp 1s e teto 86400s
      const clampedRetry = Math.max(1, Math.min(86400, Math.ceil(retryAfter)));
      return { allowed: false, retry_after_seconds: clampedRetry };
    }

  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[AV] correlation=${correlationId} stage=rate_limit code=STORAGE_TIMEOUT`);
      return { allowed: true, fail_open: true, code: 'STORAGE_UNAVAILABLE' };
    }

    // Erros de rede/fetch reais (que não sejam Abort) -> FAIL-OPEN
    if (err.message === 'Failed to fetch' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      console.warn(`[AV] correlation=${correlationId} stage=rate_limit code=STORAGE_NETWORK_ERROR`);
      return { allowed: true, fail_open: true, code: 'STORAGE_UNAVAILABLE' };
    }

    // Preservar erros de configuração/FAIL-CLOSED
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
