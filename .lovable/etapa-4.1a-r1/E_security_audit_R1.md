# Auditoria de Segurança R1: Hardening do Catálogo

## 1. Minimização de Superfície (Data Fetching)
- As queries agora utilizam `.select('col1, col2...')` explícito.
- Colunas como `pix_key`, `pix_holder`, `pix_type` e `created_at` não são sequer carregadas na memória da Server Route.
- O campo de imagem dos modelos utiliza a coluna real do schema: `front_image_url`.

## 2. Classificação de Erros (Granularidade)
- Distinção clara entre recurso não encontrado (404) e erro de infraestrutura/query (500).
- Erros de integridade de dados (ex: múltiplos eventos ativos para o mesmo código) resultam em 500.
- Logs internos preservam o `correlation_id` e o `stage` da falha, sem expor mensagens brutas do banco ao cliente.

## 3. Robustez do Schema
- `unit_price` alterado de `.positive()` para `.finite().nonnegative()` para suportar itens gratuitos se necessário, mantendo compatibilidade com o banco.
- Zod permanece como camada de segurança secundária (Deep Defense), mesmo com a seleção explícita de campos no banco.

---
**Status Final**: APROVADO PARA AUDITORIA FINAL
**Data**: 2026-08-14
