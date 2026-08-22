import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Clock,
  AlertCircle,
  Trash2
} from 'lucide-react'

import { checkAdminAuth } from '@/lib/av-admin-auth-bridge.functions'
import { getAdminOrders } from '@/lib/av-admin-orders.functions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { z } from 'zod'
import { AdminStatusBadge } from '@/utils/av-admin-status-mapper'
import { AdminDeleteOrderModal } from '@/components/AdminDeleteOrderModal'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'


const searchSchema = z.object({
  page: z.number().catch(1),
  search: z.string().optional().catch(''),
  paymentFilter: z.string().optional().catch('all'),
  orderFilter: z.string().optional().catch('all'),
})

export const Route = createFileRoute('/admin/orders')({
  beforeLoad: async () => {
    const context = await checkAdminAuth();
    if (!context.authenticated || !context.active) {
      throw redirect({ to: '/admin/login' });
    }
  },
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const { search, page, paymentFilter, orderFilter } = deps.search
    await context.queryClient.ensureQueryData({
      queryKey: ['admin-orders', { page, search, paymentFilter, orderFilter }],
      queryFn: () => getAdminOrders({ 
        data: { 
          page, 
          pageSize: 20, 
          search: search || null, 
          paymentFilter: paymentFilter === 'all' ? null : paymentFilter, 
          orderFilter: orderFilter === 'all' ? null : orderFilter,
          sortOrder: 'desc'
        } 
      })
    })
  },
  component: AdminOrdersPage,
})

function AdminOrdersPage() {
  const { authenticated, active, role } = Route.useRouteContext() as any
  const isSuperAdmin = role === 'SUPERADMIN' && active === true;
  const { page, search, paymentFilter, orderFilter } = Route.useSearch()

  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const [deletingOrder, setDeletingOrder] = useState<{ id: string, code: string } | null>(null)

  const { data: result, refetch } = useSuspenseQuery({

    queryKey: ['admin-orders', { page, search, paymentFilter, orderFilter }],
    queryFn: () => getAdminOrders({ 
      data: { 
        page, 
        pageSize: 20, 
        search: search || null, 
        paymentFilter: paymentFilter === 'all' ? null : paymentFilter, 
        orderFilter: orderFilter === 'all' ? null : orderFilter,
        sortOrder: 'desc'
      } 
    })
  })

  const handleSearch = (val: string) => {
    navigate({
      search: (prev: any) => ({ ...prev, search: val || undefined, page: 1 })
    })
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {deletingOrder && (
        <AdminDeleteOrderModal
          orderId={deletingOrder.id}
          orderCode={deletingOrder.code}
          isOpen={!!deletingOrder}
          onClose={() => setDeletingOrder(null)}
          onSuccess={async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            refetch();
          }}
        />
      )}
      <div className="flex flex-col gap-6">

        <h1 className="text-4xl font-heading font-black uppercase tracking-tight text-white">Pedidos</h1>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Buscar por AV-2026-XXXX, nome ou WhatsApp..."
              defaultValue={search}
              onBlur={(e) => handleSearch(e.target.value)}
              className="pl-12 bg-white/[0.02] border-white/5 rounded-2xl h-12"
            />
          </div>
          <Select value={paymentFilter || 'all'} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, paymentFilter: v, page: 1 }) })}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/[0.02] border-white/5 rounded-2xl h-12">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Pagamentos</SelectItem>
              <SelectItem value="awaiting_payment">Aguardando pagamento</SelectItem>
              <SelectItem value="receipt_submitted">Comprovante em análise</SelectItem>
              <SelectItem value="payment_confirmed">Pagamento confirmado</SelectItem>
              <SelectItem value="receipt_rejected">Comprovante rejeitado</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={orderFilter || 'all'} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, orderFilter: v, page: 1 }) })}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/[0.02] border-white/5 rounded-2xl h-12">
              <SelectValue placeholder="Status Pedido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="received">Recebido</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="in_production">Em Produção</SelectItem>
              <SelectItem value="ready">Pronto</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {result.orders.length === 0 ? (
        <div className="py-24 text-center border border-white/5 rounded-[40px] bg-white/[0.02] space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-700 mx-auto" />
          <p className="text-slate-500 font-medium italic">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hidden lg:block overflow-x-auto bg-white/[0.02] border border-white/5 rounded-[32px] p-2">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                  <th className="p-6">Pedido</th>
                  <th className="p-6">Cliente</th>
                  <th className="p-6">Qtd</th>
                  <th className="p-6">Valor</th>
                  <th className="p-6">Pagamento</th>
                  <th className="p-6">Pedido</th>
                  <th className="p-6">Data</th>
                  <th className="p-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {result.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.04] transition-colors group">
                    <td className="p-6 font-mono text-gold text-sm">{o.publicId}</td>
                    <td className="p-6 font-bold text-white">{o.customerName}</td>
                    <td className="p-6 text-slate-300">{o.itemCount}</td>
                    <td className="p-6 text-white font-bold">{formatCurrency(o.totalAmount)}</td>
                    <td className="p-6">
                      <AdminStatusBadge status={o.paymentStatus} type="payment" />
                    </td>
                    <td className="p-6">
                       <AdminStatusBadge status={o.orderStatus} type="order" />
                    </td>
                    <td className="p-6 text-slate-500 text-[10px] font-mono">{format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gold hover:text-gold hover:bg-gold/5" 
                          onClick={() => navigate({ to: '/admin/orders/$orderId', params: { orderId: o.id }, search: { page, search, paymentFilter, orderFilter } })}
                        >
                          Detalhes <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Excluir pedido ${o.publicId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingOrder({ id: o.id, code: o.publicId });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="lg:hidden grid gap-4">
            {result.orders.map((o) => (
              <div key={o.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-gold">{o.publicId}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <div>
                  <p className="font-bold text-white">{o.customerName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{o.whatsapp}</p>
                </div>
                <div className="flex justify-between text-sm py-2 border-y border-white/5">
                   <span className="text-slate-400">Total: ({o.itemCount} camisas)</span>
                   <span className="font-bold text-white">{formatCurrency(o.totalAmount)}</span>
                </div>
                <div className="flex gap-2">
                   <div className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Pagamento</p>
                      <AdminStatusBadge status={o.paymentStatus} type="payment" className="text-[7px] px-2 py-0" />
                   </div>
                   <div className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Pedido</p>
                      <AdminStatusBadge status={o.orderStatus} type="order" className="text-[7px] px-2 py-0" />
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-[2] bg-gold text-navy font-black uppercase tracking-widest text-[10px]" onClick={() => navigate({ to: '/admin/orders/$orderId', params: { orderId: o.id }, search: { page, search, paymentFilter, orderFilter } })}>
                    Ver Detalhes
                  </Button>
                  {isSuperAdmin && (
                    <Button 
                      variant="outline"
                      className="flex-1 border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white"
                      onClick={() => setDeletingOrder({ id: o.id, code: o.publicId })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-8">
           <Button 
            variant="outline"
            className="border-white/5 bg-white/5"
            disabled={page === 1} 
            onClick={() => navigate({ search: (p: any) => ({ ...p, page: page - 1 }) })}
           >
            <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
           </Button>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Página {page} de {result.totalPages}</span>
           <Button 
            variant="outline"
            className="border-white/5 bg-white/5"
            disabled={page === result.totalPages} 
            onClick={() => navigate({ search: (p: any) => ({ ...p, page: page + 1 }) })}
           >
            Próxima <ChevronRight className="w-4 h-4 ml-2" />
           </Button>
        </div>
      )}
    </div>
  )
}
