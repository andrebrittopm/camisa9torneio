export function Footer() {
  return (
    <footer className="py-12 border-t border-ice/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center font-bold text-navy">
              AV
            </div>
            <div>
              <h4 className="font-heading font-bold uppercase tracking-widest text-sm">Amigos do Vôlei</h4>
              <p className="text-ice/40 text-[10px] uppercase tracking-widest">Coxim – MS • 2026</p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-ice/40 text-xs uppercase tracking-[0.2em] font-medium">
              9º Torneio Amigos do Vôlei – ACS
            </p>
            <p className="text-ice/20 text-[10px] mt-2">
              © 2026 Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
