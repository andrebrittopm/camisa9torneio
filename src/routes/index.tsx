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
import { OrderReview } from "@/components/OrderReview";
import { OrderSuccess } from "@/components/OrderSuccess";
import { Toaster } from "@/components/ui/sonner";
import type { AvCreatedOrder } from "@/lib/av-order-client";

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
  const [catalog, setCatalog] = useState<AvCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderState = useOrderState();
  const [createdOrder, setCreatedOrder] = useState<AvCreatedOrder | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<{receipt: string | null, view: string | null, expires: number | null}>({
    receipt: null,
    view: null,
    expires: null
  });

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvCatalog();
      setCatalog(data);
    } catch (err) {
      setError("Não foi possível carregar as informações do torneio.");
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const activeEvent = useMemo(() => catalog?.data?.event, [catalog]);
  const models = useMemo(() => catalog?.data?.models || [], [catalog]);

  const activeModel = useMemo(() => {
    // 1. modelo do item sendo editado (from orderState if needed, but index.tsx doesn't seem to have editingItem state yet)
    // Looking at the configurator call below: editingItem={null}
    // So for now, we follow the priority in the instructions.
    
    // 2. modelo escolhido pelo usuário
    if (selectedModelId) {
      const found = models.find(m => m.id === selectedModelId);
      if (found) return found;
    }

    // 3. TSHIRT-01 fallback
    const tshirt01 = models.find(m => m.code === "TSHIRT-01");
    if (tshirt01) return tshirt01;

    // 4. primeiro modelo do catálogo
    return models[0] || null;
  }, [models, selectedModelId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-av-navy flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-av-gold animate-spin mx-auto" />
          <p className="text-av-gold font-sora">Carregando Arena...</p>
        </div>
      </div>
    );
  }

  if (error || !activeEvent || !catalog?.data) {
    return (
      <div className="min-h-screen bg-av-navy flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-av-navy-light/50 border border-white/10 p-8 rounded-2xl text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-sora text-white">Ops! Algo deu errado</h2>
          <p className="text-white/60 font-inter">{error || "Nenhum evento ativo no momento."}</p>
          <Button 
            onClick={loadCatalog}
            className="w-full bg-av-gold text-av-navy hover:bg-av-gold/90"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const handleSelectModel = (model: any) => {
    setSelectedModelId(model.id);
    orderState.setStep('configurator');
  };

  return (
    <div className="min-h-screen bg-av-navy selection:bg-av-gold selection:text-av-navy">
      <Header />
      
      {orderState.currentStep === 'idle' && (
        <>
          <HeroSection />
          <ModelsSection 
            models={models} 
            selectedModelId={
              selectedModelId 
              ?? models.find(m => m.code === "TSHIRT-01")?.id 
              ?? null
            } 
            onSelectModel={handleSelectModel}
            eventInfo={activeEvent}
          />
          <HowItWorks />
          <FinalCTA />
        </>
      )}

      {orderState.currentStep === 'configurator' && (
        <div className="max-w-4xl mx-auto px-6 lg:px-0 pt-20 md:pt-24">
          <OrderConfigurator 
            selectedModel={activeModel}
            eventInfo={activeEvent}
            onAddItem={(item) => {
              orderState.addItem(item);
              orderState.setStep('customer_data');
            }}
            editingItem={null}
            onUpdateItem={() => {}}
            onCancelEdit={() => orderState.setStep('idle')}
            onModelChange={(modelId) => setSelectedModelId(modelId)}
          />
        </div>
      )}

      {orderState.currentStep === 'customer_data' && (
        <div className="max-w-4xl mx-auto px-6 lg:px-0 pt-20 md:pt-24 space-y-8">
          <CustomerDataForm 
            data={orderState.customer}
            onChange={orderState.setCustomer}
          />
          <Button 
            className="w-full h-16 glow-gold rounded-2xl font-black uppercase tracking-widest"
            onClick={() => orderState.setStep('review')}
            disabled={orderState.items.length === 0}
          >
            Revisar Pedido
          </Button>
        </div>
      )}

      {orderState.currentStep === 'review' && (
        <OrderReview 
          customer={orderState.customer}
          items={orderState.items}
          eventInfo={activeEvent}
          onBack={() => orderState.setStep('customer_data')}
          onSuccess={(order, rToken, vToken, vExpires) => {
            setCreatedOrder(order);
            setTokens({ receipt: rToken, view: vToken, expires: vExpires });
            orderState.setStep('success');
          }}
        />
      )}

      {orderState.currentStep === 'success' && createdOrder && (
         <OrderSuccess 
            order={createdOrder}
            catalog={catalog.data}
            localItems={orderState.items}
            onNewOrder={() => {
              orderState.resetOrder();
              setCreatedOrder(null);
            }}
            receiptAccessToken={tokens.receipt}
            orderViewToken={tokens.view}
            orderViewExpiresAt={tokens.expires}
         />
      )}

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
