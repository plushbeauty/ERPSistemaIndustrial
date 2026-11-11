import { useState } from 'react'
import { Calculator, Landmark, Settings } from 'lucide-react'
import PainelLucratividade from './PainelLucratividade'
import PainelRazaoGeral from './PainelRazaoGeral'
import CadastroDecimais from './CadastroDecimais'

type Tab = 'lucratividade' | 'razao' | 'decimais'

const tabs: Array<{id:Tab;label:string;icon:typeof Calculator}> = [
  {id:'lucratividade',label:'Lucratividade e margens',icon:Calculator},
  {id:'razao',label:'Razão Geral — GL',icon:Landmark},
  {id:'decimais',label:'Precisão decimal',icon:Settings},
]

export default function ControladoriaWorkspace() {
  const [active,setActive] = useState<Tab>('lucratividade')
  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
    <div className="mx-auto max-w-[1680px]">
      <header className="mb-3 rounded-lg border border-[#D3E3EA] bg-white p-3">
        <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">SYSNQRA · CONTROLADORIA</p>
        <h1 className="mt-1 text-lg font-bold">Controladoria Integrada</h1>
        <p className="mt-1 text-[11px] text-[#547080]">Lucratividade, razão geral e regras de precisão decimal em uma única área de trabalho.</p>
      </header>
      <nav aria-label="Seções da Controladoria" className="mb-3 flex flex-wrap gap-2 rounded-lg border border-[#D3E3EA] bg-white p-2">
        {tabs.map(tab=>{const Icon=tab.icon;return <button key={tab.id} type="button" aria-pressed={active===tab.id} onClick={()=>setActive(tab.id)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${active===tab.id?'border-[#123B50] bg-[#123B50] text-white':'border-[#D3E3EA] bg-white text-[#315466] hover:bg-[#EDF6F9]'}`}><Icon size={14}/>{tab.label}</button>})}
      </nav>
      {active==='lucratividade'&&<PainelLucratividade/>}
      {active==='razao'&&<PainelRazaoGeral/>}
      {active==='decimais'&&<CadastroDecimais/>}
    </div>
  </main>
}
