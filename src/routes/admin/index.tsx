import { createFileRoute, redirect } from '@tanstack/react-router'
import { LayoutDashboard, ShoppingBag, Receipt, Users, History, ArrowRight, Shield } from 'lucide-react'
import { checkAdminAuth } from '@/lib/server/av-admin-auth-bridge.functions'

export const Route = createFileRoute('/admin/')({
  beforeLoad: async () => {
    // Usamos a bridge function (Server Function) para evitar violação de import-protection
    const context = await checkAdminAuth();
    
    if (!context.authenticated || !context.active) {
      console.warn(`[AV-ADMIN-GUARD] Redirecting to login.`);
      throw redirect({
        to: '/admin/login',
      });
    }

    return {
      adminContext: context
    };
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const stats = [
    { label: 'Total Pedidos', value: '---', icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'Aguardando Pagto', value: '---', icon: Receipt, color: 'text-gold' },
    { label: 'Administradores', value: '---', icon: Users, color: 'text-purple-500' },
    { label: 'Audit Logs (24h)', value: '---', icon: History, color: 'text-slate-500' },
  ]

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[10px] text-gold font-black uppercase tracking-[0.4em] mb-3">Dashboard Base</h2>
          <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tight text-white">Visão Geral</h1>
        </div>
        <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-xl">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Estado do Sistema:</span>
          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest ml-2">Operacional</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4">
            <div className={cn("p-3 rounded-2xl bg-white/5 w-fit", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-heading font-black mt-1 text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-10 bg-white/[0.02] border border-white/5 rounded-[40px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-royal/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-6">
            <h3 className="text-xl font-heading font-black uppercase tracking-tight text-white">Painel em Construção</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              A infraestrutura de autenticação e segurança (Etapa 5.1A) foi estabelecida. 
              Os módulos de gestão de pedidos, pagamentos e auditoria real serão habilitados nas próximas sub-etapas.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                Auth: OK
              </div>
              <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                Audit Log: OK
              </div>
              <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                RLS Hardening: OK
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-gold/5 border border-gold/10 rounded-[40px] flex flex-col justify-between group cursor-help">
          <div className="space-y-4">
             <Shield className="w-10 h-10 text-gold" />
             <h3 className="text-xl font-heading font-black uppercase tracking-tight text-gold">Segurança</h3>
             <p className="text-gold/60 text-sm leading-relaxed">
               Sua sessão é protegida por cookies HttpOnly e validação server-side em tempo real.
             </p>
          </div>
          <div className="pt-8 flex items-center text-gold font-black uppercase tracking-widest text-[10px] gap-2">
            Saiba mais <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
