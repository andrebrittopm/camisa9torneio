import { motion } from "framer-motion";

export function ProductStage() {
  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto flex items-center justify-center group">
      {/* Dynamic Lighting Background */}
      <div className="absolute inset-0 bg-radial-[at_50%_50%] from-royal/30 via-transparent to-transparent blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-radial-[at_50%_50%] from-gold/5 via-transparent to-transparent blur-2xl opacity-50" />
      
      {/* Decorative Circles/Rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="absolute rounded-full border border-ice/5"
            style={{ 
              width: `${40 + i * 20}%`, 
              height: `${40 + i * 20}%`,
              opacity: 1 - i * 0.2
            }}
          />
        ))}
      </div>

      {/* Grid of Perspective */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(3,50,173,0.1))] perspective-[1000px]">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            backgroundImage: `linear-gradient(to right, rgba(244,242,241,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,242,241,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'rotateX(60deg) translateY(-50%)',
            transformOrigin: 'top'
          }}
        />
      </div>

      {/* Main Content Area */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ 
          y: [-10, 10, -10],
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <div className="relative flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-700">
           {/* Glow behind the jersey */}
           <div className="absolute inset-0 bg-royal/40 blur-3xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
           
           <div className="relative w-[320px] md:w-[480px] aspect-[4/3] flex items-center justify-center">
             {/* Tech lines decorations */}
             <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-gold/40" />
             <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-gold/40" />
             
             <img 
               src="/tshirt-01-oficial.webp" 
               alt="Camiseta Oficial 2026"
               className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(3,50,173,0.6)]"
             />
             
             {/* Subtle technical particles/elements */}
             <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-gold/60 rounded-full animate-ping" />
             <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-gold/60 rounded-full animate-ping delay-700" />
           </div>

           <div className="mt-8 flex flex-col items-center gap-2">
             <div className="flex items-center gap-3 mb-1">
               <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse glow-gold" />
               <span className="text-gold font-heading font-black uppercase tracking-[0.4em] text-sm">
                 Uniforme Oficial 2026
               </span>
             </div>
             <span className="text-ice/60 text-[11px] font-bold uppercase tracking-[0.25em] border border-ice/20 px-5 py-2 rounded-full backdrop-blur-md bg-white/5">
               Edição Limitada • Alta Performance
             </span>
           </div>
        </div>

        {/* Passing Light Effect */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
        />
      </motion.div>
      
      {/* Contact Shadow */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-black/60 blur-3xl rounded-full" />
    </div>
  );
}
