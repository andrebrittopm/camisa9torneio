# MATRIZ DE TESTES RL01-RL25 (E) — ETAPA 3.3B-1R2

ID | DESCRIÇÃO | ESPERADO
---|---|---
RL01 | Requisição dentro do limite | HTTP 200 / Sucesso
RL02 | Atingir exatamente o limite (0 tokens) | HTTP 200 (Última permitida)
RL03 | Exceder o limite (tokens < 1) | HTTP 429 + JSON Error
RL04 | Cabeçalho Retry-After | Presente no 429 com segundos para refill de 1 token
RL05 | Refill Gradual | Frações de tokens devem ser adicionadas conforme tempo decorrido
RL06 | Concorrência (Race condition) | Lock de linha atômico deve impedir bypass em requests simultâneas
RL07 | Tentativa de Spoofing de IP | Cloudflare/Lovable Gateway deve ignorar/sobrescrever header forjado
RL08 | Isolamento de Identificador | Cliente A bloqueado não afeta Cliente B
RL09 | Limite Global do Endpoint | Proteção contra ataques distribuídos (Hot row check)
RL10 | Ordem de execução | Rate limit deve ocorrer ANTES do Turnstile Siteverify
RL11 | Economia Siteverify | VerifyTurnstile não deve ser chamado se 429
RL12 | Economia RPC Negócio | `av_create_order` não deve ser chamada se 429
RL13 | Privacidade de Logs | Zero IPs ou PII nos logs de rate limit (correlation_id apenas)
RL14 | Segurança de Secret | Fail-Closed se `AV_RATE_LIMIT_HASH_SECRET` for nulo
RL15 | Storage Indisponível | Aplicação da política Fail-Open do Limiter (segue para Turnstile)
RL16 | Cleanup Controlado | Buckets antigos devem ser removidos via `expires_at` indexado
RL17 | Retry Legítimo | Cliente que teve erro 400 pode tentar novamente (dentro do limite)
RL18 | Idempotency Bypass | Tentar forçar novo pedido com mesma key não pula o limiter
RL19 | Saneamento: Origin Inválido | Request bloqueada por CORS não consome bucket
RL20 | Saneamento: Body Malformado | Request com JSON inválido não consome bucket
RL21 | CF-Connecting-IP ausente | Fail-Closed em produção (HTTP 500)
RL22 | HMAC Determinístico | Mesmo IP/Scope gera sempre a mesma `bucket_key_hash`
RL23 | Separação de Scopes | Mesmo IP em Scopes diferentes gera hashes distintos
RL24 | Separação de Identificadores | IPs diferentes geram buckets totalmente isolados
RL25 | Segredo Invisível | `AV_RATE_LIMIT_HASH_SECRET` nunca vaza em logs/banco/responses
