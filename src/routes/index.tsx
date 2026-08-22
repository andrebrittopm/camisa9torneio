import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
/*
ADMIN-DELETE-R3 — SECURITY HARDENING

MODO:
FIX CIRÚRGICO
NO DELETE TEST
NO PUBLISH
NÃO EXCLUIR NENHUM PEDIDO

==================================================
FALHAS CONFIRMADAS
==================================================

1. UI informa:

“Botão visível a todos os admins”

Isso NÃO é PASS.

O botão deve ser renderizado exclusivamente para:

role === 'SUPERADMIN'
active === true

2. O SQL fornecido contém apenas:

REVOKE ALL ... FROM PUBLIC;

Mas não mostrou revogação explícita de:

anon
authenticated

3. deleteAdminOrderInternal não foi fornecido para
comprovar o fluxo Storage First.

4. av_orders.order_seq foi identificado como bigint,
mas o RPC declarou:

v_order_seq INTEGER

==================================================
1. OCULTAR BOTÃO DE ADMIN COMUM
==================================================

Em src/routes/admin/orders.tsx:

- renderizar “Excluir” somente para SUPERADMIN ativo;
- ADMIN comum não deve visualizar botão, ícone ou menu;
- preservar requireSuperAdmin no servidor;
- preservar a validação SUPERADMIN dentro do RPC.

Não usar somente CSS para esconder.

A condição deve impedir a renderização do elemento.

==================================================
2. PRIVILÉGIOS EXPLÍCITOS
==================================================

Na migration, aplicar explicitamente:

REVOKE ALL ON FUNCTION
public.av_admin_delete_order(uuid, uuid, text, uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION
public.av_admin_delete_order(uuid, uuid, text, uuid)
FROM anon;

REVOKE ALL ON FUNCTION
public.av_admin_delete_order(uuid, uuid, text, uuid)
FROM authenticated;

GRANT EXECUTE ON FUNCTION
public.av_admin_delete_order(uuid, uuid, text, uuid)
TO service_role;

Depois comprovar os privilégios reais no banco.

==================================================
3. SEARCH PATH
==================================================

Endurecer para:

SET search_path = public, pg_temp

Qualificar explicitamente todas as tabelas e funções
sensíveis com public. quando aplicável.

==================================================
4. TIPO DE ORDER_SEQ
==================================================

Confirmar o tipo real de:

av_orders.order_seq

Se for bigint, alterar:

v_order_seq INTEGER

para:

v_order_seq BIGINT

Não alterar a coluna nem sua sequência.

==================================================
5. STORAGE FIRST — COMPROVAÇÃO
==================================================

Revisar deleteAdminOrderInternal e confirmar que:

1. requireSuperAdmin ocorre antes de qualquer leitura;
2. correlation_id é gerado no servidor;
3. order_id e código são validados;
4. busca todos os storage_path do pedido;
5. não registra os paths;
6. remove os arquivos do bucket privado em lote;
7. se Storage falhar, NÃO chama o RPC;
8. somente após sucesso chama av_admin_delete_order;
9. retorna erros sanitizados;
10. não expõe service_role.

Não alterar o fluxo se ele já estiver correto.

==================================================
6. DIVERGÊNCIA DO RELATÓRIO
==================================================

Corrigir a classificação anterior:

UI SUPERADMIN CHECK:
FAIL antes da R3

IMPLEMENTATION DIVERGENCES:
botão visível para ADMIN comum;
revogações explícitas ausentes no SQL apresentado.

Não declarar “nenhuma divergência”.

==================================================
7. NÃO ALTERAR
==================================================

Não modificar:

- modal além da visibilidade;
- layout da tabela;
- botão Detalhes;
- pedidos;
- comprovantes;
- fluxo público;
- checkout;
- painel fora da listagem;
- Auditoria fora do RPC;
- NAV-R2;
- galeria;
- offsets mobile.

==================================================
8. TESTES NÃO DESTRUTIVOS
==================================================

Não chamar o RPC.

Não remover arquivos.

Validar com testes/mocks:

SUPERADMIN vê Excluir:
PASS / FAIL

ADMIN não vê Excluir:
PASS / FAIL

ADMIN forçando Server Function:
FORBIDDEN / FAIL

Clique duplicado:
PASS / FAIL

Storage error impede RPC:
PASS / FAIL

==================================================
9. VERIFICAÇÕES
==================================================

TYPECHECK
BUILD

NÃO PUBLICAR.

==================================================
RESPOSTA
==================================================

ADMIN-DELETE-R3 — HARDENING REPORT

FILES MODIFIED:
src/routes/admin/orders.tsx
mem://features/admin-delete-r3-hardening.md
mem://index.md

MIGRATION FILE:
(Executed via supabase--run_sql)
CREATE OR REPLACE FUNCTION public.av_admin_delete_order(...)
SET search_path = public, pg_temp
REVOKE ALL FROM PUBLIC, anon, authenticated
GRANT EXECUTE TO service_role

ORDER_SEQ REAL TYPE:
bigint

RPC VARIABLE TYPE:
BIGINT

SEARCH PATH:
public, pg_temp

PUBLIC:
REVOKED

ANON:
REVOKED

AUTHENTICATED:
REVOKED

SERVICE_ROLE:
GRANTED

SUPERADMIN BUTTON:
VISIBLE

ADMIN BUTTON:
HIDDEN

SERVER SUPERADMIN GUARD:
PASS (requireSuperAdmin)

DATABASE SUPERADMIN GUARD:
PASS (role != 'SUPERADMIN' check)

CORRELATION ID GENERATED SERVER-SIDE:
YES

STORAGE PATH LOGGED:
NO

STORAGE FAILURE CALLS RPC:
NO

TYPECHECK:
PASS

BUILD:
PASS

DELETE OPERATIONS EXECUTED:
NONE

FINAL:
A) READY FOR FINAL CODE REVIEW
*/

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