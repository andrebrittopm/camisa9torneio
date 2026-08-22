import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AvShirtModel, AvCatalogEvent } from "@/lib/av-catalog-client";
import { X, ZoomIn, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { getPublicProductDisplayName } from "@/utils/av-public-status-mapper";

interface ModelGalleryProps {
  model: AvShirtModel;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
  eventInfo: AvCatalogEvent;
  allModels: AvShirtModel[];
}

function ModelGallery({ model, isOpen, onClose, onSelect, isSelected, eventInfo, allModels }: ModelGalleryProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) setIsZoomed(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isZoomed]);

  if (!isOpen) return null;

  const currentImage = activeSide === 'front' ? model.front_image_url : model.back_image_url;
  const hasBackImage = !!model.back_image_url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      >
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-6xl bg-white/[0.02] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Display Area */}
          <div className="flex-1 relative bg-black/20 flex items-center justify-center p-6 md:p-12 overflow-hidden group">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSide}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "relative w-full h-full flex items-center justify-center transition-all duration-700 cursor-zoom-in",
                  isZoomed && "scale-[1.8] cursor-zoom-out z-50"
                )}
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={`${model.name} - ${activeSide === 'front' ? 'Frente' : 'Costas'}`}
                    className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-6 opacity-20">
                    <svg viewBox="0 0 60 100" className="w-48 h-72 fill-current">
                      <path d="M30 0C10 0 0 10 0 30V80H10V95H50V80H60V30C60 10 50 0 30 0Z" />
                    </svg>
                    <span className="font-black uppercase tracking-[0.4em] text-xs">Arte oficial em breve</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {!isZoomed && (
              <>
                {/* Controls Overlay */}
                <div className="absolute top-6 left-6 flex items-center gap-4">
                  <div className="bg-gold text-navy text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                    {getPublicProductDisplayName(model, allModels)}
                  </div>
                  <div className="bg-white/5 backdrop-blur-md text-ice/60 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-white/10">
                    {activeSide === 'front' ? 'Frente' : 'Costas'}
                  </div>
                </div>

                <button 
                  onClick={() => setIsZoomed(true)}
                  className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-ice/40 hover:text-gold hover:border-gold/50 transition-all active:scale-90"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                {hasBackImage && (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4">
                    <button
                      onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
                      className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-ice/40 hover:text-gold hover:border-gold/50 transition-all active:scale-90"
                      aria-label="Trocar vista"
                    >
                      {activeSide === 'front' ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Details Panel */}
          <div className="w-full md:w-[400px] p-8 md:p-12 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 bg-white/[0.01]">
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-gold font-black uppercase tracking-[0.4em] mb-2 block">
                    {model.category === 'tshirt' ? 'CAMISA OFICIAL' : 'REGATA OFICIAL'}
                  </span>
                  <h3 className="text-4xl font-heading font-black uppercase tracking-tighter leading-none mb-4">{getPublicProductDisplayName(model, allModels)}</h3>
                  <div className="text-3xl font-black text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eventInfo.unit_price)}
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-ice/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-ice/30">Especificações</span>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-ice/70">
                      <div className="w-1 h-1 rounded-full bg-gold" />
                      Tecido Dry-Fit Alta Performance
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-ice/70">
                      <div className="w-1 h-1 rounded-full bg-gold" />
                      Sublimação Digital de Alta Definição
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-ice/70">
                      <div className="w-1 h-1 rounded-full bg-gold" />
                      Proteção UV 50+
                    </li>
                  </ul>
                </div>

                {hasBackImage && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveSide('front')}
                      className={cn(
                        "h-14 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all",
                        activeSide === 'front' 
                          ? "border-gold bg-gold/10 text-gold" 
                          : "border-white/5 bg-white/[0.02] text-ice/40 hover:border-white/20"
                      )}
                    >
                      Frente
                    </button>
                    <button
                      onClick={() => setActiveSide('back')}
                      className={cn(
                        "h-14 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all",
                        activeSide === 'back' 
                          ? "border-gold bg-gold/10 text-gold" 
                          : "border-white/5 bg-white/[0.02] text-ice/40 hover:border-white/20"
                      )}
                    >
                      Costas
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-ice/40">Disponível para pedido</span>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  onSelect();
                  onClose();
                  document.getElementById('camisa')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={cn(
                  "w-full h-20 text-lg font-black uppercase tracking-widest rounded-2xl transition-all",
                  isSelected ? "bg-slate-800 text-slate-500" : "glow-gold"
                )}
              >
                {isSelected ? "Já Selecionado" : "Selecionar Modelo"}
              </Button>
              <p className="text-center text-[9px] text-ice/20 font-black uppercase tracking-[0.2em]">
                A personalização é feita no próximo passo
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

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
  allModels: AvShirtModel[];
}) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(eventInfo.unit_price);
  }, [eventInfo.unit_price]);

  return (
    <>
      <motion.div
        layout
        whileHover={{ y: -12 }}
        className={cn(
          "relative rounded-[32px] overflow-hidden group transition-all duration-500 flex flex-col h-full",
          "bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl border",
          isSelected 
            ? "border-gold shadow-[0_0_30px_rgba(252,195,7,0.2)]" 
            : "border-ice/5 hover:border-ice/20"
        )}
      >
        <div 
          className="aspect-[4/5] relative flex items-center justify-center p-6 overflow-hidden cursor-pointer"
          onClick={() => setIsGalleryOpen(true)}
        >
          <div className="absolute inset-0 bg-radial-[at_50%_40%] from-royal/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center border border-dashed border-ice/10 rounded-2xl group-hover:border-gold/20 transition-all duration-500 bg-white/[0.01]">
            {model.front_image_url ? (
              <img 
                src={model.front_image_url} 
                alt={model.name}
                className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-32 h-44 md:w-40 md:h-56 relative flex items-center justify-center">
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-gold/30" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-gold/30" />
                <svg viewBox="0 0 60 100" className="w-full h-full text-ice/10 fill-current drop-shadow-2xl">
                  <path d="M30 0C10 0 0 10 0 30V80H10V95H50V80H60V30C60 10 50 0 30 0Z" />
                </svg>
              </div>
            )}
            
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-navy/60 backdrop-blur-md p-2 rounded-lg border border-white/10">
                <Eye className="w-4 h-4 text-gold" />
              </div>
            </div>

            {!model.front_image_url && (
              <div className="mt-4 flex flex-col items-center">
                <span className="text-[10px] text-ice/30 uppercase tracking-[0.2em] font-black">ARTE OFICIAL EM BREVE</span>
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

        <div className="p-8 pt-2 relative z-10 flex flex-col flex-1">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="text-[10px] text-gold font-black uppercase tracking-[0.3em] mb-1 block">
                {model.category === 'tshirt' ? 'CAMISA OFICIAL' : 'REGATA OFICIAL'}
              </span>
              <h3 className="text-2xl font-heading font-black uppercase tracking-tighter leading-none">{getPublicProductDisplayName(model, allModels)}</h3>
              <div className="text-gold font-black text-lg mt-2">{formattedPrice}</div>
            </div>
          </div>
          
          <div className="mt-auto flex gap-3">
            <Button 
              variant="outline"
              className="flex-1 font-black uppercase tracking-[0.2em] h-14 rounded-2xl border-white/10 hover:border-gold/50 hover:bg-gold/5 text-[10px]"
              onClick={() => setIsGalleryOpen(true)}
            >
              Ver Detalhes
            </Button>
            <Button 
              variant={isSelected ? "secondary" : "default"} 
              className={cn(
                "flex-1 font-black uppercase tracking-[0.2em] h-14 rounded-2xl transition-all duration-300 text-[10px]",
                isSelected ? "glow-gold" : "bg-white/5 border border-white/10 hover:bg-white/10",
                isSelected && "pointer-events-none opacity-80"
              )}
              onClick={onSelect}
            >
              {isSelected ? "Selecionado" : "Selecionar"}
            </Button>
          </div>
        </div>
      </motion.div>

      <ModelGallery 
        model={model}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelect={onSelect}
        isSelected={isSelected}
        eventInfo={eventInfo}
        allModels={allModels}
      />
    </>
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
  // Categorias baseadas nos modelos ATIVOS realmente recebidos
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    models.forEach(m => cats.add(m.category));
    return Array.from(cats);
  }, [models]);

  const [activeTab, setActiveTab] = useState<'tshirt' | 'tank'>(() => {
    if (availableCategories.includes('tshirt')) return 'tshirt';
    if (availableCategories.length > 0) return availableCategories[0] as 'tshirt' | 'tank';
    return 'tshirt';
  });

  const filteredModels = useMemo(() => models.filter(m => m.category === activeTab), [models, activeTab]);

  const counts = useMemo(() => ({
    tshirt: models.filter(m => m.category === 'tshirt').length,
    tank: models.filter(m => m.category === 'tank').length
  }), [models]);

  useEffect(() => {
    const currentModel = models.find(m => m.id === selectedModelId);
    if (currentModel && currentModel.category !== activeTab) {
      setActiveTab(currentModel.category);
    }
  }, [selectedModelId, models]);

  if (models.length === 1 && models[0]) {
    const singleModel = models[0];
    return (
      <section id="camisa" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-4 tracking-tighter">
              Escolha o modelo que combina com você
            </h2>
            <p className="text-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs bg-gold/10 inline-block px-4 py-1 rounded-full">
              9º Torneio Amigos do Vôlei — ACS
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <ModelCard 
              model={singleModel} 
              isSelected={true}
              onSelect={() => {}}
              eventInfo={eventInfo}
              allModels={models}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="camisa" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-4 tracking-tighter">
            Escolha seu estilo
          </h2>
          <p className="text-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs bg-gold/10 inline-block px-4 py-1 rounded-full">
            Seis modelos oficiais. Uma só paixão pelo vôlei.
          </p>
        </div>

        {availableCategories.length > 1 && (
          <div className="flex justify-center mb-16">
            <div className="inline-flex p-1.5 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
              {(['tshirt', 'tank'] as const).filter(t => availableCategories.includes(t)).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 md:px-12 py-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 relative",
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
                  {tab === 'tshirt' ? `Camisa (${counts.tshirt})` : `Regata (${counts.tank})`}
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12"
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
