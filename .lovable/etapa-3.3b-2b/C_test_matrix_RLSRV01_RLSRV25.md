---
name: Etapa 3.3B-2B - Rate Limit Integration Matrix
description: Matriz de testes RLSRV01-RLSRV25 para a integração do Rate Limit no Server Route.
type: feature
---

# Test Matrix RLSRV01–RLSRV25

| ID | Descrição | Status | Nota |
|:---|:---|:---:|:---|
| RLSRV01 | global_only request permitida → rate RPC chamada 1 vez | PENDENTE | |
| RLSRV02 | global_and_client permitida → 3 specs enviadas em uma RPC | PENDENTE | |
| RLSRV03 | hash global determinístico | PENDENTE | |
| RLSRV04 | mesmo IP/scope → mesmo HMAC | PENDENTE | |
| RLSRV05 | IP diferente → HMAC diferente | PENDENTE | |
| RLSRV06 | mesmo IP/scopes diferentes → HMAC diferente | PENDENTE | |
| RLSRV07 | nenhum IP enviado ao Postgres | PENDENTE | |
| RLSRV08 | nenhum secret enviado ao Postgres | PENDENTE | |
| RLSRV09 | CF-Connecting-IP ausente em global_and_client → 500 antes de Turnstile | PENDENTE | |
| RLSRV10 | CF-Connecting-IP inválido → 500 | PENDENTE | |
| RLSRV11 | global_only funciona sem CF-Connecting-IP | PENDENTE | |
| RLSRV12 | allowed=false → HTTP 429 | PENDENTE | |
| RLSRV13 | 429 possui Retry-After >=1 | PENDENTE | |
| RLSRV14 | 429 não chama Siteverify | PENDENTE | |
| RLSRV15 | 429 não chama av_create_order | PENDENTE | |
| RLSRV16 | AV010–AV020 → FAIL-CLOSED 500 | PENDENTE | |
| RLSRV17 | storage transitório indisponível → Fail-Open do limiter | PENDENTE | |
| RLSRV18 | RLSRV17 ainda chama Turnstile | PENDENTE | |
| RLSRV19 | se Turnstile falhar após Fail-Open storage → pedido NÃO criado | PENDENTE | |
| RLSRV20 | Origin inválido → rate limiter não chamado | PENDENTE | |
| RLSRV21 | body excessivo → rate limiter não chamado | PENDENTE | |
| RLSRV22 | JSON inválido → rate limiter não chamado | PENDENTE | |
| RLSRV23 | retry idempotente continua passando pelo rate limiter | PENDENTE | |
| RLSRV24 | logs não contêm PII/hash/secret/token/key | PENDENTE | |
| RLSRV25 | RPC de negócio válida continua funcionando após Rate Limit + Turnstile | PENDENTE | |
