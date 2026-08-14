/** ARTEFATOS REAIS DA ETAPA 4.1A EXPORTADOS PARA AUDITORIA EXTERNA. NENHUMA NOVA ALTERAÇÃO EXECUTADA. */
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { HeroSection } from '@/components/HeroSection'
import { ModelsSection } from '@/components/ModelsSection'
import { CustomizationPreview } from '@/components/CustomizationPreview'
import { HowItWorks } from '@/components/HowItWorks'
import { FinalCTA } from '@/components/FinalCTA'
import { Footer } from '@/components/Footer'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-gold-500/30">
      <Header />
      <main>
        <HeroSection />
        <ModelsSection />
        <CustomizationPreview />
        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

