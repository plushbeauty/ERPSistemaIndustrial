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
      <div className="mt-3 flex items-center justify-between gap-3 rounded-[2px] border border-slate-300 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[2px] bg-[#123B50] text-white shadow-lg">
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
          className="inline-flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-semibold uppercase text-slate-800 hover:bg-slate-50"
        >
          <Home size={17} />
          Voltar à Mesa
        </button>
      </div>
    </IndustrialReferenceShell>
  )
}
