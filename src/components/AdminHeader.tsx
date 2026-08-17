import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, X, Shield, Home, LayoutDashboard, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoAsset from "@/assets/logo-av-transparente.webp.asset.json";

export function AdminHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    try {
      const response = await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        toast.success("Sessão encerrada.");
        // Invalida o router antes de navegar para limpar o estado autenticado do cache client-side
        navigate({ to: '/admin/login' }).then(() => {
          window.location.reload();
        });
      } else {
        toast.error("Erro ao sair.");
      }
    } catch (err) {
      console.error("[AV-ADMIN-LOGOUT] Error:", err);
      toast.error("Erro de conexão.");
    }
  };

  const navLinks = [
    { label: "Voltar para a Página Inicial", href: "/", icon: Home, highlight: true },
    { label: "Painel", href: "/admin", icon: LayoutDashboard },
    { label: "Pedidos", href: "/admin/orders", icon: ShoppingBag },
  ];


  const isActive = (path: string) => {
    if (path === '/admin') {
        return currentPath === '/admin' || currentPath === '/admin/';
    }
    return currentPath === path;
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4 bg-navy/80 backdrop-blur-xl border-b border-white/5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to="/admin" 
            className="flex items-center gap-3 group"
          >
            <div className="w-12 h-12 bg-white/5 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-500 overflow-hidden border border-gold/20 p-1">
              <img 
                src={logoAsset.url} 
                alt="Logo Amigos do Vôlei" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-base md:text-lg tracking-tighter uppercase leading-none">
                Área Administrativa
              </span>
              <span className="text-[9px] font-black text-gold uppercase tracking-[0.3em] leading-none mt-1 opacity-80">
                Torneio Amigos do Vôlei
              </span>
            </div>
          </Link>

          {/* Hamburger Toggle */}
          <button
            className="p-2 text-ice hover:bg-white/5 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Abrir menu"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Admin Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[55]"
            />

            {/* Side Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] sm:w-[320px] bg-navy border-l border-white/10 z-[60] shadow-2xl flex flex-col p-8"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-gold" />
                  <span className="font-heading font-black uppercase text-sm tracking-widest">Navegação</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-ice/40 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex flex-col gap-2 flex-grow">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href as any}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 uppercase tracking-[0.15em] text-[11px] font-black border border-transparent",
                      link.highlight 
                        ? "bg-gold text-navy hover:scale-[1.02] mb-4 shadow-lg shadow-gold/20" 
                        : isActive(link.href)
                            ? "bg-white/10 text-gold border-white/5"
                            : "text-ice/60 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="pt-8 border-t border-white/5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-ice/40 hover:text-red-500 hover:bg-red-500/5 transition-all duration-300 uppercase tracking-[0.15em] text-[11px] font-black group"
                >
                  <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
