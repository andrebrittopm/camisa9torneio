# Plano de Implementação: ETAPA 4.3C-R1 — HARDENING DE E-MAIL E ORDER-VIEW

Este plano visa corrigir as vulnerabilidades e regressões identificadas na Etapa 4.3C, focando em segurança de dados, integridade de e-mails transacionais e acesso seguro à visualização de pedidos.

## 1. Banco de Dados e Segurança
- **Migração de Schema**: Garantir que `av_orders.customer_email` seja `TEXT NOT NULL` com validação de preenchimento.
- **Outbox de E-mail**: Criar `public.av_email_outbox` para garantir idempotência e permitir retentativas de envio sem duplicar pedidos.
- **Políticas RLS**: Bloquear qualquer acesso direto do browser à outbox e limitar acesso da tabela de pedidos via capability tokens.

## 2. Server Route: Hardening de Pedidos (`av-create-order`)
- **Remover Regressão**: Excluir `model_name` e `shirt_type` do payload aceito pelo cliente. O servidor buscará esses dados no banco.
- **Validação de E-mail**: Implementar validação rigorosa via Zod (trim, email, max 254).
- **Snapshot Seguro**: Montar o resumo do pedido para o e-mail usando dados recuperados do banco de dados (service_role), nunca confiando no payload do browser.
- **Fingerprint**: Incluir o e-mail no hash de idempotência e remover campos não autoritários do cliente.
- **Fail-Closed**: Garantir que erros no provedor de e-mail não afetem a criação do pedido, mas registrem falha na outbox para retry.

## 3. Capability Tokens e Order-View
- **Token de Visualização**: Implementar `v1|order-view|<handle>|<expires_at>` separado do token de upload.
- **Expiração**: Definir prazo de validade (ex: 30 dias) assinado no token.
- **Rota Segura**: Criar `/api/public/av-order-view` que valida o token e retorna apenas dados sanitizados (status, itens, valores), ocultando UUIDs e PII.
- **Link Seguro**: O e-mail conterá um link funcional baseado no token, independente do estado da sessão do browser.

## 4. Frontend e Integração
- **Payload Limpo**: Ajustar `av-order-client` e `OrderReview` para enviar apenas os campos autorizados.
- **UI de E-mail**: Garantir `type="email"` e validação amigável no checkout.
- **OrderSuccess**: Utilizar o novo link de visualização segura.

## 5. Auditoria e Validação
- **Bateria MAIL01-MAIL25**: Executar todos os cenários de teste, incluindo tentativas de bypass de token e falhas de provedor.
- **Exportação**: Gerar `AUDITORIA_FINAL_ETAPA_4_3C_R1.txt` com todas as evidências técnicas exigidas.

## Detalhes Técnicos
- **Provider**: Simulação via logs e Supabase Auth Invites (conforme infra disponível).
- **Outbox UNIQUE**: `(order_id, event_type)` para evitar duplicidade de confirmação.
- **Headers**: `Cache-Control: no-store` e `Referrer-Policy: no-referrer` na visualização do pedido.
