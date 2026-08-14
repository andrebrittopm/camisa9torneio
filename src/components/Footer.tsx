export function Footer() {
  return (
    <footer className="py-20 relative overflow-hidden bg-navy border-t border-white/5">
      {/* Background Decor */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-royal/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
          <div className="flex items-center gap-6 group">
            <div className="w-16 h-16 bg-white/[0.03] rounded-[24px] flex items-center justify-center font-black text-gold text-2xl border border-white/10 group-hover:border-gold/50 transition-all duration-500 shadow-2xl">
              AV
            </div>
            <div>
              <h4 className="font-heading font-black uppercase tracking-tighter text-2xl mb-1">Amigos do Vôlei</h4>
              <p className="text-gold font-black text-[10px] uppercase tracking-[0.4em] opacity-80">Coxim – MS • 2026</p>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-6 w-full md:w-auto">
            <div className="flex flex-wrap gap-8">
              {['Início', 'Camisas', 'Como funciona', 'Pedido'].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40 hover:text-gold transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
            
            <div className="pt-8 border-t border-white/5 w-full flex flex-col md:items-end gap-2">
              <p className="text-ice/30 text-[10px] uppercase tracking-[0.2em] font-black">
                9º Torneio Amigos do Vôlei – ACS
              </p>
              <p className="text-ice/10 text-[9px] font-black uppercase tracking-[0.1em]">
                © 2026 Todos os direitos reservados • Desenvolvido com foco em performance
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
