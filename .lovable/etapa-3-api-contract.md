# Documentação da API - Motor de Pedidos (Etapa 3.1)

## 1. Payload de Requisição (JSON)
O frontend deve enviar um `POST` para a Edge Function com a seguinte estrutura:

```json
{
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "event_id": "uuid-do-evento-ativo",
  "customer_name": "João da Silva",
  "whatsapp": "67999998888",
  "notes": "Entregar na recepção",
  "items": [
    {
      "shirt_model_id": "uuid-do-modelo-1",
      "size_option": "G",
      "custom_size": null,
      "custom_name": "JOÃO",
      "custom_number": "10",
      "quantity": 1
    },
    {
      "shirt_model_id": "uuid-do-modelo-2",
      "size_option": "OUTRO",
      "custom_size": "XGG Especial",
      "custom_name": null,
      "custom_number": "00",
      "quantity": 2
    }
  ]
}
```

## 2. Resposta de Sucesso (201 Created)
Retornada quando o pedido é criado ou recuperado (idempotência).

```json
{
  "order_id": "uuid-do-pedido-criado",
  "order_seq": 125,
  "event_year": 2026,
  "customer_name": "João da Silva",
  "total_quantity": 3,
  "subtotal": 105.00,
  "total_amount": 105.00,
  "order_status": "received",
  "payment_status": "awaiting_payment",
  "display_order_number": "AV-2026-0125",
  "is_duplicate": false
}
```

## 3. Respostas de Erro

| HTTP Status | Error Code | Descrição |
| :--- | :--- | :--- |
| 400 | `INVALID_REQUEST_STRUCTURE` | Payload malformado ou campos obrigatórios ausentes. |
| 404 | `EVENT_NOT_FOUND` | O `event_id` fornecido não existe no banco. |
| 400 | `EVENT_CLOSED` | O evento existe mas não está aceitando novos pedidos. |
| 400 | `ORDER_DEADLINE_EXCEEDED` | A data limite para pedidos já passou. |
| 400 | `INVALID_MODEL` | Um ou mais `shirt_model_id` são inválidos ou não pertencem ao evento. |
| 400 | `INVALID_SIZE_OPTION` | O tamanho escolhido não está disponível para o modelo. |
| 400 | `CUSTOM_SIZE_REQUIRED` | Foi selecionado 'OUTRO' mas o campo `custom_size` está vazio. |
| 409 | `DUPLICATE_REQUEST` | (Tratado via `is_duplicate: true` no sucesso ou erro de concorrência). |
| 500 | `INTERNAL_SERVER_ERROR` | Erro genérico no servidor ou banco de dados. |

---
**NENHUMA ALTERAÇÃO FOI EXECUTADA.**
