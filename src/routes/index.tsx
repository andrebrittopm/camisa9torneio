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
    <div className="min-h-screen bg-navy text-ice selection:bg-gold selection:text-navy">
      {/* Background Grids & Elements */}
      <div className="fixed inset-0 bg-grid-tech opacity-10 pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-screen bg-gradient-to-b from-royal/10 to-transparent pointer-events-none" />
      
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
