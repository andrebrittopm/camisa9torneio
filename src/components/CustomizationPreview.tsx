import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TurnstileWidget, type TurnstileWidgetHandle } from "./TurnstileWidget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * ETAPA 3.3A-2A — CUSTOMIZATION PREVIEW INTEGRADO COM TURNSTILE
 * Nota: Este componente agora atua como o formulário real de pedido.
 */

export function CustomizationPreview() {
  const [athleteName, setAthleteName] = useState("ANDRÉ");
  const [athleteNumber, setAthleteNumber] = useState("10");
  const [selectedSize, setSelectedSize] = useState("M");
  
  // Estado Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const sizes = ["PP", "P", "M", "G", "GG", "XG", "XXG"];

  const handleOrderSubmit = async () => {
    if (!turnstileToken) {
      toast.error("Por favor, valide a proteção anti-bot.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Mock da chamada real
      // turnstile_token é enviado no JSON
      // idempotency_key é mantida para retries lógicos
      const payload = {
        event_id: "00000000-0000-0000-0000-000000000000", // Placeholder para auditoria
        customer_name: athleteName,
        whatsapp: "67999999999",
        notes: null,
        idempotency_key: idempotencyKeyRef.current,
        turnstile_token: turnstileToken,
        items: [
          {
            shirt_model_id: "00000000-0000-0000-0000-000000000000",
            size_option: selectedSize,
            quantity: 1,
            custom_name: athleteName,
            custom_number: athleteNumber
          }
        ]
      };

      console.log("[AV] Enviando pedido...", payload);
      
      // Simulação de delay
      await new Promise(r => setTimeout(r, 1000));
      
      toast.info("A criação real de pedidos será habilitada na próxima etapa.");

    } catch (error) {
      toast.error("Erro ao processar pedido.");
    } finally {
      // 14. RESET APÓS SUBMIT
      setIsSubmitting(false);
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  return (
    <section id="pedido" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-royal/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="aspect-square bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl rounded-[40px] border border-white/5 relative flex flex-col items-center justify-center p-12 overflow-hidden shadow-2xl"
          >
             <div className="absolute inset-0 bg-grid-tech opacity-10" />
             
             <div className="relative z-10 w-full h-full border border-dashed border-ice/10 rounded-3xl flex flex-col items-center justify-center group">
                <div className="relative w-48 h-72 md:w-56 md:h-80 flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-105">
                  <svg viewBox="0 0 60 100" className="absolute inset-0 w-full h-full text-ice/5 fill-current drop-shadow-2xl">
                    <path d="M30 0C10 0 0 10 0 30V80H10V95H50V80H60V30C60 10 50 0 30 0Z" />
                  </svg>
                  
                  <div className="absolute top-[35%] w-full text-center px-4 overflow-hidden">
                    <span className="text-ice font-heading font-black uppercase text-[10px] md:text-xs tracking-[0.3em] block truncate drop-shadow-md">
                      {athleteName || "SEU NOME"}
                    </span>
                  </div>
                  
                  <div className="absolute top-[45%] w-full text-center">
                    <span className="text-gold font-heading font-black text-6xl md:text-8xl leading-none drop-shadow-lg">
                      {athleteNumber || "00"}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-navy/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-gold uppercase tracking-widest">Preview em Tempo Real</span>
                </div>
             </div>
             
             <div className="absolute top-8 left-8 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center border border-gold/20">
                  <span className="text-gold text-xs font-black">09</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Configurador v1.0</span>
             </div>
          </motion.div>

          <div className="flex flex-col">
            <div className="mb-10 text-center lg:text-left">
              <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Exclusividade</span>
              <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-6 tracking-tighter">
                Faça do seu jeito
              </h2>
              <p className="text-ice/60 text-lg leading-relaxed max-w-xl">
                Personalize cada detalhe técnico da sua armadura. Nome, número e o ajuste perfeito para sua performance em quadra.
              </p>
            </div>

            <div className="space-y-10 bg-white/[0.02] backdrop-blur-xl p-10 rounded-[32px] border border-white/5 shadow-2xl">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-5 block">Tamanho oficial</Label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "h-14 rounded-xl border font-black text-xs transition-all duration-300 active:scale-95",
                        selectedSize === size 
                          ? "border-gold bg-gold text-navy shadow-[0_0_20px_rgba(252,195,7,0.3)]" 
                          : "border-white/5 bg-white/[0.02] text-ice/60 hover:border-gold/30 hover:text-gold"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">Nome do Atleta</Label>
                  <Input 
                    placeholder="EX: ANDRÉ" 
                    value={athleteName}
                    onChange={(e) => setAthleteName(e.target.value.toUpperCase().slice(0, 15))}
                    className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-lg tracking-widest placeholder:text-ice/10 focus:border-gold/50 focus:ring-gold/20 transition-all uppercase" 
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-3 block">Número</Label>
                  <Input 
                    placeholder="00" 
                    value={athleteNumber}
                    onChange={(e) => setAthleteNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className="h-16 bg-white/[0.02] border-white/10 rounded-xl font-black text-2xl text-center tracking-widest placeholder:text-ice/10 focus:border-gold/50 focus:ring-gold/20 transition-all" 
                  />
                </div>
              </div>

              {/* Integração Turnstile */}
              <div className="py-2 border-t border-white/5">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 mb-4 block">Verificação de Segurança</Label>
                <TurnstileWidget 
                  ref={turnstileRef}
                  onTokenChange={setTurnstileToken}
                  onError={() => toast.error("Erro na validação de segurança.")}
                />
              </div>

              <Button
                size="lg"
                className="w-full h-18 text-lg font-black uppercase tracking-widest glow-gold rounded-2xl active:scale-[0.98] transition-all"
                disabled={!turnstileToken || isSubmitting || !athleteName.trim() || !athleteNumber.trim()}
                onClick={handleOrderSubmit}
              >
                {isSubmitting ? "Processando..." : "Reservar Agora"}
              </Button>

              <div className="pt-2">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-royal/10 border border-royal/20">
                  <div className="mt-1 w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" />
                  <p className="text-ice/50 text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed">
                    Sua reserva será processada de forma segura. O pagamento será combinado após a confirmação do pedido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
