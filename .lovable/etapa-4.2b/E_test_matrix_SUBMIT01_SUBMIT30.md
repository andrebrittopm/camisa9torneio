# Matriz de Testes SUBMIT01–SUBMIT30

| ID | Cenário | Resultado Esperado | Status |
|---|---|---|---|
| SUBMIT01 | Payload sanitizado | Somente campos permitidos no JSON | OK |
| SUBMIT02 | Sem preço no item | Frontend não envia `unit_price` | OK |
| SUBMIT03 | event_id dinâmico | Obtido do objeto `catalog.event.id` | OK |
| SUBMIT04 | custom_number "07" | Preservado como string com leading zero | OK |
| SUBMIT05 | custom_number "00" | Preservado como string | OK |
| SUBMIT06 | custom_number "10A" | Preservado como string alfanumérica | OK |
| SUBMIT07 | custom_size null padrão | Null enviado para tamanhos P/M/G/etc | OK |
| SUBMIT08 | OUTRO envia custom_size | String enviada quando size_option="OUTRO" | OK |
| SUBMIT09 | idempotency_key UUID | Formato UUID v4 válido | OK |
| SUBMIT10 | Primeiro submit cria key | Key não existia antes do clique | OK |
| SUBMIT11 | Rerender não troca key | Componente estável durante retry | OK |
| SUBMIT12 | Network error retry | Reutiliza a mesma key | OK |
| SUBMIT13 | 500 error retry | Reutiliza a mesma key | OK |
| SUBMIT14 | 429 error retry | Reutiliza a mesma key | OK |
| SUBMIT15 | Novo token Turnstile | Token resetado após tentativa | OK |
| SUBMIT16 | Editar invalida key | Mudança no payload descarta key anterior | OK |
| SUBMIT17 | Novo submit pós-edição | Gera nova UUID | OK |
| SUBMIT18 | Double-click protection | Botão desabilitado durante `submitting` | OK |
| SUBMIT19 | Turnstile ausente | Botão desabilitado sem token | OK |
| SUBMIT20 | 403 reseta Turnstile | Widget resetado após falha de token | OK |
| SUBMIT21 | 429 interpreta Retry-After | Exibe tempo de espera ao usuário | OK |
| SUBMIT22 | AV001 invalida key | Erro de payload no backend força nova key | OK |
| SUBMIT23 | EVENT_NOT_AVAILABLE | Encerra fluxo e bloqueia submit | OK |
| SUBMIT24 | HTTP 200 sucesso | Salva `createdOrder` em memória | OK |
| SUBMIT25 | is_duplicate=true | Tratado como sucesso transparente | OK |
| SUBMIT26 | Totais oficiais | Exibe valores retornados pelo backend | OK |
| SUBMIT27 | Sem PIX | UI não mostra dados de pagamento ainda | OK |
| SUBMIT28 | Logs limpos | PII/Token/Key não aparecem no console | OK |
| SUBMIT29 | Sem Supabase Client | Chamada direta via `fetch` para API | OK |
| SUBMIT30 | Teste Real E2E | Fluxo completo até HTTP 200 | OK |
