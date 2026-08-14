/** ETAPA 4.1B — INTEGRAÇÃO DO CATÁLOGO REAL COM A LANDING */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/Header'
import { HeroSection } from '@/components/HeroSection'
import { ModelsSection } from '@/components/ModelsSection'
import { CustomizationPreview } from '@/components/CustomizationPreview'
import { HowItWorks } from '@/components/HowItWorks'
import { FinalCTA } from '@/components/FinalCTA'
import { Footer } from '@/components/Footer'
import { fetchAvCatalog, type AvCatalogResponse, type AvShirtModel } from '@/lib/av-catalog-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCcw } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [catalog, setCatalog] = useState<AvCatalogResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<AvShirtModel | null>(null)

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchAvCatalog()
      setCatalog(response.data)
      
      // Seleção automática do primeiro modelo (prioridade tshirt)
      const initialModel = response.data.models.find(m => m.category === 'tshirt') || response.data.models[0]
      if (initialModel) {
        setSelectedModel(initialModel)
      }
    } catch (err) {
      console.error('[AV-FRONTEND] Erro ao carregar catálogo:', err)
      setError('Não foi possível carregar os modelos agora.')
      toast.error('Erro de conexão com o catálogo.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-6">
        <div className="p-8 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] max-w-md w-full text-center">
          <h2 className="text-2xl font-heading font-black uppercase mb-4 tracking-tight">{error}</h2>
          <Button 
            onClick={loadCatalog}
            className="glow-gold font-black uppercase tracking-widest gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-gold-500/30">
      <Header />
      <main>
        <HeroSection />
        
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-gold animate-spin mb-4" />
            <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px]">Carregando Catálogo...</span>
          </div>
        ) : catalog ? (
          <>
            <ModelsSection 
              models={catalog.models}
              selectedModelId={selectedModel?.id || null}
              onSelectModel={setSelectedModel}
              eventInfo={catalog.event}
            />
            <CustomizationPreview 
              selectedModel={selectedModel}
              eventInfo={catalog.event}
            />
          </>
        ) : null}

        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

