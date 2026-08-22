import { useState, useEffect } from "react";
import { AlertTriangle, X, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteAdminOrder } from "@/lib/av-admin-orders.functions";

interface AdminDeleteOrderModalProps {
  orderId: string;
  orderCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminDeleteOrderModal({
  orderId,
  orderCode,
  isOpen,
  onClose,
  onSuccess
}: AdminDeleteOrderModalProps) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteOrder = useServerFn(deleteAdminOrder);

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationInput("");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isDeleting, onClose]);

  const handleDelete = async () => {
    if (confirmationInput !== orderCode) return;

    try {
      setIsDeleting(true);
      const result = await deleteOrder({
        data: {
          orderId,
          expectedOrderCode: orderCode
        }
      });

      if (result.success) {
        toast.success(`Pedido ${orderCode} excluído definitivamente.`);
        onSuccess();
        onClose();
      } else {
        const errorMsg = 
          result.code === 'FORBIDDEN' ? 'Acesso negado. Apenas Superadmins podem excluir pedidos.' :
          result.code === 'ORDER_CODE_MISMATCH' ? 'O código do pedido não coincide.' :
          result.code === 'STORAGE_DELETE_FAILED' ? 'Falha ao remover arquivos do Storage. Operação cancelada por segurança.' :
          'Não foi possível excluir o pedido.';
        toast.error(`Erro: ${errorMsg}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro ao processar a exclusão.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy/95 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 cursor-default" 
        onClick={!isDeleting ? onClose : undefined}
      />
      
      <div className="relative z-10 bg-slate-900 border border-white/10 rounded-[40px] p-8 max-w-md w-full space-y-8 shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center ring-4 ring-rose-500/10">
            <Trash2 className="w-10 h-10 text-rose-500" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-heading font-black text-white uppercase tracking-tight">
              Excluir pedido {orderCode}?
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed px-4">
              Esta ação é <strong className="text-white">permanente</strong>. Todos os itens, comprovantes, arquivos e dados relacionados serão eliminados.
            </p>
          </div>
        </div>

        <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest">Confirmação Crítica</p>
          </div>
          <p className="text-[11px] text-rose-500/80 leading-relaxed">
            Para confirmar, digite exatamente o código do pedido abaixo:
          </p>
          
          <Input 
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={isDeleting}
            placeholder={orderCode}
            className="bg-black/20 border-rose-500/20 text-white font-mono text-center tracking-widest h-14 rounded-2xl focus:ring-rose-500/30"
            autoFocus
          />
        </div>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting || confirmationInput !== orderCode}
            className={cn(
              "flex-[2] h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300",
              confirmationInput === orderCode 
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20" 
                : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
            )}
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Excluindo...
              </span>
            ) : (
              "EXCLUIR DEFINITIVAMENTE"
            )}
          </Button>
        </div>

        <p className="text-[9px] text-center text-slate-600 uppercase font-bold tracking-[0.2em] italic">
          Apenas Superadmins autorizados
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
