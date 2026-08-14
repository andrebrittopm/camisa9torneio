import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section id="pedido" className="py-24 relative overflow-hidden px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto relative glass rounded-[40px] p-12 md:p-24 overflow-hidden text-center"
      >
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-royal/40 via-transparent to-gold/10" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-royal/30 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gold/10 blur-[100px] rounded-full" />

        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-heading font-black uppercase mb-6 leading-tight">
            Pronto para entrar<br />em quadra?
          </h2>
          <p className="text-lg md:text-xl text-ice/80 max-w-2xl mx-auto mb-12">
            Escolha sua camisa oficial do 9º Torneio Amigos do Vôlei e faça parte da elite desta temporada.
          </p>
          <Button size="lg" variant="secondary" className="px-12 py-8 text-xl font-bold uppercase tracking-widest glow-gold hover:scale-105 transition-transform">
            Escolher minha camisa
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
