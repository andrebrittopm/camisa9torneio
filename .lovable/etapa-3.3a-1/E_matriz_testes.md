---
name: ETAPA 3.3A-1 — MATRIZ DE TESTES TURNSTILE
description: Definição dos cenários de teste para validação da proteção anti-bot.
type: feature
---

| ID | CENÁRIO | INPUT | EXPECTED STATUS | EXPECTED ERROR | STAGE/CODE (LOG) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TUR01** | Token ausente | `{ ... }` (sem turnstile_token) | 400 | INVALID_REQUEST | N/A |
| **TUR02** | Token não string | `turnstile_token: 123` | 400 | INVALID_REQUEST | N/A |
| **TUR03** | Token vazio | `turnstile_token: ""` | 400 | INVALID_REQUEST | N/A |
| **TUR04** | Token muito longo | `turnstile_token: "A" * 2049` | 400 | INVALID_REQUEST | N/A |
| **TUR05** | Secret ausente | `TURNSTILE_SECRET_KEY` unset | 500 | INTERNAL_ERROR | turnstile_config / CONFIG_MISSING |
| **TUR06** | Siteverify negado | `success: false` | 403 | TURNSTILE_FAILED | turnstile / FAILED |
| **TUR07** | Token válido | Chave oficial de teste (Pass) | Continua fluxo | N/A | turnstile (Success) |
| **TUR08** | Action incorreta | `action: "wrong_action"` | 403 | TURNSTILE_FAILED | turnstile / ACTION_MISMATCH |
| **TUR09** | Hostname incorreto | Hostname não listado | 403 | TURNSTILE_FAILED | turnstile / HOSTNAME_MISMATCH |
| **TUR10** | Timeout | Siteverify > 8s | 503 | TURNSTILE_UNAVAILABLE | turnstile / TIMEOUT |
| **TUR11** | JSON inválido | Resposta corrompida CF | 503 | TURNSTILE_UNAVAILABLE | turnstile / INVALID_JSON |
| **TUR12** | Replay de token | Token já consumido | 403 | TURNSTILE_FAILED | turnstile / FAILED |
| **TUR13** | Log Safety | Verificação de strings | N/A | N/A | Token e Secret não aparecem nos logs |
| **TUR14** | Fail-Closed | Bloqueio na falha | 403/503 | TURNSTILE_FAILED/UNAV. | RPC não é chamada |
| **TUR15** | Idempotency Legit | Retry com novo token | 200 | N/A | `is_duplicate: true` |

**VARIÁVEIS DE AMBIENTE NECESSÁRIAS:**

1. `TURNSTILE_SECRET_KEY` (Server-side Secret)
2. `TURNSTILE_EXPECTED_HOSTNAMES` (Opcional, lista separada por vírgula)
3. `VITE_TURNSTILE_SITE_KEY` (Frontend Public)
