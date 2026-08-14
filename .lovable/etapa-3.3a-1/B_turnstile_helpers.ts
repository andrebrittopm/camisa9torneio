/**
 * ETAPA 3.3A-1 — TURNSTILE SERVER HELPERS
 * Proposta de validação server-side do token Cloudflare Turnstile.
 */

interface TurnstileVerifyResult {
  success: boolean;
  error?: "TURNSTILE_FAILED" | "TURNSTILE_UNAVAILABLE" | "CONFIG_MISSING";
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

/**
 * Realiza a chamada ao endpoint Siteverify da Cloudflare.
 * Implementa Fail-Closed e Timeout de 8s.
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string | undefined,
  correlationId: string,
  expectedHostnames: string[] = [],
  expectedAction: string = "create_order"
): Promise<TurnstileVerifyResult> {
  // 4. FAIL CLOSED - Secret Ausente
  if (!secretKey) {
    console.error(`[AV] correlation=${correlationId} stage=turnstile_config code=CONFIG_MISSING`);
    return { success: false, error: "CONFIG_MISSING" };
  }

  // 5. SITEVERIFY
  const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  
  // 7. TIMEOUT (8000ms)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        // Gerar UUID própria para Siteverify
        idempotency_key: crypto.randomUUID(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=HTTP_ERROR status=${response.status}`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }

    const result: any = await response.json();

    // 8. VALIDAR RESPOSTA DO SITEVERIFY
    if (typeof result !== "object" || result === null) {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=INVALID_JSON`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }

    if (result.success !== true) {
      // 11. ERROS TURNSTILE - Mapear qualquer negativa para 403
      // Logs seguros (não logar error-codes brutos)
      console.warn(`[AV] correlation=${correlationId} stage=turnstile code=FAILED`);
      return { success: false, error: "TURNSTILE_FAILED" };
    }

    // 9. ACTION VALIDATION
    if (result.action !== expectedAction) {
      console.warn(`[AV] correlation=${correlationId} stage=turnstile code=ACTION_MISMATCH`);
      return { success: false, error: "TURNSTILE_FAILED" };
    }

    // 10. HOSTNAME VALIDATION
    if (expectedHostnames.length > 0) {
      if (!result.hostname || !expectedHostnames.includes(result.hostname)) {
        console.warn(`[AV] correlation=${correlationId} stage=turnstile code=HOSTNAME_MISMATCH`);
        return { success: false, error: "TURNSTILE_FAILED" };
      }
    }

    return { 
      success: true, 
      hostname: result.hostname, 
      action: result.action 
    };

  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=TIMEOUT`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }
    console.error(`[AV] correlation=${correlationId} stage=turnstile code=FATAL`);
    return { success: false, error: "TURNSTILE_UNAVAILABLE" };
  }
}
