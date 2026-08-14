# RATE LIMIT ARCHITECTURE (B) — ETAPA 3.3B-1

## 1. COMPARAÇÃO DE OPÇÕES

| CRITÉRIO | OPÇÃO A (REDIS/KV) | OPÇÃO B (SUPABASE/POSTGRES) | OPÇÃO C (CLOUDFLARE WAF) |
|---|---|---|---|
| **Persistente?** | Sim/Não (depende de TTL) | Sim | Não (Camada L7) |
| **Distribuída?** | Sim | Sim (via DB central) | Sim |
| **Atomicidade?** | Alta | Alta (via SQL Transactions) | N/A |
| **Latência** | Muito Baixa (< 5ms) | Média (15-40ms) | Zero (Bloqueio na borda) |
| **Nova Infra?** | Sim (Upstash/Redis) | Não (Já existente) | Não (Gerenciada) |
| **Protege Siteverify?** | Sim | Sim | Sim |
| **Auditoria** | Moderada | Alta (Tabelas SQL) | Baixa (Logs Cloudflare) |

## 2. ARQUITETURA ESCOLHIDA: OPÇÃO B (SUPABASE/POSTGRES)
Dado que o projeto já utiliza Lovable Cloud com Supabase e não possui Redis configurado, a Opção B é a mais robusta, auditável e econômica.

## 3. ALGORITMO: SLIDING WINDOW LOG (OU COUNTER)
Utilizaremos um **Sliding Window Counter** simplificado via PostgreSQL para garantir precisão sem a complexidade de logs de timestamps individuais.

## 4. FLUXO DE EXECUÇÃO (SERVER ROUTE)
1. Receber Request -> Validar Origin/CORS.
2. Extrair IP via `CF-Connecting-IP`.
3. Computar `client_hash` usando segredo server-side.
4. Chamar RPC `av_check_rate_limit(client_hash, endpoint)`.
5. Se RPC retornar `limited`:
    - Logar `correlation_id` e `LIMITED`.
    - Retornar HTTP 429.
6. Se RPC retornar `ok`:
    - Seguir para `verifyTurnstileToken()`.
