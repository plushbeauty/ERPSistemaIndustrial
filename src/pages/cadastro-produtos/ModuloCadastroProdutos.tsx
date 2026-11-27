 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-27
 * @REVISAO: REV-PRODUTOS-TELA-UNICA-20261127-02 — aba sincronizada com a URL (?aba=), menu de abas único,
 *           ficha nova x edição separadas, rota da mesa centralizada
 * @REVISAO_ANTERIOR: REV-PRODUTOS-TELA-UNICA-20261104-01 — tela principal de /cadastros/produtos
 * @STATUS_APROVACAO: ORDEM DO PROPRIETARIO: "NAO DEIXAR VARIAS TELAS COM MESMA FUNCÇAO OU PARECIDADAS"
 */

import { Barcode, ClipboardList, FileText, Home, PackagePlus, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import IndustrialReferenceShell from '../../layout/IndustrialReferenceShell'
import { SynqraLayoutProvider } from '../../layout/SynqraLayoutContext'
import ListagemProdutos from './ListagemProdutos'
import FormFichaTecnica from './FormFichaTecnica'
import ImpressaoEtiquetas from './ImpressaoEtiquetas'
import ParametrosCodigo from './ParametrosCodigo'

const ROTA_MESA = '/pageprincipal'

const nav = [
  { id: 'lista', label: 'Listagem Geral', icon: ClipboardList },
  { id: 'ficha', label: 'Ficha Técnica', icon: FileText },
  { id: 'barcode', label: 'Código de Barras', icon: Barcode },
  { id: 'regras', label: 'Regras do Código', icon: Settings2 },
] as const

type View = (typeof nav)[number]['id']
const VIEWS: readonly View[] = nav.map((item) => item.id)

function isView(v: string | null): v is View {
  return v !== null && (VIEWS as readonly string[]).includes(v)
}

/** Aba vinda da URL (?aba=ficha&id=123). Rotas antigas de ficha técnica e parâmetros apontam para cá. */
function lerAba(param: string | null): View {
  return isView(param) ? param : 'lista'
}

export default function ModuloCadastroProdutos() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setViewState] = useState<View>(() => lerAba(searchParams.get('aba')))
  const [id, setId] = useState<string | undefined>(() => searchParams.get('id') ?? undefined)

  // Mantém a aba em sincronia com voltar/avançar do navegador
  useEffect(() => {
    setViewState(lerAba(searchParams.get('aba')))
    setId(searchParams.get('id') ?? undefined)
  }, [searchParams])

  const irPara = useCallback(
    (next: View, productId?: string) => {
      const params: Record<string, string> = { aba: next }
      if (next === 'ficha' && productId) params.id = productId
      setSearchParams(params, { replace: false })
      setViewState(next)
      setId(next === 'ficha' ? productId : undefined)
    },
    [setSearchParams],
  )

  const voltarMesa = () => navigate(ROTA_MESA)

  return (
    <SynqraLayoutProvider>
      {/* O menu de abas é desenhado só pelo IndustrialReferenceShell (nav/activeId/onNav),
          para não existir dois menus com a mesma função na mesma tela. */}
      <IndustrialReferenceShell
        moduleLabel="Cadastro de Produtos"
        title="Cadastro e Identificação de Produtos"
        nav={nav}
        activeId={view}
        onNav={(next) => { if (isView(next)) irPara(next) }}
        onHome={voltarMesa}
      >
        <div className="min-h-[500px] w-full bg-[#f8fafc]">
          {view === 'lista' && <ListagemProdutos onOpenFicha={(pid?: string) => irPara('ficha', pid)} />}
          {view === 'ficha' && (
            <FormFichaTecnica
              key={id ?? 'novo'}
              productId={id}
              onSaved={() => irPara('lista')}
            />
          )}
          {view === 'barcode' && <ImpressaoEtiquetas />}
          {view === 'regras' && <ParametrosCodigo />}
        </div>

        <footer className="mt-4 flex h-14 items-center justify-between gap-4 rounded-[2px] border border-slate-300 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-[#123B50] text-white shadow-md">
              <PackagePlus size={18} />
            </span>
            <div className="flex flex-col justify-center">
              <p className="mb-0.5 text-[10px] font-black uppercase leading-none tracking-wider text-slate-400">Módulo ativo</p>
              <p className="text-xs font-bold leading-none text-slate-800">
                Cadastro Mestre de Produtos · {nav.find((n) => n.id === view)?.label}
                {view === 'ficha' && (id ? ` · #${id}` : ' · Novo')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={voltarMesa}
            className="inline-flex h-8 items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
          >
            <Home size={15} className="text-slate-500" />
            Voltar à Mesa
          </button>
        </footer>
      </IndustrialReferenceShell>
    </SynqraLayoutProvider>
  )
}
