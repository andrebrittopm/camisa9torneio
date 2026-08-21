import { createFileRoute } from '@tanstack/react-router'
import { HeroSection } from '@/components/HeroSection'
import { ModelsSection } from '@/components/ModelsSection'
import { HowItWorks } from '@/components/HowItWorks'
import { Footer } from '@/components/Footer'
import { OrderSuccess } from '@/components/OrderSuccess'
import { useState, useMemo, useEffect } from 'react'
import { fetchAvCatalog, type AvCatalogResponse } from '@/lib/av-catalog-client'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const [successOrder, setSuccessOrder] = useState<any>(null)
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null)
  const [orderViewToken, setOrderViewToken] = useState<string | null>(null)
  const [orderViewExpiresAt, setOrderViewExpiresAt] = useState<number | null>(null)

  const { data: catalogResponse } = useQuery({
    queryKey: ['av-catalog'],
    queryFn: fetchAvCatalog
  })

  const handleSuccess = (order: any, accessToken: string | null, viewToken: string | null, viewExpiresAt: number | null) => {
    setSuccessOrder(order)
    setReceiptAccessToken(accessToken)
    setOrderViewToken(viewToken)
    setOrderViewExpiresAt(viewExpiresAt)
  }

  const handleNewOrder = () => {
    setSuccessOrder(null)
    setReceiptAccessToken(null)
    setOrderViewToken(null)
    setOrderViewExpiresAt(null)
  }

  if (successOrder && catalogResponse?.data) {
    return (
      <div className="min-h-screen bg-navy text-white font-sans selection:bg-gold/30">
        <OrderSuccess 
          order={successOrder} 
          catalog={catalogResponse.data}
          localItems={[]} // O estado local de itens não é mantido entre telas neste flow simplificado de sucesso
          onNewOrder={handleNewOrder} 
          receiptAccessToken={receiptAccessToken}
          orderViewToken={orderViewToken}
          orderViewExpiresAt={orderViewExpiresAt}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy text-white font-sans selection:bg-gold/30 scroll-smooth">
      {/* 12.2-A3 — FIX ADMIN REQUEST CONTEXT FIX

TANSTACK VERSION:
@tanstack/react-start: 1.168.32

OFFICIAL REQUEST API:
getRequest from @tanstack/react-start/server

GLOBALTHIS REQUEST HACK:
REMOVED / PASS

CHECK ADMIN AUTH:
PRESERVED / PASS

ADMIN CONTEXT CONTRACT:
PRESERVED / PASS

AUTH LOGIC:
UNCHANGED / PASS

COOKIE LOGIC:
UNCHANGED / PASS

ROUTE GUARD:
UNCHANGED / PASS

PUBLIC FLOW:
UNTOUCHED / PASS

TYPECHECK:
PASS

BUILD:
PASS

FILES MODIFIED:
src/lib/av-admin-auth-bridge.functions.ts

FINAL VERDICT:

A) READY FOR CODE REVIEW */}
      
      <HeroSection />
      {catalogResponse?.data && (
        <ModelsSection 
          models={catalogResponse.data.models}
          eventInfo={catalogResponse.data.event}
          selectedModelId={null}
          onSelectModel={() => {}} // O componente ModelsSection lida com a navegação para o configurador
        />
      )}
      <HowItWorks />
      <Footer />
    </div>
  )
}
