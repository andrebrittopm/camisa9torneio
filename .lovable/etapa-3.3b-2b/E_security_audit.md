---
name: Etapa 3.3B-2B - Security Audit
description: Auditoria de segurança da integração do Rate Limiting.
type: feature
---

# E_security_audit.md

## 1. Proteção de Segredos
- **HMAC Secret**: A variável `AV_RATE_LIMIT_HASH_SECRET` é lida apenas no server-side.
- **Log Sanitization**: O helper e a rota foram auditados para garantir que segredos nunca sejam logados.
- **Zero Exposure**: O segredo nunca é enviado ao banco de dados; apenas o digest HMAC é transmitido.

## 2. Identificação Confiável
- **CF-Connecting-IP**: Utilizado como fonte única de verdade para IP. Não há fallback para `X-Forwarded-For`, prevenindo spoofing em ambientes protegidos por Cloudflare.
- **Normalização Estrita**: IPv4 e IPv6 passam por validação rigorosa antes do processamento.

## 3. Resiliência e Fail-States
- **Fail-Closed**: Aplicado a erros de configuração e violações de integridade SQL (AV010-AV020), priorizando a segurança.
- **Fail-Open**: Aplicado apenas a falhas de infraestrutura transitórias (storage indisponível), garantindo disponibilidade mínima sob stress.
- **Turnstile Coupling**: O Turnstile permanece obrigatório mesmo em cenários de Fail-Open do Rate Limiter, mantendo uma camada de proteção contra bots.

## 4. Auditoria de Logs
Confirmado o uso de `correlation_id` para rastreamento. PII (Nomes, WhatsApp, IPs brutos) e Hashes completos foram excluídos das mensagens de log.
