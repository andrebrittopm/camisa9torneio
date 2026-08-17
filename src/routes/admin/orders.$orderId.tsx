import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  ShoppingBag, 
  User, 
  Package, 
  CreditCard,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  FileText,
  Eye,
  FileIcon,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

import { checkAdminAuth } from '@/lib/av-admin-auth-bridge.functions'
import { getAdminOrderDetail, getAdminReceiptViewUrl, reviewAdminReceipt } from '@/lib/av-admin-orders.functions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'


export const Route = createFileRoute('/admin/orders/$orderId')({
  beforeLoad: async () => {
    const context = await checkAdminAuth();
    if (!context.authenticated || !context.active) {
      throw redirect({ to: '/admin/login' });
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['admin-order-detail', params.orderId],
      queryFn: () => getAdminOrderDetail({ data: { orderId: params.orderId } })
    })
  },
  component: AdminOrderDetailPage,
})

function AdminOrderDetailPage() {
  const { orderId } = Route.useParams()
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; type: string } | null>(null)
  const [isGeneratingUrl, setIsGeneratingUrl] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState<string | null>(null)
  const [confirmingApproval, setConfirmingApproval] = useState<string | null>(null)
  const [rejectingReceipt, setRejectingReceipt] = useState<{ id: string, reason: string, notes: string } | null>(null)
  
  const { data: order, refetch } = useSuspenseQuery({
    queryKey: ['admin-order-detail', orderId],
    queryFn: () => getAdminOrderDetail({ data: { orderId } })
  })

  const getReceiptUrl = useServerFn(getAdminReceiptViewUrl)
  const reviewReceipt = useServerFn(reviewAdminReceipt)



  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleReview = async (receiptId: string, action: 'approve' | 'reject', reason?: string, notes?: string) => {
    try {
      setIsReviewing(receiptId);
      const res = await reviewReceipt({
        data: {
          orderId,
          receiptId,
          action,
          reason,
          notes
        }
      });

      if (res.success) {
        toast.success(action === 'approve' ? 'Pagamento aprovado com sucesso!' : 'Comprovante rejeitado.');
        setConfirmingApproval(null);
        setRejectingReceipt(null);
        await refetch();
      } else {
        toast.error(`Erro: ${res.code || 'Não foi possível completar a ação.'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao processar a revisão.');
    } finally {
      setIsReviewing(null);
    }
  };


  if (!order) {
    return (
      <div className="py-24 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-heading font-black text-white uppercase">Pedido não encontrado</h2>
        <Link to="/admin/orders" search={{ page: 1 }}>
          <Button variant="ghost" className="text-gold">
            <ArrowLeft className="mr-2 w-4 h-4" /> Voltar para listagem
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <Link to="/admin/orders" search={{ page: 1 }}>
          <Button variant="ghost" className="text-slate-400 hover:text-white">
            <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
          </Button>
        </Link>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Identificador Interno:</span>
          <span className="text-[10px] text-white font-mono ml-2">{order.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-8">
          {/* Header Info */}
          <section className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-[10px] text-gold font-black uppercase tracking-[0.4em] mb-2">Detalhes do Pedido</h2>
                  <h1 className="text-3xl font-heading font-black text-white uppercase">{order.publicId}</h1>
                </div>
                <div className="flex gap-2">
                   <span className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400"
                  )}>
                    {order.orderStatus}
                  </span>
                   <span className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                    order.paymentStatus === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  )}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Items Section */}
          <section className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-gold" />
              <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Itens do Pedido</h3>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-lg">{item.modelName}</h4>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{item.shirtType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gold font-black">{item.quantity}x</p>
                      <p className="text-xs text-slate-500">{formatCurrency(item.unitPrice)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">Tamanho</p>
                      <p className="text-xs text-white font-bold">{item.sizeOption === 'OUTRO' ? item.customSize : item.sizeOption}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">Nome</p>
                      <p className="text-xs text-white font-bold">{item.customName || 'Sem personalização'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">Número</p>
                      <p className="text-xs text-white font-bold font-mono">{item.customNumber || 'Sem número'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-slate-500 font-black uppercase">Subtotal</p>
                      <p className="text-xs text-white font-bold">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col items-end space-y-2">
               <div className="flex justify-between w-full max-w-xs text-sm">
                  <span className="text-slate-500 uppercase font-black text-[10px] tracking-widest">Subtotal</span>
                  <span className="text-white font-bold">{formatCurrency(order.summary.subtotal)}</span>
               </div>
               <div className="flex justify-between w-full max-w-xs text-xl">
                  <span className="text-gold uppercase font-black tracking-widest">Total</span>
                  <span className="text-white font-black">{formatCurrency(order.summary.totalAmount)}</span>
               </div>
            </div>
          </section>

          {/* Customer Info */}
          <section className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gold" />
              <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Dados do Cliente</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <User className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">Nome Completo</p>
                      <p className="text-sm text-white font-bold">{order.customer.name}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Phone className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">WhatsApp</p>
                      <p className="text-sm text-white font-bold font-mono">{order.customer.whatsapp}</p>
                    </div>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Mail className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">E-mail</p>
                      <p className="text-sm text-white font-bold truncate">{order.customer.email}</p>
                    </div>
                 </div>
                 {order.notes && (
                   <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <FileText className="w-4 h-4 text-slate-500 mt-1" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase">Observações</p>
                        <p className="text-sm text-white italic">{order.notes}</p>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           {/* Info Sidebar Section */}
           <section className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gold" />
                <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Fluxo</h3>
              </div>
              <div className="space-y-6">
                 <div>
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Criado em</p>
                    <p className="text-sm text-white font-mono">{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                 </div>
                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck className="w-3 h-3 text-emerald-500" />
                       <span className="text-[8px] text-emerald-500 font-black uppercase">Segurança</span>
                    </div>
                    <p className="text-[9px] text-emerald-500/60 leading-relaxed italic">
                      Todos os dados foram validados e processados em ambiente seguro.
                    </p>
                 </div>
              </div>
           </section>

           {/* Payment Sidebar Section */}
           <section className={cn(
             "p-8 border rounded-[40px] space-y-6",
             order.payment.hasReceipt ? "bg-emerald-500/5 border-emerald-500/10" : "bg-white/[0.02] border-white/5"
           )}>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gold" />
                <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Pagamento</h3>
              </div>
              <div className="space-y-6">
                 <div>
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Status Global</p>
                    <p className="text-lg text-white font-black uppercase">{order.paymentStatus}</p>
                 </div>
                 
                 <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] text-slate-500 font-black uppercase">Comprovantes</p>
                      <span className="text-[10px] text-white font-bold bg-white/5 px-2 py-0.5 rounded-full">
                        {order.payment.receipts.length}
                      </span>
                    </div>

                    {!order.payment.hasReceipt ? (
                      <p className="text-xs text-slate-500 italic">Nenhum comprovante enviado.</p>
                    ) : (
                      <div className="space-y-4">
                        {order.payment.receipts.map((r, idx) => (
                          <div key={r.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="text-[8px] text-gold font-black uppercase mb-1">Comprovante {order.payment.receipts.length - idx}</p>
                                   <div className="flex items-center gap-2">
                                      <FileIcon className="w-3 h-3 text-slate-400" />
                                      <span className="text-[10px] text-white font-mono truncate max-w-[120px]">{r.originalFileName || 'comprovante'}</span>
                                   </div>
                                </div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                  r.reviewStatus === 'approved' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                  r.reviewStatus === 'pending' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                  "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                )}>
                                  {r.reviewStatus === 'pending' ? 'Pendente' : 
                                   r.reviewStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                </span>
                             </div>

                             <div className="grid grid-cols-2 gap-2 text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                                <div>
                                   <p className="mb-0.5">Enviado em</p>
                                   <p className="text-white font-mono">{format(new Date(r.uploadedAt), 'dd/MM/yy HH:mm')}</p>
                                </div>
                                <div>
                                   <p className="mb-0.5">Tamanho / Tipo</p>
                                   <p className="text-white font-mono">{((r.sizeBytes || 0) / 1024 / 1024).toFixed(2)}MB / {(r.mimeType || '').split('/')[1]?.toUpperCase() || '---'}</p>
                                </div>
                             </div>

                             <Button 
                               onClick={async () => {
                                 try {
                                   setIsGeneratingUrl(r.id);
                                   const { signedUrl } = await getReceiptUrl({ data: { orderId: order.id, receiptId: r.id } });
                                   
                                   if (r.mimeType === 'application/pdf') {
                                     window.open(signedUrl, '_blank');
                                   } else {
                                     setViewingReceipt({ url: signedUrl, type: r.mimeType || 'image/jpeg' });
                                   }

                                 } catch (err) {
                                   console.error(err);
                                   toast.error("Erro ao gerar acesso ao comprovante.");
                                 } finally {
                                   setIsGeneratingUrl(null);
                                 }
                               }}
                               disabled={isGeneratingUrl === r.id}
                               variant="outline" 
                               className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-gold/5 border-gold/20 text-gold hover:bg-gold hover:text-navy transition-all duration-300"
                             >
                               {isGeneratingUrl === r.id ? (
                                 <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
                                    Processando...
                                 </div>
                               ) : (
                                 <>
                                   <Eye className="w-3 h-3 mr-2" />
                                   Visualizar Comprovante
                                 </>
                               )}
                              </Button>

                              {r.reviewStatus === 'pending' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    onClick={() => setConfirmingApproval(r.id)}
                                    disabled={!!isReviewing}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-xl"
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    onClick={() => setRejectingReceipt({ id: r.id, reason: 'Valor divergente', notes: '' })}
                                    disabled={!!isReviewing}
                                    variant="outline"
                                    className="h-8 text-[9px] font-black uppercase tracking-widest bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl"
                                  >
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
                 
                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl italic text-[10px] text-slate-500 leading-relaxed">
                   A visualização é temporária (60s). As ações de aprovação e rejeição são definitivas e auditadas.
                 </div>

              </div>
           </section>
        </div>
      </div>

      {/* Modal de Visualização de Imagem */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
           <div 
             className="absolute inset-0 bg-navy/95 backdrop-blur-xl" 
             onClick={() => setViewingReceipt(null)}
           />
           <div className="relative z-10 w-full max-w-4xl max-h-full flex flex-col items-center">
              <div className="absolute -top-12 right-0 flex gap-4">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="text-white hover:bg-white/10"
                   onClick={() => window.open(viewingReceipt.url, '_blank')}
                 >
                    <ExternalLink className="w-5 h-5" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="text-white hover:bg-white/10"
                   onClick={() => setViewingReceipt(null)}
                 >
                    <X className="w-5 h-5" />
                 </Button>
              </div>
              <div className="w-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                 <img 
                   src={viewingReceipt.url} 
                   alt="Comprovante" 
                   className="w-full h-auto max-h-[80vh] object-contain mx-auto"
                   onLoad={() => console.log('Image loaded successfully')}
                   onError={() => toast.error("Erro ao carregar imagem.")}
                 />

              </div>
              <p className="mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                O acesso expira em 60 segundos
              </p>
           </div>
        </div>
      )}

      {/* Modal de Confirmação de Aprovação */}
      {confirmingApproval && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-md w-full space-y-6 shadow-2xl ring-1 ring-white/10">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Confirmar Pagamento?</h3>
                <p className="text-sm text-slate-400">
                  Você confirma que o comprovante foi analisado e o valor de <strong>{formatCurrency(order.summary.totalAmount)}</strong> foi recebido?
                </p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-black text-[9px]">Pedido:</span>
                <span className="text-white font-mono">{order.publicId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-black text-[9px]">Cliente:</span>
                <span className="text-white font-bold">{order.customer.name}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => setConfirmingApproval(null)}
                className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleReview(confirmingApproval, 'approve')}
                disabled={!!isReviewing}
                className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white glow-emerald rounded-2xl"
              >
                {isReviewing ? 'Processando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {rejectingReceipt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-md w-full space-y-6 shadow-2xl ring-1 ring-white/10">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Rejeitar Comprovante</h3>
                <p className="text-sm text-slate-400">
                  O cliente será notificado para enviar um novo comprovante.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Motivo da Rejeição</label>
                <select
                  value={rejectingReceipt.reason}
                  onChange={(e) => setRejectingReceipt({ ...rejectingReceipt, reason: e.target.value })}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="Valor divergente">Valor divergente</option>
                  <option value="Comprovante ilegível">Comprovante ilegível</option>
                  <option value="Comprovante inválido">Comprovante inválido</option>
                  <option value="Pagamento não localizado">Pagamento não localizado</option>
                  <option value="Outro">Outro (especificar)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Observações Extras</label>
                <textarea
                  value={rejectingReceipt.notes}
                  onChange={(e) => setRejectingReceipt({ ...rejectingReceipt, notes: e.target.value })}
                  placeholder="Ex: O comprovante enviado pertence a outro torneio..."
                  className="w-full min-h-[100px] bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-gold outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => setRejectingReceipt(null)}
                className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleReview(rejectingReceipt.id, 'reject', rejectingReceipt.reason, rejectingReceipt.notes)}
                disabled={!!isReviewing}
                className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white rounded-2xl"
              >
                {isReviewing ? 'Processando...' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


