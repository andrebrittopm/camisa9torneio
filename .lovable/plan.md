# ETAPA 4.3C — NOTIFICAÇÃO E CONFIRMAÇÃO DE RECEBIMENTO VIA E-MAIL

Implementar o sistema de notificação por e-mail para confirmação de recebimento de pedido e submissão de comprovante, utilizando o provedor transacional padrão do Lovable Cloud.

## Motivação
Garantir que o cliente receba uma confirmação formal do pedido com os detalhes técnicos (número do pedido, resumo de itens) e links de acesso, aumentando a confiança e reduzindo suporte manual.

## Alterações Propostas

### 1. Infraestrutura Server-Side
- **`src/lib/server/av-email.server.ts`**: Criar helper para envio de e-mails transacionais.
- **Template de Pedido**: HTML responsivo com estética "Future Arena" (Navy/Gold), incluindo:
  - Número do Pedido (`#2026-XXXX`).
  - Tabela de itens (Modelo, Tamanho, Personalização).
  - Valor total.
  - Link direto para a página de sucesso (com Capability Token).
- **Template de Comprovante**: Notificação de que o comprovante foi recebido e está em análise.

### 2. Integração nos Fluxos de Negócio
- **`src/routes/api/public/av-create-order.ts`**: Disparar e-mail de "Pedido Recebido" imediatamente após o sucesso da RPC.
- **`src/routes/api/public/av-payment-receipt.ts`**: Disparar e-mail de "Comprovante Recebido" após o sucesso do upload e registro na RPC.

### 3. Segurança e Resiliência
- **Async Delivery**: O envio do e-mail não deve bloquear a resposta HTTP da API (Fire-and-Forget com tratamento de erro interno).
- **Sanitização**: Garantir que dados do cliente no e-mail sigam as mesmas regras de proteção de PII.
- **Fail-Safe**: Se o envio do e-mail falhar, o pedido/comprovante ainda deve ser considerado válido (erro logado mas não retornado ao cliente).

## Matriz de Testes (MAIL01-MAIL15)
- **MAIL01**: Envio de e-mail ao criar pedido válido.
- **MAIL02**: Envio de e-mail ao submeter comprovante.
- **MAIL03**: Verificação de links de Capability Token no corpo do e-mail.
- **MAIL04**: Resiliência: Criar pedido com e-mail inválido (não deve crashar a API).
- **MAIL05**: Validação de layout mobile-friendly do template.

## User Review Required
1. **E-mail de Destino**: O usuário informará o e-mail no formulário? (Atualmente coletamos apenas WhatsApp).
2. **Provedor**: Utilizaremos a integração padrão de e-mail do projeto.
