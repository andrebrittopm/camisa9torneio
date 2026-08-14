# Matriz de Testes Adicional - ETAPA 4.1A-R1

| ID | Descrição | Critério de Aceite |
|:---|:---|:---|
| CAT19 | Erro simulado no supabase.from('av_events') | Deve retornar 500 INTERNAL_ERROR (Fail-Closed) |
| CAT20 | Erro simulado no supabase.from('av_shirt_models') | Deve retornar 500 INTERNAL_ERROR (Fail-Closed) |
| CAT21 | Simulação de Data Integrity (2 rows para 9/2026) | Deve retornar 500 INTERNAL_ERROR |
| CAT22 | Validação unit_price = 0 | O schema deve aceitar 0 como valor válido |
