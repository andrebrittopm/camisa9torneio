# Plan - ETAPA 4.3C-R3 — ATIVAÇÃO DO PROVIDER REAL DE E-MAIL

Esta etapa consiste na substituição do provedor mock (console.log) por uma integração real com o Resend, mantendo a arquitetura de outbox e garantindo a entrega segura e idempotente das notificações transacionais.

## User Review Required

> [!IMPORTANT]
> **Provedor Escolhido:** Resend (recomendado para TanStack Start/Edge).
> **Configuração de Secrets:** É necessário configurar as seguintes secrets no backend:
> 1. `RESEND_API_KEY`: Sua chave de API do Resend.
> 2. `EMAIL_FROM`: O remetente oficial (ex: `9º Torneio Amigos do Vôlei <noreply@amigosdovolei.com.br>`).
> 3. `APP_URL`: URL base do projeto para links do Order-View (ex: `https://project--...lovable.app`).

## Proposed Changes

### 1. Server-Side Delivery (Resend Integration)
- **src/lib/server/av-email.server.ts:**
    - Implementar `sendEmailViaProvider` usando a API REST do Resend (compatível com Edge).
    - Adicionar suporte a `headers: { 'X-Entity-Ref-ID': eventKey }` para idempotência no provedor.
    - Implementar timeout de 5s e tratamento de erros granular.
    - Atualizar `sendOrderConfirmationEmail` e `sendReceiptConfirmationEmail` para utilizar o envio real.
    - **Segurança:** Garantir que NENHUM PII (e-mail, corpo) ou secret seja logado, mantendo apenas metadados técnicos (`correlation_id`, `event_key`).

### 2. Outbox Lifecycle Management
- **src/lib/server/av-email.server.ts:**
    - Atualizar o status na `av_email_outbox` após o envio:
        - Sucesso: `status = 'sent'`, `sent_at = NOW()`, `provider_message_id = res.id`.
        - Falha: `status = 'retryable'`, `attempt_count++`.
    - Garantir que eventos já marcados como `sent` nunca sejam reprocessados.

### 3. Order-View Link Consistency
- **src/lib/server/av-email.server.ts:**
    - Construir a URL do `Order-View` usando `process.env['APP_URL']` para garantir links válidos em produção.
    - Verificar se a assinatura HMAC continua cobrindo os campos necessários.

## Technical Details

### Resend API Call (Edge Compatible)
```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: emailFrom,
    to: recipient,
    subject: subject,
    html: htmlBody,
    headers: { 'X-Entity-Ref-ID': eventKey }
  })
});
```

### Test Matrix (REAL01-REAL15)
- **REAL01:** Envio bem-sucedido -> Outbox 'sent' -> Message ID presente.
- **REAL02:** Tentativa duplicada -> Bloqueio por `event_key` (idempotência).
- **REAL03:** Falha no provedor (429/500) -> Outbox 'retryable' -> Incremento de `attempt_count`.
- **REAL04:** Link Order-View no e-mail -> Acesso funcional -> Sem PII na URL.
- **REAL05:** Verificação de logs -> Zero PII -> Apenas metadados técnicos.
