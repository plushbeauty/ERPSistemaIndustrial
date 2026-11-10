/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-06
 * @REVISAO: REV-PCP-WORKSPACE-FICHA-MONTAGEM-20261110-01 — adicionada aba de prévia Ficha de Montagem e Acabamento; rotinas PCP existentes preservadas
 * @STATUS_APROVACAO: CORREÇÃO FUNCIONAL AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-06; sem alteração do layout aprovado
 */
/**
 * SYSNQRA ERP INDUSTRIAL — central PCP.
 * @REVISAO 28/10/2026
 * Utiliza rotinas existentes e conectadas ao Supabase; não cria dados demonstrativos.
 */
import { useState } from 'react'
import { ClipboardList, Factory, Hammer, Layers3, ScanLine } from 'lucide-react'
import PainelOrdensProducao from '../features/pcp/PainelOrdensProducao'
import PCPFichasProcesso from './PCPFichasProcesso'
import EngenhariaBOM from '../features/pcp/EngenhariaBOM'
import ApuracaoTurno from '../features/pcp/ApuracaoTurno'\nimport FichaMontagem from './FichaMontagem'

type Tab = 'ordens' | 'processo' | 'montagem' | 'estrutura' | 'turno'
const tabs: Array<{ id: Tab; label: string; Icon: typeof Factory }> = [
  { id: 'ordens', label: 'Ordens de produção', Icon: ClipboardList },
  { id: 'processo', label: 'Ficha de processo', Icon: Factory },\n  { id: 'montagem', label: 'Ficha de montagem', Icon: Hammer },
  { id: 'estrutura', label: 'Estrutura / BOM', Icon: Layers3 },
  { id: 'turno', label: 'Apontamento de turno', Icon: ScanLine },
]

export default function PCPWorkspace() {
  const [tab, setTab] = useState<Tab>('ordens')
  return (
    <div className="synqra-module-shell min-w-0 space-y-3">
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
        {tab === 'processo' && <PCPFichasProcesso />}\n        {tab === 'montagem' && <FichaMontagem />}
        {tab === 'estrutura' && <EngenhariaBOM />}
        {tab === 'turno' && <ApuracaoTurno />}
      </div>
    </div>
  )
}
