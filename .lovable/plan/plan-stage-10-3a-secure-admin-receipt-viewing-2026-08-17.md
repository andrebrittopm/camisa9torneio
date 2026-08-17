# Plan: Stage 10.3A — Secure Admin Receipt Viewing

Implement secure, server-side validated viewing of payment receipts for administrators, ensuring zero exposure of private files to the public.

## Technical Details

### 1. Data Layer (Server-Side)
- **New Server Function**: `getAdminReceiptViewUrl` in `src/lib/av-admin-orders.functions.ts`.
- **Internal Helper**: `getAdminReceiptSignedUrlInternal` in `src/lib/server/av-admin-orders.server.ts`.
- **Validation**:
  - `requireAdmin(request)` to gate access.
  - Zod validation for `orderId` and `receiptId`.
  - Database cross-check: `receipt.order_id === order.id`.
  - Content-type validation (JPG, PNG, PDF).
- **Signed URL**: Generate a Supabase Storage signed URL (60s expiry) using `service_role`.

### 2. Frontend Updates
- **Order Detail Page (`/admin/orders/$orderId`)**:
  - Update listing logic to handle multiple receipts if present.
  - Add "Visualizar Comprovante" button per receipt.
  - Display receipt metadata (status, date, type, size).
- **Secure Viewer**:
  - Implement a `ReceiptViewer` component (Modal or Drawer).
  - Use `useServerFn` to fetch the temporary URL on click.
  - Handle PDF via `<iframe>` or new tab, and images via standard `<img>` with zoom support.
- **Cache Control**: Ensure the viewing endpoint/function results are not cached client-side (`no-store` equivalent).

### 3. Verification & Audit
- **Audit Header**: Update `src/routes/index.tsx` to reflect Stage 10.3A status.
- **Security Tests**:
  - IDOR check: Receipt A vs Order B (must fail).
  - Auth check: Logged-out access (must fail).
  - Expiry check: Signed URL validity duration.

## User Review Required

> [!IMPORTANT]
> This stage focuses **exclusively on viewing**. Buttons for "Approve" or "Reject" will be added in Stage 10.3B.
