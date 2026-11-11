import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, Paintbrush, ShieldCheck, PackageCheck } from 'lucide-react'
import PCPFichasProcesso from './PCPFichasProcesso'
import QualidadeInspecaoProcessoVersionada from './qualidade/QualidadeInspecaoProcessoVersionada'
import QualidadeLiberacaoLotes from './qualidade/QualidadeLiberacaoLotes'

type Tab = 'montagem' | 'acabamento' | 'inspecao' | 'liberacao'
const tabs: Array<{id:Tab;label:string;icon:typeof ClipboardList}> = [
  {id:'montagem',label:'Montagem e embalagem',icon:ClipboardList},
  {id:'acabamento',label:'Acabamento',icon:Paintbrush},
  {id:'inspecao',label:'Inspeção em processo',icon:ShieldCheck},
  {id:'liberacao',label:'Liberação de lote',icon:PackageCheck},
]

export default function FichaMontagem() {
  const [searchParams,setSearchParams] = useSearchParams()
  const [active,setActive] = useState<Tab>('montagem')

  useEffect(() => {
    const type = searchParams.get('tipo')?.toUpperCase()
    if (type === 'ACABAMENTO') setActive('acabamento')
    else if (type === 'MONTAGEM_EMBALAGEM') setActive('montagem')
  }, [searchParams])

  const changeTab = (tab:Tab) => {
    setActive(tab)
    if (tab === 'montagem') setSearchParams({tipo:'MONTAGEM_EMBALAGEM'}, {replace:true})
    if (tab === 'acabamento') setSearchParams({tipo:'ACABAMENTO'}, {replace:true})
  }

  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
    <div className="mx-auto max-w-[1680px]">
      <header className="mb-3 rounded-lg border border-[#D3E3EA] bg-white p-3">
        <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">PRODUÇÃO · QUALIDADE</p>
        <h1 className="mt-1 text-lg font-bold">Ficha de Montagem e Acabamento</h1>
        <p className="mt-1 text-[11px] text-[#547080]">Fichas técnicas vinculadas à empresa ativa, inspeção versionada e liberação real de lotes. Nenhum dado demonstrativo é usado.</p>
      </header>
      <nav aria-label="Etapas da ficha de montagem" className="mb-3 flex flex-wrap gap-2 rounded-lg border border-[#D3E3EA] bg-white p-2">
        {tabs.map(tab=>{const Icon=tab.icon;return <button key={tab.id} type="button" aria-pressed={active===tab.id} onClick={()=>changeTab(tab.id)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${active===tab.id?'border-[#123B50] bg-[#123B50] text-white':'border-[#D3E3EA] bg-white text-[#315466] hover:bg-[#EDF6F9]'}`}><Icon size={14}/>{tab.label}</button>})}
      </nav>
      {active==='montagem'&&<PCPFichasProcesso/>}
      {active==='acabamento'&&<PCPFichasProcesso/>}
      {active==='inspecao'&&<QualidadeInspecaoProcessoVersionada/>}
      {active==='liberacao'&&<QualidadeLiberacaoLotes/>}
    </div>
  </main>
}
