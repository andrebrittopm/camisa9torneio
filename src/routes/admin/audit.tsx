import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { 
  ClipboardList, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  User,
  Activity,
  Calendar,
  Eye
} from 'lucide-react'
import { checkAdminAuth } from '@/lib/av-admin-auth-bridge.functions'
import { getAdminAuditLogs, getAdminListForFilter } from '@/lib/av-admin-audit.functions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { z } from 'zod'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

const searchSchema = z.object({
  page: z.number().catch(1),
  search: z.string().optional().catch(''),
  adminFilter: z.string().optional().catch('all'),
  actionFilter: z.string().optional().catch('all'),
})

export const Route = createFileRoute('/admin/audit')({
  beforeLoad: async () => {
    const context = await checkAdminAuth();
    if (!context.authenticated || !context.active) {
      throw redirect({ to: '/admin/login' });
    }
  },
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const { search, page, adminFilter, actionFilter } = deps.search
    
    // Prefetch dos logs
    await context.queryClient.ensureQueryData({
      queryKey: ['admin-audit-logs', { page, search, adminFilter, actionFilter }],
      queryFn: () => getAdminAuditLogs({ 
        data: { 
          page, 
          pageSize: 20, 
          search: search || null, 
          adminFilter: adminFilter === 'all' ? null : adminFilter, 
          actionFilter: actionFilter === 'all' ? null : actionFilter
        } 
      })
    })

    // Prefetch da lista de admins para o filtro
    await context.queryClient.ensureQueryData({
      queryKey: ['admin-list-filter'],
      queryFn: () => getAdminListForFilter()
    })
  },
  component: AdminAuditPage,
})

function AdminAuditPage() {
  const { page, search, adminFilter, actionFilter } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [localSearch, setLocalSearch] = useState(search || '')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const { data: auditResponse } = useSuspenseQuery({
    queryKey: ['admin-audit-logs', { page, search, adminFilter, actionFilter }],
    queryFn: () => getAdminAuditLogs({ 
      data: { 
        page, 
        pageSize: 20, 
        search: search || null, 
        adminFilter: adminFilter === 'all' ? null : adminFilter, 
        actionFilter: actionFilter === 'all' ? null : actionFilter
      } 
    })
  })

  const { data: adminList } = useSuspenseQuery({
    queryKey: ['admin-list-filter'],
    queryFn: () => getAdminListForFilter()
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({
      search: (prev) => ({ ...prev, search: localSearch, page: 1 })
    })
  }

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({ ...prev, page: newPage })
    })
  }

  const handleFilterChange = (key: string, value: string) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value, page: 1 })
    })
  }

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    if (action.includes('CANCEL')) return 'text-red-400 bg-red-400/10 border-red-400/20'
    if (action.includes('APPROVE') || action.includes('SUCCESS')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    if (action.includes('REJECT') || action.includes('FAILED')) return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-amber-500" />
            Auditoria
          </h1>
          <p className="text-slate-400 text-sm mt-2">Histórico completo de ações administrativas e alterações no sistema.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest italic">Registros Imutáveis</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar por ação ou ID..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl h-11"
            />
          </div>
          <Button type="submit" className="h-11 bg-white text-black hover:bg-slate-200 rounded-xl px-6 font-bold uppercase text-xs tracking-widest">
            Filtrar
          </Button>
        </form>
      </div>

      {/* Filtros Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Administrador
          </label>
          <Select 
            value={adminFilter || 'all'} 
            onValueChange={(v) => handleFilterChange('adminFilter', v)}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11">
              <SelectValue placeholder="Todos os Admins" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="all">Todos os Admins</SelectItem>
              {adminList?.map(admin => (
                <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            Categoria de Ação
          </label>
          <Select 
            value={actionFilter || 'all'} 
            onValueChange={(v) => handleFilterChange('actionFilter', v)}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11">
              <SelectValue placeholder="Todas as Ações" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="all">Todas as Ações</SelectItem>
              <SelectItem value="auth">Autenticação & Acesso</SelectItem>
              <SelectItem value="order">Gestão de Pedidos</SelectItem>
              <SelectItem value="payment">Pagamentos & Recibos</SelectItem>
              <SelectItem value="cancellation">Cancelamentos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data e Hora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Admin</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Ação</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Recurso</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditResponse.logs.length > 0 ? (
                auditResponse.logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-medium">
                          {format(new Date(log.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-slate-500 text-[10px] font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.createdAt), "HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-slate-300 text-sm">{log.adminDisplayName || 'Sistema / Automático'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                        getActionColor(log.action)
                      )}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.resourceType ? (
                        <div className="flex flex-col">
                          <span className="text-white text-xs font-bold uppercase tracking-widest">
                            {log.resourceType === 'order' ? 'Pedido' : log.resourceType}
                          </span>
                          <span className="text-slate-500 text-[10px] font-mono">
                            {log.resourcePublicId || log.resourceId?.slice(0, 8) || '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum registro encontrado para estes filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {auditResponse.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <p className="text-xs text-slate-500">
              Mostrando <span className="text-white">{auditResponse.logs.length}</span> de <span className="text-white">{auditResponse.totalCount}</span> registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-30 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, auditResponse.totalPages))].map((_, i) => {
                  const pageNum = i + 1; // Simplificado para demo
                  return (
                    <Button
                      key={pageNum}
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "w-8 h-8 p-0 rounded-lg text-xs",
                        page === pageNum ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= auditResponse.totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-30 rounded-xl"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de Detalhes do Log */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="bg-slate-900 border-l border-white/10 w-full sm:max-w-xl overflow-y-auto">
          {selectedLog && (
            <div className="space-y-8 py-6">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                    getActionColor(selectedLog.action)
                  )}>
                    {selectedLog.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <SheetTitle className="text-2xl font-heading font-black uppercase text-white tracking-tight">
                  Detalhes da Ação
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  Registro técnico completo para auditoria forense.
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Data e Hora
                  </p>
                  <p className="text-white text-sm font-medium">
                    {format(new Date(selectedLog.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Executor
                  </p>
                  <p className="text-white text-sm font-medium">
                    {selectedLog.adminDisplayName || 'Sistema'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 border-b border-white/5 pb-2">Identificadores</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ID do Log</p>
                    <p className="text-slate-300 text-[10px] font-mono bg-white/5 p-2 rounded-lg break-all">
                      {selectedLog.id}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Correlation ID</p>
                    <p className="text-slate-300 text-[10px] font-mono bg-white/5 p-2 rounded-lg break-all">
                      {selectedLog.correlationId}
                    </p>
                  </div>
                  {selectedLog.resourceId && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        ID do Recurso ({selectedLog.resourceType})
                      </p>
                      <p className="text-slate-300 text-[10px] font-mono bg-white/5 p-2 rounded-lg break-all">
                        {selectedLog.resourceId}
                        {selectedLog.resourcePublicId && ` (${selectedLog.resourcePublicId})`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 border-b border-white/5 pb-2">Metadados (Payload)</h3>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  onClick={() => setSelectedLog(null)}
                  className="w-full h-12 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                >
                  Fechar Detalhes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
