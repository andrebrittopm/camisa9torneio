
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ModelsSection } from "@/components/ModelsSection";
import { CustomizationPreview } from "@/components/CustomizationPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Amigos do Vôlei - 9º Torneio ACS" },
      { name: "description", content: "Landing page oficial para as camisas do 9º Torneio Amigos do Vôlei." },
      { property: "og:title", content: "Amigos do Vôlei - 9º Torneio ACS" },
      { property: "og:description", content: "Garanta sua camisa oficial do torneio mais aguardado de Coxim/MS." },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-navy text-ice selection:bg-gold selection:text-navy overflow-x-hidden scroll-smooth">
      {/* Background Decor & Textures */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-tech opacity-10" />
        <div className="absolute top-0 left-0 right-0 h-screen bg-gradient-to-b from-royal/10 via-transparent to-navy" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-royal/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>
      
      <Header />
      
      <main>
        <HeroSection />
        <ModelsSection />
        <CustomizationPreview />
        <HowItWorks />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}