import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, RefreshCcw, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { fetchAvPaymentInfo, type AvPaymentInfoResponse } from "@/lib/av-payment-client";

interface OrderPaymentProps {
  totalAmount: number;
}

export function OrderPayment({ totalAmount }: OrderPaymentProps) {
  const [paymentInfo, setPaymentInfo] = useState<AvPaymentInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const loadPaymentInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchAvPaymentInfo();
    
    if (result.success) {
      setPaymentInfo(result);
    } else {
      setError(result.error || "INTERNAL_ERROR");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPaymentInfo();
  }, [loadPaymentInfo]);

  const handleCopyKey = async () => {
    if (!paymentInfo?.data?.pix.key) return;
    try {
      await navigator.clipboard.writeText(paymentInfo.data.pix.key);
      setCopiedKey(true);
      toast.success("Chave PIX copiada.");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar chave.");
    }
  };

  const handleCopyValue = async () => {
    const valueStr = totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    try {
      await navigator.clipboard.writeText(valueStr);
      setCopiedValue(true);
      toast.success("Valor copiado.");
      setTimeout(() => setCopiedValue(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar valor.");
    }
  };

  return (
    <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[48px] overflow-hidden">
      <div className="p-8 md:p-12 space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
            <Wallet className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Pagamento via PIX</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60">Siga as instruções abaixo</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center space-y-4"
            >
              <RefreshCcw className="w-8 h-8 text-gold animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-ice/40">Carregando dados para pagamento...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 space-y-6 text-center"
            >
              <div className="flex items-center justify-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md mx-auto">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-bold text-red-200">Seu pedido foi registrado, mas não foi possível carregar os dados de pagamento agora.</p>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={loadPaymentInfo}
                className="h-10 border-white/10 bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-full px-8 hover:bg-white/10"
              >
                <RefreshCcw className="w-3 h-3 mr-2" />
                Tentar Novamente
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Valor */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ice/20 block">Valor a Pagar</span>
                  <div className="flex items-end justify-between gap-4 p-6 bg-slate-950/50 rounded-3xl border border-white/5">
                    <p className="text-4xl font-black text-white">{currencyFormatter.format(totalAmount)}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCopyValue}
                      className="h-8 w-8 p-0 text-ice/40 hover:text-gold hover:bg-gold/10 rounded-full"
                    >
                      {copiedValue ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      <span className="sr-only">Copiar Valor</span>
                    </Button>
                  </div>
                </div>

                {/* Chave PIX */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ice/20 block">Chave PIX ({paymentInfo?.data?.pix.type.toUpperCase()})</span>
                  <div className="flex items-center justify-between gap-4 p-6 bg-slate-950/50 rounded-3xl border border-white/5">
                    <p className="text-2xl font-black text-ice tracking-wider break-all">{paymentInfo?.data?.pix.key}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCopyKey}
                      className="h-10 w-10 p-0 text-gold hover:bg-gold/10 rounded-full border border-gold/20"
                    >
                      {copiedKey ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      <span className="sr-only">Copiar Chave</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Titular */}
              <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ice/20">Titular da Conta</span>
                  <p className="text-xl font-black text-ice uppercase">{paymentInfo?.data?.pix.holder}</p>
                </div>
                
                <div className="flex-1 max-w-md">
                   <div className="bg-royal/10 border border-royal/20 p-4 rounded-2xl">
                     <p className="text-[10px] font-bold text-royal-200 leading-relaxed uppercase tracking-widest">
                       Abra o aplicativo do seu banco, escolha pagar via PIX, utilize a chave acima e informe o valor exato do pedido. Confira o titular antes de concluir.
                     </p>
                   </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 py-6 border-t border-white/5">
                <div className="bg-gold/10 border border-gold/20 px-6 py-4 rounded-2xl max-w-md text-center">
                  <p className="text-[11px] font-black text-gold uppercase tracking-widest leading-relaxed">
                    IMPORTANTE: Após fazer o PIX, volte para esta página e envie o comprovante. Seu pagamento será confirmado após a conferência.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
