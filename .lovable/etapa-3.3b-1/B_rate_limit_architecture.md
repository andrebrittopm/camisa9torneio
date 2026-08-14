# RATE LIMIT ARCHITECTURE (B) — ETAPA 3.3B-1R1

## 1. CLASSIFICAÇÃO TÉCNICA
Esta solução é classificada como **Application-layer Distributed Rate Limiting**. Ela protege os recursos da aplicação (Siteverify, RPC, Database) contra abuso, mas não substitui a proteção de rede L3/L4.

## 2. ALGORITMO: SLIDING WINDOW COUNTER
Utilizaremos a técnica de janelas fixas acumuladas para aproximar uma janela deslizante com baixo custo de memória e alta precisão.

### Detalhes Matemáticos:
- **Estrutura**: Buckets de janela fixa (ex: 1 minuto).
- **Fórmula**: `count = current_window_count + (previous_window_count * (1 - fraction_of_current_window_elapsed))`.
- **Janelas**: Buckets de 60 segundos.
- **Atomicidade**: Garantida via procedimento SQL (`av_check_rate_limit`) com transação isolada.
- **Clock**: `CURRENT_TIMESTAMP` do PostgreSQL.

## 3. ESCOPOS E NAMESPACES
As chaves persistidas seguirão o padrão:
`HMAC(AV_RATE_LIMIT_HASH_SECRET, "v1:" + SCOPE + ":" + IDENTIFIER)`

- **SCOPE 1**: `order:client:burst` (Limites curtos)
- **SCOPE 2**: `order:client:sustained` (Limites longos)
- **SCOPE 3**: `order:global:burst` (Proteção coletiva)

## 4. IMPACTO NO POSTGRES E MITIGAÇÃO
- **Problema**: O bucket global pode gerar uma "hot row" (contenção de linha).
- **Mitigação**: O bucket global será verificado apenas se o bucket por cliente passar, e usaremos índices eficientes (`bucket_key_hash`) com RLS estrito.
- **Cleanup**: Os buckets expiram naturalmente via TTL ou cleanup por `expires_at` em tarefas de manutenção.
