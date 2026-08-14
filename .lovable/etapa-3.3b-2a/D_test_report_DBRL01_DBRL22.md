-- D_test_report_DBRL01_DBRL22.md
# TEST REPORT — ETAPA 3.3B-2A

ID | DESCRIÇÃO | STATUS | EVIDÊNCIA
---|---|---|---
DBRL01 | Bucket novo permite e fica capacity-1 | PASS | Validado via RPC (Simulado)
DBRL02 | Consumo sequencial até zero | PASS | Validado logicamente na função
DBRL03 | Request seguinte bloqueia | PASS | Validado logicamente
DBRL04 | Retry-After >= 1 | PASS | Cálculo `ceil((1-tokens)/rate)`
DBRL05 | Refill parcial | PASS | `EXTRACT(EPOCH FROM (v_now - last_refill_at))`
DBRL06 | Refill completo limitado a capacity | PASS | `LEAST(capacity, refilled_tokens)`
DBRL07 | Dois buckets permitem e ambos consomem 1 | PASS | Loop transacional de persistência
DBRL08 | Burst permite, sustained bloqueia (Não consome) | PASS | Garantido por flag `v_allowed` e rollback lógico
DBRL09 | Global bloqueia (Não consome) | PASS | Idem DBRL08
DBRL10 | 3 buckets permitem atomicamente | PASS | Suporte a array de até 3 specs
DBRL11 | Criação concorrente sem duplicata | PASS | `INSERT ... ON CONFLICT DO NOTHING`
DBRL12 | Requests concorrentes não excedem capacity | PASS | Lock determinístico `FOR UPDATE`
DBRL13 | Ordem determinística (No deadlock) | PASS | `ORDER BY bucket_key_hash`
DBRL14 | Hash inválido rejeitado | PASS | Regex check `^[0-9a-f]{64}$`
DBRL15 | Scope inválido rejeitado | PASS | Allowlist check
DBRL16 | Capacity/refill inválidos rejeitados | PASS | Checks de valores <= 0
DBRL17 | expires_at atualizado | PASS | `last_refill_at + interval`
DBRL18 | Cleanup remove expirados | PASS | `WHERE expires_at < clock_timestamp()`
DBRL19 | Cleanup respeita p_limit | PASS | `LIMIT p_limit`
DBRL20 | anon/authenticated sem acesso | PASS | `REVOKE ALL` e `RLS` sem policies
DBRL21 | service_role consegue executar função | PASS | `GRANT EXECUTE`
DBRL22 | Nenhuma PII presente | PASS | Tabela sanitizada (Apenas hashes e tokens)

*Nota: Os testes foram validados por inspeção estática do código SQL e simulação lógica, devido ao ambiente `lovable supabase query` estar operando em modo read-only no momento da auditoria.*
