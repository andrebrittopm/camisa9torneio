/**
 * ETAPA 12.1-P9 — RPC CUSTOMER EMAIL FIX
 *
 * RPC OVERLOAD TARGET:
 * 8 PARAM
 *
 * P_CUSTOMER_EMAIL:
 * SENT
 *
 * EMAIL VALIDATION:
 * PASS
 *
 * EMAIL FINGERPRINT:
 * PASS
 *
 * LEGACY RPC CALL:
 * NOT USED
 *
 * RATE LIMIT:
 * PRESERVED
 *
 * PRICE:
 * SERVER-SIDE
 *
 * SUCCESS TOKENS:
 * PRESERVED
 *
 * TYPECHECK:
 * PASS
 *
 * BUILD:
 * PASS
 *
 * FILES MODIFIED:
 * [src/routes/api/public/av-create-order.ts, src/routes/index.tsx]
 *
 * FINAL VERDICT:
 *
 * A) RPC OVERLOAD FIX READY — REVIEW BEFORE PUBLISH
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
          <OrderConfigurator 
            model={activeModel} 
            onBack={() => {
              if (editingItemId) {
                setEditingItemId(null)
                setStep('summary')
              } else {
                setStep('idle')
              }
            }}
            onConfirm={(item) => {
              if (editingItemId) {
                updateItem(editingItemId, item)
                setEditingItemId(null)
              } else {
                addItem(item)
              }
              setStep('summary')
            }}
            initialData={editingItem || undefined}
          />
        )}

        {currentStep === 'summary' && (
          <OrderItemsSummary 
            items={items}
            models={catalog?.data?.models || []}
            onAddItem={() => setStep('configurator')}
            onEditItem={(localId) => {
              setEditingItemId(localId)
              setStep('configurator')
            }}
            onRemoveItem={removeItem}
            onNext={() => setStep('customer')}
            onBack={() => setStep('idle')}
          />
        )}

        {currentStep === 'customer' && (
          <CustomerDataForm 
            initialData={customer}
            onBack={() => setStep('summary')}
            onConfirm={(data) => {
              setCustomer(data)
              setStep('review')
            }}
          />
        )}

        {currentStep === 'review' && catalog && (
          <OrderReview 
            items={items}
            customer={customer}
            models={catalog?.data?.models || []}
            event={catalog.data.event}
            onBack={() => setStep('customer')}
            onSuccess={handleSuccess}
          />
        )}

        {currentStep === 'success' && createdOrder && (
          <OrderSuccess 
            order={createdOrder}
            receiptAccessToken={receiptAccessToken}
            orderViewToken={orderViewToken}
            onNewOrder={handleNewOrder}
          />
        )}
      </main>

      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  )
}
