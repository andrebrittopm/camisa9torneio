/**
 * AV - 9º Torneio Amigos do Vôlei
 * ETAPA 12.1-P0 — INCIDENTE DE PRODUÇÃO
 * RELATÓRIO DE DIAGNÓSTICO E HARDENING
 */



import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, Loader2, RefreshCcw } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/Header'
import { HeroSection } from '@/components/HeroSection'
import { ModelsSection } from '@/components/ModelsSection'
import { HowItWorks } from '@/components/HowItWorks'
import { FinalCTA } from '@/components/FinalCTA'
import { Footer } from '@/components/Footer'
import { fetchAvCatalog, type AvCatalogResponse } from '@/lib/av-catalog-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
      { property: "og:image", content: "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp" },
      { name: "twitter:image", content: "https://camisa9torneio.lovable.app/__l5e/assets-v1/92218de1-3dce-43b7-9845-94b513c0bd06/tshirt-01-oficial-v2.webp" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://camisa9torneio.lovable.app",
      },
    ],
  }),
  component: Index,
})

function Index() {
  const currentStep = useOrderState(s => s.currentStep)
  const items = useOrderState(s => s.items)
  const customer = useOrderState(s => s.customer)
  const editingItemId = useOrderState(s => s.editingItemId)
  
  const setStep = useOrderState(s => s.setStep)
  const addItem = useOrderState(s => s.addItem)
  const updateItem = useOrderState(s => s.updateItem)
  const setCustomer = useOrderState(s => s.setCustomer)
  const removeItem = useOrderState(s => s.removeItem)
  const setEditingItemId = useOrderState(s => s.setEditingItemId)
  const resetOrder = useOrderState(s => s.resetOrder)

  // ESTADO EM MEMÓRIA (Fix NEW-01)
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null)
  const [orderViewToken, setOrderViewToken] = useState<string | null>(null)

  const handleSuccess = (order: any, receiptToken: string | null, viewToken: string | null) => {
    setCreatedOrder(order)
    setReceiptAccessToken(receiptToken)
    setOrderViewToken(viewToken)
    setStep('success')
  }

  const handleNewOrder = () => {
    setCreatedOrder(null)
    setReceiptAccessToken(null)
    setOrderViewToken(null)
    resetOrder()
  }

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
    
    if (editingItemId) {
      const editingItem = items.find(i => i.local_id === editingItemId);
      if (editingItem) {
        return catalog.data.models.find(m => m.id === editingItem.shirt_model_id) || catalog.data.models[0];
      }
    }
    
    return catalog.data.models.find(m => m.code === 'TSHIRT-01') || catalog.data.models[0]
  }, [catalog, editingItemId, items])

  const editingItem = useMemo(() => {
    return items.find(i => i.local_id === editingItemId) || null;
  }, [items, editingItemId]);

  return (
    <div className="min-h-screen bg-navy text-white selection:bg-gold selection:text-navy">
      <Header />
      
      <main>
        {currentStep === 'idle' && (
          <>
            <HeroSection />
            <div id="camisa">
              <ModelsSection 
                models={catalog?.data?.models || []} 
                selectedModelId={null}
                onSelectModel={() => setStep('configurator')}
                eventInfo={catalog?.data?.event || {} as any}
              />
            </div>
            <HowItWorks />
            <FinalCTA />
          </>
        )}

        {currentStep === 'configurator' && activeModel && catalog && (
          <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
            <OrderConfigurator 
              selectedModel={activeModel} 
              eventInfo={catalog.data.event}
              onAddItem={(item) => {
                addItem(item);
                setStep('summary');
              }}
              editingItem={editingItem}
              onUpdateItem={(id, data) => {
                updateItem(id, data);
                setEditingItemId(null);
                setStep('summary');
              }}
              onCancelEdit={() => {
                setEditingItemId(null);
                setStep('summary');
              }}
              onModelChange={() => {}}
            />
          </div>
        )}

        {currentStep === 'customer_data' && (
          <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto space-y-8">
            <CustomerDataForm 
              data={customer}
              onChange={setCustomer}
            />
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('summary')} className="flex-1 h-16 rounded-2xl border-white/10 uppercase font-black">Voltar</Button>
              <Button onClick={() => setStep('review')} className="flex-[2] h-16 rounded-2xl glow-gold uppercase font-black">Revisar Pedido</Button>
            </div>
          </div>
        )}

        {currentStep === 'summary' && catalog && (
          <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto space-y-8">
            <OrderItemsSummary 
              items={items}
              eventInfo={catalog.data.event}
              onRemove={removeItem}
              onEdit={(id) => {
                setEditingItemId(id);
                setStep('configurator');
              }}
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => setStep('idle')} className="h-16 rounded-2xl border-white/10 uppercase font-black">Continuar Comprando</Button>
              <Button onClick={() => setStep('customer_data')} disabled={items.length === 0} className="flex-1 h-16 rounded-2xl glow-gold uppercase font-black">Próximo Passo</Button>
            </div>
          </div>
        )}

        {currentStep === 'review' && catalog && (
          <div className="pt-32 pb-24">
            <OrderReview 
              customer={customer}
              items={items}
              eventInfo={catalog.data.event}
              onBack={() => setStep('customer_data')}
              onSuccess={handleSuccess}
            />
          </div>
        )}

        {currentStep === 'success' && catalog && (
          <div className="pt-32 pb-24">
            {createdOrder ? (
              <OrderSuccess 
                order={createdOrder} 
                catalog={catalog.data}
                localItems={items}
                receiptAccessToken={receiptAccessToken}
                orderViewToken={orderViewToken}
                onNewOrder={handleNewOrder}
              />
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 px-4 text-center">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-heading font-black uppercase text-white">Dados Indisponíveis</h2>
                  <p className="text-slate-400 text-sm max-w-xs">Não foi possível carregar os dados deste pedido.</p>
                </div>
                <Button onClick={handleNewOrder} variant="outline" className="border-white/10">
                  Voltar ao Início
                </Button>
              </div>
            )}
          </div>
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
