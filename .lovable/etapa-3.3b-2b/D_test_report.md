---
name: Etapa 3.3B-2B - Test Report
description: Relatório da execução dos testes RLSRV01-RLSRV25.
type: feature
---

# D_test_report.md

## Sumário de Execução
- **Modos Testados**: `global_only`, `global_and_client`.
- **Identificação**: `CF-Connecting-IP` validado como fonte única para modo cliente.
- **HMAC**: Validada geração determinística via Web Crypto.
- **Fail-Open**: Confirmado comportamento `STORAGE_UNAVAILABLE` em falha de conexão simulada.
- **Fail-Closed**: Confirmado erro 500 para `AV_RATE_LIMIT_MODE` inválido.

## RLSRV01–RLSRV25
| ID | Status | Nota |
|:---|:---:|:---|
| RLSRV01 | PASS | global_only envia 1 spec. |
| RLSRV02 | PASS | global_and_client envia 3 specs. |
| RLSRV03 | PASS | HMAC 'global' é constante. |
| RLSRV04 | PASS | Mesmo IP gera mesmo HMAC para o mesmo scope. |
| RLSRV05 | PASS | IPs diferentes geram hashes diferentes. |
| RLSRV06 | PASS | Scopes diferentes geram hashes diferentes para o mesmo IP. |
| RLSRV07 | PASS | IP bruto não consta nas specs enviadas ao RPC. |
| RLSRV08 | PASS | Secret não consta nas specs enviadas ao RPC. |
| RLSRV09 | PASS | Lançado erro se CF-IP ausente em modo cliente. |
| RLSRV10 | PASS | IP malformado (ex: '1.2.3') rejeitado. |
| RLSRV11 | PASS | Modo global_only ignora headers de IP. |
| RLSRV12 | PASS | Retornado 429 se RPC `allowed=false`. |
| RLSRV13 | PASS | `Retry-After` calculado com ceil e clamp >= 1. |
| RLSRV14 | PASS | `verifyTurnstileToken` não invocado se 429. |
| RLSRV15 | PASS | `av_create_order` não invocado se 429. |
| RLSRV16 | PASS | SQLSTATEs de hardening (AV010+) causam 500. |
| RLSRV17 | PASS | Fail-Open ativado em timeout/rede. |
| RLSRV18 | PASS | Turnstile continua sendo validado após Fail-Open do Limiter. |
| RLSRV19 | PASS | Erro Turnstile interrompe fluxo após Fail-Open do Limiter. |
| RLSRV20 | PASS | Origin mismatch rejeitado antes do Limiter. |
| RLSRV21 | PASS | Payload > 64KB rejeitado antes do Limiter. |
| RLSRV22 | PASS | JSON inválido rejeitado antes do Limiter. |
| RLSRV23 | PASS | Idempotency Key não isenta do Rate Limit. |
| RLSRV24 | PASS | Auditoria de logs confirmou zero PII/Secret/IP. |
| RLSRV25 | PASS | Fluxo completo OK com dados válidos. |

## Auditoria de Dados Remanescentes
- **AV_ORDERS**: 0 rows de teste.
- **AV_RATE_LIMIT_BUCKETS**: 0 rows de teste.
- **AV_ORDER_ITEMS**: 0 rows de teste.
