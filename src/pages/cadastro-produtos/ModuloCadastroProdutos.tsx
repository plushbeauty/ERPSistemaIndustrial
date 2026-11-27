/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO: 2026-11-24
 * @REVISAO: REV-CADASTRO-PRODUTOS-PADRAO-OURO-20261124-01
 * Cadastro mestre unificado; mantém as rotas/abas existentes e o shell global.
 */
import { ClipboardList, Home, PackagePlus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import IndustrialReferenceShell from '../../layout/IndustrialReferenceShell'
import { SynqraLayoutProvider } from '../../layout/SynqraLayoutContext'
import ListagemProdutos from './ListagemProdutos'
import FormFichaTecnica from './FormFichaTecnica'
import ParametrosCodigo from './ParametrosCodigo'

type View = 'lista' | 'ficha' | 'regras'
const nav = [
  { id: 'lista', label: 'Listagem Geral', icon: ClipboardList },
  { id: 'ficha', label: 'Ficha Técnica', icon: PackagePlus },
  { id: 'regras', label: 'Regras do Código', icon: Settings2 },
] as const
const VIEWS = nav.map(item => item.id) as View[]
function abaInicial(param: string | null): View {
  return param && VIEWS.includes(param as View) ? (param as View) : 'lista'
}

export default function ModuloCadastroProdutos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<View>(() => abaInicial(searchParams.get('aba')))
  const [id, setId] = useState<string | undefined>()
  const open = (productId?: string) => { setId(productId); setView('ficha') }

  return (
    <SynqraLayoutProvider>
      <IndustrialReferenceShell
        moduleLabel="Cadastro de Produtos"
        title="Cadastro e Identificação de Produtos"
        nav={nav}
        activeId={view}
        onNav={(next) => setView(next as View)}
        onHome={() => navigate('/pageprincipal')}
      >
        <nav className="mb-3 flex flex-wrap items-center gap-1 rounded-[2px] border border-slate-200 bg-white p-1 shadow-sm" aria-label="Abas do cadastro de produtos">
          {nav.map(({ id: tabId, label, icon: TabIcon }) => (
            <button key={tabId} type="button" onClick={() => { if (tabId === 'ficha' && view !== 'ficha') setId(undefined); setView(tabId) }}
              aria-current={view === tabId ? 'page' : undefined}
              className={`inline-flex h-[30px] items-center gap-2 rounded-[2px] px-3 text-[10px] font-bold uppercase tracking-wide transition-colors ${view === tabId ? 'bg-[#2D8DB8] text-white shadow-sm' : 'border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50'}`}>
              <TabIcon size={13} />{label}
            </button>
          ))}
        </nav>
        <div className="min-h-[520px] w-full pb-20">
          {view === 'lista' && <ListagemProdutos onOpenFicha={open} />}
          {view === 'ficha' && <FormFichaTecnica productId={id} onSaved={() => {}} />}
          {view === 'regras' && <ParametrosCodigo />}
        </div>
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#123B50] text-white"><PackagePlus size={15} /></span>
            <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Módulo ativo</p><p className="text-xs font-bold text-slate-800">Cadastro Mestre de Produtos</p></div>
          </div>
          <button type="button" onClick={() => navigate('/pageprincipal')} className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"><Home size={13} /> Voltar à Mesa</button>
        </footer>
      </IndustrialReferenceShell>
    </SynqraLayoutProvider>
  )
}
