/**
 * SYSNQRA ERP INDUSTRIAL — MÓDULO MESTRE DE CADASTRO DE PRODUTOS
 * PADRÃO: Design Industrial Premium Compacto (#123B50 / #2D8DB8 / #F4FBFD)
 * COMPATIBILIDADE: Alinhamento milimétrico, densidade de dados alta, campos h-[30px],
 *                  labels 9px uppercase e navegação integrada com IndustrialReferenceShell.
 */

import { useState } from 'react'
import {
  Barcode,
  ClipboardList,
  Home,
  Package,
  PackagePlus,
  Settings2,
  Boxes,
  Plus
} from 'lucide-react'
import IndustrialReferenceShell from '../../layout/IndustrialReferenceShell'
import ListagemProdutos from './ListagemProdutos'
import FormFichaTecnica from './FormFichaTecnica'
import ImpressaoEtiquetas from './ImpressaoEtiquetas'
import ParametrosCodigo from './ParametrosCodigo'

export type ViewTab = 'lista' | 'ficha' | 'barcode' | 'regras'

const nav = [
  { id: 'lista', label: 'Listagem Geral', icon: ClipboardList },
  { id: 'ficha', label: 'Ficha Técnica & Engenharia', icon: Package },
  { id: 'barcode', label: 'Etiquetas & Código Barras', icon: Barcode },
  { id: 'regras', label: 'Regras de Numeração SKU', icon: Settings2 },
] as const

export default function ModuloCadastroProdutos() {
  const [view, setView] = useState<ViewTab>('lista')
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>()

  const openFicha = (productId?: string) => {
    setSelectedProductId(productId)
    setView('ficha')
  }

  const handleNovo = () => {
    setSelectedProductId(undefined)
    setView('ficha')
  }

  return (
    <IndustrialReferenceShell
      moduleLabel="Engenharia de Dados Mestres"
      title="Cadastro e Ficha Técnica de Produtos"
      nav={nav}
      activeId={view}
      onNav={(next) => setView(next as ViewTab)}
      onHome={() => { window.location.href = '/tablet/dashboard' }}
      actions={
        <div className="flex items-center gap-2">
          {view === 'lista' && (
            <button
              type="button"
              onClick={handleNovo}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#237094] active:scale-[0.98]"
            >
              <Plus size={13} strokeWidth={2.5} />
              Novo Produto
            </button>
          )}
          {view === 'ficha' && (
            <button
              type="button"
              onClick={() => setView('lista')}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Boxes size={13} className="text-slate-500" />
              Ver Catálogo
            </button>
          )}
        </div>
      }
    >
      {/* Container Principal com visual neutro e sem quebras de layout */}
      <div className="w-full min-h-[580px] rounded-[2px] bg-[#F4FBFD]/50">
        {view === 'lista' && (
          <ListagemProdutos onOpenFicha={openFicha} />
        )}

        {view === 'ficha' && (
          <FormFichaTecnica
            productId={selectedProductId}
            onSaved={() => setView('lista')}
          />
        )}

        {view === 'barcode' && (
          <ImpressaoEtiquetas />
        )}

        {view === 'regras' && (
          <ParametrosCodigo />
        )}
      </div>

      {/* Barra de Rodapé Operacional Padronizada (Padrão Mesa Industrial / NovoPedido) */}
      <div className="mt-4 flex h-12 items-center justify-between gap-4 rounded-[2px] border border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#123B50] text-white shadow-sm">
            <PackagePlus size={16} />
          </span>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#2D8DB8]">
                SYSNQRA ERP INDUSTRIAL
              </span>
              <span className="text-[9px] font-bold text-slate-300">•</span>
              <span className="text-[9px] font-bold text-slate-500">Módulo Mestre Ativo</span>
            </div>
            <p className="text-[11px] font-bold text-slate-800 leading-tight">
              {view === 'lista' && 'Catálogo Mestre e Relação de Produtos'}
              {view === 'ficha' && (selectedProductId ? 'Edição Técnica de Produto Existente' : 'Inclusão de Novo Produto Mestre')}
              {view === 'barcode' && 'Emissão de Código de Barras e Etiquetas ZPL'}
              {view === 'regras' && 'Tabela de Parametrização de Códigos e Máscaras'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { window.location.href = '/tablet/dashboard' }}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
          >
            <Home size={13} className="text-slate-500" />
            Mesa de Controle
          </button>
        </div>
      </div>
    </IndustrialReferenceShell>
  )
}
