import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/logo-av-transparente.webp.asset.json";
import { useOrderState } from "@/lib/order-state";
import { useAvNavigation } from "@/hooks/use-av-navigation";


export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { navigateToSection } = useAvNavigation();


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Início", href: "#inicio" },
    { label: "Camisa", href: "#camisa" },
    { label: "Como funciona", href: "#como-funciona" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4",
        isScrolled 
          ? "bg-navy/80 backdrop-blur-xl border-b border-ice/10 py-3 shadow-lg" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-3 group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-14 h-14 bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 overflow-hidden border border-gold/20 p-1">
            <img 
              src={logoAsset.url} 
              alt="Logo Amigos do Vôlei" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-lg md:text-xl tracking-tighter uppercase leading-none">
              Amigos do Vôlei
            </span>
            <span className="text-[10px] font-black text-gold uppercase tracking-[0.3em] leading-none mt-1 opacity-80">
              9º Torneio • ACS
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] font-black hover:text-gold transition-all duration-300 uppercase tracking-[0.2em] relative group py-2"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
          <Button 
            onClick={() => useOrderState.getState().setStep('configurator')}
            variant="secondary" 
            className="font-black uppercase tracking-[0.15em] px-6 py-5 rounded-xl glow-gold hover:scale-105 active:scale-95 transition-all duration-300 text-[11px]"
          >
            Escolher Camisa
          </Button>

        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-ice"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-navy/95 backdrop-blur-2xl border-b border-white/10 p-8 flex flex-col gap-6 md:hidden shadow-2xl"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-lg font-black py-3 uppercase tracking-[0.2em] border-b border-white/5 hover:text-gold transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/admin"
              className="flex items-center gap-3 text-lg font-black py-4 uppercase tracking-[0.2em] border-b border-white/5 text-ice/40 hover:text-gold transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Shield className="w-5 h-5" />
              Área Administrativa
            </Link>
            <Button 
              onClick={() => {
                document.getElementById('camisa')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              variant="secondary" 
              className="w-full font-black uppercase tracking-widest py-6 rounded-xl glow-gold"
            >
              Escolher Camisa
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
