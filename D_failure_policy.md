# FAILURE POLICY (D) — ETAPA 3.3B-1R1

## 1. POLÍTICA DE FALHA CRÍTICA (CONFIGURAÇÃO)
Se `AV_RATE_LIMIT_HASH_SECRET` estiver ausente em ambiente de **PRODUÇÃO**:
- **Ação**: **FAIL-CLOSED**.
- **Resposta**: HTTP 500 / `INTERNAL_ERROR`.
- **Log**: `stage=rate_limit_config`, `code=CONFIG_MISSING`.

## 2. POLÍTICA DE FALHA TRANSITÓRIA (STORAGE)
Se o Supabase/Postgres estiver inacessível durante a verificação do limiter:
- **Ação**: **FAIL-OPEN DO LIMITER**.
- **Fluxo**: Logar erro -> Prosseguir para `verifyTurnstileToken()`.
- **Garantia**: O Turnstile permanece obrigatório; a aplicação não fica vulnerável a ataques sem captcha.

## 3. RATE LIMIT ANTES DO TURNSTILE
Ordem de Precedência Obrigatória:
1. Validação de CORS/Origin.
2. Validação de Tamanho do Body (64KB).
3. Parse JSON e Validações Sintáticas Baratas.
4. **RATE LIMITING** (Consome bucket aqui).
5. **TURNSTILE SITEVERIFY**.
6. RPC `av_create_order`.

*Nota: Origin ou JSON inválidos NÃO devem consumir créditos do bucket.*