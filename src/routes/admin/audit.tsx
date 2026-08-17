import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '@/lib/server/av-admin-auth.server'

export const Route = createFileRoute('/admin/audit')({
  beforeLoad: async ({ request }) => {
    await requireAdmin(request)
  },
  component: AdminAuditPage,
})

function AdminAuditPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-white">Auditoria</h1>
        <p className="text-slate-400 text-sm mt-2">Histórico de ações administrativas do sistema.</p>
        <div className="mt-4 inline-block px-3 py-1 bg-white/5 border border-white/5 rounded-full">
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest italic">Os registros de auditoria são somente leitura.</p>
        </div>
      </div>
      <div className="p-12 text-center border border-dashed border-white/10 rounded-[32px] text-slate-500 font-medium">
        Em construção: Listagem paginada de av_admin_audit_logs.
      </div>
    </div>
  )
}
