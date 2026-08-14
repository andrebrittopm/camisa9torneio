---
name: Etapa 3.3B-2B - Rate Limit Server Helper
description: Detalhes da implementação do helper src/lib/server/av-rate-limit.ts.
type: reference
---

# A_rate_limit_helper.md

Implementação do helper server-only para Rate Limiting.

## Funções
- `normalizeIPv4(ip)`: Valida e normaliza IPv4 para o formato canônico `A.B.C.D`. Rejeita octetos > 255 e formatos ambíguos.
- `normalizeIPv6(ip)`: Usa `URL` parser para validar e canonicalizar IPv6.
- `generateHMAC(secret, scope, identifier)`: Gera `HMAC-SHA-256` usando Web Crypto API. Formato: `v1|<scope>|av-create-order|<identifier>`.
- `checkRateLimit(request, correlationId)`: Orquestra a extração do IP, geração de specs e chamada à RPC `av_check_rate_limits`.

## Segurança
- **Fail-Closed**: Erros de configuração (env vars ausentes/inválidas) ou SQLSTATEs de hardening (AV010-AV020) resultam em erro 500.
- **Fail-Open**: Somente para falhas de storage transitórias (Rede, Timeout, 5xx do PostgREST).
- **Isolamento**: O identificador (IP ou 'global') nunca é enviado ao banco; apenas o HMAC é persistido.
