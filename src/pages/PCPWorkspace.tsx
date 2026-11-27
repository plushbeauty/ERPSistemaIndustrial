/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-27
 * @REVISAO: REV-PCP-MANUFATURA-ABAS-20261127-01 — central única com abas horizontais, filtros reais por processo e apontamento CPP com retrabalho
 * @STATUS_APROVACAO: INTEGRAÇÃO AUTORIZADA PELO PROPRIETÁRIO; reutiliza telas existentes e contratos reais do Supabase
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, Boxes, ClipboardList, Factory, FileText, Gauge, Package, ScanLine } from 'lucide-react'
import QualityPlanGate from '../components/quality/QualityPlanGate'
import PCPOrdens from './PCPOrdens'
import PainelOrdensProducao from '../features/pcp/PainelOrdensProducao'
import PCPFichasProcesso from './PCPFichasProcesso'
import PCPExecucaoIndustrial from './PCPExecucaoIndustrial'
import EngenhariaBOM from '../features/pcp/EngenhariaBOM'
import ApuracaoTurno from '../features/pcp/ApuracaoTurno'

const tabIds = ['central','capacidade','fichas','prensados','injetados','acabamento','apontamento','estrutura','turno'] as const
type Tab = (typeof tabIds)[number]
const isTab = (value: string | null): value is Tab => value !== null && (tabIds as readonly string[]).includes(value)

const tabs = [
  { id: 'central', label: 'Central PCP', Icon: ClipboardList },
  { id: 'capacidade', label: 'Capacidade & Roteiro', Icon: Gauge },
  { id: 'fichas', label: 'Fichas de Processo', Icon: FileText },
  { id: 'prensados', label: 'PCP Prensados', Icon: Factory },
  { id: 'injetados', label: 'PCP Injetados', Icon: Factory },
  { id: 'acabamento', label: 'Acabamento & Montagem', Icon: Package },
  { id: 'apontamento', label: 'Apontamento / CPP', Icon: Activity },
  { id: 'estrutura', label: 'Estrutura / BOM', Icon: Boxes },
  { id: 'turno', label: 'Apuração de Turno', Icon: ScanLine },
] as const

export default function PCPWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => isTab(searchParams.get('aba')) ? searchParams.get('aba') as Tab : 'central')

  useEffect(() => {
    setTab(isTab(searchParams.get('aba')) ? searchParams.get('aba') as Tab : 'central')
  }, [searchParams])

  const selectTab = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    params.set('aba', next)
    setSearchParams(params, { replace: false })
  }

  return (
    <div className="synqra-module-shell min-w-0 space-y-3">
      <nav role="tablist" aria-label="Rotinas do PCP" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={`inline-flex h-11 min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition lg:h-[34px] lg:min-h-[34px] ${tab === id ? 'border-[#123b50] bg-[#123b50] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tab === 'central' && <PainelOrdensProducao />}
        {tab === 'capacidade' && <QualityPlanGate><PCPOrdens /></QualityPlanGate>}
        {tab === 'fichas' && <QualityPlanGate><PCPFichasProcesso /></QualityPlanGate>}
        {tab === 'prensados' && <QualityPlanGate><PCPExecucaoIndustrial processFilter="PRENSADO" /></QualityPlanGate>}
        {tab === 'injetados' && <QualityPlanGate><PCPExecucaoIndustrial processFilter="INJETADO" /></QualityPlanGate>}
        {tab === 'acabamento' && <QualityPlanGate><PCPExecucaoIndustrial processFilter="ACABAMENTO" /></QualityPlanGate>}
        {tab === 'apontamento' && <QualityPlanGate><PCPExecucaoIndustrial initialTab="apontamentos" /></QualityPlanGate>}
        {tab === 'estrutura' && <EngenhariaBOM />}
        {tab === 'turno' && <ApuracaoTurno />}
      </div>
    </div>
  )
}
