import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function FinalCTA() {
  const scrollToSelection = () => {
    const el = document.getElementById('camisas');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="pedido-final" className="py-24 relative overflow-hidden px-6 bg-navy">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl mx-auto relative bg-gradient-to-br from-royal/20 to-navy rounded-[48px] p-12 md:p-24 overflow-hidden text-center border border-white/5 shadow-2xl"
      >
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-radial-[at_50%_50%] from-royal/30 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-royal/20 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gold/5 blur-[100px] rounded-full" />
        
        {/* Decorative Court Lines */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-gold/20 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-t from-gold/20 to-transparent" />
        <div className="absolute top-1/2 left-0 w-24 h-px bg-gradient-to-r from-gold/20 to-transparent" />
        <div className="absolute top-1/2 right-0 w-24 h-px bg-gradient-to-l from-gold/20 to-transparent" />

        <div className="relative z-10">
          <span className="text-gold font-black uppercase tracking-[0.4em] text-[10px] md:text-xs mb-8 block">Tempestade 2026</span>
          <h2 className="text-5xl md:text-7xl font-heading font-black uppercase mb-8 leading-[0.9] tracking-tighter">
            Pronto para entrar<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-dark drop-shadow-[0_0_10px_rgba(252,195,7,0.2)]">em quadra?</span>
          </h2>
          <p className="text-lg md:text-xl text-ice/70 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Escolha sua camisa oficial do <span className="text-ice font-bold">9º Torneio Amigos do Vôlei</span> e faça parte da elite desta temporada.
          </p>
          <Button 
            onClick={scrollToSelection}
            size="lg" 
            variant="secondary" 
            className="px-12 py-8 text-xl font-black uppercase tracking-widest glow-gold hover:scale-105 active:scale-95 transition-all duration-300 rounded-2xl"
          >
            Escolher minha camisa
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
