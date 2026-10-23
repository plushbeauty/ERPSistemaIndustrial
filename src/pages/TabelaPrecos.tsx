/**
 * SYSNQRA ERP INDUSTRIAL — Padronização visual incremental de Vendas
 * Revisão: REV-VENDAS-UI-006 | Data: 2026-10-23
 * Escopo: geometria dos filtros, ação e grade; regras e RPCs de reajuste preservados.
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Produto = { id: string; codigo: string; nome: string; grupo: string | null; preco_venda: number | null }

const PAGE_SIZE = 25

export default function TabelaPrecos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [grupo, setGrupo] = useState('')
  const [tipoCliente, setTipoCliente] = useState('')
  const [percentual, setPercentual] = useState('5')
  const [tipoReajuste, setTipoReajuste] = useState<'vendas' | 'postos'>('vendas')
  const [pagina, setPagina] = useState(1)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setErro('')
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa não identificada.')

      const resultado = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome,grupo,preco_venda')
        .eq('empresa_id', String(empresa.data))
        .eq('ativo', true)
        .order('codigo')
        .limit(5000)
      if (resultado.error) throw resultado.error

      setProdutos((resultado.data ?? []) as Produto[])
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao carregar a tabela de preços.')
    }
  }

  useEffect(() => { void carregar() }, [])

  const paginas = Math.max(1, Math.ceil(produtos.length / PAGE_SIZE))
  const produtosVisiveis = useMemo(
    () => produtos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [pagina, produtos],
  )
  const simulacoes = useMemo(() => {
    const ajuste = Number(percentual)
    return new Map(produtos.map(produto => {
      const preco = Number(produto.preco_venda)
      return [
        produto.id,
        Number.isFinite(preco) && preco > 0 && Number.isFinite(ajuste)
          ? preco * (1 + ajuste / 100)
          : null,
      ] as const
    }))
  }, [percentual, produtos])

  useEffect(() => {
    setPagina(atual => Math.min(atual, paginas))
  }, [paginas])

  const aplicarReajuste = async () => {
    setErro('')
    setMensagem('')
    const ajuste = Number(percentual)
    if (!Number.isFinite(ajuste) || ajuste <= -100) {
      setErro('Percentual inválido.')
      return
    }

    const resultado = tipoReajuste === 'vendas'
      ? await supabase.rpc('erp_reajuste_global_vendas', {
        p_percentual: ajuste,
        p_grupo: grupo || null,
        p_tipo_cliente: tipoCliente || null,
      })
      : await supabase.rpc('erp_reajuste_global_postos_trabalho', { p_percentual: ajuste })

    if (resultado.error) {
      setErro(resultado.error.message)
      return
    }

    setMensagem(`Reajuste aplicado em ${Number(resultado.data ?? 0)} registro(s).`)
    await carregar()
  }

  return (
    <VendasLayout
      title="Tabela de Preços / Reajuste"
      subtitle="Área administrativa"
      onRefresh={() => void carregar()}
    >
      <div className="space-y-3 text-xs">
        <section className="rounded-[2px] border border-slate-300 bg-white p-2">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck size={16} aria-hidden="true" />
            <h2 className="text-sm font-bold">Ajuste global controlado por permissão</h2>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <label className="grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-1 xl:col-span-3">
              Tipo
              <select
                className="h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-xs"
                value={tipoReajuste}
                onChange={event => setTipoReajuste(event.target.value as 'vendas' | 'postos')}
              >
                <option value="vendas">Preço de venda comercial</option>
                <option value="postos">Custo hora-máquina</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-1 xl:col-span-2">
              Percentual %
              <input
                className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs"
                type="number"
                step="0.01"
                value={percentual}
                onChange={event => setPercentual(event.target.value)}
              />
            </label>
            <label className="grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-1 xl:col-span-3">
              Grupo produto
              <input
                className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs"
                value={grupo}
                onChange={event => setGrupo(event.target.value)}
              />
            </label>
            <label className="grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-1 xl:col-span-2">
              Perfil cliente
              <input
                className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs"
                value={tipoCliente}
                onChange={event => setTipoCliente(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => void aplicarReajuste()}
              className="h-[30px] w-full self-end rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-xs font-semibold text-white hover:bg-[#237497] sm:col-span-2 xl:col-span-2"
            >
              Aplicar
            </button>
          </div>
          {erro && <div role="alert" className="mt-3 border border-red-200 bg-red-50 p-2 text-red-800">{erro}</div>}
          {mensagem && <div role="status" className="mt-3 border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">{mensagem}</div>}
        </section>

        <section className="overflow-hidden border border-slate-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-2 py-1">SKU</th>
                  <th className="px-2 py-1">Produto</th>
                  <th className="px-2 py-1">Grupo</th>
                  <th className="px-2 py-1">Preço atual</th>
                  <th className="px-2 py-1">Preço de venda · simulação</th>
                </tr>
              </thead>
              <tbody>
                {produtosVisiveis.map(produto => (
                  <tr key={produto.id} className="h-8 border-t border-slate-200">
                    <td className="px-2 py-1">{produto.codigo}</td>
                    <td className="px-2 py-1">{produto.nome}</td>
                    <td className="px-2 py-1">{produto.grupo ?? '—'}</td>
                    <td className="px-2 py-1">{brl(Number(produto.preco_venda ?? 0))}</td>
                    <td className="px-2 py-1 font-semibold text-[#17445A]">
                      {simulacoes.get(produto.id) != null ? brl(simulacoes.get(produto.id) as number) : '—'}
                    </td>
                  </tr>
                ))}
                {!produtosVisiveis.length && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum produto ativo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2" aria-label="Paginação da tabela de preços">
            <span className="text-xs text-slate-600">
              Página {pagina} de {paginas} · {produtos.length} produtos
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={pagina <= 1}
                onClick={() => setPagina(atual => Math.max(1, atual - 1))}
                className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={pagina >= paginas}
                onClick={() => setPagina(atual => Math.min(paginas, atual + 1))}
                className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima <ChevronRight size={15} />
              </button>
            </div>
          </nav>
        </section>
      </div>
    </VendasLayout>
  )
}

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
}
