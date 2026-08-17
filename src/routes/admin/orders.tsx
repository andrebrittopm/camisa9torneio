import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Clock 
} from 'lucide-react'
import { checkAdminAuth } from '@/lib/av-admin-auth-bridge.functions'
import { getAdminOrders } from '@/lib/av-admin-orders.functions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/orders')({
  beforeLoad: async () => {
    const context = await checkAdminAuth();
    if (!context.authenticated || !context.active) {
      throw redirect({ to: '/admin/login' });
    }
  },
  loader: ({ search }) => ({
    page: Number(search.page) || 1,
    search: search.search || '',
    paymentFilter: search.paymentFilter || 'all',
    orderFilter: search.orderFilter || 'all',
  }),
  validateSearch: (search: any) => ({
    page: Number(search.page) || 1,
    search: search.search as string | undefined,
    paymentFilter: search.paymentFilter as string | undefined,
    orderFilter: search.orderFilter as string | undefined,
  }),
  component: AdminOrdersPage,
})

function AdminOrdersPage() {
  const { page, search, paymentFilter, orderFilter } = Route.useSearch()
  const navigate = useNavigate()

  const { data: result } = useSuspenseQuery({
    queryKey: ['admin-orders', { page, search, paymentFilter, orderFilter }],
    queryFn: () => getAdminOrders({ page, search, paymentFilter, orderFilter })
  })

  const handleSearch = (val: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: val, page: 1 })
    })
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
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
          <Select defaultValue={paymentFilter} onValueChange={(v) => navigate({ search: (p) => ({ ...p, paymentFilter: v, page: 1 }) })}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/[0.02] border-white/5 rounded-2xl h-12">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Pagamentos</SelectItem>
              <SelectItem value="awaiting">Aguardando</SelectItem>
              <SelectItem value="paid">Confirmado</SelectItem>
              <SelectItem value="receipt_sent">Em Análise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {result.orders.length === 0 ? (
        <div className="py-24 text-center border border-white/5 rounded-[40px] bg-white/[0.02]">
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
                  <th className="p-6">Data</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {result.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="p-6 font-mono text-gold text-sm">{o.publicId}</td>
                    <td className="p-6 font-bold">{o.customerName}</td>
                    <td className="p-6">{o.itemCount}</td>
                    <td className="p-6">{formatCurrency(o.totalAmount)}</td>
                    <td className="p-6">
                      <span className={cn("px-2 py-1 rounded-full text-[9px] uppercase font-bold", o.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-300')}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="p-6 text-slate-500 text-xs">{format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                    <td className="p-6 text-right">
                      <Button variant="ghost" className="text-gold" onClick={() => navigate({ to: '/admin/orders/$orderId', params: { orderId: o.id } })}>
                        Ver <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
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
                  <span className="text-xs text-slate-500">{format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <p className="font-bold">{o.customerName}</p>
                <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Total:</span>
                   <span className="font-bold">{formatCurrency(o.totalAmount)}</span>
                </div>
                <Button className="w-full" onClick={() => navigate({ to: '/admin/orders/$orderId', params: { orderId: o.id } })}>
                  Ver Detalhes
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-8">
           <Button disabled={page === 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}><ChevronLeft /></Button>
           <span className="text-sm font-bold">Página {page} de {result.totalPages}</span>
           <Button disabled={page === result.totalPages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}><ChevronRight /></Button>
        </div>
      )}
    </div>
  )
}
