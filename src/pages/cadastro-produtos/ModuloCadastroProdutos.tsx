import { Barcode, ClipboardList, Home, PackagePlus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IndustrialReferenceShell from '../../layout/IndustrialReferenceShell'
import { SynqraLayoutProvider } from '../../layout/SynqraLayoutContext'
import ListagemProdutos from './ListagemProdutos'
import FormFichaTecnica from './FormFichaTecnica'
import ImpressaoEtiquetas from './ImpressaoEtiquetas'
import ParametrosCodigo from './ParametrosCodigo'

type View = 'lista' | 'ficha' | 'barcode' | 'regras'

const nav = [
  { id: 'lista', label: 'Listagem Geral', icon: ClipboardList },
  { id: 'ficha', label: 'Ficha Técnica', icon: ClipboardList },
  { id: 'barcode', label: 'Código de Barras', icon: Barcode },
  { id: 'regras', label: 'Regras do Código', icon: Settings2 },
] as const

export default function ModuloCadastroProdutos() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('lista')
  const [id, setId] = useState<string | undefined>()

  const open = (productId?: string) => {
    setId(productId)
    setView('ficha')
  }

  return (
    <SynqraLayoutProvider>
      <IndustrialReferenceShell
        moduleLabel="Cadastro de Produtos"
        title="Cadastro e Identificação de Produtos"
        nav={nav}
        activeId={view}
        onNav={(next) => setView(next as View)}
        onHome={() => { navigate('/pageprincipal') }}
      >
        <nav className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Abas do cadastro de produtos">
          {nav.map(({ id: tabId, label, icon: TabIcon }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setView(tabId)}
              aria-current={view === tabId ? 'page' : undefined}
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[11px] font-black uppercase transition-all ${view === tabId ? 'bg-sky-600 text-white shadow-md shadow-sky-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <TabIcon size={14} />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-[500px] w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {view === 'lista' && <ListagemProdutos onOpenFicha={open} />}
          {view === 'ficha' && <FormFichaTecnica productId={id} onSaved={() => setView('lista')} />}
          {view === 'barcode' && <ImpressaoEtiquetas />}
          {view === 'regras' && <ParametrosCodigo />}
        </div>

        <div className="mt-4 flex h-16 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-200">
              <PackagePlus size={18} />
            </span>
            <div className="flex flex-col justify-center">
              <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 leading-none">Módulo ativo</p>
              <p className="text-sm font-black text-slate-800 leading-none">Cadastro Mestre de Produtos</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { navigate('/pageprincipal') }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black uppercase text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <Home size={15} className="text-slate-500" />
            Voltar à Mesa
          </button>
        </div>
      </IndustrialReferenceShell>
    </SynqraLayoutProvider>
  )
}

