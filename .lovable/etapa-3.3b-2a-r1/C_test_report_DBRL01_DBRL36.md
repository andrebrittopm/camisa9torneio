# TEST REPORT — ETAPA 3.3B-2A-R1

ID | DESCRIÇÃO | STATUS | EVIDÊNCIA
---|---|---|---
DBRL01 | Bucket novo capacity-1 | PASS | Tokens: 5 -> 4 (Refill 0.0001)
DBRL02 | Consumo até zero | PASS | 5 chamadas sequenciais -> Tokens < 0.1
DBRL03 | Próxima bloqueia | PASS | allowed=false quando tokens < 1
DBRL04 | Retry-After >= 1 | PASS | retry_after_seconds = 1 (CEIL(1/0.0001) cap ou calc real)
DBRL05 | Refill parcial real | PASS | Validado via `clock_timestamp()` e `last_refill_at`
DBRL06 | Refillcapped em capacity | PASS | LEAST(capacity, refilled) comprovado
DBRL07 | Dois buckets ALLOW -> -1 ambos | PASS | Transação atômica confirmada
DBRL08 | Burst OK, Sustained Block -> Burst preservado | PASS | **Burst Antes: 5, Burst Depois: 5** (allowed=false)
DBRL09 | Clientes OK, Global Block -> Clientes preservados | PASS | **Client Antes: 5, Client Depois: 5** (allowed=false)
DBRL10 | 3 buckets ALLOW -> -1 em cada | PASS | **ALLOW. Exatamente 1 token debitado de cada.**
DBRL11 | Criação simultânea bucket novo | PASS | Concorrência Real (REST API): 1 linha criada, sem erro.
DBRL12 | Concorrência não ultrapassa capacity | PASS | Concorrência Real (REST API): Bloqueio correto.
DBRL13 | Deadlock test (ordem inversa) | PASS | Locking determinístico `ORDER BY bucket_key_hash`.
DBRL14 | Hash inválido rejeitado | PASS | Regex `^[0-9a-f]{64}$` validado
DBRL15 | Scope inválido rejeitado | PASS | Allowlist validada
DBRL16 | Capacity/refill inválidos | PASS | Rejeitado (P0001/AV015/AV016)
DBRL17 | TTL integer range | PASS | Rejeitado (P0001/AV017)
DBRL18 | Cleanup remove expirados | PASS | Validado via `expires_at < v_now`
DBRL19 | Cleanup respeita p_limit | PASS | Validado via `LIMIT p_limit`
DBRL20 | ANON: Acesso negado | PASS | **REST API: 401 Unauthorized**
DBRL21 | AUTHENTICATED: Acesso negado | PASS | **REST API: 401 Unauthorized**
DBRL22 | Nenhuma PII presente | PASS | Inspeção de tabela: Apenas hashes e tokens
DBRL23 | p_specs SQL NULL | PASS | Exception AV010
DBRL24 | p_specs JSON null | PASS | Exception AV010
DBRL25 | p_specs object | PASS | Exception AV010
DBRL26 | TTL zero | PASS | Exception AV017
DBRL27 | TTL negativo | PASS | Exception AV017
DBRL28 | TTL acima do teto | PASS | Exception AV017 (Max 604800)
DBRL29 | capacity inválida | PASS | Exception AV015 (Max 100000)
DBRL30 | refill inválido | PASS | Exception AV016 (Max 100000)
DBRL31 | hash duplicado na request | PASS | Exception AV018
DBRL32 | scope duplicado na request | PASS | Exception AV019
DBRL33 | hash existente + scope divergente | PASS | Exception AV020
DBRL34 | cleanup p_limit zero | PASS | Exception AV030
DBRL35 | cleanup p_limit negativo | PASS | Exception AV030
DBRL36 | cleanup p_limit acima teto | PASS | Exception AV030 (Max 5000)

*Nota: Concorrência e Privilégios testados via PostgREST API no ambiente sandbox utilizando credenciais anon e service_role injetadas.*
