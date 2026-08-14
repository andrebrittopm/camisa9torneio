# ETAPA 3.2B-2B — TESTES REAIS DE INTEGRAÇÃO SERVER ROUTE → RPC

Este documento estabelece a bateria final de 30 testes de integração para validar o motor de pedidos ponta-a-ponta, desde a Server Route (`/api/public/av-create-order`) até a RPC no banco de dados.

## 1. Escopo e Segurança
Todos os testes são executados contra o ambiente de preview local (`http://localhost:8080`).
As operações que alteram o banco de dados devem ser verificadas e limpas após a execução.

## 2. Matriz de Requisitos (30 Pontos)

### Camada A: Protocolo e CORS (6 testes)
- [ ] **A01**: OPTIONS same-origin -> 204 No Content + Headers CORS.
- [ ] **A02**: OPTIONS origin indevida -> 403 CORS_ERROR.
- [ ] **A03**: POST sem Header Origin -> 403 CORS_ERROR (Fail-Closed).
- [ ] **A04**: GET / PUT / DELETE -> 405 METHOD_NOT_ALLOWED.
- [ ] **A05**: Header Vary: Origin presente em todas as respostas.
- [ ] **A06**: Access-Control-Max-Age = 86400 em preflights bem-sucedidos.

### Camada B: Robustez do Payload (8 testes)
- [ ] **B01**: Body > 64KB (Content-Length) -> 413 PAYLOAD_TOO_LARGE.
- [ ] **B02**: Body > 64KB (Streaming/Interrupção) -> 413 PAYLOAD_TOO_LARGE.
- [ ] **B03**: JSON malformado -> 400 INVALID_JSON.
- [ ] **B04**: Body sendo Array [] ou null -> 400 INVALID_REQUEST.
- [ ] **B05**: Campo proibido no top-level (ex: unit_price) -> 400 INVALID_REQUEST.
- [ ] **B06**: Campo desconhecido no top-level -> 400 INVALID_REQUEST.
- [ ] **B07**: Event_id ou Idempotency_key com formato não-UUID -> 400 INVALID_REQUEST.
- [ ] **B08**: WhatsApp ou Customer_name como string vazia ou apenas espaços -> 400 INVALID_REQUEST.

### Camada C: Validação de Itens (8 testes)
- [ ] **C01**: Lista de itens vazia [] -> 400 INVALID_REQUEST.
- [ ] **C02**: Mais de 50 itens em um único pedido -> 400 INVALID_REQUEST.
- [ ] **C03**: Quantity sendo string "1" ou decimal 1.5 -> 400 INVALID_QUANTITY.
- [ ] **C04**: Quantity <= 0 -> 400 INVALID_QUANTITY.
- [ ] **C05**: Shirt_model_id inválido ou malformado -> 400 INVALID_REQUEST.
- [ ] **C06**: Size_option ausente ou vazio -> 400 INVALID_REQUEST.
- [ ] **C07**: Campo proibido dentro do item (ex: unit_price) -> 400 INVALID_REQUEST.
- [ ] **C08**: Objeto complexo onde se espera string (ex: custom_name: {}) -> 400 INVALID_REQUEST.

### Camada D: Integração RPC e Idempotência (8 testes)
- [ ] **D01**: Event_id inexistente no banco -> 404 EVENT_NOT_FOUND.
- [ ] **D02**: Evento desativado (active=false) -> 409 EVENT_NOT_AVAILABLE.
- [ ] **D03**: Evento com pedidos fechados (orders_open=false) -> 409 EVENT_NOT_AVAILABLE.
- [ ] **D04**: Pedido após deadline (order_deadline expirada) -> 409 ORDER_DEADLINE_EXCEEDED.
- [ ] **D05**: Sucesso na criação (200 OK) + Resposta com sequence formatado (AV-2026-XXXX).
- [ ] **D06**: Idempotência: Retry exato -> 200 OK + is_duplicate: true + mesmo ID.
- [ ] **D07**: Colisão: Mesma idempotency_key, mas dados diferentes -> 409 IDEMPOTENCY_KEY_REUSED (AV001).
- [ ] **D08**: Fingerprint: Itens enviados em ordem diferente resultam no mesmo Fingerprint (Canonical).

## 3. Logs e Auditoria
- Todas as falhas 500 devem gerar logs com `correlation_id` e estágio do erro.
- O payload retornado pela API deve ser sanitizado (zero exposição de metadados internos do banco).

---
**ESTADO ATUAL:** Documentação de requisitos aprovada. Pronto para execução da bateria de testes.
