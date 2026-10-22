/**
 * SYSNQRA — Gestão da Qualidade | Análise de refugos e perdas
 * Revisão QAL-AN-007 | 2026-10-21
 * Escopo: indicadores reais por empresa autenticada; sem fallback ou dados simulados.
 * Nota: custo estimado usa custo_medio do cadastro do produto, não substitui custo BOM validado.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CalendarDays, Coins, RefreshCw, Scale, PackageSearch } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Scrap = { id: string; ordem_producao_id: string; defeito_id: string; quantidade_refugada: number; peso_refugo_kg: number | null; created_at: string }
type OP = { id: string; numero_op: number | string; produto_id: string | null }
type Product = { id: string; codigo: string; nome: string; custo_medio: number | null }
type Defect = { id: string; codigo_defeito: string; descricao: string; classificacao: string }

const field = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#3b5e7c] bg-[#091522] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none focus:border-[#48B7C7]'
const label = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-[#A8BBC8]'
const dateISO = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const integer = (value: number) => value.toLocaleString('pt-BR')
const decimal = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function QualidadeGraficosRefugo() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(dateISO(firstDay))
  const [endDate, setEndDate] = useState(dateISO(today))
  const [records, setRecords] = useState<Scrap[]>([])
  const [orders, setOrders] = useState<OP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [defects, setDefects] = useState<Defect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão autenticada não identificada.')
      const tenant = String(company.data)
      const [scrapRows, orderRows, productRows, defectRows] = await Promise.all([
        fetchAllPages<Scrap>((from, to) => supabase.from('erp_qualidade_refugos').select('id,ordem_producao_id,defeito_id,quantidade_refugada,peso_refugo_kg,created_at').eq('empresa_id', tenant).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<OP>((from, to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id').eq('empresa_id', tenant).range(from, to)),
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,custo_medio').eq('empresa_id', tenant).range(from, to)),
        supabase.from('erp_qualidade_defeitos_motivos').select('id,codigo_defeito,descricao,classificacao').eq('empresa_id', tenant).eq('ativo', true).order('codigo_defeito')
      ])
      if (defectRows.error) throw defectRows.error
      setRecords(scrapRows)
      setOrders(orderRows)
      setProducts(productRows)
      setDefects((defectRows.data ?? []) as Defect[])
    } catch (e) {
      setRecords([]); setOrders([]); setProducts([]); setDefects([])
      setError(e instanceof Error ? e.message : 'Falha ao consultar os dados reais do SGQ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const orderMap = useMemo(() => new Map(orders.map(item => [item.id, item])), [orders])
  const productMap = useMemo(() => new Map(products.map(item => [item.id, item])), [products])
  const defectMap = useMemo(() => new Map(defects.map(item => [item.id, item])), [defects])

  const analysis = useMemo(() => {
    const validRange = startDate <= endDate
    const filtered = validRange ? records.filter(row => {
      const day = row.created_at.slice(0, 10)
      return day >= startDate && day <= endDate
    }) : []
    const byProduct = new Map<string, { id: string; code: string; name: string; quantity: number; cost: number; costKnown: boolean }>()
    const byDefect = new Map<string, { id: string; code: string; description: string; classification: string; quantity: number }>()
    let totalQuantity = 0
    let totalWeight = 0
    let estimatedCost = 0
    let valuedQuantity = 0

    for (const row of filtered) {
      const qty = Number(row.quantidade_refugada) || 0
      totalQuantity += qty
      totalWeight += Number(row.peso_refugo_kg) || 0
      const order = orderMap.get(row.ordem_producao_id)
      const product = order?.produto_id ? productMap.get(order.produto_id) : undefined
      if (product) {
        const unitCost = product.custo_medio == null ? null : Number(product.custo_medio)
        const existing = byProduct.get(product.id) ?? { id: product.id, code: product.codigo, name: product.nome, quantity: 0, cost: 0, costKnown: unitCost !== null && Number.isFinite(unitCost) }
        existing.quantity += qty
        if (unitCost !== null && Number.isFinite(unitCost)) {
          existing.cost += qty * unitCost
          estimatedCost += qty * unitCost
          valuedQuantity += qty
        } else existing.costKnown = false
        byProduct.set(product.id, existing)
      }
      const defect = defectMap.get(row.defeito_id)
      if (defect) {
        const existing = byDefect.get(defect.id) ?? { id: defect.id, code: defect.codigo_defeito, description: defect.descricao, classification: defect.classificacao, quantity: 0 }
        existing.quantity += qty
        byDefect.set(defect.id, existing)
      }
    }
    const productRanking = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity)
    const defectRanking = [...byDefect.values()].sort((a, b) => b.quantity - a.quantity)
    const criticalRecords = filtered.filter(row => defectMap.get(row.defeito_id)?.classificacao === 'CRÍTICO').length
    return {
      totalQuantity, totalWeight, estimatedCost, valuedQuantity, totalRows: filtered.length, criticalRecords,
      productRanking, defectRanking,
      maxProduct: Math.max(1, ...productRanking.map(item => item.quantity)),
      maxDefect: Math.max(1, ...defectRanking.map(item => item.quantity)),
      validRange
    }
  }, [records, startDate, endDate, orderMap, productMap, defectMap])

  const BarList = ({ title, subtitle, empty, children }: { title: string; subtitle: string; empty: boolean; children: React.ReactNode }) => (
    <section className="min-w-0 border border-[#2E4A62] bg-[#0E1E2F] p-3">
      <div className="mb-3 border-b border-[#2E4A62] pb-2"><h2 className="text-xs font-black uppercase text-[#F4FBFD]">{title}</h2><p className="mt-1 text-[9px] text-[#A8BBC8]">{subtitle}</p></div>
      {empty ? <p className="py-8 text-center text-[10px] text-slate-400">Sem registros para o período selecionado.</p> : <div className="space-y-3">{children}</div>}
    </section>
  )

  return <main className="min-h-screen bg-[#0A111A] p-3 font-mono text-[#F4FBFD] antialiased md:p-5">
    <div className="mx-auto max-w-[1700px] space-y-4">
      <header className="flex flex-wrap items-center gap-3 border border-[#2E4A62] border-l-4 border-l-[#2D8DB8] bg-[#0E1E2F] p-4 shadow-xl">
        <span className="flex h-11 w-11 items-center justify-center border border-[#48B7C7]/30 bg-[#123B50] text-[#48B7C7]"><BarChart3 size={22}/></span>
        <div className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#48B7C7]">SYSNQRA • SGQ / AN-QAL-007</span><h1 className="text-lg font-black md:text-xl">Análise de Refugos e Perdas da Qualidade</h1><p className="text-[10px] text-slate-400">Indicadores derivados dos registros reais da empresa autenticada.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex h-[30px] items-center gap-1.5 border border-[#2E4A62] bg-[#123B50] px-3 text-[10px] font-black uppercase disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Sincronizar</button>
      </header>

      {error && <div role="alert" className="border border-rose-500 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{error}</div>}
      <section className="grid grid-cols-1 gap-3 border border-[#2E4A62] bg-[#122335] p-3 sm:grid-cols-12">
        <div className="sm:col-span-4"><label className={label}><CalendarDays size={10} className="mr-1 inline text-[#48B7C7]"/>Data inicial</label><input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className={field}/></div>
        <div className="sm:col-span-4"><label className={label}><CalendarDays size={10} className="mr-1 inline text-[#2D8DB8]"/>Data final</label><input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={field}/></div>
        <div className="flex items-end text-[10px] text-[#A8BBC8] sm:col-span-4">{loading ? 'Consultando Supabase…' : `Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`}</div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
        <article className="border border-rose-900 border-l-4 border-l-[#D65B61] bg-gradient-to-br from-[#3a121a] to-[#160b10] p-3 xl:col-span-3"><div className="flex items-center gap-2 text-rose-200"><AlertTriangle size={15}/><span className="text-[9px] font-black uppercase">Peças refugadas</span></div><div className="mt-2 text-2xl font-black text-rose-300">{integer(analysis.totalQuantity)} <span className="text-xs">un</span></div><p className="mt-1 text-[9px] text-rose-200/70">{integer(analysis.totalRows)} registros no período</p></article>
        <article className="border border-amber-900 border-l-4 border-l-[#E6A34A] bg-gradient-to-br from-[#332007] to-[#1a1003] p-3 xl:col-span-3"><div className="flex items-center gap-2 text-amber-200"><Scale size={15}/><span className="text-[9px] font-black uppercase">Massa descartada</span></div><div className="mt-2 text-2xl font-black text-amber-300">{decimal(analysis.totalWeight)} <span className="text-xs">kg</span></div><p className="mt-1 text-[9px] text-amber-100/70">Soma dos pesos informados</p></article>
        <article className="border border-violet-900 border-l-4 border-l-violet-500 bg-gradient-to-br from-[#241533] to-[#100a18] p-3 xl:col-span-3"><div className="flex items-center gap-2 text-violet-200"><Coins size={15}/><span className="text-[9px] font-black uppercase">Custo estimado da perda</span></div><div className="mt-2 text-2xl font-black text-violet-300">{brl(analysis.estimatedCost)}</div><p className="mt-1 text-[9px] text-violet-100/70">{integer(analysis.valuedQuantity)} peças com custo médio cadastrado</p></article>
        <article className="border border-sky-900 border-l-4 border-l-[#2D8DB8] bg-gradient-to-br from-[#0b2b40] to-[#081722] p-3 xl:col-span-3"><div className="flex items-center gap-2 text-sky-200"><PackageSearch size={15}/><span className="text-[9px] font-black uppercase">RNC críticas</span></div><div className="mt-2 text-2xl font-black text-sky-300">{integer(analysis.criticalRecords)}</div><p className="mt-1 text-[9px] text-sky-100/70">Registros associados a defeitos críticos</p></article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <BarList title="Ranking de peças com maior refugo" subtitle="Ordenado pela quantidade acumulada; valor unitário conforme custo_medio cadastrado." empty={!analysis.productRanking.length}>
          {analysis.productRanking.map(item => <div key={item.id} className="space-y-1.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] font-black text-[#F4FBFD]">{item.code} — {item.name}</p><p className="text-[9px] text-slate-400">{item.costKnown ? brl(item.cost) + ' estimados' : 'Custo parcial/não cadastrado'}</p></div><strong className="shrink-0 text-xs text-[#48B7C7]">{integer(item.quantity)} un</strong></div><div className="h-2 overflow-hidden bg-[#071522]"><div className="h-full rounded-[2px] bg-gradient-to-r from-[#2D8DB8] to-[#48B7C7] transition-all" style={{ width: `${(item.quantity / analysis.maxProduct) * 100}%` }}/></div></div>)}
        </BarList>
        <BarList title="Pareto de defeitos de processo" subtitle="Volume de peças associado a cada motivo ativo cadastrado." empty={!analysis.defectRanking.length}>
          {analysis.defectRanking.map(item => <div key={item.id} className="space-y-1.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black text-[#F4FBFD]">{item.code} — {item.description}</p><p className={'text-[9px] font-bold '+(item.classification==='CRÍTICO'?'text-rose-300':item.classification==='MAIOR'?'text-amber-300':'text-slate-400')}>{item.classification}</p></div><strong className="shrink-0 text-xs text-[#E6A34A]">{integer(item.quantity)} un</strong></div><div className="h-2 overflow-hidden bg-[#071522]"><div className="h-full rounded-[2px] bg-gradient-to-r from-[#E6A34A] to-[#D65B61] transition-all" style={{ width: `${(item.quantity / analysis.maxDefect) * 100}%` }}/></div></div>)}
        </BarList>
      </section>

      <section className="border border-[#2E4A62] border-l-4 border-l-[#48B7C7] bg-[#0E1E2F] p-4">
        <h2 className="text-xs font-black uppercase text-[#48B7C7]">Sumário analítico do SGQ</h2>
        {loading ? <p className="mt-2 text-xs text-slate-400">Carregando apuração…</p> : error ? <p className="mt-2 text-xs text-rose-200">Apuração indisponível até a consulta ao banco ser corrigida.</p> : <p className="mt-2 text-xs leading-6 text-slate-200">No período selecionado, foram registrados <strong>{integer(analysis.totalQuantity)} peças refugadas</strong> em {integer(analysis.totalRows)} apontamentos. O produto com maior volume é <strong>{analysis.productRanking[0] ? `${analysis.productRanking[0].code} — ${analysis.productRanking[0].name}` : 'não identificado nos registros'}</strong>; o defeito com maior volume é <strong>{analysis.defectRanking[0] ? analysis.defectRanking[0].description : 'não identificado nos registros'}</strong>. O custo estimado calculável é <strong>{brl(analysis.estimatedCost)}</strong>, usando o custo médio cadastrado apenas para as peças com valor disponível; não representa custo BOM completo validado.</p>}
        <p className="mt-2 text-[9px] text-slate-500">Revisão QAL-AN-007 • Valores limitados ao período e à empresa da sessão autenticada. Sem dados simulados.</p>
      </section>
    </div>
  </main>
}
