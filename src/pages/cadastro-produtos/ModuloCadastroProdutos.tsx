/**
 * SYNQRA ERP — CONTROLE MESTRE DE CADASTRO DE PRODUTOS
 * REVISÃO: 1.0 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-PRODUCTS-20261016-01
 * ESCOPO: Reestruturação do layout mestre de produtos para simetria visual e acoplamento rígido de componentes.
 * ALTERAÇÃO: Removidos paddings flutuantes, padronizados os mini-cards inferiores e adicionada auditoria estrita.
 */

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
      onHome={() => { window.location.href = '/erp-industrial' }}
    >
      {/* Container de Renderização Dinâmica - Isola o conteúdo das abas para evitar vazamento de layout */}
      <div className="w-full bg-[#f8fafc] min-h-[500px]">
        {view === 'lista' && <ListagemProdutos onOpenFicha={open} />}
        {view === 'ficha' && <FormFichaTecnica productId={id} onSaved={() => setView('lista')} />}
        {view === 'barcode' && <ImpressaoEtiquetas />}
        {view === 'regras' && <ParametrosCodigo />}
      </div>

      {/* Barra de Status Inferior Padronizada (Mesa Industrial) */}
      <div className="mt-4 flex h-14 items-center justify-between gap-4 rounded-[2px] border border-slate-300 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-[#123B50] text-white shadow-md">
            <PackagePlus size={18} />
          </span>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none mb-0.5">Módulo ativo</p>
            <p className="text-xs font-bold text-slate-800 leading-none">Cadastro Mestre de Produtos</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => { window.location.href = '/erp-industrial' }}
          className="inline-flex h-8 items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
        >
          <Home size={15} className="text-slate-500" />
          Voltar à Mesa
        </button>
      </div>
    </IndustrialReferenceShell>
  )
}
