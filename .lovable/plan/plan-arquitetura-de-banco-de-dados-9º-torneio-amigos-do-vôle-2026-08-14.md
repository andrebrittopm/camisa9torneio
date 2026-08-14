# Plan: Arquitetura de Banco de Dados - 9º Torneio Amigos do Vôlei

Este plano detalha a proposta de arquitetura para o banco de dados do projeto, utilizando o prefixo `av_` para isolamento e garantindo suporte a múltiplos eventos futuros.

## Arquitetura e Relações

A estrutura consiste em 5 tabelas principais no schema `public`:

1.  **av_events**: Tabela mestre. Armazena configurações globais do torneio (ano, preço, chave PIX).
2.  **av_shirt_models**: Catálogo de modelos (Camisetas/Regatas) vinculados a um evento.
3.  **av_orders**: Cabeçalho do pedido do cliente (status, dados de contato, totais).
4.  **av_order_items**: Itens específicos do pedido (modelo, tamanho, personalização). Inclui snapshots de preço e nome para histórico.
5.  **av_payment_receipts**: Histórico de comprovantes enviados para um pedido.

**Relacionamentos:**
- `av_events` (1) <-> (N) `av_shirt_models`
- `av_events` (1) <-> (N) `av_orders`
- `av_orders` (1) <-> (N) `av_order_items` (Cascade delete)
- `av_orders` (1) <-> (N) `av_payment_receipts` (Cascade delete)
- `av_shirt_models` (1) <-> (N) `av_order_items` (No cascade)

## Detalhes Técnicos

### 1. Migração SQL Proposta
A migração incluirá:
- Criação das 5 tabelas com RLS habilitado.
- Tipos ENUM para categorias de camisa e status de pedido/pagamento.
- CHECK constraints para validação de preços, quantidades e regras lógicas (ex: `custom_size` obrigatório se `size_option` for 'OUTRO').
- UNIQUE constraints (ex: `event_id` + `code` em modelos).
- Função e Triggers para atualização automática do campo `updated_at`.

### 2. Dados Iniciais (Seed)
- **Evento**: 9º Torneio Amigos do Vôlei - ACS (2026).
- **Modelos**: 6 placeholders (TSHIRT-01, TSHIRT-02, TSHIRT-03, TANK-01, TANK-02, TANK-03).

### 3. Índices e Segurança
- Índices otimizados para buscas por `event_id`, `order_status`, `whatsapp` e datas.
- **RLS**: Habilitado por padrão em todas as tabelas. Nenhuma política pública ou autenticada será criada nesta etapa, mantendo o acesso bloqueado até a próxima rodada.
- **Grants**: Permissões concedidas para `authenticated` e `service_role`.

### 4. Confirmação
Nenhuma migration será executada nesta rodada. O resultado final será o SQL completo para revisão manual.

## Próximos Passos
Após a revisão deste plano, apresentarei o SQL completo conforme solicitado.
