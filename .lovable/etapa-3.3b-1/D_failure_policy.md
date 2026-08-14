# FAILURE POLICY (D) — ETAPA 3.3B-1

## 1. FAIL-OPEN VS FAIL-CLOSED

| CENÁRIO | POLÍTICA | JUSTIFICATIVA |
|---|---|---|
| **Falha de Conexão DB** | **FAIL-OPEN** | Não queremos impedir vendas legítimas se o banco de rate limit (mesmo sendo o principal) oscilar momentaneamente antes da lógica de negócio. |
| **Ausência de Secret** | **FAIL-CLOSED** | Erro de configuração crítica. Bloqueia o endpoint e loga erro de sistema. |
| **Erro de Sintaxe RPC** | **FAIL-CLOSED** | Indica bug no deploy. |

## 2. COMPORTAMENTO POR AMBIENTE
- **PRODUÇÃO**: Fail-Open controlado com logs de erro de alta prioridade.
- **DESENVOLVIMENTO**: Bypass (Skip) ou logs de aviso para não atrapalhar testes locais sem IP real.

## 3. IDENTIFICAÇÃO DE ERROS
Em caso de falha no limiter, o sistema deve:
1. Capturar a exceção.
2. Logar `correlation_id` + `error_type=RATE_LIMIT_STORAGE_ERROR`.
3. Incrementar métrica de erro (se disponível).
4. Permitir a requisição prosseguir para o Turnstile.
