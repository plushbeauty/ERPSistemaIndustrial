/**
 * SYNQRA ERP — CONTROLE MESTRE DE CADASTRO DE PRODUTOS
 * Revisão: 2026-10-19 | Reconstrução do fluxo de listagem + ficha mestre.
 * Mantém rotas e módulos auxiliares existentes; escopo limitado ao cadastro de produtos.
 */
import { Barcode, ChevronDown, ChevronRight, ClipboardList, Home, PackagePlus, Settings2 } from 'lucide-react'
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(true)
  const saved = (savedId?: string) => {
    if (savedId) setId(savedId)
    setRefreshKey(value => value + 1)
    setView('lista')
  }
  const open = (productId?: string) => { setId(productId); setView('lista'); setFormOpen(true) }
  const newProduct = () => { setId(undefined); setView('lista'); setFormOpen(true) }

  return (
    <IndustrialReferenceShell
      moduleLabel="Cadastro de Produtos"
      title="Cadastro e Identificação de Produtos"
      nav={nav}
      activeId={view}
      onNav={(next) => {
        const nextView = next as View
        if (nextView === 'ficha' && view !== 'ficha' && !id) setId(undefined)
        if (nextView === 'ficha') setFormOpen(true)
        setView(nextView)
      }}
      onHome={() => { window.location.href = '/tablet/dashboard' }}
    >
      <div className="min-h-[500px] w-full bg-[#F4FBFD] p-2">
        {view === 'lista' && <>
          <div className="mb-2 flex justify-end">
            <button type="button" onClick={() => setFormOpen(value => !value)} className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[9px] font-black uppercase text-[#123B50]">
              {formOpen ? <ChevronRight size={13}/> : <ChevronDown size={13}/>} {formOpen ? 'Recolher ficha' : 'Expandir ficha'}
            </button>
          </div>
          <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-12">
            <div className={formOpen ? 'min-w-0 xl:col-span-5' : 'min-w-0 xl:col-span-12'}>
              <ListagemProdutos onOpenFicha={open} onNewFicha={newProduct} selectedId={id} refreshKey={refreshKey} />
            </div>
            {formOpen && <aside className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm xl:col-span-7">
              <FormFichaTecnica key={id || 'novo-produto'} productId={id} onSaved={saved} />
            </aside>}
          </div>
        </>}
        {view === 'ficha' && <div className="mx-auto max-w-5xl rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
          <FormFichaTecnica key={id || 'nova-ficha'} productId={id} onSaved={saved} />
        </div>}
        {view === 'barcode' && <ImpressaoEtiquetas />}
        {view === 'regras' && <ParametrosCodigo />}
      </div>
      <div className="mt-3 flex h-14 items-center justify-between gap-4 rounded-[2px] border border-slate-300 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-[#123B50] text-white shadow-sm"><PackagePlus size={18}/></span>
          <div><p className="mb-0.5 text-[9px] font-black uppercase leading-none tracking-wider text-slate-400">Módulo ativo</p><p className="text-xs font-bold leading-none text-slate-800">Cadastro Mestre de Produtos</p></div>
        </div>
        <button type="button" onClick={() => { window.location.href = '/tablet/dashboard' }} className="inline-flex h-8 items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"><Home size={14} className="text-slate-500"/> Voltar à Mesa</button>
      </div>
    </IndustrialReferenceShell>
  )
}
