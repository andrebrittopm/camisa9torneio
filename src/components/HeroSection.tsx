import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductStage } from "./ProductStage";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 overflow-hidden">
      {/* Giant Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[20vw] font-heading font-black text-white/[0.02] uppercase leading-none whitespace-nowrap">
          9º TORNEIO
        </span>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-royal/30 border border-royal/50 text-gold text-xs font-bold tracking-widest uppercase mb-8">
              9º TORNEIO • ACS • COXIM-MS • 2026
            </div>
            
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold leading-tight uppercase mb-6">
              Vista a história.<br />
              <span className="text-gold text-shadow-glow">Jogue como um campeão.</span>
            </h1>
            
            <p className="text-lg text-ice/80 max-w-lg mb-10">
              Escolha o modelo oficial do 9º Torneio Amigos do Vôlei, personalize seu nome e número e garanta a sua camisa.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" variant="secondary" className="px-8 py-7 text-lg font-bold uppercase tracking-wider glow-gold">
                Escolher minha camisa
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-7 text-lg font-bold uppercase tracking-wider border-ice/20 hover:bg-ice/10">
                Ver modelos
              </Button>
            </div>
          </motion.div>

          {/* Product Stage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <ProductStage />
          </motion.div>
        </div>
      </div>
      
      {/* Bottom markings (Court lines suttle) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute bottom-0 left-1/4 w-px h-24 bg-gradient-to-t from-gold/20 to-transparent" />
      <div className="absolute bottom-0 right-1/4 w-px h-24 bg-gradient-to-t from-gold/20 to-transparent" />
    </section>
  );
}
