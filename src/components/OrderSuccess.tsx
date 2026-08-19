import { motion } from "framer-motion";
import { CheckCircle2, Copy, Share2, PlusCircle, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { AvCreateOrderResponse } from "@/lib/av-order-client";
import type { AvCatalogResponse } from "@/lib/av-catalog-client";
import type { OrderItem } from "@/lib/order-state";
import { OrderItemsSummary } from "./OrderItemsSummary";
import { OrderPayment } from "./OrderPayment";
import { ReceiptUpload } from "./ReceiptUpload";


interface OrderSuccessProps {
  order: AvCreateOrderResponse;
  catalog: AvCatalogResponse['data'];
  localItems: OrderItem[];
  onNewOrder: () => void;
  receiptAccessToken?: string | null;
  orderViewToken?: string | null;
  onStatusUpdate?: (paymentStatus: string, reviewStatus: string) => void;
}



const ORDER_STATUS_MAP: Record<string, string> = {
  received: "PEDIDO RECEBIDO",
  confirmed: "PEDIDO CONFIRMADO",
  in_production: "EM PRODUÇÃO",
  ready: "PRONTO",
  delivered: "ENTREGUE",
  cancelled: "CANCELADO",
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  awaiting_payment: "AGUARDANDO PAGAMENTO",
  receipt_submitted: "COMPROVANTE ENVIADO",
  payment_confirmed: "PAGAMENTO CONFIRMADO",
  receipt_rejected: "COMPROVANTE NÃO APROVADO",
};

export function OrderSuccess({ order, catalog, localItems, onNewOrder, receiptAccessToken, orderViewToken, onStatusUpdate }: OrderSuccessProps) {
  const [copied, setCopied] = useState(false);
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  useEffect(() => {
    // Focar no título para acessibilidade após o sucesso
    const title = document.getElementById('success-title');
    if (title) title.focus();
  }, []);

  const handleCopy = async () => {
    if (!order.display_order_number) return;
    try {
      await navigator.clipboard.writeText(order.display_order_number);
      setCopied(true);
      toast.success("Número copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar número.");
    }
  };

  const handleWhatsAppShare = () => {
    const statusLabel = ORDER_STATUS_MAP[order.order_status || 'received'] || order.order_status;
    const paymentLabel = PAYMENT_STATUS_MAP[order.payment_status || 'awaiting_payment'] || order.payment_status;
    const totalFormatted = currencyFormatter.format(order.total_amount || 0);
    
    const eventName = catalog.event.event_name;
    const location = catalog.event.location ? ` - ${catalog.event.location}` : '';

    const message = `🏐 ${eventName}${location}\n\n✅ Pedido registrado com sucesso!\n\nPedido: ${order.display_order_number}\nCliente: ${order.customer_name}\nPeças: ${order.total_quantity}\nTotal: ${totalFormatted}\n\nStatus: ${statusLabel}\nPagamento: ${paymentLabel}\n\nGuarde o número do pedido para acompanhamento.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const showSubtotal = order.subtotal !== order.total_amount;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto px-6 lg:px-0 space-y-12 pb-24"
    >
      {/* Hero Success */}
      <div className="text-center space-y-8">
        <div className="w-24 h-24 bg-gold rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,215,0,0.3)] border-4 border-slate-950">
          <CheckCircle2 className="w-12 h-12 text-slate-950" />
        </div>
        
        <div className="space-y-4">
          <h2 
            id="success-title"
            tabIndex={-1}
            className="text-5xl md:text-7xl font-heading font-black uppercase tracking-tighter outline-none"
          >
            Pedido recebido!
          </h2>
          <p className="text-gold font-black uppercase tracking-[0.4em] text-xs">Seu pedido foi criado! Agora faça o PIX e envie o comprovante.</p>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-12">
          {(order.payment_status === "awaiting_payment" || order.payment_status === "receipt_rejected") && (
            <div className="space-y-12">
              <OrderPayment totalAmount={order.total_amount || 0} />
              {receiptAccessToken && order.order_id && (
                <ReceiptUpload 
                  orderId={order.order_id}
                  receiptAccessToken={receiptAccessToken}
                  currentPaymentStatus={order.payment_status}
                  onSuccess={(pStatus, rStatus) => {
                    onStatusUpdate?.(pStatus, rStatus);
                  }}
                />
              )}
            </div>
          )}

          {order.payment_status === "receipt_submitted" && (
             <ReceiptUpload 
                orderId={order.order_id || ''}
                receiptAccessToken={receiptAccessToken || ''}
                currentPaymentStatus={order.payment_status}
                onSuccess={() => {}}
             />
          )}

          
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[48px] overflow-hidden">
            <div className="p-8 md:p-12 space-y-12">
              {/* Protocol Section */}
              <div className="text-center space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-ice/30">Protocolo Oficial</span>
                <div className="flex flex-col items-center gap-6">
                  <span className="text-5xl md:text-7xl font-black text-white tracking-widest break-all">
                    {order.display_order_number}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopy}
                    className="h-10 border-white/10 bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-full px-6 hover:bg-white/10"
                  >
                    {copied ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                    {copied ? "Número Copiado" : "Copiar Número"}
                  </Button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-white/5">
                <div className="space-y-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Cliente</span>
                    <p className="text-2xl font-black text-ice uppercase">{order.customer_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Total de Peças</span>
                    <p className="text-2xl font-black text-ice">{order.total_quantity}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Status do Pedido</span>
                    <p className="text-xl font-black text-gold uppercase">
                      {ORDER_STATUS_MAP[order.order_status || 'received'] || order.order_status}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Pagamento</span>
                    <p className="text-xl font-black text-ice uppercase">
                      {PAYMENT_STATUS_MAP[order.payment_status || 'awaiting_payment'] || order.payment_status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Section */}
              <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ice/20 block mb-1">Total do Pedido</span>
                  <p className="text-5xl font-black text-gold">
                    {currencyFormatter.format(order.total_amount || 0)}
                  </p>
                  {showSubtotal && (
                     <p className="text-xs font-bold text-ice/30 uppercase tracking-widest mt-1">
                       Subtotal: {currencyFormatter.format(order.subtotal || 0)}
                     </p>
                  )}
                </div>

                <Button 
                  onClick={handleWhatsAppShare}
                  className="glow-gold w-full md:w-auto h-16 px-10 rounded-2xl font-black uppercase tracking-widest gap-3"
                >
                  <Share2 className="w-5 h-5" />
                  Compartilhar no WhatsApp
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[32px] text-center space-y-4">
            <p className="text-sm text-ice/40 leading-relaxed max-w-md mx-auto">
              Seu pedido foi registrado e está aguardando a abertura do período de pagamentos. <br/>
              Acompanhe seu e-mail para novas instruções.
            </p>
            {orderViewToken && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ice/20 mb-2">Link Seguro de Visualização</p>
                <code className="block p-3 bg-black/40 rounded-lg text-[9px] text-gold/60 break-all border border-gold/10">
                  {`${window.location.origin}/order-view?handle=${order.display_order_number}&token=${orderViewToken}`}
                </code>
              </div>
            )}
          </div>

        </div>

        {/* Local Items Summary (Side) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40">Resumo da Configuração</h4>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              <OrderItemsSummary 
                items={localItems} 
                eventInfo={catalog.event} 
                onRemove={() => {}} 
                onEdit={() => {}} 
                disabled 
              />
            </div>
          </div>

          <Button 
            variant="outline"
            onClick={onNewOrder}
            className="w-full h-20 border-white/10 font-black uppercase tracking-widest rounded-[24px] gap-3 transition-all hover:bg-white/5"
          >
            <PlusCircle className="w-5 h-5" />
            Fazer Outro Pedido
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
