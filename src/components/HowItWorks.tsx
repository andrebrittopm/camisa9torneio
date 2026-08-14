import { motion } from "framer-motion";
import { MousePointer2, Settings2, Eye, Trophy } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Escolha",
      description: "Selecione sua camiseta ou regata favorita entre os modelos exclusivos.",
      icon: <MousePointer2 className="w-6 h-6" />,
    },
    {
      number: "02",
      title: "Personalize",
      description: "Informe seu tamanho ideal, nome e o número que levará nas costas.",
      icon: <Settings2 className="w-6 h-6" />,
    },
    {
      number: "03",
      title: "Confira",
      description: "Revise todos os dados e veja o preview de como seu uniforme ficará.",
      icon: <Eye className="w-6 h-6" />,
    },
    {
      number: "04",
      title: "Garanta",
      description: "Finalize sua reserva e prepare-se para brilhar no torneio.",
      icon: <Trophy className="w-6 h-6" />,
    },
  ];

  return (
    <section id="como-funciona" className="py-24 relative overflow-hidden bg-navy/30">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-royal/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Processo</span>
          <h2 className="text-5xl md:text-6xl font-heading font-black uppercase mb-6 tracking-tighter">
            Como funciona
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Desktop connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-y-12" />
          
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="relative p-10 bg-white/[0.02] backdrop-blur-xl rounded-[32px] border border-white/5 hover:border-gold/30 transition-all duration-500 group"
            >
              <div className="text-[120px] font-heading font-black text-white/[0.02] absolute -top-8 -right-4 group-hover:text-gold/5 transition-colors duration-500 leading-none select-none">
                {step.number}
              </div>
              
              <div className="w-16 h-16 bg-gradient-to-br from-royal/20 to-royal/5 rounded-2xl flex items-center justify-center text-gold mb-8 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(3,50,173,0.3)] transition-all duration-500 border border-white/5">
                {step.icon}
              </div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-heading font-black uppercase mb-4 tracking-tighter group-hover:text-gold transition-colors">{step.title}</h3>
                <p className="text-ice/50 text-sm leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
              
              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-gold/0 to-transparent group-hover:via-gold/40 transition-all duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
