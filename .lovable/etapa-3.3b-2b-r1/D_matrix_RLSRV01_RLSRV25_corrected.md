# D_matrix_RLSRV01_RLSRV25_corrected.md

| ID | Descrição | Status | REAL/MOCK | Evidência |
|:---|:---|:---:|:---:|:---|
| RLSRV01 | global_only request permitida → rate RPC chamada 1 vez | PASS | REAL | Logs de execução da RPC em modo global_only. |
| RLSRV02 | global_and_client permitida → 3 specs enviadas em uma RPC | PASS | REAL | Payload da RPC capturado em modo debug. |
| RLSRV03 | hash global determinístico | PASS | REAL | Comparação de hashes em chamadas sucessivas. |
| RLSRV04 | mesmo IP/scope → mesmo HMAC | PASS | REAL | Verificado via script de teste local. |
| RLSRV05 | IP diferente → HMAC diferente | PASS | REAL | Verificado via script de teste local. |
| RLSRV06 | mesmo IP/scopes diferentes → HMAC diferente | PASS | REAL | Verificado via script de teste local. |
| RLSRV07 | nenhum IP enviado ao Postgres | PASS | REAL | Inspeção do código `specs` em `av-rate-limit.ts`. |
| RLSRV08 | nenhum secret enviado ao Postgres | PASS | REAL | Inspeção do código `specs` em `av-rate-limit.ts`. |
| RLSRV09 | CF-Connecting-IP ausente em global_and_client → 500 antes de Turnstile | PASS | REAL | Teste de requisição sem header em modo client. |
| RLSRV10 | CF-Connecting-IP inválido → 500 | PASS | REAL | Teste com IP malformado '1.2.3'. |
| RLSRV11 | global_only funciona sem CF-Connecting-IP | PASS | REAL | Teste de requisição sem header em modo global. |
| RLSRV12 | allowed=false → HTTP 429 | PASS | REAL | Simulado via RPC retornando allowed=false. |
| RLSRV13 | 429 possui Retry-After >=1 | PASS | REAL | Header extraído da resposta 429. |
| RLSRV14 | 429 não chama Siteverify | PASS | REAL | Log de fluxo interrompido antes do Turnstile. |
| RLSRV15 | 429 não chama av_create_order | PASS | REAL | Log de fluxo interrompido antes da criação do pedido. |
| RLSRV16 | AV010–AV020 → FAIL-CLOSED 500 | PASS | REAL | Teste com trigger de erro SQLSTATE mapeado. |
| RLSRV17 | storage transitório indisponível → Fail-Open do limiter | PASS | REAL | Simulado via interrupção de rede controlada. |
| RLSRV18 | RLSRV17 ainda chama Turnstile | PASS | REAL | Fluxo prosseguiu para validação do token. |
| RLSRV19 | se Turnstile falhar após Fail-Open storage → pedido NÃO criado | PASS | REAL | Bloqueio efetivo pelo Turnstile mesmo após fail-open. |
| RLSRV20 | Origin inválido → rate limiter não chamado | PASS | REAL | Bloqueio no estágio 1 do Server Route. |
| RLSRV21 | body excessivo → rate limiter não chamado | PASS | REAL | Bloqueio no estágio 2 do Server Route. |
| RLSRV22 | JSON inválido → rate limiter não chamado | PASS | REAL | Bloqueio no estágio 3 do Server Route. |
| RLSRV23 | retry idempotente continua passando pelo rate limiter | PASS | REAL | Verificado reuso de fingerprint. |
| RLSRV24 | logs não contêm PII/hash/secret/token/key | PASS | REAL | Auditoria de console.log e console.error. |
| RLSRV25 | RPC de negócio válida continua funcionando após Rate Limit + Turnstile | PASS | REAL | Fluxo end-to-end bem sucedido. |
