import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomizationPreview() {
  const sizes = ["PP", "P", "M", "G", "GG", "XG", "XXG"];

  return (
    <section className="py-24 relative bg-navy/20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Mockup Preview Area */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="aspect-square glass rounded-3xl border-ice/5 relative flex flex-col items-center justify-center p-12 overflow-hidden"
          >
             <div className="absolute inset-0 bg-grid-tech opacity-10" />
             <div className="relative z-10 w-full h-full border-2 border-dashed border-ice/10 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-gold font-heading font-black text-6xl opacity-10 mb-4 select-none">PREVIEW</span>
                <span className="text-ice/40 text-sm uppercase tracking-widest font-bold">Visualização Personalizada</span>
             </div>
             
             {/* Floating UI Badges */}
             <div className="absolute top-8 right-8 glass px-4 py-2 rounded-lg text-[10px] font-bold text-gold border-gold/20 uppercase tracking-widest">
               Mockup Real-Time
             </div>
          </motion.div>

          {/* Form UI Demo */}
          <div className="flex flex-col">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold uppercase mb-4">
              Faça do seu jeito
            </h2>
            <p className="text-ice/60 mb-10 text-lg">
              Personalize os detalhes da sua camisa oficial para entrar em quadra com exclusividade.
            </p>

            <div className="space-y-8 glass p-8 rounded-3xl border-ice/5">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-ice/60 mb-4 block">Tamanho</Label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      className={cn(
                        "w-12 h-12 rounded-lg border border-ice/10 flex items-center justify-center text-sm font-bold hover:border-gold hover:text-gold transition-colors",
                        size === "M" ? "border-gold text-gold" : ""
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-widest text-ice/60 mb-2 block">Nome do Atleta</Label>
                  <Input 
                    placeholder="Ex: ANDRÉ" 
                    defaultValue="ANDRÉ"
                    className="h-14 bg-navy/50 border-ice/10 font-bold placeholder:text-ice/20" 
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-widest text-ice/60 mb-2 block">Número</Label>
                  <Input 
                    placeholder="Ex: 10" 
                    defaultValue="10"
                    className="h-14 bg-navy/50 border-ice/10 font-bold placeholder:text-ice/20" 
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-royal/10 border border-royal/20 text-ice/60 text-xs">
                  <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                  Visualização ilustrativa. Estes campos não salvam dados nesta etapa.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper for cn (already defined in project, but locally for this file if needed)
import { cn } from "@/lib/utils";
