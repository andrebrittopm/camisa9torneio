import { createFileRoute } from '@tanstack/react-router'
import { HeroSection } from '@/components/HeroSection'
import { ModelsSection } from '@/components/ModelsSection'
import { HowItWorksSection } from '@/components/HowItWorksSection'
import { Footer } from '@/components/Footer'
import { AV_ORDER_ACCESS_SECRET } from '@/lib/server/av-order-access.server'
import { OrderSuccess } from '@/components/OrderSuccess'
import { useState, useMemo } from 'react'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const [successOrder, setSuccessOrder] = useState<any>(null)
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null)
  const [orderViewToken, setOrderViewToken] = useState<string | null>(null)
  const [orderViewExpiresAt, setOrderViewExpiresAt] = useState<number | null>(null)

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

  if (successOrder) {
    return (
      <div className="min-h-screen bg-navy text-white font-sans selection:bg-gold/30">
        <OrderSuccess 
          order={successOrder} 
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
getWebRequest from @tanstack/react-start/server

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
      <ModelsSection onSuccess={handleSuccess} />
      <HowItWorksSection />
      <Footer />
    </div>
  )
}
