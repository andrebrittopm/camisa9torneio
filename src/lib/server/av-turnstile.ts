/**
 * ETAPA 3.3A-2A — TURNSTILE SERVER HELPERS
 * Implementação canônica para validação server-side do token Cloudflare Turnstile.
 */

export type TurnstileVerification =
  | { success: true }
  | {
      success: false;
      error:
        | "TURNSTILE_FAILED"
        | "TURNSTILE_UNAVAILABLE"
        | "CONFIG_MISSING"
        | "CONFIG_ERROR";
    };

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
): Promise<TurnstileVerification> {
  const isProduction = process.env['NODE_ENV'] === "production";

  // 4. FAIL CLOSED - Secret Ausente
  if (!secretKey) {
    console.error(`[AV] correlation=${correlationId} stage=turnstile_config code=CONFIG_MISSING`);
    return { success: false, error: "CONFIG_MISSING" };
  }

  // 9. PRODUÇÃO — HOSTNAME OBRIGATÓRIO (Fail-Closed)
  if (isProduction && expectedHostnames.length === 0) {
    console.error(`[AV] correlation=${correlationId} stage=turnstile_config code=CONFIG_MISSING`);
    return { success: false, error: "CONFIG_MISSING" };
  }

  // 10. TEST MODE SEGURO
  const turnstileTestMode = process.env['TURNSTILE_TEST_MODE'];
  if (turnstileTestMode === "true" && isProduction) {
    console.error(`[AV] correlation=${correlationId} stage=turnstile_config code=CONFIG_ERROR`);
    return { success: false, error: "CONFIG_ERROR" };
  }

  // 11. DUMMY KEYS / ACTIONS
  let effectiveAction = expectedAction;
  let effectiveHostnames = expectedHostnames;

  if (turnstileTestMode === "true") {
    effectiveAction = "test";
    effectiveHostnames = ["localhost"];
  }

  // 5. SITEVERIFY
  const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  
  // 7. TIMEOUT (8000ms) - 4. TURNSTILE HELPER — TIMEOUT
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

    // 5. HTTP NÃO 2XX
    if (!response.ok) {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=HTTP_ERROR`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }

    // 6. JSON / ESTRUTURA INVÁLIDA
    let result: any;
    try {
      result = await response.json();
    } catch {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=INVALID_RESPONSE`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }

    if (typeof result !== "object" || result === null || Array.isArray(result)) {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=INVALID_RESPONSE`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }

    // 7. SUCCESS FALSE
    if (result.success !== true) {
      console.warn(`[AV] correlation=${correlationId} stage=turnstile code=FAILED`);
      return { success: false, error: "TURNSTILE_FAILED" };
    }

    // 12. ACTION PINNING
    if (result.action !== effectiveAction) {
      console.warn(`[AV] correlation=${correlationId} stage=turnstile code=ACTION_MISMATCH`);
      return { success: false, error: "TURNSTILE_FAILED" };
    }

    // 9. PRODUÇÃO — HOSTNAME FAIL CLOSED (EXATA via includes)
    if (effectiveHostnames.length > 0) {
      if (!result.hostname || !effectiveHostnames.includes(result.hostname)) {
        console.warn(`[AV] correlation=${correlationId} stage=turnstile code=HOSTNAME_MISMATCH`);
        return { success: false, error: "TURNSTILE_FAILED" };
      }
    }

    return { success: true };

  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(`[AV] correlation=${correlationId} stage=turnstile code=TIMEOUT`);
      return { success: false, error: "TURNSTILE_UNAVAILABLE" };
    }
    console.error(`[AV] correlation=${correlationId} stage=turnstile code=FATAL`);
    return { success: false, error: "TURNSTILE_UNAVAILABLE" };
  } finally {
    clearTimeout(timeoutId);
  }
}
