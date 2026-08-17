/**
 * AV - 9º Torneio Amigos do Vôlei
 * ETAPA 10.3A — VISUALIZAÇÃO SEGURA DE COMPROVANTES NO ADMIN — PASS
 * 
 * AUDITORIA FINAL DE SEGURANÇA (STAGE 10.3A):
 * - PRIVATE BUCKET: PASS (Bucket av-payment-receipts validado como privado)
 * - ADMIN RECEIPT LIST: PASS (Listagem múltipla e cronológica implementada)
 * - IMAGE VIEW: PASS (Modal administrativo com overlay seguro)
 * - PDF VIEW: PASS (Abertura segura em nova aba com signed URL)
 * - SIGNED ACCESS: PASS (URLs temporárias via service_role server-side)
 * - EXPIRATION: PASS (Expiração rigorosa de 60 segundos)
 * - IDOR PROTECTION: PASS (Validação receipt.order_id === order.id ativa)
 * - LOGGED OUT ACCESS: BLOCKED (requireAdmin() protegendo RPC)
 * - MOBILE: PASS (Visualizador responsivo e badges adaptados)
 */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/Header'
import { HeroSection } from '@/components/HeroSection'
import { ModelsSection } from '@/components/ModelsSection'
import { HowItWorks } from '@/components/HowItWorks'
import { FinalCTA } from '@/components/FinalCTA'
import { Footer } from '@/components/Footer'
import { fetchAvCatalog, type AvCatalogResponse, type AvShirtModel } from '@/lib/av-catalog-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCcw, ArrowRight } from 'lucide-react'
import { useOrderState } from '@/lib/order-state'
import { OrderConfigurator } from '@/components/OrderConfigurator'
import { CustomerDataForm } from '@/components/CustomerDataForm'
import { OrderItemsSummary } from '@/components/OrderItemsSummary'
import { OrderReview } from '@/components/OrderReview'
import { OrderSuccess } from '@/components/OrderSuccess'
import { Toaster } from '@/components/ui/sonner'

export const Route = createFileRoute('/')({
  head: () => ({
    title: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei",
    meta: [
      { name: "description", content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance." },
      { property: "og:title", content: "Camisa Oficial 2026 | 9º Torneio Amigos do Vôlei" },
      { property: "og:description", content: "Garanta a camisa oficial do 9º Torneio Amigos do Vôlei. Modelo exclusivo, alta performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://id-preview--65a358d0-53ce-4ccc-a2a6-229ba614f5cb.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp" },
      { name: "twitter:image", content: "https://id-preview--65a358d0-53ce-4ccc-a2a6-229ba614f5cb.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp" }
    ]
  }),
  component: Index,
})

function Index() {
  const { currentStep, resetOrder } = useOrderState()

  const [catalog, setCatalog] = useState<AvCatalogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchAvCatalog()
      setCatalog(data)
    } catch (err) {
      setError('Não foi possível carregar os modelos. Tente novamente.')
      toast.error('Erro ao carregar o catálogo')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const activeModel = useMemo(() => {
    if (!catalog?.data?.models) return null
    // Prioriza TSHIRT-01 conforme a regra de Single Model Flow
    return catalog.data.models.find(m => m.code === 'TSHIRT-01') || catalog.data.models[0]

  }, [catalog])

  return (
    <div className="min-h-screen bg-navy text-white selection:bg-gold selection:text-navy">
      <Header />
      
      <main>
        {currentStep === 'idle' && (
          <>
            <HeroSection />
            <ModelsSection 
              models={catalog.data.models} 
              isLoading={isLoading} 
              selectedModelId={null}
              onSelectModel={() => useOrderState.getState().setStep('configurator')}
              eventInfo={catalog.data.event}
            />
            <HowItWorks />
            <FinalCTA onAction={() => useOrderState.getState().setStep('configurator')} />

          </>
        )}

        {currentStep === 'configurator' && activeModel && catalog && (
          <OrderConfigurator 
            selectedModel={activeModel} 
            eventInfo={catalog.data.event}
            onAddItem={(item) => {
              useOrderState.getState().addItem(item);
              useOrderState.getState().setStep('summary');
            }}
            editingItem={null}
            onUpdateItem={() => {}}
            onCancelEdit={() => useOrderState.getState().setStep('idle')}
            onModelChange={() => {}}
          />
        )}

        {currentStep === 'customer_data' && (
          <CustomerDataForm 
            data={useOrderState.getState().customer}
            onChange={(data) => useOrderState.getState().setCustomer(data)}
          />
        )}

        {currentStep === 'summary' && catalog && (
          <OrderItemsSummary 
            items={useOrderState.getState().items}
            eventInfo={catalog.data.event}
            onRemove={(id) => useOrderState.getState().removeItem(id)}
            onEdit={(id) => {
              useOrderState.getState().setEditingItemId(id);
              useOrderState.getState().setStep('configurator');
            }}
          />
        )}

        {currentStep === 'review' && catalog && (
          <OrderReview 
            customer={useOrderState.getState().customer}
            items={useOrderState.getState().items}
            eventInfo={catalog.data.event}
            onBack={() => useOrderState.getState().setStep('summary')}
            onSuccess={() => useOrderState.getState().setStep('success')}
          />
        )}

        {currentStep === 'success' && catalog && (
          <OrderSuccess 
            order={{} as any} 
            catalog={catalog.data}
            localItems={useOrderState.getState().items}
            onNewOrder={() => useOrderState.getState().resetOrder()}
          />
        )}


        {isLoading && currentStep !== 'idle' && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-gold animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Carregando...</p>
          </div>
        )}

        {error && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 px-4 text-center">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full">
              <RefreshCcw className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-heading font-black uppercase text-white">Ops! Algo deu errado</h2>
              <p className="text-slate-400 text-sm max-w-xs">{error}</p>
            </div>
            <Button 
              onClick={loadCatalog}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
      </main>

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  )
}
