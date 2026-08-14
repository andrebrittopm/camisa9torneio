# Auditoria de Segurança: Endpoint de Catálogo (ETAPA 4.1A)

## 1. Controle de Acesso e CORS
- **Autenticação**: O endpoint é público (`/api/public/*`), conforme requisito, para permitir visualização sem login.
- **Autorização**: Utiliza `service_role` no servidor para bypassar RLS apenas para leitura controlada de metadados do evento/modelos.
- **CORS Allowlist**: Implementado via `getAllowedOrigins`, permitindo apenas origens autorizadas ou a própria origem.
- **Isolamento de Métodos**: Apenas `GET` e `OPTIONS` são permitidos. `POST`, `PUT`, `PATCH` e `DELETE` retornam `405 Method Not Allowed`.

## 2. Sanitização de Dados (Prevenção de Leaks)
A resposta é construída manualmente a partir dos dados validados, garantindo que campos sensíveis nunca sejam expostos:
- **Campos Removidos**: `created_at`, `updated_at`, `event_id` (nos modelos), `active`, `orders_open`, e qualquer campo de controle interno.
- **Dados Financeiros**: A chave PIX do evento é explicitamente omitida da resposta pública.
- **PII**: Nenhum dado pessoal ou de rastreamento é incluído na resposta.

## 3. Validação de Integridade
- **Zod Strict Validation**: Todos os dados lidos do banco passam por `EventSchema` e `ShirtModelSchema` antes do processamento.
- **Derivação de Regras de Negócio**: A flag `orders_available` é calculada no servidor com base em `active`, `orders_open` e `order_deadline`, protegendo a lógica de negócio.
- **Correlation ID**: Todas as falhas internas são logadas com um UUID único e retornam apenas um erro genérico `INTERNAL_ERROR` para o cliente, sem detalhes da stack.

## 4. Performance e Robustez
- **Single Source of Truth**: O endpoint serve como fonte única para o frontend, reduzindo latência de múltiplas queries.
- **Cache Control**: `Cache-Control: no-store` para garantir que a disponibilidade dos pedidos seja sempre consultada em tempo real (etapa atual).
- **Error Handling**: Fail-closed para qualquer inconsistência de dados (HTTP 500 se o Zod falhar).

---
**Status Final**: APROVADO PARA PRODUÇÃO.
**Data**: 2026-05-20
**Versão**: 1.0.0
