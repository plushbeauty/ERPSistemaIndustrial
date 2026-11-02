/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type Stock = { produto_id: string; saldo_fisico: number | null }
type Product = { id: string; codigo: string; descricao: string | null; custo_total: number }
type Cost = { produto_id: string; custo_total: number | null; custo_fabricacao: number | null; created_at: string }
const colors = ['#2563eb', '#f59e0b', '#64748b']

export default function EstoqueCurvaABC() {
  const [items, setItems] = useState<Product[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      setBusy(true)
      setError('')
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) {
          throw tenant.error ?? new Error('Empresa da sessão não identificada.')
        }
        const empresaId = tenant.data
        const [products, balances, costs] = await Promise.all([
          fetchAllPages<Omit<Product, 'custo_total'>>((from, to) =>
            supabase.from('erp_produtos').select('id,codigo,descricao').eq('empresa_id', empresaId).eq('ativo', true).order('codigo').range(from, to)
          ),
          fetchAllPages<Stock>((from, to) =>
            supabase.from('erp_produto_estoque').select('produto_id,saldo_fisico').eq('empresa_id', empresaId).range(from, to)
          ),
          fetchAllPages<Cost>((from, to) =>
            supabase.from('erp_custos_produtos').select('produto_id,custo_total,custo_fabricacao,created_at').eq('empresa_id', empresaId).order('created_at', { ascending: false }).range(from, to)
          )
        ])
        const latestCost = new Map<string, number>()
        for (const row of costs) {
          if (!latestCost.has(row.produto_id)) latestCost.set(row.produto_id, Number(row.custo_total || row.custo_fabricacao || 0))
        }
        if (active) {
          setItems(products.map(product => ({ ...product, custo_total: latestCost.get(product.id) ?? 0 })))
          setStock(balances)
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Falha ao carregar a curva ABC.')
      } finally {
        if (active) setBusy(false)
      }
    })()
    return () => { active = false }
  }, [])

  const data = useMemo(() => {
    const balanceByProduct = new Map<string, number>()
    for (const row of stock) balanceByProduct.set(row.produto_id, (balanceByProduct.get(row.produto_id) ?? 0) + Number(row.saldo_fisico || 0))
    const values = items.map(product => ({
      codigo: product.codigo,
      valor: Number(product.custo_total || 0) * (balanceByProduct.get(product.id) ?? 0)
    })).sort((a, b) => b.valor - a.valor)
    const total = values.reduce((sum, row) => sum + row.valor, 0)
    let accumulated = 0
    let a = 0, b = 0, c = 0
    for (const row of values) {
      accumulated += row.valor
      const percent = total ? accumulated / total : 0
      if (percent <= .7) a += row.valor
      else if (percent <= .9) b += row.valor
      else c += row.valor
    }
    return [{ name: 'Classe A', value: a }, { name: 'Classe B', value: b }, { name: 'Classe C', value: c }]
  }, [items, stock])

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
    <header className="flex flex-wrap items-center gap-2 border-b pb-4">
      <div><p className="text-sm font-black text-slate-600">ESTOQUE &gt; INDICADORES CRÍTICOS</p><h1 className="text-2xl font-black">Curva ABC de Valorização</h1></div>
      <div className="ml-auto flex gap-2 print:hidden"><button type="button" onClick={() => window.print()} className="rounded-sm bg-slate-900 px-4 py-2 text-sm font-bold text-white">IMPRIMIR RELATÓRIO</button></div>
    </header>
    {error && <div role="alert" className="mt-4 border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div>}
    <section className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
      <article className="rounded-sm border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Distribuição patrimonial</h2>{busy ? <p className="py-10 text-sm">Carregando dados reais…</p> : <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105}>{data.map((row, index) => <Cell key={row.name} fill={colors[index]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>}</article>
      <article className="rounded-sm border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Capital parado por classe</h2>{data.map(row => <div key={row.name} className="flex h-10 items-center justify-between border-b text-sm font-semibold"><span>{row.name}</span><span>R$ {row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>)}<p className="mt-3 text-xs text-slate-500">Valor estimado a partir do último custo registrado por produto e do saldo físico; produtos sem custo cadastrado não são valorizados.</p></article>
    </section>
  </main>
}
