# Rota de Informações de Pagamento (PIX)

## Endpoint
`GET /api/public/av-payment-info`

## Segurança
- Restrito a `GET` e `OPTIONS`.
- Consulta ao banco via `service_role` (RLS bloqueia acesso público).
- Filtro estrito por `event_number=9` e `event_year=2026`.
- Validação rigorosa do `pix_type` e campos obrigatórios via Zod.

## Resposta Sanitizada
Retorna apenas o nome do evento e o objeto PIX (chave, tipo, titular).
