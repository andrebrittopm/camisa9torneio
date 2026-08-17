import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { 
  ShoppingBag, 
  Receipt, 
  ArrowRight, 
  Shield, 
  Shirt, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle,
  AlertCircle
} from 'lucide-react'
import { checkAdminAuth } from '@/lib/av-admin-auth-bridge.functions'
import { getAdminDashboardStats } from '@/lib/av-admin-stats.functions'
import { useSuspenseQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/admin/')({
  beforeLoad: async () => {
    // RPC Bridge para evitar import-protection violation no bundle client
    const context = await checkAdminAuth();
    
    if (!context.authenticated || !context.active) {
      console.warn('[AV-ADMIN-GUARD] Unauthorized, redirecting to /admin/login. Context:', JSON.stringify(context));
      throw redirect({
        to: '/admin/login',
      });
    }

    return {
      adminContext: context
    };
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['admin-stats'],
      queryFn: () => getAdminDashboardStats()
    })
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: stats } = useSuspenseQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getAdminDashboardStats()
  })

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const mainStats = [
    { label: 'Total Pedidos', value: stats.totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'Aguardando Pagto', value: stats.awaitingPayment.toString(), icon: Clock, color: 'text-gold' },
    { label: 'Em Análise (Rec.)', value: stats.receiptsPending.toString(), icon: Receipt, color: 'text-purple-500' },
    { label: 'Pagos / Confirmados', value: stats.paymentsConfirmed.toString(), icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Camisas Vendidas', value: stats.shirtsSold.toString(), icon: Shirt, color: 'text-sky-400' },
    { label: 'Valor Total', value: formatCurrency(stats.totalOrderValue), icon: TrendingUp, color: 'text-slate-400' },
  ]

  const operationalStats = [
    { label: 'Em Produção', value: stats.inProduction, icon: Clock, color: 'text-amber-500' },
    { label: 'Prontos', value: stats.ready, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Entregues', value: stats.delivered, icon: Truck, color: 'text-blue-400' },
    { label: 'Cancelados', value: stats.cancelled, icon: XCircle, color: 'text-rose-500' },
  ]

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[10px] text-gold font-black uppercase tracking-[0.4em] mb-3">Painel Real</h2>
          <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tight text-white">Visão Geral</h1>
        </div>
        <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-xl">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Valor Confirmado:</span>
          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest ml-2">{formatCurrency(stats.confirmedValue)}</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {mainStats.map((stat) => (
          <div key={stat.label} className="p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4 hover:bg-white/[0.04] transition-colors">
            <div className={cn("p-2.5 rounded-xl bg-white/5 w-fit", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-heading font-black mt-1 text-white truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading font-black uppercase tracking-tight text-white">Pedidos Recentes</h3>
            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-400 font-black uppercase tracking-widest">
              Últimos 10
            </div>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-slate-500 font-medium italic">Nenhum pedido registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8 px-8">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                    <th className="pb-4 pl-4">Nº</th>
                    <th className="pb-4">Cliente</th>
                    <th className="pb-4">Qtd</th>
                    <th className="pb-4">Valor</th>
                    <th className="pb-4">Status Pgto</th>
                    <th className="pb-4 pr-4 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="group transition-colors">
                      <td className="py-4 pl-4 bg-white/[0.03] rounded-l-2xl border-y border-l border-white/5 group-hover:bg-white/[0.06] transition-colors font-mono text-xs text-gold">
                        #{order.orderSeq.toString().padStart(4, '0')}
                      </td>
                      <td className="py-4 bg-white/[0.03] border-y border-white/5 group-hover:bg-white/[0.06] transition-colors font-bold text-white">
                        {order.customerName}
                      </td>
                      <td className="py-4 bg-white/[0.03] border-y border-white/5 group-hover:bg-white/[0.06] transition-colors text-slate-400">
                        {order.itemCount}
                      </td>
                      <td className="py-4 bg-white/[0.03] border-y border-white/5 group-hover:bg-white/[0.06] transition-colors text-white">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-4 bg-white/[0.03] border-y border-white/5 group-hover:bg-white/[0.06] transition-colors">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                           order.paymentStatus === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                           order.paymentStatus === 'pending' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                           "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                         )}>
                           {order.paymentStatus === 'paid' ? 'Pago' : order.paymentStatus === 'pending' ? 'Pendente' : order.paymentStatus}
                         </span>
                      </td>
                      <td className="py-4 pr-4 bg-white/[0.03] rounded-r-2xl border-y border-r border-white/5 group-hover:bg-white/[0.06] transition-colors text-right text-[10px] text-slate-500 font-mono">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Resumo */}
        <div className="space-y-6">
          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
             <h3 className="text-xl font-heading font-black uppercase tracking-tight text-white">Status Operacional</h3>
             <div className="grid grid-cols-2 gap-4">
               {operationalStats.map((stat) => (
                 <div key={stat.label} className="p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3">
                    <div className={cn("p-2 rounded-lg bg-white/5 w-fit", stat.color)}>
                      <stat.icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
                      <p className="text-2xl font-heading font-black text-white">{stat.value}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <Link 
            to="/admin/orders" 
            search={{ page: 1 }}
            className="p-8 bg-gold/5 border border-gold/10 rounded-[40px] flex flex-col justify-between group cursor-pointer hover:bg-gold/10 transition-all"
          >
            <div className="space-y-4">
               <Shield className="w-10 h-10 text-gold" />
               <h3 className="text-xl font-heading font-black uppercase tracking-tight text-gold">Gestão de Pedidos</h3>
               <p className="text-gold/60 text-sm leading-relaxed">
                 Acesse a listagem completa para aprovar pagamentos e gerenciar status de produção.
               </p>
            </div>
            <div className="pt-8 flex items-center text-gold font-black uppercase tracking-widest text-[10px] gap-2">
              Ver todos os pedidos <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
