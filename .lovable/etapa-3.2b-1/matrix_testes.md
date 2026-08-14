# Matriz de Testes Estáticos (FUTURA ETAPA 3.2B-2)

| ID | Cenário | Expectativa |
| :--- | :--- | :--- |
| **CORS** | OPTIONS com Origin permitida | 200 OK + Headers Allow-Origin |
| **CORS** | OPTIONS com Origin negada | 403 CORS_ERROR |
| **MÉTODO** | GET / DELETE / PUT | 405 METHOD_NOT_ALLOWED |
| **BODY** | Body > 64KB (Content-Length) | 413 PAYLOAD_TOO_LARGE |
| **BODY** | Body > 64KB (sem Content-Length) | 413 PAYLOAD_TOO_LARGE (Interrupção de stream) |
| **JSON** | JSON malformado | 400 INVALID_JSON |
| **JSON** | Body é Array ou Null | 400 INVALID_REQUEST |
| **CONFIG** | SUPABASE_URL ausente | 500 INTERNAL_ERROR + Log CONFIG_MISSING |
| **CAMPOS** | Campo desconhecido top-level | 400 INVALID_REQUEST |
| **CAMPOS** | Campo financeiro proibido (unit_price) | 400 INVALID_REQUEST |
| **EVENT** | event_id inválido (não UUID) | 400 INVALID_REQUEST |
| **IDEM** | idempotency_key inválida | 400 INVALID_REQUEST |
| **ITEMS** | items ausente ou vazio | 400 INVALID_REQUEST |
| **ITEMS** | items > 50 linhas | 400 INVALID_REQUEST |
| **ITEM** | quantity string "1" | 400 INVALID_QUANTITY |
| **ITEM** | quantity <= 0 | 400 INVALID_QUANTITY |
| **ITEM** | custom_number "07" | Preservado como string no fingerprint e RPC |
| **FINGER** | Itens em ordens diferentes | Mesmo Fingerprint SHA-256 |
| **RPC** | SQLSTATE AV001 | 409 IDEMPOTENCY_KEY_REUSED |
| **RPC** | SQLSTATE AV007 | 400 INVALID_MODEL |
| **RPC** | Erro genérico do banco | 500 INTERNAL_ERROR (Sanitizado) |
| **SUCESSO** | Ordem Válida | 200 OK + Payload Sanitizado |
