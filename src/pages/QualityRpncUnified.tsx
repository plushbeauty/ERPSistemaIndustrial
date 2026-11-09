/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-SGQ-RPNC-UNIFICADA-20261102-01 — ordem do proprietário: três telas RPNC reunidas em uma página com abas
 * @STATUS_APROVACAO: FLUXOS REAIS PRESERVADOS; DISTRIBUIÇÃO REDUZIDA A UMA ÚNICA ORIGEM DE NAVEGAÇÃO
 */
import { lazy, Suspense, useState } from 'react'
import { AlertTriangle, ClipboardCheck, ClipboardList, Layers } from 'lucide-react'
import '../styles/quality-rpnc-unified.css'

const QualidadeRPNC = lazy(() => import('./QualidadeRPNC'))
const QualityRpncForm = lazy(() => import('./QualityRpncForm'))
const QualidadeRPNCMultiorigem = lazy(() => import('./QualidadeRPNCMultiorigem'))

type AbaUnificada = 'abertura' | 'tratamento' | 'multiorigem'

const abas: Array<{ value: AbaUnificada; label: string; description: string; icon: typeof ClipboardList }> = [
  { value: 'abertura', label: 'Abertura e evidências', description: 'Registro, triagem, anexos e investigação assistida.', icon: ClipboardCheck },
  { value: 'tratamento', label: 'Ishikawa, 5 Porquês e CAPA', description: 'Formulário completo, recorrência, ações, eficácia e impressão.', icon: ClipboardList },
  { value: 'multiorigem', label: 'RPNC multiorigem', description: 'Clientes, auditorias, processos, status 8D e relatório externo.', icon: Layers },
]

export default function QualityRpncUnified() {
  const [aba, setAba] = useState<AbaUnificada>('abertura')

  return (
    <main className="min-h-screen bg-slate-50 p-2 text-slate-800 md:p-3">
      <div className="mx-auto max-w-[1700px] space-y-2">
        <header className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#123B50] text-white"><AlertTriangle size={16} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">SGQ · Tratamento de não conformidade</p>
              <h1 className="text-sm font-extrabold text-[#123B50]">RPNC unificada</h1>
            </div>
            <p className="ml-auto max-w-xl text-[11px] text-slate-500">Uma única entrada para os três fluxos oficiais. Nenhum registro é duplicado: todas as abas operam sobre o mesmo protocolo de <code>erp_rpnc</code>.</p>
          </div>
        </header>

        <nav className="erp-rpnc-abas grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3" role="tablist" aria-label="Abas do tratamento RPNC">
          {abas.map((item) => {
            const Icon = item.icon
            const active = aba === item.value
            return (
              <button key={item.value} type="button" role="tab" aria-selected={active} onClick={() => setAba(item.value)}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${active ? 'border-[#2D8DB8] bg-[#E8F4F9] text-[#123B50]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="shrink-0" />
                <span className="min-w-0">
                  <strong className="font-extrabold">{item.label}</strong>
                  <span className="text-slate-500">{item.description}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Carregando o módulo RPNC…</div>}>
            {aba === 'abertura' && <QualidadeRPNC />}
            {aba === 'tratamento' && <QualityRpncForm />}
            {aba === 'multiorigem' && <QualidadeRPNCMultiorigem />}
          </Suspense>
        </section>
      </div>
    </main>
  )
}
