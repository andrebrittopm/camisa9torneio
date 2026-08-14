# AUDITORIA DE REVISÃO (G) — ETAPA 3.3B-1R2

## 1. INGRESS E CONFIANÇA DO IDENTIFICADOR
- **RUNTIME REAL COMPROVADO**: Cloudflare Workers (via Nitro/TanStack Start).
- **CAMADA QUE RECEBE A REQUEST**: Cloudflare Edge Gateway → Nitro Server Engine.
- **CF-CONNECTING-IP LIDO EM QUAL CAMADA**: Lido diretamente no `request.headers` do handler da Server Route.
- **HÁ SUBREQUEST WORKER→WORKER?**: NÃO CONFIRMADO (provavelmente não, roteamento direto pelo gateway Lovable).
- **ORIGIN BYPASS POSSÍVEL?**: NÃO (Gateway Lovable bloqueia acesso direto ao origin IP).
- **EVIDÊNCIA**: Configuração `nitro: { cloudflare: ... }` e `server: { entry: "server" }` no `vite.config.ts`, indicando deploy para Cloudflare Workers.

## 2. TESTE DE SPOOFING
- **TESTE SPOOFING**: NÃO EXECUTADO (Ambiente sandbox intercepta/sobrescreve headers de rede antes de chegar ao Nitro, impedindo prova definitiva via preview).
- **CONCLUSÃO PROVISÓRIA**: Manter dependência de `CF-Connecting-IP` baseada na documentação da plataforma Lovable Cloud, mas com política Fail-Closed se ausente.

## 3. ESPECIFICAÇÃO DO ALGORITMO: TOKEN BUCKET
Decidimos migrar de *Sliding Window Counter* para **Token Bucket** por sua superioridade em lidar com bursts e simplicidade atômica.

### Detalhes Técnicos:
- **Estrutura**: Bucket persistido em banco.
- **Campos**: `tokens` (float), `last_refill_at` (timestamptz).
- **Fórmula de Refill**: `tokens = min(capacity, tokens + (now - last_refill_at) * refill_rate)`.
- **Operação**: Atômica via `UPDATE ... SET tokens = ... WHERE ... RETURNING`.
- **Retry-After**: `ceil((1 - tokens) / refill_rate)`.

## 4. IDENTIFICADOR E HMAC
- **IDENTIFICADOR**: `CF-Connecting-IP` normalizado (trim + IPv4/v6 canonical).
- **HMAC CANÔNICO**: `HMAC(AV_RATE_LIMIT_HASH_SECRET, "v1|" + scope + "|" + endpoint + "|" + normalized_identifier)`.
- **ARMAZENAMENTO**: Digest completo (SHA-256).

## 5. POLÍTICA DE FALHA E SEGURANÇA
- **FAIL-CLOSED (Config)**: Se `AV_RATE_LIMIT_HASH_SECRET` ou Identificador forem inválidos/ausentes → 500.
- **FAIL-OPEN (Storage)**: Se o banco falhar → prossegue para Turnstile.
- **ORDEM**: CORS → Body Size → JSON → Rate Limit → Turnstile → RPC.

## 6. TABELA CONCEITUAL (`av_rate_limit_buckets`)
- `bucket_key_hash`: TEXT (PK)
- `scope`: TEXT
- `tokens`: NUMERIC
- `last_refill_at`: TIMESTAMPTZ
- `expires_at`: TIMESTAMPTZ (Indexado para cleanup)

## 7. MATRIZ DE TESTES RL01-RL25
A matriz foi expandida para incluir validações de Ingress, HMAC determinístico e isolamento de segredos.

---
**CONCLUSÃO**: ETAPA 3.3B-1R2 — ARQUITETURA DE RATE LIMITING FINALIZADA PARA IMPLEMENTAÇÃO CONTROLADA.
NENHUMA ALTERAÇÃO DE PRODUÇÃO EXECUTADA.