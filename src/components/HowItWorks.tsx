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
    <section id="como-funciona" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold uppercase mb-4">
            Como funciona
          </h2>
          <div className="w-24 h-1 bg-gold mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative p-8 glass rounded-3xl border-ice/5 hover:border-royal/50 transition-colors group"
            >
              <div className="text-5xl font-heading font-black text-ice/5 absolute top-4 right-6 group-hover:text-royal/20 transition-colors">
                {step.number}
              </div>
              <div className="w-12 h-12 bg-royal/20 rounded-xl flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <h3 className="text-xl font-heading font-bold uppercase mb-4 tracking-wider">{step.title}</h3>
              <p className="text-ice/60 text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
