# Estratégia de Idempotência - Etapa 4.2B

Para garantir que cada pedido seja processado exatamente uma vez, mesmo em cenários de falha de rede ou retentativas manuais, implementamos uma estratégia rigorosa de idempotência no frontend.

## 1. Geração da Key
- A `idempotency_key` é um UUID v4 (`crypto.randomUUID()`).
- É gerada no momento do **primeiro clique** em "CONFIRMAR PEDIDO".
- Não muda durante re-renders ou mudanças de foco.

## 2. Persistência em Memória
- A key é mantida no estado do componente `OrderReview`.
- Se o `fetch` falhar (erro de rede, timeout), a mesma key é reutilizada na próxima tentativa.

## 3. Invalidação por Edição
- Implementamos um "Payload Hash" (snapshot estrutural do pedido).
- Se o usuário clicar em "Voltar e Editar" e alterar qualquer campo do pedido (modelo, tamanho, nome, quantidade, etc), a key anterior é **invalidada**.
- Um novo clique em confirmar gerará uma nova key para o novo payload.

## 4. Single-Use Turnstile
- Diferente da idempotency key, o token do Turnstile é tratado como descartável.
- Cada tentativa de submissão (mesmo com a mesma key de idempotência) exige um **novo token** do Turnstile para passar pelo `siteverify` do servidor.
