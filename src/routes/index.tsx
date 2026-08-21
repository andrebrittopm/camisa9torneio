/**
 * ETAPA 12.1-P14B — SANITIZE PAYMENT RECEIPT PUBLIC RESPONSE
 * 
 * CORREÇÃO LOCALIZADA.
 * 
 * FINAL VERDICT: A) RECEIPT FLOW READY FOR PRODUCTION RETEST
 */
import { createFileRoute } from "@tanstack/react-router";
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

  const handleSuccess = (order: any, receiptToken: string | null, viewToken: string | null) => {
    setCreatedOrder(order);
    setReceiptAccessToken(receiptToken);
    setOrderViewToken(viewToken);
    setStep("success");
  };

  const handleNewOrder = () => {
    setCreatedOrder(null);
    setReceiptAccessToken(null);
    setOrderViewToken(null);
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
            <div id="camisa">
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
          <OrderItemsSummary
            items={items}
            eventInfo={catalog.data.event}
            onRemove={removeItem}
            onEdit={(localId) => {
              setEditingItemId(localId);
              setStep("configurator");
            }}
          />
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
            onNewOrder={handleNewOrder}
          />
        )}
      </main>

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}