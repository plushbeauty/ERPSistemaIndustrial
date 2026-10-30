import { ArrowDown, HelpCircle } from 'lucide-react'

interface CincoPorquesProps {
  respostas: string[]
  onRespostasAlteradas: (novasRespostas: string[]) => void
}

export default function CincoPorques({ respostas, onRespostasAlteradas }: CincoPorquesProps) {
  const listaPorques = Array.from({ length: 5 }, (_, index) => respostas[index] ?? '')
  const alterarResposta = (index: number, valor: string) => {
    const novaLista = [...listaPorques]
    novaLista[index] = valor
    for (let i = index + 1; i < novaLista.length; i += 1) {
      if (!novaLista[i - 1].trim()) novaLista[i] = ''
    }
    onRespostasAlteradas(novaLista)
  }

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
    <header><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><HelpCircle size={16} className="text-sky-600" /> Metodologia dos 5 Porquês</h3><p className="mt-1 text-xs text-slate-500">Avance sequencialmente para identificar a causa raiz.</p></header>
    <div className="space-y-2">
      {listaPorques.map((resposta, index) => <div key={index} className="flex flex-col items-center">
        {index > 0 && <ArrowDown size={15} className="my-1 text-slate-400" />}
        <label className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="shrink-0 rounded border border-sky-100 bg-sky-50 px-2 py-1 font-mono text-xs font-bold text-sky-800">{index + 1}º Por quê?</span>
          <input type="text" value={resposta} disabled={index > 0 && !listaPorques[index - 1].trim()} onChange={event => alterarResposta(index, event.target.value)} placeholder={index === 0 ? 'Por que o problema aconteceu?' : 'Com base na resposta anterior, por quê?'} className="min-w-0 flex-1 border-b border-slate-300 bg-transparent pb-1 text-xs text-slate-800 outline-none focus:border-sky-600 disabled:opacity-40" />
        </label>
      </div>)}
    </div>
  </section>
}
