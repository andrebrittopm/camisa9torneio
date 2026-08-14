import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AvShirtModel, AvCatalogEvent } from "@/lib/av-catalog-client";

/**
 * ETAPA 4.2A — CUSTOMIZATION PREVIEW
 * Componente visual que exibe a prévia da camisa com nome e número.
 */

export function CustomizationPreview({
  selectedModel,
  eventInfo,
  customName,
  customNumber
}: {
  selectedModel: AvShirtModel | null;
  eventInfo: AvCatalogEvent;
  customName?: string | null;
  customNumber?: string | null;
}) {
  const athleteName = customName || "SEU NOME";
  const athleteNumber = customNumber || "00";

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
