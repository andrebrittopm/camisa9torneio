import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Administrative Payment Status Mapping
 */
export const getPaymentStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "Status desconhecido";
  
  const mapping: Record<string, string> = {
    'awaiting_payment': 'Aguardando pagamento',
    'receipt_submitted': 'Comprovante em análise',
    'payment_confirmed': 'Pagamento confirmado',
    'receipt_rejected': 'Comprovante rejeitado',
    // Fallback for legacy or untracked strings
    'paid': 'Pagamento confirmado',
    'pending': 'Aguardando pagamento',
  };

  return mapping[status.toLowerCase()] || status;
};

export const getPaymentStatusStyle = (status: string | null | undefined): string => {
  const s = status?.toLowerCase();
  if (s === 'payment_confirmed' || s === 'paid') return "bg-green-500/10 text-green-500 border-green-500/20";
  if (s === 'receipt_rejected') return "bg-red-500/10 text-red-500 border-red-500/20";
  if (s === 'receipt_submitted') return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === 'awaiting_payment' || s === 'pending') return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
};

/**
 * Administrative Order Status Mapping
 */
export const getOrderStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "Status desconhecido";
  
  const mapping: Record<string, string> = {
    'received': 'Pedido recebido',
    'confirmed': 'Pedido confirmado',
    'in_production': 'Em produção',
    'ready': 'Pronto para retirada',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado',
  };

  return mapping[status.toLowerCase()] || status;
};

export const getOrderStatusStyle = (status: string | null | undefined): string => {
  const s = status?.toLowerCase();
  if (s === 'received') return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  if (s === 'confirmed') return "bg-green-500/10 text-green-500 border-green-500/20";
  if (s === 'in_production') return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === 'ready') return "bg-blue-500/10 text-blue-400 border-blue-400/20";
  if (s === 'delivered') return "bg-green-500/10 text-green-500 border-green-500/20";
  if (s === 'cancelled') return "bg-red-500/10 text-red-500 border-red-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
};

/**
 * Administrative Receipt Review Status Mapping
 */
export const getReceiptStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "Status desconhecido";
  
  const mapping: Record<string, string> = {
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado',
  };

  return mapping[status.toLowerCase()] || status;
};

export const getReceiptStatusStyle = (status: string | null | undefined): string => {
  const s = status?.toLowerCase();
  if (s === 'approved') return "bg-green-500/10 text-green-500 border-green-500/20";
  if (s === 'rejected') return "bg-red-500/10 text-red-500 border-red-500/20";
  if (s === 'pending') return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
};

interface StatusBadgeProps {
  status: string | null | undefined;
  type: 'payment' | 'order' | 'receipt';
  className?: string;
}

export function AdminStatusBadge({ status, type, className }: StatusBadgeProps) {
  let label = "";
  let style = "";

  if (type === 'payment') {
    label = getPaymentStatusLabel(status);
    style = getPaymentStatusStyle(status);
  } else if (type === 'order') {
    label = getOrderStatusLabel(status);
    style = getOrderStatusStyle(status);
  } else if (type === 'receipt') {
    label = getReceiptStatusLabel(status);
    style = getReceiptStatusStyle(status);
  }

  return (
    <Badge variant="outline" className={cn("font-medium", style, className)}>
      {label}
    </Badge>
  );
}
