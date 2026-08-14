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
        <p>ARTEFATOS REAIS DA ETAPA 3.3B-2B EXPORTADOS PARA AUDITORIA EXTERNA. NENHUMA NOVA ALTERAÇÃO EXECUTADA.</p>
        <p>Documentação disponível em: AUDITORIA_FINAL_3_3B_2B.txt</p>
      </div>
    </div>
  )
}
