import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AvShirtModel, AvCatalogEvent } from "@/lib/av-catalog-client";


/**
 * ETAPA 3.3A-2A — CUSTOMIZATION PREVIEW INTEGRADO COM TURNSTILE
 * Nota: Este componente agora atua como o formulário real de pedido.
 */

export function CustomizationPreview({
  selectedModel,
  eventInfo,
  customName,
  customNumber
}: {
  selectedModel: AvShirtModel | null;
  eventInfo: AvCatalogEvent;
  customName?: string;
  customNumber?: string;
}) {
  const athleteName = customName || "SEU NOME";
  const athleteNumber = customNumber || "00";

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(eventInfo.unit_price);
  }, [eventInfo.unit_price]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="aspect-square bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl rounded-[40px] border border-white/5 relative flex flex-col items-center justify-center p-12 overflow-hidden shadow-2xl"
    >
      <div className="absolute inset-0 bg-grid-tech opacity-10" />
      
      <div className="relative z-10 w-full h-full border border-dashed border-ice/10 rounded-3xl flex flex-col items-center justify-center group">
        {selectedModel?.image_url ? (
          <img 
            src={selectedModel.image_url} 
            alt={selectedModel.name}
            className="absolute inset-0 w-full h-full object-contain p-8 opacity-20"
          />
        ) : null}
        
        <div className="relative w-48 h-72 md:w-56 md:h-80 flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-105">
          <svg viewBox="0 0 60 100" className="absolute inset-0 w-full h-full text-ice/5 fill-current drop-shadow-2xl">
            <path d="M30 0C10 0 0 10 0 30V80H10V95H50V80H60V30C60 10 50 0 30 0Z" />
          </svg>
          
          <div className="absolute top-[35%] w-full text-center px-4 overflow-hidden">
            <span className="text-ice font-heading font-black uppercase text-[10px] md:text-xs tracking-[0.3em] block truncate drop-shadow-md">
              {athleteName}
            </span>
          </div>
          
          <div className="absolute top-[45%] w-full text-center">
            <span className="text-gold font-heading font-black text-6xl md:text-8xl leading-none drop-shadow-lg">
              {athleteNumber}
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
          <span className="text-gold text-xs font-black">{eventInfo.event_number.toString().padStart(2, '0')}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Configurador v1.0</span>
      </div>
      
      <div className="absolute top-8 right-8 text-[10px] font-black text-gold uppercase tracking-[0.15em] opacity-30">
        Prévia ilustrativa
      </div>
    </motion.div>
  );
}

/**
 * DEPRECATED: CustomizationPreviewForm logic moved to OrderConfigurator.
 * Keeping file structure for visual preview only.
 */

             
             <div className="absolute top-8 left-8 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center border border-gold/20">
                  <span className="text-gold text-xs font-black">{eventInfo.event_number.toString().padStart(2, '0')}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-ice/40">Configurador v1.0</span>
             </div>
          </motion.div>

          <div className="flex flex-col">
            <div className="mb-10 text-center lg:text-left">
              <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Exclusividade</span>
              <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-6 tracking-tighter">
                {selectedModel?.name || "Faça do seu jeito"}
              </h2>
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <p className="text-ice/60 text-lg leading-relaxed max-w-xl">
                  Personalize sua armadura oficial para o {eventInfo.event_name}.
                </p>
                <div className="bg-gold/10 px-6 py-2 rounded-full border border-gold/20 shrink-0">
                  <span className="text-gold font-black text-2xl">{formattedPrice}</span>
                </div>
              </div>
              {selectedModel?.allow_custom_size && sizes.includes('OUTRO') && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-royal/20 border border-royal/30 rounded-lg mb-4">
                  <div className="w-1.5 h-1.5 bg-royal-light rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-royal-light uppercase tracking-widest">Tamanho personalizado disponível</span>
                </div>
              )}
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
                className={cn(
                  "w-full h-18 text-lg font-black uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all",
                  eventInfo.orders_available ? "glow-gold" : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                )}
                disabled={!eventInfo.orders_available || !turnstileToken || isSubmitting || !athleteName.trim() || !athleteNumber.trim()}
                onClick={handleOrderSubmit}
              >
                {eventInfo.orders_available 
                  ? (isSubmitting ? "Processando..." : "Reservar Agora")
                  : "Pedidos Encerrados"
                }
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
