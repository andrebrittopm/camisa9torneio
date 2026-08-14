# Matriz de Testes PIX01-PIX20

| ID | Cenário | Resultado |
|----|---------|-----------|
| PIX01 | GET 200 | PASS |
| PIX02 | Evento 9/2026 | PASS |
| PIX03 | pix_key do banco | PASS |
| PIX04 | pix_holder do banco | PASS |
| PIX05 | pix_type do banco | PASS |
| PIX06 | Sem hardcode no front | PASS |
| PIX07 | Sem campos internos | PASS |
| PIX08 | Select explícito | PASS |
| PIX09 | Erro query -> 500 | PASS |
| PIX10 | Não encontrado -> 404 | PASS |
| PIX11 | Incompleto -> 503 | PASS |
| PIX12 | Métodos proibidos 405 | PASS |
| PIX13 | Fetch pós-pedido | PASS |
| PIX14 | Valor de createdOrder | PASS |
| PIX15 | Copiar chave exata | PASS |
| PIX16 | Sem QR falso | PASS |
| PIX17 | Sem Copia-e-Cola falso | PASS |
| PIX18 | Falha PIX não trava pedido | PASS |
| PIX19 | Sem mutação de status | PASS |
| PIX20 | Sem Supabase direto no browser | PASS |
