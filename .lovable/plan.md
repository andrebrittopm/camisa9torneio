# Plano de Implementação - ETAPA 10.2: Gestão Administrativa de Pedidos (Read-Only)

Implementar a visualização completa de pedidos no painel administrativo, incluindo listagem com filtros, busca, paginação e detalhes, mantendo a segurança e o design "Future Arena".

## 1. Backend (Camada de Dados)
- Criar `src/lib/av-admin-orders.functions.ts` para expor:
  - `getAdminOrders`: Listagem paginada com busca e filtros.
  - `getAdminOrderDetail`: Detalhes completos de um pedido específico.
- Criar helper `src/lib/server/av-admin-orders.server.ts` para implementar as queries usando `supabaseAdmin`:
  - `getAdminOrdersInternal`: Join entre `av_orders`, `av_order_items` (para contagem) e `av_payment_receipts` (resumo).
  - `getAdminOrderDetailInternal`: Join completo para exibir todos os dados do pedido, cliente e itens.
- Garantir que o número público do pedido (`AV-2026-XXXX`) seja gerado a partir do `order_seq`.

## 2. Navegação e Roteamento
- Criar `src/routes/admin/orders.tsx` para a listagem.
- Criar `src/routes/admin/orders.$orderId.tsx` para os detalhes.
- Atualizar `src/components/AdminHeader.tsx` para incluir o link "Pedidos".
- Atualizar o Dashboard (`src/routes/admin/index.tsx`) para o botão "Ver todos os pedidos" funcionar.

## 3. UI - Listagem (`/admin/orders`)
- Implementar barra de busca (Nome, WhatsApp, Número AV-2026-XXXX).
- Implementar filtros de status (Pagamento e Pedido) usando `shadcn/ui` (Select ou Popover).
- Tabela responsiva: Tabela tradicional no desktop e Cards no mobile.
- Paginação server-side (20 itens por página).
- Estados de Loading, Empty e Error customizados.

## 4. UI - Detalhes (`/admin/orders/$orderId`)
- Layout organizado em seções: Pedido, Cliente, Itens, Resumo e Pagamento.
- Formatação rigorosa: Moeda (R$), Datas (dd/MM/yyyy HH:mm) e números de personalização como string (ex: "07").
- Exibição de metadados de comprovante (sem visualização do binário nesta etapa).

## 5. Segurança e Qualidade
- Proteção via `requireAdmin()` em todas as server functions.
- Validação de tipos com Zod.
- Garantir que IDs técnicos (UUIDs) não sejam a identificação visual primária.
- Verificação de build e typecheck.
