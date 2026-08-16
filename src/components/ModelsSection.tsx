import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AvShirtModel, AvCatalogEvent } from "@/lib/av-catalog-client";

export function ModelCard({ 
  model, 
  isSelected, 
  onSelect,
  eventInfo
}: { 
  model: AvShirtModel; 
  isSelected: boolean;
  onSelect: () => void;
  eventInfo: AvCatalogEvent;
}) {
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(eventInfo.unit_price);
  }, [eventInfo.unit_price]);
  return (
    <motion.div
      layout
      whileHover={{ y: -12 }}
      className={cn(
        "relative rounded-[32px] overflow-hidden group transition-all duration-500",
        "bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl border",
        isSelected 
          ? "border-gold shadow-[0_0_30px_rgba(252,195,7,0.2)]" 
          : "border-ice/5 hover:border-ice/20"
      )}
    >
      <div className="aspect-[4/5] relative flex items-center justify-center p-6 overflow-hidden">
        {/* Internal Gradient Glow */}
        <div className="absolute inset-0 bg-radial-[at_50%_40%] from-royal/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Placeholder Image Area - Larger & Prepared for images */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center border border-dashed border-ice/10 rounded-2xl group-hover:border-gold/20 transition-all duration-500 bg-white/[0.01]">
          {model.front_image_url ? (
            <img 
              src={model.front_image_url} 
              alt={model.name}
              className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-32 h-44 md:w-40 md:h-56 relative flex items-center justify-center">
              {/* Tech markers */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-gold/30" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-gold/30" />
              
              <svg viewBox="0 0 60 100" className="w-full h-full text-ice/10 fill-current drop-shadow-2xl">
                <path d="M30 0C10 0 0 10 0 30V80H10V95H50V80H60V30C60 10 50 0 30 0Z" />
              </svg>
            </div>
          )}
          {!model.front_image_url && (
            <div className="mt-4 flex flex-col items-center">
              <span className="text-[10px] text-ice/30 uppercase tracking-[0.2em] font-black">Modelo oficial em breve</span>
              <div className="mt-1 flex gap-1">
                <div className="w-1 h-1 rounded-full bg-gold/20" />
                <div className="w-1 h-1 rounded-full bg-gold/20" />
              </div>
            </div>
          )}
        </div>

        {isSelected && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-6 right-6 bg-gold text-navy text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg z-20"
          >
            Selecionado
          </motion.div>
        )}
      </div>

      <div className="p-8 pt-2 relative z-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-gold font-black uppercase tracking-[0.3em] mb-1 block">
              {model.category === 'tshirt' ? 'Camiseta' : 'Regata'}
            </span>
            <h3 className="text-2xl font-heading font-black uppercase tracking-tighter">{model.name}</h3>
            <div className="text-gold font-black text-lg mt-1">{formattedPrice}</div>
          </div>
          <div className="text-[10px] font-black text-ice/20 uppercase tracking-widest">
            {eventInfo.event_year}
          </div>
        </div>
        <Button 
          variant={isSelected ? "secondary" : "outline"} 
          className={cn(
            "w-full font-black uppercase tracking-[0.2em] h-14 rounded-2xl transition-all duration-300",
            isSelected ? "glow-gold" : "border-ice/10 hover:border-gold/50 hover:bg-gold/5"
          )}
          onClick={onSelect}
        >
          {isSelected ? "Selecionado" : "Ver Modelo"}
        </Button>
      </div>
    </motion.div>
  );
}

export function ModelsSection({
  models,
  selectedModelId,
  onSelectModel,
  eventInfo
}: {
  models: AvShirtModel[];
  selectedModelId: string | null;
  onSelectModel: (model: AvShirtModel) => void;
  eventInfo: AvCatalogEvent;
}) {
  const [activeTab, setActiveTab] = useState<'tshirt' | 'tank'>('tshirt');

  const filteredModels = useMemo(() => models.filter(m => m.category === activeTab), [models, activeTab]);

  const counts = useMemo(() => ({
    tshirt: models.filter(m => m.category === 'tshirt').length,
    tank: models.filter(m => m.category === 'tank').length
  }), [models]);

  useEffect(() => {
    // Se trocar de aba e o modelo selecionado não for da aba ativa, seleciona o primeiro da aba
    const currentModel = models.find(m => m.id === selectedModelId);
    if (currentModel && currentModel.category !== activeTab) {
      const firstInTab = filteredModels[0];
      if (firstInTab) {
        onSelectModel(firstInTab);
      }
    }
  }, [activeTab, models, selectedModelId, filteredModels, onSelectModel]);

  return (
    <section id="camisas" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-4 tracking-tighter">
            Escolha seu estilo
          </h2>
          <p className="text-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs bg-gold/10 inline-block px-4 py-1 rounded-full">
            Seis modelos. Uma só paixão pelo vôlei.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex p-1.5 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            {(['tshirt', 'tank'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-10 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 relative",
                  activeTab === tab 
                    ? "text-ice shadow-xl" 
                    : "text-ice/40 hover:text-ice/80"
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-royal rounded-xl -z-10 shadow-[0_0_20px_rgba(3,50,173,0.5)] border border-royal-light/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab === 'tshirt' ? `Camiseta (${counts.tshirt})` : `Regata (${counts.tank})`}
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
                  onSelect={() => onSelectModel(model)}
                  eventInfo={eventInfo}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
