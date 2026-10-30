/**
 * SYSNQRA ERP INDUSTRIAL — central PCP.
 * @REVISAO 28/10/2026
 * Utiliza rotinas existentes e conectadas ao Supabase; não cria dados demonstrativos.
 */
import { useState } from 'react'
import { ClipboardCheck, ClipboardList, Factory, Layers3, LockKeyhole, ScanLine, Send } from 'lucide-react'
import PainelOrdensProducao from '../features/pcp/PainelOrdensProducao'
import FichaProcesso from '../features/pcp/FichaProcesso'
import EngenhariaBOM from '../features/pcp/EngenhariaBOM'
import ApuracaoTurno from '../features/pcp/ApuracaoTurno'
import { OpEmissionScreen, PasswordPolicyPanel, SynqraAuditoriaModulo } from '../features/pcp/IndustrialControlPanels'

type Tab = 'ordens' | 'emissao' | 'processo' | 'estrutura' | 'turno' | 'auditoria' | 'senha'
const tabs: Array<{ id: Tab; label: string; Icon: typeof Factory }> = [
  { id: 'ordens', label: 'Ordens de produção', Icon: ClipboardList },
  { id: 'emissao', label: 'Emitir OP / Reservar lotes', Icon: Send },
  { id: 'processo', label: 'Ficha de processo', Icon: Factory },
  { id: 'estrutura', label: 'Estrutura / BOM', Icon: Layers3 },
  { id: 'turno', label: 'Apontamento de turno', Icon: ScanLine },
  { id: 'auditoria', label: 'Histórico de Auditoria', Icon: ClipboardCheck },
  { id: 'senha', label: 'Política de Senha', Icon: LockKeyhole },
]

export default function PCPWorkspace({ initialTab = 'ordens' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
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
        {tab === 'emissao' && <OpEmissionScreen />}
        {tab === 'processo' && <FichaProcesso />}
        {tab === 'estrutura' && <EngenhariaBOM />}
        {tab === 'turno' && <ApuracaoTurno />}
        {tab === 'auditoria' && <SynqraAuditoriaModulo />}
        {tab === 'senha' && <PasswordPolicyPanel />}
      </div>
    </div>
  )
}
