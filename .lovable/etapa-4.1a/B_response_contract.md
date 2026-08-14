---
name: Catálogo Público Server-Side - Contrato de Resposta
description: Definição formal do JSON retornado pelo endpoint /api/public/av-catalog
type: feature
---

# Contrato de Resposta - GET /api/public/av-catalog

O endpoint é read-only e retorna os dados necessários para renderizar o catálogo do 9º Torneio Amigos do Vôlei.

## Sucesso (HTTP 200)

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "event_number": 9,
      "event_year": 2026,
      "event_name": "string",
      "location": "string",
      "unit_price": 35,
      "orders_available": true,
      "order_deadline": "ISO8601-TIMESTAMP | null"
    },
    "models": [
      {
        "id": "uuid",
        "code": "string",
        "name": "string",
        "category": "tshirt | tank",
        "image_url": "url | null",
        "model_3d_url": "url | null",
        "available_sizes": ["string"],
        "allow_custom_size": boolean,
        "sort_order": integer
      }
    ]
  }
}
```

## Erros

### 404 CATALOG_NOT_AVAILABLE
Evento não encontrado ou sem modelos ativos.

### 405 METHOD_NOT_ALLOWED
Utilização de POST, PUT, PATCH ou DELETE.

### 500 INTERNAL_ERROR
Erro de configuração ou falha inesperada no servidor.
Inclui `correlation_id` para debug.
