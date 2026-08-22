import { Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderItem } from "@/lib/order-state";
import { AvCatalogEvent, AvShirtModel } from "@/lib/av-catalog-client";
import { getPublicProductDisplayName } from "@/utils/av-public-status-mapper";

interface OrderItemsSummaryProps {
  items: OrderItem[];
  eventInfo: AvCatalogEvent;
  onRemove: (local_id: string) => void;
  onEdit: (local_id: string) => void;
  disabled?: boolean;
  isMultiModel?: boolean;
}

export function OrderItemsSummary({ items, eventInfo, onRemove, onEdit, disabled, isMultiModel = false }: OrderItemsSummaryProps) {
  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalEstimated = items.reduce((sum, item) => sum + (item.quantity * eventInfo.unit_price), 0);

  return (
    <div className="space-y-6 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-10 rounded-[32px] border border-white/5">
      <h3 className="text-2xl font-heading font-black uppercase tracking-tight">Seu Pedido</h3>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.local_id} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-gold text-lg">
                  {getPublicProductDisplayName({ category: item.category } as AvShirtModel, isMultiModel)}
                </span>
              </div>
              <div className="text-sm text-ice/60 space-x-2">
                <span>Tam: {item.size_option}{item.custom_size ? ` (${item.custom_size})` : ''}</span>
                {item.custom_name && <span>• Nome: {item.custom_name}</span>}
                {item.custom_number && <span>• Nº: {item.custom_number}</span>}
              </div>
              <div className="font-black text-sm text-ice">Qtd: {item.quantity} x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eventInfo.unit_price)}</div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {!disabled && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item.local_id)} className="text-ice/40 hover:text-gold">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onRemove(item.local_id)} className="text-ice/40 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-ice/30 text-center py-8">Nenhum item adicionado.</p>}
      </div>

      <div className="pt-6 border-t border-white/10 space-y-2">
        <div className="flex justify-between font-black uppercase tracking-widest">
          <span className="text-ice/60">Total de Peças</span>
          <span className="text-ice">{totalPieces}</span>
        </div>
        <div className="flex justify-between font-black uppercase tracking-widest">
          <span className="text-ice/60">Total Estimado</span>
          <span className="text-gold text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEstimated)}</span>
        </div>
      </div>
    </div>
  );
}
