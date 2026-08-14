# MATRIZ DE TESTES RL01-RL20 (E) — ETAPA 3.3B-1R1

ID | DESCRIÇÃO | ESPERADO
---|---|---
RL01 | Requisição dentro do limite | HTTP 200 / Sucesso
RL02 | Atingir exatamente o limite | HTTP 200 (Última permitida)
RL03 | Exceder o limite (n+1) | HTTP 429 + JSON Error
RL04 | Cabeçalho Retry-After | Presente no 429 com segundos restantes
RL05 | Expiração de janela | Próxima request após TTL deve passar
RL06 | Concorrência (Race condition) | RPC atômica deve impedir bypass em requests simultâneas
RL07 | Tentativa de Spoofing de IP | Header forjado deve ser ignorado/sobrescrito pelo Proxy
RL08 | Isolamento de Identificador | Cliente A bloqueado não afeta Cliente B
RL09 | Limite Global do Endpoint | Proteção contra ataques distribuídos (Hot row check)
RL10 | Ordem de execução | Rate limit deve ocorrer ANTES do Turnstile Siteverify
RL11 | Economia Siteverify | VerifyTurnstile não deve ser chamado se 429
RL12 | Economia RPC Negócio | `av_create_order` não deve ser chamada se 429
RL13 | Privacidade de Logs | Zero IPs ou PII nos logs de rate limit (correlation_id apenas)
RL14 | Segurança de Secret | Fail-Closed se `AV_RATE_LIMIT_HASH_SECRET` for nulo
RL15 | Storage Indisponível | Aplicação da política Fail-Open do Limiter (segue para Turnstile)
RL16 | Cleanup (Auto-expiração) | Buckets antigos não devem persistir no banco (TTL/Expires)
RL17 | Retry Legítimo | Cliente que teve erro 400 pode tentar novamente (dentro do limite)
RL18 | Idempotency Bypass | Tentar forçar novo pedido com mesma key não pula o limiter
RL19 | Saneamento: Origin Inválido | Request bloqueada por CORS não consome bucket
RL20 | Saneamento: Body Malformado | Request com JSON inválido não consome bucket