import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import type { CustomerData, OrderItem } from "@/lib/order-state";
import { AvCatalogEvent } from "@/lib/av-catalog-client";
import { OrderItemsSummary } from "./OrderItemsSummary";
import { TurnstileWidget, type TurnstileWidgetHandle } from "./TurnstileWidget";
import { useState, useRef, useEffect, useMemo } from "react";
import { submitAvOrder, type AvCreateOrderResponse, type AvCreatedOrder } from "@/lib/av-order-client";

interface OrderReviewProps {
  customer: CustomerData;
  items: OrderItem[];
  eventInfo: AvCatalogEvent;
  onBack: () => void;
  onSuccess: (order: AvCreatedOrder, receiptToken: string | null, viewToken: string | null, viewExpiresAt: number | null) => void;
  isMultiModel?: boolean;
}


type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export function OrderReview({ customer, items, eventInfo, onBack, onSuccess, isMultiModel = false }: OrderReviewProps) {
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [lastPayloadHash, setLastPayloadHash] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  // Snapshot do payload para controle de idempotência (sem tokens/keys e sem regressão de nomes)
  const currentPayloadHash = useMemo(() => {
    const essentialData = {
      event_id: eventInfo.id,
      customer_name: customer.name,
      whatsapp: customer.whatsapp,
      customer_email: customer.email,
      notes: customer.notes || null,
      items: items.map(i => ({
        shirt_model_id: i.shirt_model_id,
        size_option: i.size_option,
        custom_size: i.size_option === 'OUTRO' ? i.custom_size : null,
        custom_name: i.custom_name || null,
        custom_number: i.custom_number || null,
        quantity: i.quantity
      }))
    };
    return JSON.stringify(essentialData);
  }, [eventInfo.id, customer, items]);


  // Se o pedido mudar, invalidamos a idempotency key
  useEffect(() => {
    if (lastPayloadHash && currentPayloadHash !== lastPayloadHash) {
      setIdempotencyKey(null);
      setTurnstileToken(null);
      if (turnstileRef.current) turnstileRef.current.reset();
    }
  }, [currentPayloadHash, lastPayloadHash]);

  const handleConfirm = async () => {
    if (/* !turnstileToken || */ status === 'submitting' || !eventInfo.orders_available) return; // TURNSTILE TEMPORARILY DISABLED

    setStatus('submitting');
    setErrorMsg(null);
    setRetryAfter(null);
    setLastErrorCode(null);

    // Gestão de Idempotency Key
    let currentKey = idempotencyKey;
    if (!currentKey) {
      currentKey = crypto.randomUUID();
      setIdempotencyKey(currentKey);
      setLastPayloadHash(currentPayloadHash);
    }

    const payload = {
      event_id: eventInfo.id,
      customer_name: customer.name,
      whatsapp: customer.whatsapp,
      customer_email: customer.email,
      notes: customer.notes || null,
      idempotency_key: currentKey,
      // turnstile_token: turnstileToken, // TURNSTILE TEMPORARILY DISABLED
      items: items.map(i => ({
        shirt_model_id: i.shirt_model_id,
        size_option: i.size_option,
        custom_size: i.size_option === 'OUTRO' ? i.custom_size : null,
        custom_name: i.custom_name || null,
        custom_number: i.custom_number || null,
        quantity: i.quantity
      }))

    };

    const { order: orderResult, receiptAccessToken, orderViewToken, orderViewExpiresAt } = await submitAvOrder(payload);

    // Resetar Turnstile após qualquer tentativa (Single Use)
    setTurnstileToken(null);
    if (turnstileRef.current) turnstileRef.current.reset();

    if (orderResult.success && orderResult.data) {
      setStatus('success');
      onSuccess(orderResult.data, receiptAccessToken, orderViewToken, orderViewExpiresAt);
    } else {

      setStatus('error');
      setLastErrorCode(orderResult.code || null);
      
      // Mapeamento de Erros Amigáveis
      switch (orderResult.code) {
        case 'INVALID_QUANTITY':
          setErrorMsg("Verifique a quantidade informada.");
          break;
        case 'INVALID_SIZE_OPTION':
          setErrorMsg("Um dos tamanhos selecionados não está mais disponível.");
          break;
        case 'CUSTOM_SIZE_NOT_ALLOWED':
          setErrorMsg("O tamanho personalizado não está disponível para esse modelo.");
          break;
        case 'EVENT_NOT_FOUND':
        case 'INVALID_MODEL':
          setErrorMsg("Um dos modelos ou o evento não está mais disponível.");
          break;
        case 'EVENT_NOT_AVAILABLE':
        case 'ORDER_DEADLINE_EXCEEDED':
          setErrorMsg("Os pedidos para este evento foram encerrados.");
          break;
        case 'IDEMPOTENCY_KEY_REUSED':
          setErrorMsg("O pedido foi alterado. Tente confirmar novamente.");
          setIdempotencyKey(null); // Forçar nova key no próximo
          break;
        case 'RATE_LIMITED':
          setErrorMsg("Muitas tentativas em pouco tempo. Aguarde alguns instantes.");
          if (orderResult.retry_after) setRetryAfter(orderResult.retry_after);
          break;
        case 'TURNSTILE_FAILED':
          setErrorMsg("Não foi possível validar a verificação de segurança. Tente novamente.");
          break;
        case 'TURNSTILE_UNAVAILABLE':
          setErrorMsg("A verificação de segurança está temporariamente indisponível.");
          break;
        default:
          setErrorMsg(orderResult.error || "Não foi possível concluir o pedido agora. Tente novamente.");
      }
    }
  };

  const isButtonDisabled = status === 'submitting' || status === 'success' || /* !turnstileToken || */ !eventInfo.orders_available; // TURNSTILE TEMPORARILY DISABLED

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 px-6 lg:px-0"
    >
      <div className="text-center mb-12">
        <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-4 tracking-tighter">Revise seu Pedido</h2>
        <p className="text-gold font-black uppercase tracking-[0.3em] text-[10px]">Confira os detalhes do seu pedido antes de finalizar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <div className="bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-6">Cliente</h4>
            <div className="space-y-4">
              <LabelReview label="Nome" value={customer.name} />
              <LabelReview label="WhatsApp" value={customer.whatsapp} />
              <LabelReview label="E-mail" value={customer.email} />
              {customer.notes && (
                <LabelReview label="Observações" value={customer.notes} />
              )}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={onBack}
            disabled={status === 'submitting' || status === 'success'}
            className="w-full h-16 border-white/10 font-black uppercase tracking-widest rounded-2xl gap-2 transition-all hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar e Editar
          </Button>
        </div>

        <div className="md:col-span-2 space-y-8">
          <OrderItemsSummary items={items} eventInfo={eventInfo} onRemove={() => {}} onEdit={() => {}} disabled isMultiModel={isMultiModel} />
          
          <div className="bg-royal/10 border border-royal/20 p-8 rounded-[32px] space-y-8 overflow-hidden">
            {/* TURNSTILE TEMPORARILY DISABLED
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[300px]">
                <TurnstileWidget 
                  ref={turnstileRef}
                  onTokenChange={setTurnstileToken}
                  onError={() => {
                    setTurnstileToken(null);
                    setErrorMsg("Falha no carregamento da verificação de segurança.");
                  }}
                />
              </div>
            </div>
            */}

            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-red-200">{errorMsg}</p>
                    {retryAfter && (
                      <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">
                        Tente novamente em aproximadamente {retryAfter} segundos
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <Button 
                size="lg"
                onClick={handleConfirm}
                disabled={isButtonDisabled}
                aria-busy={status === 'submitting'}
                className={cn(
                  "w-full h-20 text-xl font-black uppercase tracking-widest rounded-2xl transition-all duration-500",
                  isButtonDisabled 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none" 
                    : "glow-gold border-none"
                )}
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Enviando Pedido...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 mr-3" />
                    Confirmar Pedido
                  </>
                )}
              </Button>

              {status === 'error' && (lastErrorCode === 'EVENT_NOT_FOUND' || lastErrorCode === 'INVALID_MODEL') && (
                <Button 
                  variant="link" 
                  onClick={() => window.location.reload()}
                  className="w-full text-gold font-black uppercase tracking-widest text-[10px]"
                >
                  <RefreshCcw className="w-3 h-3 mr-2" />
                  Recarregar Catálogo
                </Button>
              )}
            </div>
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}