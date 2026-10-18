/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: METAS-COMERCIAIS-UI-ALINHADA
 * @ESCOPO: metas da empresa e metas individuais por vendedor, com realizado vindo de pedidos reais.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, DollarSign, Plus, Save, Target, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Seller = { id: string; nome: string }
type SellerGoal = { id?: string; vendedor_id: string; meta_faturamento: number; meta_pedidos: number; realizado: number; pedidos_realizados: number }
type GoalRecord = { id: string; competencia: string; meta_faturamento: number; meta_pedidos: number }
type OrderRecord = { vendedor_id: string | null; total: number | null; status: string | null; data_entrada: string }

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const localMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
const isClosedOrInvalidOrder = (status: string | null) => ['cancelado', 'cancelada', 'rascunho', 'aberto', 'cotação', 'cotacao'].includes((status ?? '').trim().toLocaleLowerCase('pt-BR'))

export default function VendasMetas() {
  const [empresa, setEmpresa] = useState('')
  const [sellers, setSellers] = useState<Seller[]>([])
  const [sellerGoals, setSellerGoals] = useState<SellerGoal[]>([])
  const [companyGoal, setCompanyGoal] = useState<GoalRecord | null>(null)
  const [mes, setMes] = useState(localMonth)
  const [valor, setValor] = useState('0')
  const [pedidos, setPedidos] = useState('0')
  const [realizado, setRealizado] = useState(0)
  const [pedidosRealizados, setPedidosRealizados] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setMsg('')
    try {
      if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error('Selecione uma competência válida.')
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa não identificada para a sessão autenticada.')
      const empresaId = String(company.data)
      setEmpresa(empresaId)

      const monthStart = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1)
      const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
      const nextMonthText = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
      const start = `${mes}-01`

      const [sellerResult, companyGoalResult, sellerGoalResult, orderResult] = await Promise.all([
        supabase.from('erp_usuarios').select('id,nome').eq('empresa_id', empresaId).eq('ativo', true).is('deleted_at', null).order('nome'),
        supabase.from('erp_vendas_metas').select('id,competencia,meta_faturamento,meta_pedidos').eq('empresa_id', empresaId).eq('competencia', start).maybeSingle(),
        supabase.from('erp_vendas_metas_vendedores').select('id,vendedor_id,meta_faturamento,meta_pedidos').eq('empresa_id', empresaId).eq('competencia', start),
        supabase.from('erp_pedidos_venda').select('vendedor_id,total,status,data_entrada').eq('empresa_id', empresaId).gte('data_entrada', start).lt('data_entrada', nextMonthText),
      ])
      if (sellerResult.error) throw sellerResult.error
      if (companyGoalResult.error) throw companyGoalResult.error
      if (sellerGoalResult.error) throw sellerGoalResult.error
      if (orderResult.error) throw orderResult.error

      const activeSellers = (sellerResult.data ?? []).map((seller) => ({ id: String(seller.id), nome: String(seller.nome ?? 'Vendedor sem nome') }))
      const companyGoalData = companyGoalResult.data as GoalRecord | null
      const goalsBySeller = new Map((sellerGoalResult.data ?? []).map((goal) => [String(goal.vendedor_id), goal]))
      const totalsBySeller = new Map<string, { total: number; count: number }>()
      const validOrders = ((orderResult.data ?? []) as OrderRecord[]).filter((order) => !isClosedOrInvalidOrder(order.status))
      for (const order of validOrders) {
        if (!order.vendedor_id) continue
        const current = totalsBySeller.get(order.vendedor_id) ?? { total: 0, count: 0 }
        current.total += Number(order.total ?? 0)
        current.count += 1
        totalsBySeller.set(order.vendedor_id, current)
      }

      setSellers(activeSellers)
      setCompanyGoal(companyGoalData)
      setValor(String(Number(companyGoalData?.meta_faturamento ?? 0)))
      setPedidos(String(Number(companyGoalData?.meta_pedidos ?? 0)))
      setRealizado(validOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0))
      setPedidosRealizados(validOrders.length)
      setSellerGoals(activeSellers.map((seller) => {
        const goal = goalsBySeller.get(seller.id)
        const actual = totalsBySeller.get(seller.id) ?? { total: 0, count: 0 }
        return {
          id: goal?.id ? String(goal.id) : undefined,
          vendedor_id: seller.id,
          meta_faturamento: Number(goal?.meta_faturamento ?? 0),
          meta_pedidos: Number(goal?.meta_pedidos ?? 0),
          realizado: actual.total,
          pedidos_realizados: actual.count,
        }
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao sincronizar as metas com o banco ERP.')
    } finally {
      setLoading(false)
    }
  }, [mes])

  useEffect(() => { void load() }, [load])

  const pct = useMemo(() => Number(valor) > 0 ? Math.min((realizado / Number(valor)) * 100, 999) : 0, [realizado, valor])
  const updateSellerGoal = (sellerId: string, field: 'meta_faturamento' | 'meta_pedidos', value: number) => {
    setSellerGoals((current) => current.map((goal) => goal.vendedor_id === sellerId ? { ...goal, [field]: value } : goal))
  }

  const save = async () => {
    if (!empresa || saving || loading) return
    if (!/^\d{4}-\d{2}$/.test(mes)) { setError('Selecione uma competência válida.'); return }
    if (!Number.isFinite(Number(valor)) || Number(valor) < 0 || !Number.isFinite(Number(pedidos)) || Number(pedidos) < 0) {
      setError('As metas da empresa devem ser valores numéricos iguais ou maiores que zero.')
      return
    }
    if (sellerGoals.some((goal) => !Number.isFinite(goal.meta_faturamento) || goal.meta_faturamento < 0 || !Number.isInteger(goal.meta_pedidos) || goal.meta_pedidos < 0)) {
      setError('As metas individuais devem ser números válidos e não negativos.')
      return
    }
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const companySave = await supabase.from('erp_vendas_metas').upsert({
        empresa_id: empresa,
        competencia: `${mes}-01`,
        meta_faturamento: Number(valor),
        meta_pedidos: Math.trunc(Number(pedidos)),
      }, { onConflict: 'empresa_id,competencia' }).select('id,competencia,meta_faturamento,meta_pedidos').single()
      if (companySave.error) throw companySave.error

      if (sellerGoals.length > 0) {
        const sellerSave = await supabase.from('erp_vendas_metas_vendedores').upsert(sellerGoals.map((goal) => ({
          empresa_id: empresa,
          competencia: `${mes}-01`,
          vendedor_id: goal.vendedor_id,
          meta_faturamento: goal.meta_faturamento,
          meta_pedidos: Math.trunc(goal.meta_pedidos),
        })), { onConflict: 'empresa_id,vendedor_id,competencia' })
        if (sellerSave.error) throw sellerSave.error
      }
      setCompanyGoal(companySave.data as GoalRecord)
      setMsg('Metas da empresa e da equipe gravadas no banco de dados.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar metas comerciais.')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = 'h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-100 disabled:bg-slate-100'
  const compactFieldClass = `${fieldClass} w-[132px] max-w-full font-mono`

  return (
    <VendasLayout title="Metas Comerciais" subtitle="Definição de metas, atingimento e desempenho real por vendedor" onRefresh={() => void load()}>
      <main className="sales-workspace sales-detail space-y-3 p-1 text-[11px]">
        {error && <div role="alert" className="flex items-start justify-between gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-800"><span className="flex items-center gap-1.5"><AlertTriangle size={13} />{error}</span><button type="button" onClick={() => setError('')} aria-label="Fechar erro" className="no-print p-1"><X size={12} /></button></div>}
        {msg && <div role="status" className="flex items-center justify-between gap-2 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800"><span className="flex items-center gap-1.5"><CheckCircle2 size={13} />{msg}</span><button type="button" onClick={() => setMsg('')} aria-label="Fechar confirmação" className="no-print p-1"><X size={12} /></button></div>}

        <section className="grid grid-cols-1 items-end gap-3 rounded border border-slate-200 bg-slate-50 p-3 shadow-sm md:grid-cols-12 no-print">
          <label className="grid gap-1 md:col-span-3">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><Target size={11} />Selecionar competência</span>
            <input type="month" required value={mes} onChange={(event) => setMes(event.target.value)} className={`${fieldClass} w-[150px] max-w-full font-mono`} />
          </label>
          <div className="hidden md:col-span-5 md:block" />
          <div className="flex flex-wrap gap-1.5 md:col-span-4 md:justify-end">
            <button type="button" className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-600 hover:bg-slate-100" onClick={() => { setValor('0'); setPedidos('0'); setSellerGoals((current) => current.map((goal) => ({ ...goal, meta_faturamento: 0, meta_pedidos: 0 }))); setMsg('Campos de meta zerados. Grave para persistir a alteração.'); }}><Plus size={11} />Zerar metas</button>
            <button type="button" className="inline-flex h-8 items-center justify-center gap-1 rounded bg-[#2D8DB8] px-3 text-[10px] font-black uppercase tracking-wide text-white shadow-sm hover:bg-[#1e6180] disabled:opacity-50" onClick={() => void save()} disabled={loading || saving || !empresa}><Save size={12} />{saving ? 'Gravando…' : 'Gravar metas'}</button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded border border-slate-200 bg-white p-3 shadow-sm">
            <label className="grid gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400"><span className="flex items-center gap-1"><DollarSign size={11} />Meta de faturamento da empresa (R$)</span><input type="number" min="0" step="0.01" value={valor} disabled={loading || saving} onChange={(event) => setValor(event.target.value)} className={fieldClass + ' w-[190px] max-w-full font-mono'} /></label>
          </article>
          <article className="rounded border border-slate-200 bg-white p-3 shadow-sm">
            <label className="grid gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400"><span className="flex items-center gap-1"><ClipboardCheck size={11} />Meta de pedidos da empresa</span><input type="number" min="0" step="1" value={pedidos} disabled={loading || saving} onChange={(event) => setPedidos(event.target.value)} className={fieldClass + ' w-[150px] max-w-full font-mono'} /></label>
          </article>
          <article className="flex items-center justify-between rounded border border-slate-200 border-l-4 border-l-sky-800 bg-white p-3 shadow-sm">
            <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">Realizado comercial</span><strong className="mt-0.5 block text-lg font-black text-slate-900">{brl(realizado)}</strong><span className="text-[9px] text-slate-500">{pedidosRealizados} pedido(s) válidos · {pct.toFixed(0)}% da meta</span></div>
            <Target size={19} className="shrink-0 text-sky-700" />
          </article>
        </section>

        <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2"><Users size={13} className="text-sky-700" /><h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-700">Metas individuais e atingimento por vendedor</h2></header>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-3 py-2 text-[9px] text-slate-600" aria-label="Legenda de atingimento">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sky-600" />Em andamento: abaixo de 100%</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Meta atingida: 100% ou mais</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-300" />Sem meta definida</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-[10px]">
              <thead><tr className="h-8 border-b border-slate-200 bg-slate-100 text-[9px] font-black uppercase tracking-wide text-slate-600"><th className="p-2">Vendedor ativo</th><th className="p-2 text-right">Meta faturamento</th><th className="p-2 text-right">Realizado</th><th className="p-2 text-right">Meta pedidos</th><th className="p-2 text-right">Pedidos realizados</th><th className="p-2">Atingimento</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {sellerGoals.map((goal) => {
                  const seller = sellers.find((item) => item.id === goal.vendedor_id)
                  const percent = goal.meta_faturamento > 0 ? Math.min((goal.realizado / goal.meta_faturamento) * 100, 999) : 0
                  const attained = goal.meta_faturamento > 0 && percent >= 100
                  return <tr key={goal.vendedor_id} className="h-10 hover:bg-slate-50">
                    <td className="p-2 font-bold uppercase text-slate-800">{seller?.nome ?? 'Vendedor'}</td>
                    <td className="p-2 text-right"><input aria-label={`Meta de faturamento de ${seller?.nome ?? 'vendedor'}`} type="number" min="0" step="0.01" value={goal.meta_faturamento} disabled={loading || saving} onChange={(event) => updateSellerGoal(goal.vendedor_id, 'meta_faturamento', Number(event.target.value))} className="h-8 w-[130px] rounded border border-slate-300 bg-white px-2 text-right font-mono text-[10px] outline-none focus:border-sky-600" /></td>
                    <td className="p-2 text-right font-mono font-bold text-slate-800">{brl(goal.realizado)}</td>
                    <td className="p-2 text-right"><input aria-label={`Meta de pedidos de ${seller?.nome ?? 'vendedor'}`} type="number" min="0" step="1" value={goal.meta_pedidos} disabled={loading || saving} onChange={(event) => updateSellerGoal(goal.vendedor_id, 'meta_pedidos', Number(event.target.value))} className="h-8 w-[90px] rounded border border-slate-300 bg-white px-2 text-right font-mono text-[10px] outline-none focus:border-sky-600" /></td>
                    <td className="p-2 text-right font-mono text-slate-700">{goal.pedidos_realizados}</td>
                    <td className="p-2"><div className="flex min-w-[170px] items-center gap-2"><progress max={100} value={Math.min(percent, 100)} aria-label={`Atingimento de ${seller?.nome ?? 'vendedor'}: ${percent.toFixed(0)} por cento`} className={`h-2 w-[110px] overflow-hidden rounded-full ${attained ? 'accent-emerald-500' : 'accent-sky-600'}`} /><strong className={`w-10 text-right font-mono ${attained ? 'text-emerald-700' : goal.meta_faturamento > 0 ? 'text-sky-800' : 'text-slate-400'}`}>{goal.meta_faturamento > 0 ? `${percent.toFixed(0)}%` : '—'}</strong></div></td>
                  </tr>
                })}
                {!sellerGoals.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">{loading ? 'Carregando equipe comercial…' : 'Nenhum usuário vendedor ativo localizado para esta empresa.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[9px] text-slate-500">Competência: {mes}. O realizado é calculado dos pedidos de venda da empresa autenticada, agrupados pelo vendedor associado ao pedido.</footer>
        </section>
      </main>
    </VendasLayout>
  )
}
