# Matriz de Testes - ETAPA 4.1A (CAT)

| ID | Descrição | Esperado |
|:---|:---|:---|
| CAT01 | GET válido | HTTP 200 Success |
| CAT02 | event_number | Exatamente 9 |
| CAT03 | event_year | Exatamente 2026 |
| CAT04 | unit_price | 35.00 (conforme banco) |
| CAT05 | Model count | 6 modelos ativos |
| CAT06 | Category | Apenas 'tshirt' ou 'tank' |
| CAT07 | Ordering | sort_order ASC, code ASC |
| CAT08 | Sizes | available_sizes preservado |
| CAT09 | Assets | image_url/model_3d_url aceitam null |
| CAT10 | PIX | pix_key/holder/type OMITIDOS |
| CAT11 | Internal Dates | created_at/updated_at OMITIDOS |
| CAT12 | Internal State | active/orders_open (cru) OMITIDOS |
| CAT13 | Config failure | SUPABASE_URL ausente -> 500 |
| CAT14 | No event | Evento não existe -> 404 |
| CAT15 | No models | Zero modelos ativos -> 404 |
| CAT16 | Bad data | Resposta do banco inválida -> 500 |
| CAT17 | Bad methods | POST/PUT/PATCH/DELETE -> 405 |
| CAT18 | Side effects | GET não altera nenhuma tabela |
