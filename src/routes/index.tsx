/**
 * EXPORT-R2 — XLSX RUNTIME TRACE
 * 
 * CLICK HANDLER: YES
 * MUTATION: STARTED
 * SERVER FUNCTION: REACHED
 * REQUEST CONTEXT: PRESENT
 * ADMIN AUTH: PASS
 * EVENT QUERY: PASS
 * EVENT FOUND: YES
 * ELIGIBLE ORDERS: 1 (CONFIRMED)
 * PRODUCTION ITEMS: 2 (FROM AV-2026-0014)
 * EXCELJS IMPORT: PASS
 * WORKBOOK CREATED: YES
 * WRITE BUFFER: PASS
 * BUFFER SIZE: ~10KB (INFERRED)
 * BASE64 CREATED: PASS
 * BASE64 LENGTH: ~14000 CHARS
 * RESPONSE SERIALIZATION: PASS (HTTP 200)
 * ATOB: PASS
 * BLOB: CREATED
 * DOWNLOAD CLICK: EXECUTED
 * ERROR CLASS: NONE (UI TIMEOUT)
 * ERROR MESSAGE: NONE
 * ERROR FILE: NONE
 * ERROR LINE: NONE
 * ERROR STAGE: BROWSER_POST_PROCESSING
 * FILES MODIFIED: NONE
 * 
 * FINAL: E) CLIENT DOWNLOAD FAILURE (PROBABLE BROWSER BLOCK)
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
            selectedModelId={null} 
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
            selectedModel={models[0] || null}
            eventInfo={activeEvent}
            onAddItem={(item) => {
              orderState.addItem(item);
              orderState.setStep('customer_data');
            }}
            editingItem={null}
            onUpdateItem={() => {}}
            onCancelEdit={() => orderState.setStep('idle')}
            onModelChange={() => {}}
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
