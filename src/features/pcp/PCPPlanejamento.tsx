import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarRange, RefreshCw, Save, Target } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type MasterPlan = { id: string; produto_id: string; periodo_inicio: string; periodo_fim: string; quantidade_prevista: number; estoque_alvo: number; demanda_confirmada: number; status: string }
type PlannedOrder = { id: string; produto_id: string; quantidade: number; data_necessaria: string; origem: string; status: string }
type AlertRow = { id: string; tipo: string; severidade: string; mensagem: string; status: string; criado_em: string }

export default function PCPPlanejamento() {
  const [companyId, setCompanyId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [plans, setPlans] = useState<MasterPlan[]>([])
  const [plannedOrders, setPlannedOrders] = useState<PlannedOrder[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [productId, setProductId] = useState('')
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10))
  const [end, setEnd] = useState(new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('0')
  const [target, setTarget] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(tenant.data)
      const [p, m, o, a] = await Promise.all([
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', id).eq('ativo', true).order('codigo'),
        supabase.from('erp_pcp_planos_mestres').select('id,produto_id,periodo_inicio,periodo_fim,quantidade_prevista,estoque_alvo,demanda_confirmada,status').eq('empresa_id', id).order('periodo_inicio', { ascending: false }),
        supabase.from('erp_pcp_ordens_planejadas').select('id,produto_id,quantidade,data_necessaria,origem,status').eq('empresa_id', id).order('data_necessaria'),
        supabase.from('erp_pcp_alertas').select('id,tipo,severidade,mensagem,status,criado_em').eq('empresa_id', id).neq('status', 'RESOLVIDO').order('criado_em', { ascending: false }),
      ])
      const failure = p.error ?? m.error ?? o.error ?? a.error
      if (failure) throw failure
      setCompanyId(id)
      setProducts((p.data ?? []) as Product[])
      setPlans((m.data ?? []) as MasterPlan[])
      setPlannedOrders((o.data ?? []) as PlannedOrder[])
      setAlerts((a.data ?? []) as AlertRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o planejamento do PCP.')
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p.codigo + ' · ' + p.nome])), [products])

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = Number(quantity)
    const stock = Number(target)
    if (!companyId || !productId || !start || !end || end < start || !Number.isFinite(q) || q < 0 || !Number.isFinite(stock) || stock < 0) {
      setError('Informe produto, período válido e quantidades não negativas.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await supabase.from('erp_pcp_planos_mestres').insert({
        empresa_id: companyId,
        produto_id: productId,
        periodo_inicio: start,
        periodo_fim: end,
        quantidade_prevista: q,
        estoque_alvo: stock,
        demanda_confirmada: 0,
        status: 'ABERTO',
      }).select('id').single()
      if (result.error) throw result.error
      if (!result.data?.id) throw new Error('O banco não confirmou a criação do plano mestre.')
      setNotice('Plano mestre salvo e confirmado pelo Supabase.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o plano mestre.')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b50] text-white"><Target size={16} /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#2d8db8]">Manufatura / PCP</p><h2 className="text-sm font-extrabold">Planejamento mestre e exceções</h2><p className="text-[11px] text-slate-500">MPS, ordens planejadas e alertas existentes do tenant.</p></div><button type="button" onClick={() => void load()} disabled={busy} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold"><RefreshCw size={12} /> Atualizar</button></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}
      <form onSubmit={(event) => void savePlan(event)} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-6">
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500 md:col-span-2">Produto<select required value={productId} onChange={(event) => setProductId(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal normal-case text-slate-800"><option value="">Selecionar produto cadastrado</option>{products.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Início<input required type="date" value={start} onChange={(event) => setStart(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-normal normal-case text-slate-800" /></label>
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Fim<input required min={start} type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-normal normal-case text-slate-800" /></label>
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Qtd. prevista<input required min="0" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-normal normal-case text-slate-800" /></label>
        <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Estoque-alvo<input required min="0" step="0.001" type="number" value={target} onChange={(event) => setTarget(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-normal normal-case text-slate-800" /></label>
        <div className="md:col-span-6"><button type="submit" disabled={busy || !products.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#123b50] px-4 text-xs font-bold text-white disabled:opacity-40"><Save size={13} /> Salvar plano mestre</button></div>
      </form>
      <div className="grid gap-3 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h3 className="flex items-center gap-2 border-b border-slate-200 p-3 text-xs font-extrabold"><CalendarRange size={14} /> Planos mestres existentes ({plans.length})</h3><div className="max-h-[360px] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-800 text-white"><tr><th className="p-2 text-left">Produto</th><th className="p-2 text-left">Período</th><th className="p-2 text-right">Previsto</th><th className="p-2 text-right">Estoque-alvo</th><th className="p-2 text-left">Status</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id} className="border-t border-slate-100 even:bg-slate-50"><td className="p-2">{productMap.get(plan.produto_id) ?? plan.produto_id}</td><td className="p-2">{plan.periodo_inicio} — {plan.periodo_fim}</td><td className="p-2 text-right">{Number(plan.quantidade_prevista).toLocaleString('pt-BR')}</td><td className="p-2 text-right">{Number(plan.estoque_alvo).toLocaleString('pt-BR')}</td><td className="p-2">{plan.status}</td></tr>)}{!plans.length && <tr><td colSpan={5} className="p-5 text-center text-slate-500">Nenhum plano mestre cadastrado.</td></tr>}</tbody></table></div></section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h3 className="border-b border-slate-200 p-3 text-xs font-extrabold">Ordens planejadas ({plannedOrders.length})</h3><div className="max-h-[360px] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-800 text-white"><tr><th className="p-2 text-left">Produto</th><th className="p-2 text-left">Necessária em</th><th className="p-2 text-right">Quantidade</th><th className="p-2 text-left">Origem / status</th></tr></thead><tbody>{plannedOrders.map((row) => <tr key={row.id} className="border-t border-slate-100 even:bg-slate-50"><td className="p-2">{productMap.get(row.produto_id) ?? row.produto_id}</td><td className="p-2">{row.data_necessaria}</td><td className="p-2 text-right">{Number(row.quantidade).toLocaleString('pt-BR')}</td><td className="p-2">{row.origem} / {row.status}</td></tr>)}{!plannedOrders.length && <tr><td colSpan={4} className="p-5 text-center text-slate-500">Nenhuma ordem planejada registrada.</td></tr>}</tbody></table></div></section>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white"><h3 className="border-b border-slate-200 p-3 text-xs font-extrabold">Alertas de planejamento ({alerts.length})</h3>{alerts.length ? <ul className="divide-y divide-slate-100">{alerts.map((alert) => <li key={alert.id} className="flex flex-wrap items-start gap-2 p-3 text-xs"><span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-bold">{alert.severidade}</span><span className="font-bold">{alert.tipo}</span><span className="min-w-0 flex-1">{alert.mensagem}</span><span className="text-slate-500">{alert.status}</span></li>)}</ul> : <p className="p-4 text-xs text-slate-500">Nenhum alerta pendente no banco.</p>}</section>
    </section>
  )
}
