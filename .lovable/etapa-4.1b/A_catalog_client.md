---
name: Catálogo Client (Frontend)
description: Helper tipado para consumo do endpoint /api/public/av-catalog
type: feature
---

# Catálogo Client

Implementado em `src/lib/av-catalog-client.ts`.

## Tipagem Base
- `AvCatalogEvent`: Dados do evento (id, number, year, name, location, price, availability, deadline).
- `AvShirtModel`: Dados dos modelos (id, code, name, category, image, 3D, sizes, sort).
- `AvCatalogResponse`: Estrutura padrão de sucesso.

## Funções
- `fetchAvCatalog()`: Realiza o `fetch` para o endpoint público. Lança erro `FAILED_TO_FETCH_CATALOG` em caso de falha HTTP.
