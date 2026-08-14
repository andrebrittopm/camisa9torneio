import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { CustomerData, OrderItem } from "@/lib/order-state";
import { AvCatalogEvent } from "@/lib/av-catalog-client";
import { OrderItemsSummary } from "./OrderItemsSummary";

interface OrderReviewProps {
  customer: CustomerData;
  items: OrderItem[];
  eventInfo: AvCatalogEvent;
  onBack: () => void;
  onConfirm: () => void;
}

export function OrderReview({ customer, items, eventInfo, onBack, onConfirm }: OrderReviewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="text-center mb-12">
        <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-4 tracking-tighter">Revise seu Pedido</h2>
        <p className="text-gold font-black uppercase tracking-[0.3em] text-[10px]">Confira os detalhes antes de continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <div className="bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-6">Cliente</h4>
            <div className="space-y-4">
              <div>
                <LabelReview label="Nome" value={customer.name} />
              </div>
              <div>
                <LabelReview label="WhatsApp" value={customer.whatsapp} />
              </div>
              {customer.notes && (
                <div>
                  <LabelReview label="Observações" value={customer.notes} />
                </div>
              )}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full h-16 border-white/10 font-black uppercase tracking-widest rounded-2xl gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar e Editar
          </Button>
        </div>

        <div className="md:col-span-2 space-y-8">
          <OrderItemsSummary items={items} eventInfo={eventInfo} onRemove={() => {}} onEdit={() => {}} disabled />
          
          <div className="bg-royal/10 border border-royal/20 p-8 rounded-[32px] text-center space-y-6">
            <p className="text-ice/60 text-sm font-medium">O envio oficial será habilitado na próxima etapa do desenvolvimento.</p>
            <Button 
              size="lg"
              disabled
              className="w-full h-20 text-xl font-black uppercase tracking-widest rounded-2xl bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none"
            >
              <CheckCircle2 className="w-6 h-6 mr-3" />
              Confirmar e Continuar
            </Button>
            <p className="text-[9px] text-ice/30 uppercase font-black tracking-widest">A_confirmação_não_envia_dados_ainda</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LabelReview({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-ice/20 uppercase tracking-widest">{label}</span>
      <p className="text-ice font-bold text-lg leading-tight break-words">{value}</p>
    </div>
  );
}
