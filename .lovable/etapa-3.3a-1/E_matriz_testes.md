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
| **TUR04** | Token >2048 | `turnstile_token: "A" * 2049` | 400 | INVALID_REQUEST | N/A |
| **TUR05** | Secret ausente | `TURNSTILE_SECRET_KEY` unset | 500 | INTERNAL_ERROR | turnstile_config / CONFIG_MISSING |
| **TUR06** | success=false | `success: false` | 403 | TURNSTILE_FAILED | turnstile / FAILED |
| **TUR07** | Token válido | Chave oficial de teste (Pass) | 200/Fluxo | N/A | turnstile (Success) |
| **TUR08** | Action incorreta | `action: "wrong_action"` | 403 | TURNSTILE_FAILED | turnstile / ACTION_MISMATCH |
| **TUR09** | Hostname incorreto | Hostname não listado | 403 | TURNSTILE_FAILED | turnstile / HOSTNAME_MISMATCH |
| **TUR10** | Timeout | Siteverify > 8s | 503 | TURNSTILE_UNAVAILABLE | turnstile / TIMEOUT |
| **TUR11** | JSON inválido | Resposta corrompida CF | 503 | TURNSTILE_UNAVAILABLE | turnstile / INVALID_RESPONSE |
| **TUR12** | Replay | Token já consumido | 403 | TURNSTILE_FAILED | turnstile / FAILED |
| **TUR13** | Token não aparece logs | Inspeção de logs | N/A | N/A | Token omitido nos logs |
| **TUR14** | Secret não aparece logs | Inspeção de logs | N/A | N/A | Secret omitido nos logs |
| **TUR15** | Turnstile bloqueado | Siteverify falhou | 403 | TURNSTILE_FAILED | RPC NÃO chamada |
| **TUR16** | Token válido + Pedido | Sucesso completo | 200 | N/A | RPC chamada exatamente 1 vez |
| **TUR17** | Retry | Mesmo ID + Novo Token | 200 | N/A | Mesma order idempotency_key |
| **TUR18** | Payload inválido | event_id inválido | 400 | INVALID_REQUEST | Siteverify NÃO chamada |
| **TUR19** | HTTP Siteverify 500 | Erro 500 Cloudflare | 503 | TURNSTILE_UNAVAILABLE | turnstile / HTTP_ERROR |
| **TUR20** | JSON malformado | JSON quebrado Siteverify | 503 | TURNSTILE_UNAVAILABLE | turnstile / INVALID_RESPONSE |
| **TUR21** | Array/null | Siteverify retorna array | 503 | TURNSTILE_UNAVAILABLE | turnstile / INVALID_RESPONSE |
| **TUR22** | Prod sem hostnames | Config ausente em Prod | 500 | INTERNAL_ERROR | turnstile_config / CONFIG_MISSING |
| **TUR23** | Test mode em Prod | TEST_MODE=true em Prod | 500 | INTERNAL_ERROR | turnstile_config / CONFIG_ERROR |
| **TUR24** | Submit consumido | Tentativa enviada | N/A | N/A | Widget resetado via useImperativeHandle |
| **TUR25** | Retry | Reenvio após reset | 200 | N/A | Novo Token + Mesma chave pedido |

**ESTADO DAS VARIÁVEIS:**

1. `TURNSTILE_SECRET_KEY`: Server-side Secret.
2. `TURNSTILE_EXPECTED_HOSTNAMES`: Server-side, Obrigatório em Prod.
3. `TURNSTILE_TEST_MODE`: "true" para habilitar bypass localhost em Dev.
4. `VITE_TURNSTILE_SITE_KEY`: Frontend Public.
