---
name: Estratégia de Confirmação e WhatsApp
description: Define como a interface de sucesso deve se comportar e como as mensagens de WhatsApp são geradas.
type: feature
---

# Estratégia de Confirmação (ETAPA 4.2C)

## 1. Fonte da Verdade
A tela de confirmação deve ser alimentada EXCLUSIVAMENTE pelo objeto `createdOrder` retornado pelo backend na ETAPA 4.2B.
Campos obrigatórios:
- `display_order_number`
- `total_quantity`
- `subtotal`
- `total_amount`
- `order_status`
- `payment_status`
- `event_year`
- `customer_name`

## 2. Mapeamento de Status
Os códigos internos do backend devem ser traduzidos para o cliente:

### Pedido (`order_status`)
- `received` -> "PEDIDO RECEBIDO"
- `confirmed` -> "PEDIDO CONFIRMADO"
- `in_production` -> "EM PRODUÇÃO"
- `ready` -> "PRONTO"
- `delivered` -> "ENTREGUE"
- `cancelled` -> "CANCELADO"

### Pagamento (`payment_status`)
- `awaiting_payment` -> "AGUARDANDO PAGAMENTO"
- `receipt_submitted` -> "COMPROVANTE ENVIADO"
- `payment_confirmed` -> "PAGAMENTO CONFIRMADO"
- `receipt_rejected` -> "COMPROVANTE NÃO APROVADO"

## 3. Mensagem de WhatsApp
A mensagem deve ser curta, clara e profissional, utilizando `encodeURIComponent`.

**Template:**
🏐 9º TORNEIO AMIGOS DO VÔLEI – {event_name}
✅ Pedido registrado com sucesso!

Pedido: {display_order_number}
Cliente: {customer_name}
Peças: {total_quantity}
Total: {total_amount_formatted}

Status: {order_status_label}
Pagamento: {payment_status_label}

Guarde o número do pedido para acompanhamento.

## 4. Reset de Estado (Novo Pedido)
Ao clicar em "FAZER OUTRO PEDIDO", todo o estado do pedido anterior deve ser limpo, incluindo a chave de idempotência e tokens do Turnstile. O catálogo deve permanecer carregado.
