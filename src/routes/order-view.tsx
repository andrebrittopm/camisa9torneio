import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, AlertCircle, ShoppingBag, Clock, CheckCircle2, Truck, XCircle, Shirt, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/order-view')({
  validateSearch: (search: Record<string, unknown>) => ({
    handle: search['handle'] as string,
    token: search['token'] as string,
    expires: search['expires'] as string,
  }),
  component: OrderViewPage,
})

async function fetchOrderData(handle: string, token: string, expires: string) {
  const params = new URLSearchParams({ handle, token, expires })
  const res = await fetch(`/api/public/av-order-view?${params.toString()}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Erro ao carregar pedido')
  }
  return res.json()
}

function OrderViewPage() {
  const search = Route.useSearch() as any
  const handle = search['handle']
  const token = search['token']
  const expires = search['expires']
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-order-view', handle],
    queryFn: () => fetchOrderData(handle, token, expires),
    retry: false
  })

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const ORDER_STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
    received: { label: "PEDIDO RECEBIDO", icon: ShoppingBag, color: "text-blue-400" },
    confirmed: { label: "PEDIDO CONFIRMADO", icon: CheckCircle2, color: "text-emerald-400" },
    in_production: { label: "EM PRODUÇÃO", icon: Clock, color: "text-gold" },
    ready: { label: "PRONTO PARA RETIRADA", icon: CheckCircle2, color: "text-emerald-400" },
    delivered: { label: "ENTREGUE", icon: Truck, color: "text-blue-400" },
    cancelled: { label: "CANCELADO", icon: XCircle, color: "text-rose-400" },
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Verificando Acesso...</p>
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-black uppercase text-white">Acesso Negado ou Expirado</h1>
          <p className="text-slate-400 text-sm max-w-xs">
            {error instanceof Error ? error.message : 'Este link de visualização não é mais válido ou o pedido não existe.'}
          </p>
        </div>
        <Button asChild variant="outline" className="border-white/10 text-white rounded-2xl h-14 px-8 uppercase font-black">
          <Link to="/">Voltar para o Início</Link>
        </Button>
      </div>
    )
  }

  const order = data.order
  const statusInfo = (ORDER_STATUS_MAP[order.order_status] || ORDER_STATUS_MAP['received'])!;

  return (
    <div className="min-h-screen bg-navy text-white selection:bg-gold selection:text-navy pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="text-center">
             <span className="block text-[8px] text-gold font-black uppercase tracking-[0.3em]">Status do Pedido</span>
             <span className="block font-mono text-xs">{order.display_order_number}</span>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>
      </header>

      <main className="pt-32 px-6 max-w-4xl mx-auto space-y-8">
        {/* Status Hero */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[48px] p-8 md:p-12 text-center space-y-8 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className={cn("w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10", statusInfo.color)}>
            <statusInfo.icon className="w-10 h-10" />
          </div>

          <div className="space-y-4 relative">
            <h2 className="text-4xl md:text-6xl font-heading font-black uppercase tracking-tighter">
              {statusInfo.label}
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Olá <span className="text-white font-bold">{order.customer_name}</span>, 
              seu pedido está em nossa base e sendo processado conforme o cronograma oficial.
            </p>
          </div>

          <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Pagamento</span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                order.payment_status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}>
                {order.payment_status === 'paid' ? 'Confirmado' : 'Pendente / Em Análise'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Total</span>
              <span className="text-xl font-heading font-black text-gold">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Items Summary */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
              <Shirt className="w-3 h-3" /> Resumo da Configuração
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-heading font-black uppercase text-white">{item.model_name}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{item.shirt_type} • TAMANHO {item.size_option}</p>
                  </div>
                  
                  {(item.custom_name || item.custom_number) && (
                    <div className="flex gap-4">
                      {item.custom_name && (
                        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                          <span className="block text-[8px] text-slate-500 font-black uppercase mb-1">NOME</span>
                          <span className="text-xs font-black text-gold uppercase">{item.custom_name}</span>
                        </div>
                      )}
                      {item.custom_number && (
                        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                          <span className="block text-[8px] text-slate-500 font-black uppercase mb-1">NÚMERO</span>
                          <span className="text-xs font-black text-gold">{item.custom_number}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Quantidade</span>
                  <span className="text-2xl font-heading font-black text-white">{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center p-8 border border-white/5 rounded-[32px] bg-white/[0.01]">
          <p className="text-xs text-slate-400 leading-relaxed italic">
            Este é um link de visualização segura. Para sua segurança, ele expira periodicamente. <br/>
            Dúvidas? Entre em contato com a organização do torneio.
          </p>
        </div>
      </main>
    </div>
  )
}
