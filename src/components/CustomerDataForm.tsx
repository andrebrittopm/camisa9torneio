import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerData } from "@/lib/order-state";

interface CustomerDataFormProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  disabled?: boolean;
}

export function CustomerDataForm({ data, onChange, disabled }: CustomerDataFormProps) {
  // Simple phone mask
  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <div className="space-y-6 bg-white/[0.02] backdrop-blur-xl p-6 md:p-10 rounded-[32px] border border-white/5">
      <h3 className="text-2xl font-heading font-black uppercase tracking-tight">Dados do Pedido</h3>
      
      <div>
        <Label htmlFor="customer-name" className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">Nome Completo</Label>
        <Input 
          id="customer-name"
          placeholder="Ex: André Silva" 
          value={data.name}
          disabled={disabled}
          autoComplete="name"
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-lg placeholder:text-ice/10 focus:border-gold/50 transition-all"
        />
      </div>

      <div>
        <Label htmlFor="customer-whatsapp" className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">WhatsApp</Label>
        <Input 
          id="customer-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(67) 99999-9999" 
          value={data.whatsapp}
          disabled={disabled}
          onChange={(e) => onChange({ ...data, whatsapp: formatWhatsApp(e.target.value) })}
          className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-lg placeholder:text-ice/10 focus:border-gold/50 transition-all"
        />
      </div>

      <div>
        <Label htmlFor="customer-email" className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">E-mail (para confirmação)</Label>
        <Input 
          id="customer-email"
          type="email"
          autoComplete="email"
          placeholder="Ex: seu@email.com" 
          value={data.email}
          disabled={disabled}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-lg placeholder:text-ice/10 focus:border-gold/50 transition-all"
        />
      </div>

      <div>
        <Label htmlFor="customer-notes" className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-1 block">Observações (Opcional)</Label>
        <p className="text-[9px] text-ice/20 font-black uppercase tracking-widest mb-3">Observações adicionais. Para alterar tamanho, nome ou número, volte aos campos da camisa.</p>
        <Textarea 
          id="customer-notes"
          value={data.notes}
          disabled={disabled}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="min-h-[120px] bg-white/[0.02] border-white/10 rounded-xl font-medium placeholder:text-ice/10 focus:border-gold/50 transition-all"
        />
      </div>
    </div>
  );
}
