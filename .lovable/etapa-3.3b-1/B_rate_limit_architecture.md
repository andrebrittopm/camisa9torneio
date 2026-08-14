# RATE LIMIT ARCHITECTURE (B) — ETAPA 3.3B-1R2

## 1. CLASSIFICAÇÃO TÉCNICA
Esta solução é classificada como **Application-layer Distributed Rate Limiting**. Ela protege os recursos da aplicação (Siteverify, RPC, Database) contra abuso.

## 2. ALGORITMO: TOKEN BUCKET
Utilizaremos o algoritmo **Token Bucket** para permitir bursts naturais com recuperação gradual.

### Detalhes Matemáticos:
- **Refill**: `refilled_tokens = min(capacity, current_tokens + (now - last_refill_at) * refill_rate_per_second)`.
- **Atomicidade**: Garantida via procedimento SQL (`av_check_rate_limit`) com transação isolada e lock de linha.
- **Retry-After**: `ceil((1 - refilled_tokens) / refill_rate_per_second)`.
- **Clock**: `CURRENT_TIMESTAMP` do PostgreSQL.

## 3. ESCOPOS E NAMESPACES
As chaves persistidas seguirão o padrão:
`HMAC(AV_RATE_LIMIT_HASH_SECRET, "v1|" + SCOPE + "|" + ENDPOINT + "|" + IDENTIFIER)`

- **SCOPE 1**: `order:client:burst` (Capacidade: 5, Refill: 5/60s)
- **SCOPE 2**: `order:client:sustained` (Capacidade: 20, Refill: 20/900s)
- **SCOPE 3**: `order:global` (Capacidade: 100, Refill: 100/60s)

## 4. IMPACTO NO POSTGRES E MITIGAÇÃO
- **Hot Row Global**: O bucket global é verificado por último para reduzir contenção. A contenção é um trade-off aceitável para o volume do projeto.
- **Cleanup**: Estratégia de `expires_at` indexado com cleanup periódico (manual ou automático). Buckets sem atividade são removidos após 24h.
