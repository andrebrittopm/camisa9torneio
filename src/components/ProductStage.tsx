import { motion } from "framer-motion";

export function ProductStage() {
  return (
    <div className="relative w-full aspect-square max-w-lg mx-auto flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-royal/20 blur-[100px] rounded-full animate-pulse" />
      
      {/* Decorative Grids */}
      <div className="absolute inset-0 bg-grid-tech opacity-20 mask-radial-gradient" />

      {/* Placeholder Product */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ 
          y: [-15, 15, -15],
          rotateY: [0, 10, -10, 0]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative z-10 w-4/5 h-4/5 flex items-center justify-center"
      >
        <div className="w-full h-full glass rounded-3xl border-gold/30 flex flex-col items-center justify-center p-8 glow-blue">
          <div className="w-32 h-48 bg-ice/10 rounded-2xl border border-ice/20 mb-6 flex items-center justify-center overflow-hidden">
             {/* Silhouette placeholder */}
             <svg width="60" height="100" viewBox="0 0 60 100" className="text-ice/20 fill-current">
                <path d="M30 0C10 0 0 10 0 30V80H10V95H50V80H60V30C60 10 50 0 30 0Z" />
             </svg>
          </div>
          <span className="text-gold font-heading font-bold uppercase tracking-[0.2em] text-center">
            Modelo oficial em breve
          </span>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-gold/50" />
            ))}
          </div>
        </div>

        {/* Passing Light Effect */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      </motion.div>
      
      {/* Stage Shadow */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/40 blur-xl rounded-full" />
    </div>
  );
}
