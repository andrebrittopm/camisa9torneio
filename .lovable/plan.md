# Plan - ETAPA 4.3C-R2 — PROVIDER REAL + OUTBOX IDEMPOTENTE + ORDER-VIEW FINAL

Esta etapa foca no hardening do sistema de e-mail transacional, implementação de outbox robusta com idempotência e finalização da visualização segura de pedidos (Order-View).

## User Review Required

> [!IMPORTANT]
> **Email Provider:** O projeto atualmente usa `console.log` como mock. Se um provider real (ex: Resend, SendGrid) for desejado, as credenciais devem ser fornecidas via `add_secret`. Caso contrário, manteremos o mock mas com toda a infraestrutura de produção pronta.
> **Email Backfill:** Existem 3 pedidos de teste na base. Eles serão atualizados para `suporte@torneio.com.br` para permitir a aplicação da constraint `NOT NULL`.

## Proposed Changes

### 1. Database & Migrations
- **av_orders:** Adicionar `customer_email` (NOT NULL) com validação de formato e comprimento (254 chars).
- **av_email_outbox:** 
    - Adicionar `event_key` para idempotência granular.
    - Criar constraint UNIQUE em `(order_id, event_type, event_key)`.
    - Implementar lógica de enqueue que respeita o status `sent`.
    - Garantir RLS estrito (acesso apenas para `service_role`).

### 2. Server-Side Hardening
- **src/lib/server/av-email.server.ts:**
    - Implementar adapter com suporte a timeout e idempotency keys (se o provider suportar).
    - Lógica de normalização de e-mail (trim, lowercase).
    - Sistema de retentativa sem duplicação de pedidos.
- **src/routes/api/public/av-order-view.ts:**
    - Garantir que `expires` faz parte da assinatura HMAC.
    - Sanitização total da resposta (remover PII e IDs internos).
    - Adicionar headers de segurança: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- **src/lib/server/av-order-access.server.ts:**
    - Unificar geração de tokens incluindo expiração de forma opaca ou explícita (conforme auditoria).

### 3. Frontend Integration
- **OrderSuccess.tsx:** Atualizar exibição do Link Seguro para garantir que handle/token/expires estejam codificados corretamente.
- **OrderReview.tsx:** Reforçar a captura e validação do e-mail antes da submissão.

## Technical Details

### SQL Schema Changes
```sql
-- Normalização e Constraint de Email
ALTER TABLE public.av_orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
UPDATE public.av_orders SET customer_email = 'suporte@torneio.com.br' WHERE customer_email IS NULL;
ALTER TABLE public.av_orders ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE public.av_orders ADD CONSTRAINT av_orders_email_check 
    CHECK (length(customer_email) <= 254 AND customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

-- Evolução da Outbox
CREATE TABLE IF NOT EXISTS public.av_email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.av_orders(id) NOT NULL,
    event_type TEXT NOT NULL,
    event_key TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    provider_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, event_type, event_key)
);
```

### Test Plan (MAIL01-MAIL25)
- Testes automatizados via script de auditoria para validar assinatura, expiração, sanitização e idempotência.
- Verificação manual de fluxo: Compra -> Recebimento -> Order View (Novo Browser) -> Refresh.
