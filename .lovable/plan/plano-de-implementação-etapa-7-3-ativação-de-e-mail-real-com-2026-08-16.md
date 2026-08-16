# Plano de Implementação — ETAPA 7.3 — ATIVAÇÃO DE E-MAIL REAL COM SENDGRID

Este plano descreve a transição da infraestrutura de e-mail transacional do provedor mock/Resend para **Twilio SendGrid** usando **Single Sender Verification**.

## 1. Preparação de Credenciais
- Verificar a existência dos segredos `SENDGRID_API_KEY` e `EMAIL_FROM`.
- **Nota**: Se ausentes, a implementação falhará com `SENDGRID_CREDENTIALS_REQUIRED`.

## 2. Refatoração do Provider de E-mail
- Modificar `src/lib/server/av-email.server.ts`:
  - Remover referências à API da Resend.
  - Implementar chamada à API do SendGrid (`https://api.sendgrid.com/v3/mail/send`).
  - Utilizar o header `X-Entity-Ref-ID` ou equivalente se disponível para rastreamento.
  - Manter o timeout de 5 segundos e a lógica de retryable/failed.

## 3. Hardening dos Templates
- Sanitizar e escapar entradas do usuário (`customer_name`, `custom_name`, `custom_number`, `notes`) para prevenir HTML Injection.
- Garantir que nenhum UUID interno, token de upload ou segredo seja incluído nos corpos das mensagens.
- Seguir as especificações textuais para `ORDER_CREATED` e `RECEIPT_SUBMITTED`.

## 4. Segurança e Idempotência
- Preservar a integridade da tabela `av_email_outbox`.
- Garantir que retentativas no SendGrid não gerem e-mails duplicados para o mesmo `event_key`.
- Manter links seguros no `Order-View` sem expor PII na URL.

## 5. Validação Técnica
- Testar o envio real para o endereço autorizado (`EMAIL_FROM`).
- Simular falha de rede para validar o status `retryable`.
- Executar `typecheck` e `build` para garantir compatibilidade com o runtime do Worker.

## Detalhes Técnicos
- **Endpoint SendGrid**: `POST https://api.sendgrid.com/v3/mail/send`
- **Auth**: `Authorization: Bearer ${SENDGRID_API_KEY}`
- **Payload**: JSON formatado conforme v3 Mail Send API.
- **Fail-Closed**: Se `SENDGRID_API_KEY` for inválida, o processo de pedido não deve quebrar, mas a outbox deve registrar a falha técnica.
