import { createFileRoute } from '@tanstack/react-router'
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

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [catalog, setCatalog] = useState<AvCatalogResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<AvShirtModel | null>(null)
  const [view, setView] = useState<'config' | 'review' | 'success'>('config')
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [receiptAccessToken, setReceiptAccessToken] = useState<string | null>(null)
  const [orderViewToken, setOrderViewToken] = useState<string | null>(null)


  const {
    items,
    customer,
    setCustomer,
    editingItemId,
    setEditingItemId,
    addItem,
    removeItem,
    updateItem,
    clearOrder,
  } = useOrderState();

  const handleClearAll = useCallback(() => {
    clearOrder();
    setReceiptAccessToken(null);
    setOrderViewToken(null);
  }, [clearOrder]);


  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchAvCatalog()
      setCatalog(response.data)
      
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

  const editingItem = useMemo(() => 
    items.find(i => i.local_id === editingItemId) || null
  , [items, editingItemId]);

  const isContinueEnabled = customer.name.trim() !== '' && 
    customer.whatsapp.replace(/\D/g, '').length >= 10 && 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) &&
    items.length > 0 && 
    catalog?.event.orders_available === true;

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
        {view === 'config' ? (
          <>
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
                
                <section id="pedido" className="py-24 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-royal/5 blur-[120px] rounded-full pointer-events-none" />
                  <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                      <CustomizationPreview 
                        selectedModel={selectedModel}
                        eventInfo={catalog.event}
                        customName={editingItem?.custom_name ?? null}
                        customNumber={editingItem?.custom_number ?? null}
                      />
                      
                      <div className="space-y-12">
                        <OrderConfigurator 
                          selectedModel={selectedModel}
                          eventInfo={catalog.event}
                          onAddItem={addItem}
                          editingItem={editingItem}
                          onUpdateItem={(id, data) => {
                            updateItem(id, data);
                            setEditingItemId(null);
                          }}
                          onCancelEdit={() => setEditingItemId(null)}
                          onModelChange={setSelectedModel}
                        />

                        <CustomerDataForm 
                          data={customer}
                          onChange={setCustomer}
                          disabled={!catalog.event.orders_available}
                        />

                        <OrderItemsSummary 
                          items={items}
                          eventInfo={catalog.event}
                          onRemove={removeItem}
                          onEdit={setEditingItemId}
                        />

                        <div className="pt-8">
                          <Button
                            size="lg"
                            disabled={!isContinueEnabled}
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              setView('review');
                            }}
                            className={cn(
                              "w-full h-20 text-xl font-black uppercase tracking-widest rounded-[24px] transition-all duration-500",
                              isContinueEnabled ? "glow-gold" : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                            )}
                          >
                            Continuar Pedido
                            <ArrowRight className="w-6 h-6 ml-3" />
                          </Button>
                          {!isContinueEnabled && catalog.event.orders_available && (
                            <p className="text-center text-[10px] text-ice/30 uppercase font-black tracking-widest mt-4">
                              Preencha seus dados e adicione pelo menos um item
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            <HowItWorks />
            <FinalCTA />
          </>
        ) : view === 'review' ? (
          <div className="py-24">
            {catalog && (
              <OrderReview 
                customer={customer}
                items={items}
                eventInfo={catalog.event}
                onBack={() => setView('config')}
                onSuccess={(order, rToken, vToken) => {
                  setCreatedOrder(order);
                  setReceiptAccessToken(rToken);
                  setOrderViewToken(vToken);
                  setView('success');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}

              />
            )}
          </div>
        ) : (
          <div className="py-24">
            {catalog && createdOrder && (
              <OrderSuccess 
                order={createdOrder}
                catalog={catalog}
                localItems={items}
                receiptAccessToken={receiptAccessToken}
                orderViewToken={orderViewToken}

                onStatusUpdate={(pStatus, rStatus) => {
                  setCreatedOrder((prev: any) => ({
                    ...prev,
                    payment_status: pStatus,
                    review_status: rStatus
                  }));
                }}
                onNewOrder={() => {
                  if (confirm("Deseja iniciar um novo pedido?")) {
                    handleClearAll();
                    setCreatedOrder(null);
                    setView('config');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              />
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
