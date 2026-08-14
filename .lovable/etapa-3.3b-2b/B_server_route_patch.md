---
name: Etapa 3.3B-2B - Server Route Patch
description: Resumo das alterações realizadas no arquivo src/routes/api/public/av-create-order.ts.
type: reference
---

# B_server_route_patch.md

Patch aplicado à Server Route `av-create-order.ts`.

## Alterações no Fluxo
1. **Importação**: Adicionado `checkRateLimit` de `@/lib/server/av-rate-limit`.
2. **Posicionamento**: O Rate Limiting foi inserido imediatamente após as validações sintáticas baratas e antes do Turnstile Siteverify.
3. **HTTP 429**: Implementado retorno de status 429 com cabeçalho `Retry-After` (clamp 1-86400s) e corpo JSON padrão.
4. **Proteção**: Garantido que Turnstile e RPC de Negócio NÃO são chamados se o Rate Limit negar a requisição.
5. **Logs**: Mantida a política de zero PII/Secret em logs, utilizando `correlation_id` para rastreamento.

## Ordem Final
1. Origin Check
2. Body Size Check (64KB)
3. JSON Parsing
4. Schema Validation (Allowlist)
5. Basic Content Validation
6. **Rate Limiting** (HMAC + PostgreSQL RPC)
7. **Turnstile Siteverify**
8. Business Logic (av_create_order)
9. Sanitized Response
