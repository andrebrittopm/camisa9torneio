# CONCURRENCY REPORT — ETAPA 3.3B-2A-R1

## METODOLOGIA
Utilizado harness em Python disparando requisições paralelas via REST API do Supabase (PostgREST) utilizando a `service_role_key`.

## RESULTADOS

### DBRL11: Criação Simultânea
- **Ação**: 2 threads disparando `av_check_rate_limits` para o mesmo hash inexistente.
- **Resultado**: Ambos receberam `allowed: true`.
- **Integridade**: Apenas 1 linha persistida na tabela `av_rate_limit_buckets` (confirmado via `INSERT ... ON CONFLICT DO NOTHING`).
- **STATUS**: PASS

### DBRL12: Limite de Capacidade
- **Ação**: Burst de 15 requisições para bucket com capacity=10.
- **Resultado**: Exatamente 10 requisições permitidas, 5 bloqueadas com `allowed: false`.
- **STATUS**: PASS

### DBRL13: Deadlock / Ordem Determinística
- **Ação**: Sessão A envia [Hash1, Hash2]. Sessão B envia [Hash2, Hash1].
- **Mecanismo**: A função reordena internamente todos os hashes via `SELECT array_agg(h ORDER BY h)` antes de aplicar `FOR UPDATE`.
- **Observação**: Zero deadlocks detectados em 50 iterações.
- **STATUS**: PASS
