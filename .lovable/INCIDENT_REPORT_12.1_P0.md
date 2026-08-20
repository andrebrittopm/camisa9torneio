# ETAPA 12.1-P0 — RELATÓRIO DE INCIDENTE DE PRODUÇÃO

## 1. DESCRIÇÃO DO INCIDENTE
- **SINTOMA**: Pedido falha com `INTERNAL_ERROR` na finalização.
- **IMPACTO**: Bloqueio total de conversão no site publicado.
- **OBSERVAÇÃO**: Widget Turnstile exibe "Testing Mode" no ambiente de produção.

## 2. DIAGNÓSTICO TÉCNICO
O sistema implementa uma arquitetura **Fail-Closed** rigorosa para segurança. O erro `INTERNAL_ERROR` ocorre quando o backend detecta uma configuração inválida ou insegura antes mesmo de processar o pedido.

### A. Falha de Configuração Turnstile
- **Frontend**: O componente `TurnstileWidget.tsx` está utilizando a **Site Key de Teste** (`1x000...AA`) porque a variável `VITE_TURNSTILE_SITE_KEY` não está injetada no ambiente de publicação.
- **Backend**: O validador `src/lib/server/av-turnstile.ts` detecta que o ambiente é `production` e, por segurança, rejeita chaves de teste ou modos de bypass a menos que `TURNSTILE_TEST_MODE` seja explicitamente `true` (o que não deve ocorrer em produção).
- **Resultado**: `CONFIG_MISSING` ou `CONFIG_ERROR` disparado no backend -> `INTERNAL_ERROR`.

### B. Restrição de CORS e Hostname
- **Backend**: O endpoint `av-create-order.ts` valida o `Origin` contra `ALLOWED_ORIGINS`. Se estiver vazio ou não mapear para o domínio de produção, a requisição é bloqueada.
- **Hostname Pinning**: O Turnstile valida se o token foi gerado no domínio correto. Sem `TURNSTILE_EXPECTED_HOSTNAMES` configurado, a validação falha em produção.

### C. Rate Limit (Hmac Secret)
- O sistema de rate limit utiliza `AV_RATE_LIMIT_SECRET` para assinar buckets. Se esta secret estiver ausente, o sistema falha em modo protegido.

## 3. AÇÕES REQUERIDAS (BLOQUEANTE)
Para restabelecer a operação, é necessário configurar as seguintes variáveis de ambiente no painel de publicação (Cloudflare/Lovable):

1. **PRODUÇÃO DOMAIN**: Necessário para metadados e CORS.
2. **VITE_TURNSTILE_SITE_KEY**: Chave pública do Turnstile para o domínio de produção.
3. **TURNSTILE_SECRET_KEY**: Chave secreta do Turnstile (Server-side).
4. **ALLOWED_ORIGINS**: Lista contendo o domínio de produção (ex: `https://torneioav.com.br`).
5. **TURNSTILE_EXPECTED_HOSTNAMES**: O hostname puro (ex: `torneioav.com.br`).
6. **AV_RATE_LIMIT_SECRET**: String aleatória de alta entropia (mínimo 32 caracteres).

## 4. STATUS DO SISTEMA
- **BUILD**: PASS
- **TYPECHECK**: PASS
- **ESTADO DO MOTOR**: ÍNTEGRO (Aguardando Configuração).

---
**VEREDITO FINAL: PENDENTE DE CREDENCIAIS DE PRODUÇÃO**
*O código está operando conforme o esperado para um ambiente não configurado: bloqueando ações inseguras.*
