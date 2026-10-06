import { useEffect, useMemo, useState } from 'react'
import { Copy, Filter, Minus, Plus, Search, Send, ShoppingBag, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Produto = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  preco_venda: number | null
  estoque_atual: number | null
  unidade: string
  foto_url: string | null
  catalogo_disponivel: boolean
  grupo: string | null
  subgrupo: string | null
  codigo_barras: string | null
  referencia_interna: string | null
}

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export default function VendasCatalogoDigital() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtro, setFiltro] = useState('')
  const [categoria, setCategoria] = useState('TODOS')
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [detalhe, setDetalhe] = useState<Produto | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa não identificada.')

      const result = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome,descricao,preco_venda,estoque_atual,unidade,foto_url,catalogo_disponivel,grupo,subgrupo,codigo_barras,referencia_interna')
        .eq('empresa_id', String(empresa.data))
        .eq('ativo', true)
        .order('grupo')
        .order('subgrupo')
        .order('codigo')

      if (result.error) throw result.error
      setProdutos((result.data ?? []) as Produto[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar catálogo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const categorias = useMemo(
    () => Array.from(new Set(produtos.map((produto) => produto.grupo || 'SEM GRUPO'))).sort(),
    [produtos],
  )

  const rows = useMemo(() => {
    const query = filtro.trim().toLowerCase()
    return produtos.filter((produto) => {
      const matchesCategory =
        categoria === 'TODOS' || (produto.grupo || 'SEM GRUPO') === categoria
      const searchable = [
        produto.codigo,
        produto.nome,
        produto.descricao ?? '',
        produto.grupo ?? '',
        produto.subgrupo ?? '',
        produto.referencia_interna ?? '',
        produto.codigo_barras ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return matchesCategory && (!query || searchable.includes(query))
    })
  }, [produtos, filtro, categoria])

  const cart = produtos.filter((produto) => (quantidades[produto.id] ?? 0) > 0)
  const cartCount = cart.reduce((total, produto) => total + (quantidades[produto.id] ?? 0), 0)
  const cartTotal = cart.reduce(
    (total, produto) => total + Number(produto.preco_venda ?? 0) * (quantidades[produto.id] ?? 0),
    0,
  )
  const catalogLink = window.location.origin + '/vendas/catalogo-digital'

  const copyCatalogLink = async () => {
    await navigator.clipboard.writeText(catalogLink)
  }

  const sendSelection = async () => {
    const message =
      'Catálogo: ' +
      catalogLink +
      '\n\nItens selecionados:\n' +
      cart
        .map(
          (produto) =>
            produto.codigo +
            ' - ' +
            produto.nome +
            ' x ' +
            (quantidades[produto.id] ?? 0),
        )
        .join('\n')

    if (navigator.share) {
      await navigator.share({ title: 'Solicitação de cotação', text: message }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(message)
    }
  }

  const add = (produto: Produto) => {
    setQuantidades((current) => ({
      ...current,
      [produto.id]: Math.max(1, current[produto.id] ?? 0),
    }))
  }

  const decrement = (produto: Produto) => {
    setQuantidades((current) => {
      const quantity = Math.max(0, (current[produto.id] ?? 0) - 1)
      return { ...current, [produto.id]: quantity }
    })
  }

  const cartRows = cart.map((produto) => {
    const quantity = quantidades[produto.id] ?? 0
    return (
      <div key={produto.id} className="flex gap-2 border-b border-slate-100 py-2.5">
        <div className="h-12 w-12 shrink-0 bg-slate-50">
          {produto.foto_url && (
            <img src={produto.foto_url} alt="" className="h-full w-full object-contain" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[10px] font-medium text-[#123B50]">
            {produto.nome}
          </strong>
          <span className="text-[8px] text-slate-400">{produto.codigo}</span>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center border border-slate-300">
              <button type="button" onClick={() => decrement(produto)} className="h-6 w-6">
                <Minus size={10} className="mx-auto" />
              </button>
              <span className="w-6 text-center text-[8px]">{quantity}</span>
              <button type="button" onClick={() => add(produto)} className="h-6 w-6">
                <Plus size={10} className="mx-auto" />
              </button>
            </div>
            <strong className="text-[10px]">
              {brl(Number(produto.preco_venda ?? 0) * quantity)}
            </strong>
          </div>
        </div>
      </div>
    )
  })

  return (
    <VendasLayout
      title="Catálogo Digital"
      subtitle="Produtos industriais cadastrados e organizados por grupo"
      onRefresh={() => void load()}
    >
      <main className="text-[11px]">
        <section className="overflow-hidden border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-[#123B50] to-[#2D8DB8] px-4 py-5 text-white">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-[9px] font-medium uppercase tracking-[.18em] text-cyan-100">
                  CATÁLOGO DIGITAL • SGQERP
                </span>
                <h1 className="mt-1 text-xl font-medium">Produtos e soluções industriais</h1>
                <p className="mt-1 max-w-xl text-[10px] text-cyan-50">
                  Consulte peças e materiais do cadastro industrial, organizados por grupo e subgrupo.
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => void copyCatalogLink()}
                  className="flex h-8 items-center gap-1 border border-white/40 bg-white/10 px-2.5 text-[9px] text-white"
                >
                  <Copy size={13} />
                  Compartilhar catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative flex h-8 items-center gap-1 border border-white bg-white px-2.5 text-[9px] text-[#123B50]"
                >
                  <ShoppingBag size={13} />
                  Minha seleção
                  {cartCount > 0 && (
                    <span className="ml-0.5 min-w-4 bg-[#2D8DB8] px-1 text-[8px] text-white">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-2">
            <div className="relative min-w-[240px] flex-1">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                className="h-9 w-full border border-slate-300 bg-white pl-8 pr-2 text-[10px] outline-none focus:border-[#2D8DB8]"
                placeholder="Buscar por código, produto, referência ou código de barras..."
              />
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500">
              <Filter size={13} />
              {rows.length} produtos
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5">
            <button
              type="button"
              onClick={() => setCategoria('TODOS')}
              className={
                categoria === 'TODOS'
                  ? 'shrink-0 bg-[#123B50] px-3 py-1.5 text-[9px] text-white'
                  : 'shrink-0 border border-slate-200 bg-white px-3 py-1.5 text-[9px] text-slate-600'
              }
            >
              Todos
            </button>
            {categorias.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setCategoria(item)}
                className={
                  categoria === item
                    ? 'shrink-0 bg-[#123B50] px-3 py-1.5 text-[9px] text-white'
                    : 'shrink-0 border border-slate-200 bg-white px-3 py-1.5 text-[9px] text-slate-600'
                }
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-2 border border-red-300 bg-red-50 px-2 py-1.5 text-[10px] text-red-800">
            {error}
          </div>
        )}

        <section className="mt-2">
          {busy ? (
            <div className="border border-slate-200 bg-white p-10 text-center text-slate-500">
              Carregando catálogo...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {rows.map((produto, index) => {
                const quantity = quantidades[produto.id] ?? 0
                const grupo = produto.grupo || 'SEM GRUPO'
                const anterior = rows[index - 1]?.grupo || 'SEM GRUPO'
                const showGrupo = categoria === 'TODOS' && (index === 0 || grupo !== anterior)
                return (
                  <div key={produto.id} className="contents">
                    {showGrupo && <div className="col-span-full flex items-center gap-2 border-b border-[#c8e1e8] bg-[#f4fbfd] px-2 py-1.5"><span className="h-2 w-2 bg-[#2D8DB8]"/><strong className="text-[10px] font-medium uppercase tracking-wide text-[#123B50]">{grupo}</strong><span className="text-[8px] text-slate-400">{rows.filter((item) => (item.grupo || 'SEM GRUPO') === grupo).length} produto(s)</span></div>}
                    <article
                    key={produto.id}
                    className="group overflow-hidden border border-slate-200 bg-white transition-shadow hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setDetalhe(produto)}
                      className="block w-full text-left"
                    >
                      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-slate-50">
                        {produto.foto_url ? (
                          <img
                            src={produto.foto_url}
                            alt={produto.nome}
                            className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="text-center text-[9px] text-slate-400">
                            <ShoppingBag size={28} className="mx-auto mb-1 opacity-40" />
                            Sem imagem
                          </div>
                        )}
                        {produto.grupo && (
                          <span className="absolute left-2 top-2 bg-white/90 px-1.5 py-1 text-[8px] text-slate-600 shadow-sm">{produto.grupo}</span>{produto.catalogo_disponivel&&<span className="absolute right-2 top-2 bg-[#e7f7fa] px-1.5 py-1 text-[8px] text-[#2D8DB8]">PUBLICADO</span>}
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="flex items-center justify-between gap-2"><span className="font-mono text-[8px] text-slate-400">{produto.codigo}</span>{produto.subgrupo&&<span className="truncate text-[8px] text-slate-400">{produto.subgrupo}</span>}</div>
                        <h2 className="mt-1 min-h-8 text-[11px] font-medium leading-4 text-[#123B50]">
                          {produto.nome}
                        </h2>
                        <p className="mt-1 line-clamp-2 min-h-7 text-[8px] leading-3 text-slate-500">{produto.descricao || "Sem descrição cadastrada."}</p>
                        <div className="mt-2 flex items-end justify-between gap-1">
                          <div>
                            <span className="block text-[8px] text-slate-400">Preço de venda</span>
                            <strong className="text-[13px] font-medium text-[#123B50]">
                              {brl(Number(produto.preco_venda ?? 0))}
                            </strong>
                          </div>
                          <span className="text-[8px] text-slate-500">{produto.unidade}</span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-2 py-1.5">
                      {quantity > 0 ? (
                        <div className="flex items-center border border-slate-300 bg-white">
                          <button
                            type="button"
                            onClick={() => decrement(produto)}
                            className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus size={12} className="mx-auto" />
                          </button>
                          <span className="w-7 text-center text-[9px]">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => add(produto)}
                            className="h-7 w-7 text-[#2D8DB8] hover:bg-slate-100"
                          >
                            <Plus size={12} className="mx-auto" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => add(produto)}
                          className="flex h-7 flex-1 items-center justify-center gap-1 bg-[#2D8DB8] text-[9px] text-white"
                        >
                          <Plus size={12} />
                          Adicionar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetalhe(produto)}
                        className="ml-1 h-7 border border-slate-300 px-2 text-[8px] text-slate-600"
                      >
                        Detalhes
                      </button>
                    </div>
                  </article>
                  </div>
                )
              })}

              {!rows.length && (
                <div className="col-span-full border border-slate-200 bg-white p-10 text-center text-slate-500">
                  Nenhum produto publicado para este filtro.
                </div>
              )}
            </div>
          )}
        </section>

        {cartCount > 0 && (
          <section className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2">
            <div>
              <span className="text-[9px] text-slate-500">MINHA SELEÇÃO</span>
              <strong className="ml-2 text-[11px] text-[#123B50]">
                {cartCount} item(ns) • {brl(cartTotal)}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex h-8 items-center gap-1 bg-[#123B50] px-3 text-[9px] text-white"
            >
              <ShoppingBag size={13} />
              Abrir seleção
            </button>
          </section>
        )}

        {detalhe && (
          <>
            <button
              type="button"
              aria-label="Fechar ficha"
              onClick={() => setDetalhe(null)}
              className="fixed inset-0 z-40 bg-black/30"
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-[min(430px,94vw)] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
              <header className="sticky top-0 z-10 flex h-11 items-center justify-between border-b bg-white px-3">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">
                    Detalhes do produto
                  </span>
                  <strong className="block text-[11px] text-[#123B50]">{detalhe.codigo}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalhe(null)}
                  className="h-7 w-7 border border-slate-300"
                >
                  <X size={13} className="mx-auto" />
                </button>
              </header>
              <div className="p-4">
                {detalhe.foto_url && (
                  <div className="mb-4 flex h-52 items-center justify-center bg-slate-50">
                    <img src={detalhe.foto_url} alt={detalhe.nome} className="h-full w-full object-contain p-4" />
                  </div>
                )}
                <h2 className="text-lg font-medium leading-6 text-[#123B50]">{detalhe.nome}</h2>
                <p className="mt-1 text-[9px] text-slate-400">
                  {detalhe.referencia_interna || detalhe.codigo_barras || 'Produto industrial'}
                </p>
                <div className="mt-4 border-y border-slate-200 py-3">
                  <span className="text-[9px] text-slate-500">PREÇO DE VENDA</span>
                  <strong className="mt-1 block text-xl font-medium text-[#123B50]">
                    {brl(Number(detalhe.preco_venda ?? 0))}
                  </strong>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
                  {[
                    ['Grupo', detalhe.grupo || '—'],
                    ['Subgrupo', detalhe.subgrupo || '—'],
                    ['Unidade', detalhe.unidade],
                    ['Estoque', Number(detalhe.estoque_atual ?? 0).toLocaleString('pt-BR')],
                  ].map(([label, value]) => (
                    <div key={label} className="border p-2">
                      <span className="text-slate-400">{label}</span>
                      <b className="mt-1 block font-medium">{value}</b>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border p-3 text-[10px] leading-5 text-slate-600">
                  {detalhe.descricao || 'Sem descrição cadastrada.'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    add(detalhe)
                    setDetalhe(null)
                  }}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1 bg-[#2D8DB8] text-[10px] text-white"
                >
                  <Plus size={14} />
                  Adicionar à seleção
                </button>
              </div>
            </aside>
          </>
        )}

        {cartOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar seleção"
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 z-40 bg-black/30"
            />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(420px,94vw)] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <header className="flex h-12 items-center justify-between border-b px-3">
                <div>
                  <strong className="block text-[12px] text-[#123B50]">Minha seleção</strong>
                  <span className="text-[8px] text-slate-400">{cartCount} item(ns)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="h-7 w-7 border border-slate-300"
                >
                  <X size={13} className="mx-auto" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-3">
                {cartRows.length ? (
                  cartRows
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingBag size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-[10px]">Sua seleção está vazia.</p>
                  </div>
                )}
              </div>
              <footer className="border-t bg-slate-50 p-3">
                <div className="mb-2 flex justify-between text-[10px]">
                  <span>Total estimado</span>
                  <strong className="text-[13px] text-[#123B50]">{brl(cartTotal)}</strong>
                </div>
                <button
                  type="button"
                  disabled={!cart.length}
                  onClick={() => void sendSelection()}
                  className="flex h-10 w-full items-center justify-center gap-2 bg-[#2D8DB8] text-[10px] text-white disabled:opacity-40"
                >
                  <Send size={13} />
                  Enviar seleção para pedido
                </button>
              </footer>
            </aside>
          </>
        )}
      </main>
    </VendasLayout>
  )
}
