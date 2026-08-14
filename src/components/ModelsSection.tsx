import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { shirtModels } from "@/lib/constants";

export function ModelCard({ model, isSelected, onSelect }: { 
  model: typeof shirtModels[0]; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      layout
      whileHover={{ y: -10 }}
      className={cn(
        "relative glass rounded-3xl overflow-hidden group transition-all duration-500",
        isSelected ? "ring-2 ring-gold glow-gold" : "border-ice/5 hover:border-ice/20"
      )}
    >
      <div className="aspect-[4/5] relative flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-navy/80 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Placeholder Image Area */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-ice/10 rounded-2xl group-hover:border-gold/30 transition-colors">
          <div className="w-24 h-32 bg-ice/5 rounded-xl mb-4" />
          <span className="text-xs text-ice/40 uppercase tracking-widest font-bold">Imagem Frontal</span>
        </div>

        {isSelected && (
          <div className="absolute top-4 right-4 bg-gold text-navy text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
            Selecionado
          </div>
        )}
      </div>

      <div className="p-6 border-t border-ice/5 bg-navy/40 backdrop-blur-md">
        <span className="text-[10px] text-gold font-bold uppercase tracking-widest mb-1 block">
          {model.category === 'tshirt' ? 'Camiseta' : 'Regata'}
        </span>
        <h3 className="text-xl font-heading font-bold uppercase mb-4">{model.name}</h3>
        <Button 
          variant={isSelected ? "secondary" : "outline"} 
          className="w-full font-bold uppercase tracking-widest h-12"
          onClick={onSelect}
        >
          {isSelected ? "Selecionado" : "Ver Modelo"}
        </Button>
      </div>
    </motion.div>
  );
}

export function ModelsSection() {
  const [activeTab, setActiveTab] = useState<'tshirt' | 'tank'>('tshirt');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const filteredModels = shirtModels.filter(m => m.category === activeTab);

  return (
    <section id="camisas" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold uppercase mb-4">
            Escolha seu estilo
          </h2>
          <p className="text-ice/60 uppercase tracking-widest text-sm">
            Seis modelos. Uma só paixão pelo vôlei.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-navy/50 rounded-xl border border-ice/5">
            {(['tshirt', 'tank'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all",
                  activeTab === tab 
                    ? "bg-royal text-ice glow-blue" 
                    : "text-ice/40 hover:text-ice"
                )}
              >
                {tab === 'tshirt' ? 'Camiseta' : 'Regata'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ModelCard 
                  model={model} 
                  isSelected={selectedModelId === model.id}
                  onSelect={() => setSelectedModelId(model.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
