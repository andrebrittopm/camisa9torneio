# C_tests_RLSRV26_RLSRV33.md

| ID | PASS/FAIL | REAL/MOCK | Resultado Observado |
|:---|:---:|:---:|:---|
| RLSRV26 | PASS | REAL | `TURNSTILE_SECRET_KEY` ausente -> `CONFIG_MISSING` -> HTTP 500. Dummy fallback removido. |
| RLSRV27 | PASS | MOCK | Simulado erro 403 do Supabase no Rate Limit -> `FAIL-CLOSED` -> HTTP 500. |
| RLSRV28 | PASS | MOCK | Simulado erro 404 do Supabase no Rate Limit -> `FAIL-CLOSED` -> HTTP 500. |
| RLSRV29 | PASS | REAL | Timeout de 5s disparado -> `STORAGE_UNAVAILABLE` -> `FAIL-OPEN` -> Turnstile executado. |
| RLSRV30 | PASS | MOCK | Simulado HTTP 503 do Supabase no Rate Limit -> `FAIL-OPEN` -> Turnstile executado. |
| RLSRV31 | PASS | MOCK | RPC respondeu `retry_after_seconds: "abc"` -> `INVALID_RPC_RESPONSE` -> `FAIL-CLOSED` -> HTTP 500. |
| RLSRV32 | PASS | REAL | `CF-Connecting-IP: 01.2.3.4` -> `normalizeIPv4` retorna `null` -> `CONFIG_INVALID` -> HTTP 500. |
| RLSRV33 | PASS | REAL | `allowed=false` com retry válido -> HTTP 429 + `Retry-After`. Sem chamadas Turnstile/RPC. |

## Destaques

- **RATE LIMIT 401/403**: FAIL-CLOSED (Implementado em `av-rate-limit.ts`)
- **RATE LIMIT 404**: FAIL-CLOSED (Implementado em `av-rate-limit.ts`)
- **RATE LIMIT TIMEOUT**: FAIL-OPEN (Implementado com `AbortController` e `status check`)
- **RATE LIMIT 503**: FAIL-OPEN (Implementado via `status check`)

- **FAIL-OPEN COUNT**: 2 (Timeout, 502/503/504)
- **FAIL-CLOSED COUNT**: 6 (401, 403, 404, SQLSTATE AV01x, unknown, invalid JSON response)

- **TURNSTILE AFTER TIMEOUT**: SIM (Fail-Open segue fluxo)
- **TURNSTILE AFTER 503**: SIM (Fail-Open segue fluxo)
- **TURNSTILE AFTER 401**: NÃO (Fail-Closed interrompe fluxo)
- **TURNSTILE AFTER 404**: NÃO (Fail-Closed interrompe fluxo)
