import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AvShirtModel, AvCatalogEvent } from "@/lib/av-catalog-client";
import { X, ZoomIn, ChevronLeft, ChevronRight, Eye, ZoomOut, Maximize2, RefreshCcw } from "lucide-react";

interface ModelGalleryProps {
  model: AvShirtModel;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
  eventInfo: AvCatalogEvent;
}

function ModelGallery({ model, isOpen, onClose, onSelect, isSelected, eventInfo }: ModelGalleryProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) handleToggleZoom();
        else onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isZoomed]);

  const handleToggleZoom = useCallback(() => {
    if (isZoomed) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
    setIsZoomed(!isZoomed);
  }, [isZoomed]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    setIsDragging(true);
    setStartPan({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isZoomed) return;
    setPanPosition({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!isOpen) return null;

  const currentImage = activeSide === 'front' ? model.front_image_url : model.back_image_url;
  const hasBackImage = !!model.back_image_url;
  const isOfficial = model.code === 'TSHIRT-01';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8"
      >
        <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-7xl h-full md:h-auto bg-navy/20 md:bg-white/[0.02] md:border md:border-white/10 md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row md:max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Display Area */}
          <div className="flex-1 relative bg-black/40 flex items-center justify-center overflow-hidden group min-h-[50vh] md:min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSide}-${isZoomed}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "relative w-full h-full flex items-center justify-center select-none",
                  isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => !isDragging && !isZoomed && handleToggleZoom()}
              >
                {currentImage ? (
                  <motion.img
                    src={currentImage}
                    alt={activeSide === 'front' ? "Camisa oficial — vista frontal" : "Camisa oficial — vista das costas"}
                    style={{
                      scale: zoomLevel,
                      x: panPosition.x,
                      y: panPosition.y,
                    }}
                    transition={isDragging ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
                    className="max-w-[90%] max-h-[90%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                    draggable={false}
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

            {/* Mobile Touch Navigation */}
            <div className="absolute inset-0 md:hidden flex items-center justify-between px-4 pointer-events-none">
               {hasBackImage && !isZoomed && (
                 <>
                   <button 
                     className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center text-white pointer-events-auto"
                     onClick={() => setActiveSide('front')}
                     aria-label="Ver frente"
                   >
                     <ChevronLeft className="w-6 h-6" />
                   </button>
                   <button 
                     className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center text-white pointer-events-auto"
                     onClick={() => setActiveSide('back')}
                     aria-label="Ver costas"
                   >
                     <ChevronRight className="w-6 h-6" />
                   </button>
                 </>
               )}
            </div>

            {/* Float Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 z-50">
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))}
                className="p-2 text-white/60 hover:text-gold transition-colors"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
                className="p-2 text-white/60 hover:text-gold transition-colors"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-2" />
              <button 
                onClick={handleToggleZoom}
                className={cn("p-2 transition-colors", isZoomed ? "text-gold" : "text-white/60 hover:text-gold")}
                aria-label={isZoomed ? "Restaurar zoom" : "Maximizar"}
              >
                {isZoomed ? <RefreshCcw className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              {hasBackImage && (
                <>
                  <div className="w-px h-4 bg-white/10 mx-2" />
                  <button 
                    onClick={() => {
                      setActiveSide(activeSide === 'front' ? 'back' : 'front');
                      setPanPosition({ x: 0, y: 0 });
                    }}
                    className="p-2 text-white/60 hover:text-gold transition-colors"
                    aria-label="Girar camisa"
                  >
                    <RefreshCcw className="w-5 h-5 animate-spin-slow" />
                  </button>
                </>
              )}
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all z-50"
              aria-label="Fechar visualizador"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-[400px] bg-navy/40 backdrop-blur-xl p-8 md:p-12 flex flex-col border-t md:border-t-0 md:border-l border-white/10">
            <div className="flex-1 space-y-8">
              <div>
                <span className="text-[10px] text-gold font-black uppercase tracking-[0.4em] mb-2 block">
                  {model.category === 'tshirt' ? 'CAMISA OFICIAL' : 'REGATA OFICIAL'}
                </span>
                <h3 className="text-4xl font-heading font-black uppercase tracking-tighter leading-none mb-4">{model.name}</h3>
                <div className="text-3xl font-black text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eventInfo.unit_price)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveSide('front')}
                  className={cn(
                    "h-16 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all",
                    activeSide === 'front' 
                      ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(252,195,7,0.1)]" 
                      : "border-white/5 bg-white/[0.02] text-ice/40 hover:border-white/20"
                  )}
                  aria-label="Ver vista frontal"
                >
                  Frente
                </button>
                <button
                  onClick={() => setActiveSide('back')}
                  className={cn(
                    "h-16 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all",
                    activeSide === 'back' 
                      ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(252,195,7,0.1)]" 
                      : "border-white/5 bg-white/[0.02] text-ice/40 hover:border-white/20"
                  )}
                  aria-label="Ver vista traseira"
                >
                  Costas
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-ice/30">Destaques do Produto</span>
                <ul className="space-y-4">
                  {[
                    "Dry-Fit Performance Plus",
                    "Costuras Reforçadas",
                    "Estampa Digital HD",
                    "Ajuste Ergonômico"
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-ice/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(252,195,7,0.5)]" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8 space-y-6">
              <Button
                size="lg"
                onClick={() => {
                  onSelect();
                  onClose();
                  document.getElementById('camisa')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={cn(
                  "w-full h-20 text-lg font-black uppercase tracking-widest rounded-2xl transition-all",
                  isSelected ? "bg-white/10 text-ice/40 pointer-events-none" : "glow-gold"
                )}
              >
                {isSelected ? "Selecionado" : "Garantir a Minha"}
              </Button>
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
              <div className="w-full h-full flex items-center justify-center relative">
                {model.code === 'TSHIRT-01' || model.code === 'TANK-01' ? (
                  <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-2 p-2">
                    <div className="flex-1 h-full relative">
                      <img 
                        src={model.front_image_url} 
                        alt="Frente"
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-white/20">Frente</span>
                    </div>
                    {model.back_image_url && (
                      <div className="flex-1 h-full relative hidden md:block border-l border-white/5 pl-2">
                        <img 
                          src={model.back_image_url} 
                          alt="Costas"
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-white/20">Costas</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <img 
                    src={model.front_image_url} 
                    alt={model.name}
                    className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                )}
              </div>
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
              <h3 className="text-2xl font-heading font-black uppercase tracking-tighter leading-none">
                {model.category === 'tshirt' ? 'CAMISA OFICIAL' : 'REGATA OFICIAL'}
              </h3>
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
  const [activeTab, setActiveTab] = useState<'tshirt' | 'tank'>('tshirt');

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
              Conheça a Camisa Oficial
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

        <div className="flex justify-center mb-16">
          <div className="inline-flex p-1.5 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            {(['tshirt', 'tank'] as const).map((tab) => (
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
