import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AvShirtModel, AvCatalogEvent } from "@/lib/av-catalog-client";
import type { OrderItem } from "@/lib/order-state";
import { Minus, Plus, ShoppingCart, Save } from "lucide-react";

interface OrderConfiguratorProps {
  selectedModel: AvShirtModel | null;
  eventInfo: AvCatalogEvent;
  onAddItem: (item: Omit<OrderItem, 'local_id'>) => void;
  editingItem: OrderItem | null;
  onUpdateItem: (local_id: string, item: Omit<OrderItem, 'local_id'>) => void;
  onCancelEdit: () => void;
  onModelChange: (model: AvShirtModel) => void;
}

export function OrderConfigurator({
  selectedModel,
  eventInfo,
  onAddItem,
  editingItem,
  onUpdateItem,
  onCancelEdit,
  onModelChange
}: OrderConfiguratorProps) {
  const [sizeOption, setSizeOption] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Sync state with editingItem when editingItem changes
  useEffect(() => {
    if (editingItem) {
      setSizeOption(editingItem.size_option);
      setCustomSize(editingItem.custom_size || "");
      setCustomName(editingItem.custom_name || "");
      setCustomNumber(editingItem.custom_number || "");
      setQuantity(editingItem.quantity);
    } else {
      // Reset only customization if not editing
      setSizeOption("");
      setCustomSize("");
      setCustomName("");
      setCustomNumber("");
      setQuantity(1);
    }
  }, [editingItem]);

  // If model changes and current size doesn't exist, reset it
  useEffect(() => {
    if (selectedModel && sizeOption && sizeOption !== "OUTRO" && !selectedModel.available_sizes.includes(sizeOption)) {
      setSizeOption("");
    }
  }, [selectedModel, sizeOption]);

  const sizes = selectedModel?.available_sizes || [];
  const showCustomSize = sizeOption === "OUTRO" && selectedModel?.allow_custom_size;

  const handleAddOrUpdate = () => {
    if (!selectedModel) return;
    if (!sizeOption) {
      toast.error("Escolha um tamanho.");
      return;
    }
    if (showCustomSize && !customSize.trim()) {
      toast.error("Informe o tamanho personalizado.");
      return;
    }
    if (quantity < 1) {
      toast.error("Quantidade inválida.");
      return;
    }

    const itemData: Omit<OrderItem, 'local_id'> = {
      shirt_model_id: selectedModel.id,
      model_code: selectedModel.code,
      model_name: selectedModel.name,
      category: selectedModel.category,
      size_option: sizeOption,
      custom_size: showCustomSize ? customSize.trim() : null,
      custom_name: customName.trim() || null,
      custom_number: customNumber.trim() || null,
      quantity: Math.floor(quantity)
    };

    if (editingItem) {
      onUpdateItem(editingItem.local_id, itemData);
      toast.success("Item atualizado no pedido.");
    } else {
      onAddItem(itemData);
      toast.success("Item adicionado ao pedido.");
      // Reset fields but keep model
      setSizeOption("");
      setCustomSize("");
      setCustomName("");
      setCustomNumber("");
      setQuantity(1);
    }
  };

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(eventInfo.unit_price);

  return (
    <div className="space-y-10 bg-white/[0.02] backdrop-blur-xl p-10 rounded-[32px] border border-white/5 shadow-2xl">
      <div className="flex flex-col gap-2">
        <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px]">Passo único: Personalize sua peça</span>
        <h3 className="text-2xl font-heading font-black uppercase tracking-tight">
          {editingItem ? "Editando Item" : "Personalize Agora"}
        </h3>
      </div>

      {/* Tamanho */}
      <div>
        <div className="flex justify-between items-center mb-5">
          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40">Tamanho oficial</Label>
          {!eventInfo.orders_available && (
             <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Pedidos Encerrados</span>
          )}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {sizes.map((size) => (
            <button
              key={size}
              disabled={!eventInfo.orders_available}
              onClick={() => setSizeOption(size)}
              className={cn(
                "h-14 rounded-xl border font-black text-xs transition-all duration-300 active:scale-95",
                sizeOption === size 
                  ? "border-gold bg-gold text-navy shadow-[0_0_20px_rgba(252,195,7,0.3)]" 
                  : "border-white/5 bg-white/[0.02] text-ice/60 hover:border-gold/30 hover:text-gold disabled:opacity-30 disabled:hover:border-white/5 disabled:hover:text-ice/60"
              )}
            >
              {size}
            </button>
          ))}
        </div>
        
        {showCustomSize && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">Informe o tamanho</Label>
            <Input 
              placeholder="Ex.: 3G, 4G, Infantil 12"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              disabled={!eventInfo.orders_available}
              className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-lg tracking-widest placeholder:text-ice/10 focus:border-gold/50 focus:ring-gold/20 transition-all"
            />
          </motion.div>
        )}
      </div>

      {/* Nome e Número */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">Nome na camisa (opcional)</Label>
          <Input 
            placeholder="EX: ANDRÉ" 
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            disabled={!eventInfo.orders_available}
            className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-lg tracking-widest placeholder:text-ice/10 focus:border-gold/50 focus:ring-gold/20 transition-all uppercase" 
          />
        </div>
        <div>
          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">Número (opcional)</Label>
          <Input 
            placeholder="00" 
            value={customNumber}
            onChange={(e) => setCustomNumber(e.target.value.slice(0, 3))}
            disabled={!eventInfo.orders_available}
            className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-2xl text-center tracking-widest placeholder:text-ice/10 focus:border-gold/50 focus:ring-gold/20 transition-all" 
          />
        </div>
      </div>

      {/* Quantidade e CTA */}
      <div className="flex flex-col sm:flex-row gap-6 items-end sm:items-center justify-between pt-6 border-t border-white/5">
        <div className="flex flex-col gap-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40">Quantidade</Label>
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-xl p-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={!eventInfo.orders_available || quantity <= 1}
              onClick={() => setQuantity(q => q - 1)}
              className="h-10 w-10 text-ice/40 hover:text-gold"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center font-black text-xl">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              disabled={!eventInfo.orders_available}
              onClick={() => setQuantity(q => q + 1)}
              className="h-10 w-10 text-ice/40 hover:text-gold"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="flex justify-between items-center px-2">
             <span className="text-[10px] font-black text-ice/40 uppercase tracking-widest">Subtotal</span>
             <span className="text-xl font-black text-gold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eventInfo.unit_price * quantity)}</span>
          </div>
          <div className="flex gap-3">
            {editingItem && (
              <Button
                variant="outline"
                onClick={onCancelEdit}
                className="h-16 px-6 border-white/10 hover:bg-white/5 font-black uppercase tracking-widest rounded-2xl"
              >
                Cancelar
              </Button>
            )}
            <Button
              size="lg"
              disabled={!eventInfo.orders_available}
              onClick={handleAddOrUpdate}
              className={cn(
                "h-16 flex-1 sm:px-12 text-lg font-black uppercase tracking-widest rounded-2xl transition-all",
                eventInfo.orders_available ? "glow-gold" : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
            >
              {editingItem ? <Save className="w-5 h-5 mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
              {editingItem ? "Atualizar Item" : "Adicionar ao Pedido"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
