import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductStage } from "./ProductStage";

export function HeroSection() {
  const scrollToSelection = () => {
    const el = document.getElementById('camisa');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="inicio" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Giant Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[18vw] font-heading font-black text-white/[0.015] uppercase leading-none whitespace-nowrap translate-y-[-5%] tracking-tighter">
          AMIGOS DO VÔLEI
        </span>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-80px)]">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-royal/10 border border-royal/20 text-gold text-[10px] md:text-xs font-black tracking-[0.2em] uppercase mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-gold rounded-full mr-2 animate-pulse" />
              9º TORNEIO • ACS • COXIM-MS • 2026
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-heading font-black leading-[0.9] md:leading-[0.85] uppercase mb-8 tracking-tighter">
              Vista a <span className="text-white">história.</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-dark to-gold animate-gradient-x drop-shadow-[0_0_15px_rgba(252,195,7,0.3)]">Jogue como um campeão.</span>
            </h1>
            
            <p className="text-base md:text-xl text-ice/70 max-w-lg mb-12 leading-relaxed md:leading-normal font-medium">
              Apresentamos a <span className="text-ice font-bold">Camisa Oficial</span> do <span className="text-ice font-bold">9º Torneio Amigos do Vôlei</span>. 
              Design de elite, performance profissional e a alma do esporte em cada fibra.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <Button 
                onClick={() => document.getElementById('camisa')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                variant="secondary" 
                className="px-10 py-8 text-lg font-black uppercase tracking-widest glow-gold hover:scale-105 active:scale-95 transition-all duration-300"
              >
                QUERO MINHA CAMISA
              </Button>
              <Button 
                onClick={() => document.getElementById('camisa')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                variant="outline" 
                className="px-10 py-8 text-lg font-black uppercase tracking-widest border-ice/10 hover:bg-ice/5 hover:border-gold/30 active:scale-95 transition-all duration-300 backdrop-blur-sm"
              >
                Ver Camisa Oficial
              </Button>
            </div>

            {/* Subtle labels */}
            <div className="mt-16 flex items-center gap-8 opacity-30 select-none hidden lg:flex">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Torneio</span>
                <span className="text-xl font-black">09</span>
              </div>
              <div className="w-px h-8 bg-ice/20" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sede</span>
                <span className="text-xl font-black">ACS</span>
              </div>
              <div className="w-px h-8 bg-ice/20" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ano</span>
                <span className="text-xl font-black">2026</span>
              </div>
            </div>
          </motion.div>

          {/* Product Stage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 lg:order-2 w-full"
          >
            <ProductStage />
          </motion.div>
        </div>
      </div>
      
      {/* Decorative markings (Court lines) */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
      <div className="absolute top-1/2 left-0 w-32 h-px bg-gradient-to-r from-gold/5 to-transparent rotate-45 opacity-20" />
      <div className="absolute bottom-1/4 right-0 w-48 h-px bg-gradient-to-l from-royal/20 to-transparent -rotate-12 opacity-30" />
    </section>
  );
}
