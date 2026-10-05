import { Link } from 'react-router-dom'

export default function GeradorGruposContabeis() {
  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-3">
        <header className="border-b border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-blue-800">Fiscal / Contabilidade</p>
          <h1 className="text-xl font-semibold">Grupos contábeis</h1>
        </header>
        <section role="status" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-semibold">Geração automática suspensa</h2>
          <p className="mt-2">
            O gerador anterior gravava três grupos com nomes e códigos fixos de demonstração e
            ignorava o tamanho máximo informado. Esses dados não representam um plano de contas
            aprovado e não serão mais inseridos como se fossem reais.
          </p>
          <p className="mt-2">
            Para habilitar a geração, é necessário definir a origem do plano de contas da empresa,
            as regras de codificação, validação e auditoria, e persistir o resultado de forma
            transacional. Nenhum registro foi criado por esta tela.
          </p>
          <Link to="/fiscal" className="mt-3 inline-flex items-center border border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-900">
            Voltar ao módulo Fiscal
          </Link>
        </section>
      </div>
    </main>
  )
}
