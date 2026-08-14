---
name: Matriz de Testes CONF01-CONF20
description: Lista completa de cenários de validação para a Etapa 4.2C.
type: feature
---

# Matriz de Testes CONF01-CONF20

| ID | Cenário | Resultado Esperado |
|----|---------|-------------------|
| CONF01 | HTTP 200 mostra tela de sucesso | A tela de confirmação substitui o review após sucesso. |
| CONF02 | display_order_number vem do backend | O valor exibido é exatamente o `display_order_number` da resposta. |
| CONF03 | Não gera número no frontend | Nenhum código JS no frontend concatena strings para criar o ID visual. |
| CONF04 | total_quantity usa backend | O total de peças é lido de `createdOrder.total_quantity`. |
| CONF05 | total_amount usa backend | O valor total é lido de `createdOrder.total_amount`. |
| CONF06 | Valor exibido em pt-BR | Formatação via `Intl.NumberFormat` com prefixo `R$`. |
| CONF07 | status received | Mapeado para "PEDIDO RECEBIDO". |
| CONF08 | status awaiting_payment | Mapeado para "AGUARDANDO PAGAMENTO". |
| CONF09 | order_id não exibido | O UUID interno do pedido não está visível na UI. |
| CONF10 | idempotency_key não exibida | A chave de idempotência não está visível na UI. |
| CONF11 | Turnstile reset | O widget é removido ou resetado após sucesso. |
| CONF12 | Copiar número | O botão copia apenas o `display_order_number` para o clipboard. |
| CONF13 | WhatsApp número correto | A mensagem de compartilhamento contém o ID visual do pedido. |
| CONF14 | WhatsApp total oficial | A mensagem contém o valor total retornado pelo backend. |
| CONF15 | WhatsApp sem UUID | A mensagem não contém o `order_id` (UUID). |
| CONF16 | WhatsApp sem idempotency | A mensagem não contém a chave de idempotência. |
| CONF17 | Sem telefone hardcoded | O link `wa.me` não possui número de destino fixo. |
| CONF18 | Limpar pedido | O botão "Novo Pedido" zera itens e dados do cliente. |
| CONF19 | Nova Idempotency Key | O próximo pedido gera uma nova UUID para idempotência no primeiro submit. |
| CONF20 | Sem PIX/Comprovante | Não há campos de chave PIX ou upload de arquivos na tela. |
