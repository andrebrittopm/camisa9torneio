# Plano de Implementação - ETAPA 10.1: Dashboard Administrativo Real

Transformar o dashboard administrativo estático em um painel funcional com dados reais do banco, mantendo a segurança e a identidade visual "Future Arena".

## 1. Backend (Camada de Dados)
- Criar `src/lib/av-admin-stats.functions.ts` para expor as funções de servidor.
- Implementar a função `getAdminDashboardStats` protegida por `requireAdmin`.
- As consultas devem agregar dados de:
  - `av_orders`: Contagem por status, valor total.
  - `av_order_items`: Soma de `quantity` para total de camisas.
  - `av_payment_receipts`: Para identificar comprovantes em análise.
- Criar helper `src/lib/server/av-admin-stats.server.ts` para as queries SQL otimizadas usando `supabaseAdmin`.

## 2. Frontend (Dashboard)
- Atualizar `src/routes/admin/index.tsx`:
  - Utilizar `useSuspenseQuery` para buscar os dados via `getAdminDashboardStats`.
  - Mapear os dados para os cards de estatísticas.
  - Implementar a seção "Pedidos Recentes" (últimos 10) com tratamento responsivo.
  - Adicionar a segunda área visual para status operacionais (Produção, Prontos, Entregues, Cancelados).

## 3. Formatação e UX
- Aplicar `Intl.NumberFormat('pt-BR')` para valores e `Intl.DateTimeFormat` para datas.
- Implementar estados de Loading e Empty State.

## Detalhes Técnicos
- **Segurança**: Validação rigorosa via `requireAdmin`.
- **Performance**: Payload único via RPC.
- **Responsividade**: Grid fluido para 360px a Desktop.
