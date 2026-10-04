import { Barcode, ClipboardList, Home, PackagePlus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import IndustrialReferenceShell from '../../layout/IndustrialReferenceShell'
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
  const [view, setView] = useState<View>('lista')
  const [id, setId] = useState<string | undefined>()

  const open = (productId?: string) => {
    setId(productId)
    setView('ficha')
  }

  return (
    <IndustrialReferenceShell
      moduleLabel="Cadastro de Produtos"
      title="Cadastro e Identificação de Produtos"
      nav={nav}
      activeId={view}
      onNav={(next) => setView(next as View)}
      onHome={() => { window.location.href = '/tablet/dashboard' }}
    >
      {view === 'lista' && <ListagemProdutos onOpenFicha={open} />}
      {view === 'ficha' && <FormFichaTecnica productId={id} onSaved={() => setView('lista')} />}
      {view === 'barcode' && <ImpressaoEtiquetas />}
      {view === 'regras' && <ParametrosCodigo />}
      <div className="mt-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-700 to-indigo-950 text-white shadow-lg">
            <PackagePlus size={19} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Módulo ativo</p>
            <p className="text-sm font-black text-slate-900">Cadastro Mestre de Produtos</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { window.location.href = '/tablet/dashboard' }}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <Home size={17} />
          Voltar à Mesa
        </button>
      </div>
    </IndustrialReferenceShell>
  )
}
