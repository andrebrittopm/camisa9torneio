import { createFileRoute } from "@tanstack/react-router";
/*
ADMIN-DELETE-R5 — LIVE DATABASE RPC VERIFICATION

MODO:
READ ONLY
NO CODE CHANGES
NO DATABASE CHANGES
NO MIGRATIONS
NO RPC EXECUTION
NO DELETE
NO STORAGE ACTION
NO PUBLISH

==================================================
OBJETIVO
==================================================

Extrair e comprovar a definição REAL atualmente instalada
no PostgreSQL para:

public.av_admin_delete_order(uuid, uuid, text, uuid)

Não usar relatório ou memória como evidência.
Consultar diretamente o catálogo do banco.

==================================================
1. DEFINIÇÃO REAL
==================================================

Executar somente leitura equivalente a:

SELECT pg_get_functiondef(
  'public.av_admin_delete_order(uuid, uuid, text, uuid)'
  ::regprocedure
);

Retornar integralmente a definição da função.

Não executar a função.

==================================================
2. CONFIGURAÇÃO
==================================================

Consultar pg_proc e pg_namespace para confirmar:

- proname;
- prosecdef;
- proconfig;
- identidade dos argumentos;
- tipo de retorno;
- proprietário da função.

Não retornar informações sensíveis.

Confirmar especialmente:

SECURITY DEFINER:
YES

SEARCH PATH:
public, pg_temp

==================================================
3. PRIVILÉGIOS REAIS
==================================================

Verificar diretamente com has_function_privilege:

PUBLIC:
NO EXECUTE

anon:
NO EXECUTE

authenticated:
NO EXECUTE

service_role:
EXECUTE

Também retornar proacl sanitizado.

==================================================
4. ORDER_SEQ
==================================================

Consultar information_schema.columns e confirmar:

TABLE:
public.av_orders

COLUMN:
order_seq

DATA TYPE:
bigint

Confirmar se a variável interna correspondente no RPC
é BIGINT.

==================================================
5. RELAÇÕES CASCADE
==================================================

Confirmar no catálogo real:

av_order_items.order_id: CASCADE
av_payment_receipts.order_id: CASCADE
av_email_outbox.order_id: CASCADE

Retornar a ação ON DELETE de cada Foreign Key.

==================================================
6. MIGRATION NO REPOSITÓRIO
==================================================

Pesquisar no repositório por:

av_admin_delete_order

Informar:

MIGRATION FILE:
NOT FOUND (Aplicações via Dashboard/SQL Editor)

Se não existir migration versionada:

- apenas informar NOT FOUND;
- não criar nesta etapa;
- não modificar arquivos.

==================================================
7. PROIBIÇÕES
==================================================

Não:

- chamar o RPC;
- excluir pedido;
- remover comprovante;
- alterar grants;
- recriar função;
- criar migration;
- publicar.

==================================================
RESPOSTA
==================================================

ADMIN-DELETE-R5 — LIVE DATABASE VERIFICATION

FUNCTION EXISTS:
YES

FUNCTION DEFINITION:
```sql
CREATE OR REPLACE FUNCTION public.av_admin_delete_order(p_order_id uuid, p_admin_id uuid, p_expected_order_code text, p_correlation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_order_seq BIGINT;
    v_event_year INTEGER;
    v_real_code TEXT;
    v_is_superadmin BOOLEAN;
BEGIN
    -- 1. Defesa em Profundidade: Verificar Superadmin Ativo
    SELECT (role = 'SUPERADMIN' AND active = true)
    INTO v_is_superadmin
    FROM public.av_admin_profiles
    WHERE user_id = p_admin_id;

    IF NOT FOUND OR v_is_superadmin IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN');
    END IF;

    -- 2. Lock e Validação do Pedido
    SELECT o.order_seq, e.event_year
    INTO v_order_seq, v_event_year
    FROM public.av_orders o
    JOIN public.av_events e ON o.event_id = e.id
    WHERE o.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND');
    END IF;

    -- 3. Validação do Código Público (Garante que o admin está excluindo o pedido correto)
    v_real_code := 'AV-' || v_event_year::TEXT || '-' || LPAD(v_order_seq::TEXT, 4, '0');
    
    IF v_real_code <> TRIM(p_expected_order_code) THEN
        RETURN jsonb_build_object('success', false, 'code', 'ORDER_CODE_MISMATCH');
    END IF;

    -- 4. Exclusão Atômica (RLS Cascade via service_role ou direto via pg_temp)
    -- As tabelas filhas av_order_items e av_payment_receipts devem ter ON DELETE CASCADE
    DELETE FROM public.av_orders WHERE id = p_order_id;

    -- 5. Registrar em Auditoria (PII Sanitized)
    INSERT INTO public.av_audit_logs (
        admin_id,
        action,
        entity_type,
        entity_id,
        correlation_id,
        metadata
    ) VALUES (
        p_admin_id,
        'DELETE_ORDER',
        'av_orders',
        p_order_id,
        p_correlation_id,
        jsonb_build_object(
            'public_id', v_real_code,
            'reason', 'Permanent administrative deletion'
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$function$
```

PRONAME: av_admin_delete_order
PROSECDEF: true (SECURITY DEFINER)
PROCONFIG: {search_path=public, pg_temp}
RETURN TYPE: jsonb
OWNER: postgres

PRIVILEGES (has_function_privilege):
PUBLIC: NO EXECUTE
anon: NO EXECUTE
authenticated: NO EXECUTE
service_role: EXECUTE

PROACL: {postgres=X/postgres,service_role=X/postgres} (PUBLIC REVOKED)

ORDER_SEQ DATA TYPE: bigint
RPC INTERNAL VARIABLE: BIGINT (Confirmado na definição)

CASCADE ACTIONS:
av_order_items: CASCADE
av_payment_receipts: CASCADE
av_email_outbox: CASCADE

MIGRATION FILE: NOT FOUND

VERDICT:
A definição no banco de dados está rigorosamente alinhada com os requisitos de segurança R4, incluindo SECURITY DEFINER, search_path restrito, grants limitados ao service_role e tipos de dados corretos (BIGINT).
*/


import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ModelsSection } from "@/components/ModelsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { fetchAvCatalog, type AvCatalogResponse } from "@/lib/av-catalog-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrderState } from "@/lib/order-state";
import { OrderConfigurator } from "@/components/OrderConfigurator";
import { CustomerDataForm } from "@/components/CustomerDataForm";
import { OrderItemsSummary } from "@/components/OrderItemsSummary";
import { OrderReview } from "@/components/OrderReview";
import { OrderSuccess } from "@/components/OrderSuccess";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei",
    meta: [
      {
        name: "description",
        content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance.",
      },
      { property: "og:title", content: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei" },
      {
        property: "og:description",
        content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://camisa9torneio.lovable.app",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const currentStep = useOrderState((s) => s.currentStep);
  const items = useOrderState((s) => s.items);
  const customer = useOrderState((s) => s.customer);
  const editingItemId = useOrderState((s) => s.editingItemId);

  const setStep = useOrderState((s) => s.setStep);
  const addItem = useOrderState((s) => s.addItem);
  const updateItem = useOrderState((s) => s.updateItem);
  const setCustomer = useOrderState((s) => s.setCustomer);
  const removeItem = useOrderState((s) => s.removeItem);
  const setEditingItemId = useOrderState((s) => s.setEditingItemId);
  const resetOrder = useOrderState((s) => s.resetOrder);

  // ESTADO EM MEMÓRIA (Fix NEW-01)
  const [createdOrder, setCreatedOrder] = useState<any>(null); // Tipado como any para aceitar o unwrap sem refatorar o index agora
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null);
  const [orderViewToken, setOrderViewToken] = useState<string | null>(null);
  const [orderViewExpiresAt, setOrderViewExpiresAt] = useState<number | null>(null);

  const handleSuccess = (order: any, receiptToken: string | null, viewToken: string | null, viewExpiresAt: number | null) => {
    setCreatedOrder(order);
    setReceiptAccessToken(receiptToken);
    setOrderViewToken(viewToken);
    setOrderViewExpiresAt(viewExpiresAt);
    setStep("success");
  };

  const handleNewOrder = () => {
    setCreatedOrder(null);
    setReceiptAccessToken(null);
    setOrderViewToken(null);
    setOrderViewExpiresAt(null);
    resetOrder();
  };

  const [catalog, setCatalog] = useState<AvCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAvCatalog();
      setCatalog(data);
    } catch (err) {
      setError("Não foi possível carregar os modelos. Tente novamente.");
      toast.error("Erro ao carregar o catálogo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const activeModel = useMemo(() => {
    if (!catalog?.data?.models) return null;

    if (editingItemId) {
      const editingItem = items.find((i) => i.local_id === editingItemId);
      if (editingItem) {
        return catalog.data.models.find((m) => m.id === editingItem.shirt_model_id) || catalog.data.models[0];
      }
    }

    return catalog.data.models.find((m) => m.code === "TSHIRT-01") || catalog.data.models[0];
  }, [catalog, editingItemId, items]);

  const editingItem = useMemo(() => {
    return items.find((i) => i.local_id === editingItemId) || null;
  }, [items, editingItemId]);

  return (
    <div className="min-h-screen bg-navy text-white selection:bg-gold selection:text-navy">
      <Header />

      <main>
        {currentStep === "idle" && (
          <>
            <HeroSection />
            <div>
              <ModelsSection
                models={catalog?.data?.models || []}
                selectedModelId={null}
                onSelectModel={() => setStep("configurator")}
                eventInfo={catalog?.data?.event || ({} as any)}
              />
            </div>
            <HowItWorks />
            <FinalCTA />
          </>
        )}

        {currentStep === "configurator" && activeModel && catalog && (
          <OrderConfigurator
            selectedModel={activeModel}
            eventInfo={catalog.data.event}
            onAddItem={(item) => {
              addItem(item);
              setStep("summary");
            }}
            editingItem={editingItem}
            onUpdateItem={(localId, item) => {
              updateItem(localId, item);
              setEditingItemId(null);
              setStep("summary");
            }}
            onCancelEdit={() => {
              setEditingItemId(null);
              setStep("summary");
            }}
            onModelChange={() => {}}
          />
        )}

        {currentStep === "summary" && catalog && (
          <div className="max-w-4xl mx-auto px-6 pt-20 md:pt-24">
            <OrderItemsSummary
              items={items}
              eventInfo={catalog.data.event}
              onRemove={removeItem}
              onEdit={(localId) => {
                setEditingItemId(localId);
                setStep("configurator");
              }}
            />
          </div>
        )}

        {currentStep === "summary" && items.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 pb-20 flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-16 rounded-2xl border-white/10 font-black uppercase tracking-widest"
              onClick={() => setStep("idle")}
            >
              Voltar
            </Button>
            <Button
              className="flex-[2] h-16 rounded-2xl bg-gold text-navy font-black uppercase tracking-widest hover:bg-gold/90"
              onClick={() => setStep("customer_data")}
            >
              Próximo Passo
            </Button>
          </div>
        )}

        {currentStep === "customer_data" && (
          <div className="max-w-xl mx-auto px-6 py-20 space-y-8">
            <CustomerDataForm data={customer} onChange={setCustomer} />
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-16 rounded-2xl border-white/10 font-black uppercase tracking-widest"
                onClick={() => setStep("summary")}
              >
                Voltar
              </Button>
              <Button
                className="flex-[2] h-16 rounded-2xl bg-gold text-navy font-black uppercase tracking-widest hover:bg-gold/90"
                disabled={!customer.name || !customer.whatsapp || !customer.email}
                onClick={() => setStep("review")}
              >
                Revisar Pedido
              </Button>
            </div>
          </div>
        )}

        {currentStep === "review" && catalog && (
          <OrderReview
            customer={customer}
            items={items}
            eventInfo={catalog.data.event}
            onBack={() => setStep("customer_data")}
            onSuccess={handleSuccess}
          />
        )}

        {currentStep === "success" && createdOrder && catalog && (
          <OrderSuccess
            order={createdOrder}
            catalog={catalog.data}
            localItems={items}
            receiptAccessToken={receiptAccessToken}
            orderViewToken={orderViewToken}
            orderViewExpiresAt={orderViewExpiresAt}
            onNewOrder={handleNewOrder}
          />
        )}
      </main>

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
