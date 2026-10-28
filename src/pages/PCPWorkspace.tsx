/**
 * SYSNQRA ERP INDUSTRIAL — central PCP.
 * @REVISAO 28/10/2026
 * Utiliza rotinas existentes e conectadas ao Supabase; não cria dados demonstrativos.
 */
import { useState } from 'react'
import { ClipboardList, Factory, Layers3, ScanLine } from 'lucide-react'
import PainelOrdensProducao from '../features/pcp/PainelOrdensProducao'
import FichaProcesso from '../features/pcp/FichaProcesso'
import EngenhariaBOM from '../features/pcp/EngenhariaBOM'
import ApuracaoTurno from '../features/pcp/ApuracaoTurno'

type Tab = 'ordens' | 'processo' | 'estrutura' | 'turno'
const tabs: Array<{ id: Tab; label: string; Icon: typeof Factory }> = [
  { id: 'ordens', label: 'Ordens de produção', Icon: ClipboardList },
  { id: 'processo', label: 'Ficha de processo', Icon: Factory },
  { id: 'estrutura', label: 'Estrutura / BOM', Icon: Layers3 },
  { id: 'turno', label: 'Apontamento de turno', Icon: ScanLine },
]

export default function PCPWorkspace() {
  const [tab, setTab] = useState<Tab>('ordens')
  return (
    <div className="min-w-0 space-y-3">
      <header className="rounded-xl bg-[#123b50] px-4 py-3 text-white shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-cyan-200">SYSNQRA ERP INDUSTRIAL</p>
        <h1 className="mt-1 text-lg font-extrabold">PCP · Planejamento e Controle da Produção</h1>
        <p className="mt-1 text-xs text-slate-300">Ordens, processos, estrutura de produto e apontamento industrial.</p>
      </header>
      <nav aria-label="Rotinas do PCP" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${tab === id ? 'border-[#123b50] bg-[#123b50] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tab === 'ordens' && <PainelOrdensProducao />}
        {tab === 'processo' && <FichaProcesso />}
        {tab === 'estrutura' && <EngenhariaBOM />}
        {tab === 'turno' && <ApuracaoTurno />}
      </div>
    </div>
  )
}
