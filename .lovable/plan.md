# Plan: Stage 10.3B — Payment Approval and Rejection

Implement a secure, transactional, and audited system for administrators to approve or reject payment receipts in the 9º Torneio Amigos do Vôlei admin panel.

## Technical Details

### 1. Database Layer (PostgreSQL RPC)
I will create a new Postgres function `av_admin_review_receipt` to ensure atomicity. This is superior to multiple client-side calls as it handles the transaction entirely on the server.

- **Function**: `public.av_admin_review_receipt`
- **Logic**:
    - Verify the receipt exists and belongs to the order.
    - Check if the receipt is currently `pending`.
    - **Approval**:
        - Set `review_status` = 'approved', `reviewed_at` = NOW(), `reviewed_by` = admin_id.
        - Update `av_orders.payment_status` = 'payment_confirmed'.
        - If `order_status` is 'received', update to 'confirmed'.
    - **Rejection**:
        - Set `review_status` = 'rejected', `review_notes` = reason + notes, `reviewed_at` = NOW(), `reviewed_by` = admin_id.
        - Update `av_orders.payment_status` = 'receipt_rejected'.
    - **Audit**: Insert a record into `av_admin_audit_logs`.
    - **Concurrency**: Use `FOR UPDATE` or strict `WHERE status = 'pending'` to prevent race conditions.

### 2. Backend Logic
- **Server File**: `src/lib/server/av-admin-orders.server.ts`
    - Add `reviewAdminReceiptInternal` helper to call the RPC using `supabaseAdmin`.
- **Server Functions**: `src/lib/av-admin-orders.functions.ts`
    - Export `reviewAdminReceipt` using `createServerFn`.
    - Enforce `requireAdmin()`.
    - Validate input with Zod.

### 3. Frontend UI
- **Route**: `src/routes/admin/orders.$orderId.tsx`
    - **Actions**: Add "Aprovar Pagamento" and "Rejeitar Comprovante" buttons to each receipt entry that has a `pending` status.
    - **Modals**:
        - `ApproveConfirmationModal`: Shows order summary and asks for final confirmation.
        - `RejectReasonModal`: Required select for reason (divergent value, unreadable, invalid, not found, other) and optional text area.
    - **States**: Manage loading states per receipt to prevent double-clicks.
    - **Refresh**: Use `queryClient.invalidateQueries` to refresh the order details after a successful action.

### 4. Security & Validation
- **IDOR**: Validated in the Postgres RPC.
- **CSRF/Session**: Handled by TanStack Start / Supabase Auth.
- **Audit**: Every action logged with admin ID and resource IDs.

## Success Criteria
- [ ] Admin can approve a receipt -> Order becomes 'payment_confirmed'.
- [ ] Admin can reject a receipt with a reason -> Order becomes 'receipt_rejected'.
- [ ] Actions are logged in audit tables.
- [ ] UI reflects changes immediately without full page reload.
- [ ] Unauthorized users cannot call the review functions.
