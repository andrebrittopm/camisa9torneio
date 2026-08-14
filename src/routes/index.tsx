import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-2">
      <h3>9º Torneio Amigos do Vôlei</h3>
      <p>Landing Page em desenvolvimento.</p>
      <hr className="my-4" />
      <div className="bg-slate-900 p-4 rounded text-xs font-mono text-slate-300">
        <p>ETAPA 3.3B-2A-R2 — CAMADA POSTGRES DO RATE LIMITING APROVADA PARA INTEGRAÇÃO SERVER-SIDE.</p>
        <p>Documentação disponível em: AUDITORIA_FINAL_RATE_LIMIT_3_3B_2A_R2.txt</p>
      </div>
    </div>
  )
}
