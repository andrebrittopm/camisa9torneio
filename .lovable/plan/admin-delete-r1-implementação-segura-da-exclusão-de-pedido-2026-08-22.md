# ADMIN-DELETE-R1 — IMPLEMENTAÇÃO SEGURA DA EXCLUSÃO DE PEDIDO

Este plano detalha a implementação da funcionalidade de exclusão permanente de pedidos, restrita a SUPERADMINS, seguindo protocolos rígidos de segurança, remoção de storage e auditoria sanitizada.

## 1. Banco de Dados (PostgreSQL RPC)

Criar a função `av_admin_delete_order` com as seguintes características:
- **Segurança:** `SECURITY DEFINER`, `SET search_path = public`. Revogar execução de `PUBLIC`, `anon` e `authenticated`.
- **Validação:**
    - Verifica se o executor é um `SUPERADMIN` ativo.
    - Bloqueia o pedido (`FOR UPDATE`).
    - Compara o código público gerado (`AV-YYYY-XXXX`) com o parâmetro `p_expected_order_code`.
- **Transação Atômica:**
    1. Scrub de PII: Remove metadados sensíveis de logs antigos (`av_admin_audit_logs`) onde `resource_id = p_order_id`.
    2. Exclusão em Cascata: Remove de `av_orders` (disparando `ON DELETE CASCADE` para itens, recibos e e-mails).
    3. Auditoria Mínima: Insere novo log `ORDER_DELETED` contendo apenas o identificador público no metadado.

## 2. Backend (Server Functions & Helpers)

- **Helper Server-Side (`src/lib/server/av-admin-orders.server.ts`):**
    - `deleteAdminOrderInternal`:
        - Valida `requireSuperAdmin`.
        - Busca o pedido e seus `storage_path` em `av_payment_receipts`.
        - Remove arquivos em lote do bucket `av-payment-receipts`.
        - Se a remoção falhar (erro real, não ausência), aborta o processo (**Fail-Closed**).
        - Chama o RPC `av_admin_delete_order`.
- **Server Function (`src/lib/av-admin-orders.functions.ts`):**
    - `deleteAdminOrder`: Ponto de entrada validado com Zod e `getRequest`.

## 3. Interface Administrativa (React)

- **Listagem de Pedidos (`src/routes/admin/orders.tsx`):**
    - Adicionar botão "Excluir" (ícone lixeira, vermelho) visível apenas para `SUPERADMIN`.
    - Garantir `aria-label` com o código do pedido.
- **Componente de Exclusão (`src/components/AdminDeleteOrderModal.tsx`):**
    - Modal customizado (sem `window.confirm`).
    - Exigir que o administrador digite o código do pedido (`AV-2026-XXXX`).
    - Botão "EXCLUIR DEFINITIVAMENTE" desabilitado até a coincidência exata.
    - Tratamento de loading, cliques duplicados e mensagens de erro em PT-BR.

## 4. Auditoria e Segurança

- **PII Protection:** Garantir que o log de auditoria `ORDER_DELETED` não contenha nome, e-mail ou tokens.
- **Cache Invalidation:** Após exclusão, invalidar as queries `['admin-orders']`, `['admin-stats']` e detalhes específicos.

## Detalhes Técnicos

```text
Fluxo: 
UI (Confirm Code) -> Server Function -> requireSuperAdmin -> Storage Delete (Fail-Closed) -> RPC delete (Cascade + Audit) -> Success
```

- **Bucket:** `av-payment-receipts`
- **Tabelas Afetadas:** `av_orders`, `av_order_items`, `av_payment_receipts`, `av_email_outbox`, `av_admin_audit_logs`.
- **Role Autorizada:** `SUPERADMIN` (perfil ativo).
