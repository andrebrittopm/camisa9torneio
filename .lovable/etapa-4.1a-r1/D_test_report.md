# Relatório de Testes Hardened - ETAPA 4.1A-R1 (CAT)

| ID | Cenário | Resultado Esperado | Resultado Obtido | Status |
|:---|:---|:---|:---|:---|
| CAT19 | Erro de query do Evento | HTTP 500 / INTERNAL_ERROR | HTTP 500 / INTERNAL_ERROR | OK |
| CAT20 | Erro de query dos Modelos | HTTP 500 / INTERNAL_ERROR | HTTP 500 / INTERNAL_ERROR | OK |
| CAT21 | Múltiplos eventos (9/2026) | HTTP 500 / INTERNAL_ERROR | HTTP 500 / INTERNAL_ERROR | OK |
| CAT22 | unit_price = 0 (Schema) | Zod accept (finite/nonnegative) | Schema validado | OK |
| SMOKE | GET válido Produção | HTTP 200 / 6 modelos / No PIX | HTTP 200 / 6 modelos / No PIX | OK |

## Observações de Auditoria
- **EVENT SELECT EXPLICIT**: SIM
- **MODEL SELECT EXPLICIT**: SIM
- **PIX FETCHED FROM DB**: NÃO
- **EVENT QUERY ERROR**: 500
- **EVENT NOT FOUND**: 404
- **MODEL QUERY ERROR**: 500
- **ZERO ACTIVE MODELS**: 404
- **UNIT PRICE ZERO SCHEMA**: ACEITO
- **PIX EXPOSED**: NÃO

**Status Final**: APROVADO PARA AUDITORIA FINAL
**Data**: 2026-08-14
