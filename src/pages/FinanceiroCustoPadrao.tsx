import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Building2, Calculator, Factory, Plus, Printer, RefreshCw, Save, Wallet, Boxes } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import ERPHorizontalShell from '../components/layout/ERPHorizontalShell'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'

type Product = LookupRecord & { custo_ultimo: number; custo_fabricacao: number; preco_venda: number; margem_percentual: number; descricao?: string | null }
type Machine = { id: string; codigo: string; nome: string; custo_hora: number }
type Need = { id: string; componente_id: string; quantidade_bruta: number; necessidade_liquida: number }
type Center = { id: string; codigo: string; nome: string; tipo: string; parent_id: string | null; ativo: boolean }
type FixedCost = { id: string; centro_custo_id: string; categoria: string; descricao: string; valor_mensal: number; percentual_rateio: number; ativo: boolean }
type Tab = 'visao' | 'calculo' | 'centros' | 'fixos'

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0)
const field = 'h-[30px] min-w-0 w-full rounded-[2px] border border-[#c9dce2] bg-white px-2 text-[11px] font-medium text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-[#526d79]'
const primary = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white hover:bg-[#24799f] disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-[#cbdde3] bg-white px-3 text-[10px] font-semibold text-[#315565] hover:bg-[#edf7fa] disabled:opacity-50'
const colors = ['#2D8DB8', '#48B7C7', '#3A9D78', '#E6A34A', '#D65B61', '#8064A2']

export default function FinanceiroCustoPadrao() {
  const [empresa, setEmpresa] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [productId, setProductId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [cycle, setCycle] = useState('')
  const [margin, setMargin] = useState('50')
  const [qty, setQty] = useState('1')
  const [needs, setNeeds] = useState<Need[]>([])
  const [tab, setTab] = useState<Tab>('visao')
  const [newCenter, setNewCenter] = useState({ codigo: '', nome: '', tipo: 'OPERACIONAL' })
  const [newFixed, setNewFixed] = useState({ centro: '', categoria: 'ENERGIA', descricao: '', valor: '0', rateio: '100' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa ERP não identificada para esta sessão.')
      const companyId = String(tenant.data)
      setEmpresa(companyId)
      const [p, m, c, f] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,descricao,custo_ultimo,custo_fabricacao,preco_venda,margem_percentual', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome,custo_hora', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Center>((from, to) => supabase.from('erp_centros_custos').select('id,codigo,nome,tipo,parent_id,ativo', { count: 'exact' }).eq('empresa_id', companyId).order('codigo').range(from, to)),
        fetchAllPages<FixedCost>((from, to) => supabase.from('erp_custos_fixos').select('id,centro_custo_id,categoria,descricao,valor_mensal,percentual_rateio,ativo', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('descricao').range(from, to)),
      ])
      setProducts(p); setMachines(m); setCenters(c); setFixedCosts(f)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao consultar os dados reais de custos.') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!productId || !empresa) { setNeeds([]); return }
    let alive = true
    void (async () => {
      setBusy(true); setError('')
      try {
        const result = await supabase.rpc('erp_mrp_explodir', { p_produto_id: productId, p_quantidade: Number(qty) || 1, p_demanda_ref: 'CUSTO_PADRAO' })
        if (result.error) throw result.error
        const rows = await supabase.from('erp_mrp_necessidades').select('id,componente_id,quantidade_bruta,necessidade_liquida').eq('run_id', String(result.data)).order('nivel')
        if (rows.error) throw rows.error
        if (alive) setNeeds((rows.data ?? []) as Need[])
      } catch (e) { if (alive) { setNeeds([]); setError(e instanceof Error ? e.message : 'Não foi possível calcular a estrutura MRP/BOM.') } }
      finally { if (alive) setBusy(false) }
    })()
    return () => { alive = false }
  }, [productId, qty, empresa])

  const selected = products.find(p => p.id === productId)
  const machine = machines.find(m => m.id === machineId)
  const materialCost = useMemo(() => needs.reduce((sum, row) => {
    const component = products.find(p => p.id === row.componente_id)
    return sum + Number(row.quantidade_bruta || 0) * Number(component?.custo_ultimo || 0)
  }, 0), [needs, products])
  const machineCost = machine && Number(cycle) > 0 ? Number(machine.custo_hora || 0) * Number(cycle) / 3600 * (Number(qty) || 1) : 0
  const total = Math.max(0, Number(selected?.custo_fabricacao || 0) > 0 ? Number(selected?.custo_fabricacao) * (Number(qty) || 1) : materialCost + machineCost)
  const marginValue = Math.min(99.9, Math.max(0, Number(margin) || 0))
  const price = total / (1 - marginValue / 100)
  const monthlyFixed = useMemo(() => fixedCosts.reduce((sum, row) => sum + Number(row.valor_mensal || 0) * Number(row.percentual_rateio || 0) / 100, 0), [fixedCosts])
  const fixedByCenter = useMemo(() => {
    const totals = new Map<string, number>()
    fixedCosts.forEach(row => totals.set(row.centro_custo_id, (totals.get(row.centro_custo_id) ?? 0) + Number(row.valor_mensal || 0) * Number(row.percentual_rateio || 0) / 100))
    return [...totals].map(([id, value]) => ({ name: centers.find(c => c.id === id)?.nome ?? 'Centro não identificado', value })).sort((a, b) => b.value - a.value)
  }, [fixedCosts, centers])
  const composition = [{ name: 'Materiais BOM', value: materialCost }, { name: 'Máquina', value: machineCost }, { name: 'Custo fabril cadastrado', value: Math.max(0, Number(selected?.custo_fabricacao || 0) * (Number(qty) || 1) - materialCost - machineCost) }].filter(x => x.value > 0)

  async function addCenter() {
    if (!empresa || !newCenter.codigo.trim() || !newCenter.nome.trim()) { setError('Informe o código e o nome do centro de custo.'); return }
    setError(''); setMessage('')
    const r = await supabase.from('erp_centros_custos').insert({ ...newCenter, codigo: newCenter.codigo.trim(), nome: newCenter.nome.trim(), empresa_id: empresa, ativo: true })
    if (r.error) { setError(r.error.message); return }
    setMessage('Centro de custo cadastrado.'); setNewCenter({ codigo: '', nome: '', tipo: 'OPERACIONAL' }); await load()
  }
  async function addFixed() {
    if (!empresa || !newFixed.centro || !newFixed.descricao.trim()) { setError('Selecione o centro de custo e informe a descrição.'); return }
    const amount = Number(newFixed.valor), rate = Number(newFixed.rateio)
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate < 0 || rate > 100) { setError('Confira o valor mensal e o rateio (0 a 100%).'); return }
    setError(''); setMessage('')
    const r = await supabase.from('erp_custos_fixos').insert({ empresa_id: empresa, centro_custo_id: newFixed.centro, categoria: newFixed.categoria, descricao: newFixed.descricao.trim(), valor_mensal: amount, percentual_rateio: rate, ativo: true })
    if (r.error) { setError(r.error.message); return }
    setMessage('Custo fixo cadastrado.'); setNewFixed({ ...newFixed, descricao: '', valor: '0' }); await load()
  }
  async function savePrice() {
    if (!empresa || !selected) { setError('Selecione um produto antes de salvar.'); return }
    if (!Number.isFinite(price) || price < 0 || marginValue >= 100) { setError('Confira a margem e os valores antes de salvar.'); return }
    setSaving(true); setError(''); setMessage('')
    const r = await supabase.from('erp_produtos').update({ preco_venda: price, margem_percentual: marginValue }).eq('id', selected.id).eq('empresa_id', empresa)
    setSaving(false)
    if (r.error) { setError(r.error.message); return }
    setMessage('Preço sugerido gravado no cadastro do produto.')
    setProducts(rows => rows.map(p => p.id === selected.id ? { ...p, preco_venda: price, margem_percentual: marginValue } : p))
  }

  const productRecords = products.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome, descricao: p.descricao ?? undefined }))
  const machineRecords = machines.map(m => ({ id: m.id, codigo: m.codigo, nome: m.nome }))
  const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
    { id: 'visao', label: 'Visão geral', icon: BarChart3 }, { id: 'calculo', label: 'Custo padrão', icon: Calculator },
    { id: 'centros', label: 'Centros de custo', icon: Building2 }, { id: 'fixos', label: 'Custos fixos', icon: Wallet },
  ]

  return <ERPHorizontalShell>
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(45,141,184,0.16),transparent_42%),linear-gradient(135deg,#edf7fb_0%,#f4f7fc_52%,#edf2fa_100%)] p-3 text-[#123B50] md:p-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <header className="flex flex-wrap items-end gap-4 rounded-[2px] border border-[#2D8DB8] bg-gradient-to-r from-[#123B50] via-[#185c78] to-[#2D8DB8] p-4 text-white shadow-sm">
          <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100">FINANCEIRO › CUSTOS › CUSTO PADRÃO</p><h1 className="text-xl font-semibold md:text-2xl">Centro de custos e formação do custo padrão</h1><p className="mt-1 text-[11px] text-sky-50">Indicadores reais, estrutura de custos industriais e formação de preço vinculada aos cadastros do ERP.</p></div>
          <div className="ml-auto flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={busy} className={secondary + ' !border-white/40 !bg-white/10 !text-white hover:!bg-white/20'}><RefreshCw size={13} className={busy ? 'animate-spin' : ''}/>{busy ? 'Atualizando…' : 'Atualizar'}</button><button type="button" onClick={() => window.print()} className={secondary + ' !border-white/40 !bg-white/10 !text-white hover:!bg-white/20'}><Printer size={13}/>Imprimir</button></div>
        </header>
        {(error || message) && <div role={error ? 'alert' : 'status'} className={'rounded-[2px] border p-3 text-[11px] font-semibold ' + (error ? 'border-[#D65B61] bg-[#fff0ef] text-[#9f343c]' : 'border-[#3A9D78]/40 bg-[#edf8f2] text-[#246b50]')}>{error || message}</div>}
        <nav aria-label="Seções de custos" className="flex flex-wrap border border-[#cddfe5] bg-white">{tabs.map(({ id, label: tabLabel, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={'inline-flex h-[34px] items-center gap-2 border-r border-[#dbe8ed] px-3 text-[10px] font-semibold ' + (tab === id ? 'border-b-2 border-b-[#2D8DB8] bg-[#e8f5f9] text-[#123B50]' : 'text-[#607889] hover:bg-[#f4fafc]')}><Icon size={14}/>{tabLabel}</button>)}</nav>

        {tab === 'visao' && <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Wallet} label="Custos fixos rateados / mês" value={money(monthlyFixed)} detail={fixedCosts.length + ' registros ativos'}/><Metric icon={Building2} label="Centros de custo ativos" value={String(centers.filter(c => c.ativo).length)} detail="Empresa atual"/><Metric icon={Boxes} label="Produtos ativos" value={String(products.length)} detail="Disponíveis para cálculo"/><Metric icon={Factory} label="Máquinas ativas" value={String(machines.length)} detail="Com custo/hora cadastrado"/></section>
          <section className="grid gap-3 xl:grid-cols-2">
            <ChartCard title="Custos fixos por centro" description="Total mensal rateado conforme os registros ativos do financeiro.">{fixedByCenter.length ? <div className="h-[300px]" role="img" aria-label={fixedByCenter.map(r => r.name + ': ' + money(r.value)).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={fixedByCenter} margin={{ left: 12, right: 18, top: 12, bottom: 36 }}><CartesianGrid stroke="#e0ebef" strokeDasharray="3 3"/><XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={64} tick={{ fontSize: 10, fill: '#526d79' }}/><YAxis tick={{ fontSize: 10, fill: '#526d79' }}/><Tooltip formatter={(v) => money(Number(v))}/><Bar dataKey="value" name="Custo mensal rateado" radius={[2, 2, 0, 0]}>{fixedByCenter.map((r, i) => <Cell key={r.name} fill={colors[i % colors.length]}/>)}</Bar></BarChart></ResponsiveContainer></div> : <Empty text="Ainda não existem custos fixos rateados para exibir."/>}</ChartCard>
            <ChartCard title="Composição do cálculo selecionado" description="Distribuição dos valores disponíveis para o produto escolhido na aba Custo padrão.">{composition.length ? <div className="h-[300px]" role="img" aria-label={composition.map(r => r.name + ': ' + money(r.value)).join('; ')}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={92} label={({ name, percent }) => (name || '') + ' ' + (Number(percent || 0) * 100).toFixed(0) + '%'}>{composition.map((r, i) => <Cell key={r.name} fill={colors[i % colors.length]}/>)}</Pie><Tooltip formatter={(v) => money(Number(v))}/></PieChart></ResponsiveContainer></div> : <Empty text="Selecione um produto na aba Custo padrão para visualizar sua composição."/>}</ChartCard>
          </section>
          <section className="grid gap-3 xl:grid-cols-2"><article className="rounded-[2px] border border-[#cddfe5] border-l-[3px] border-l-[#2D8DB8] bg-white p-3"><h2 className="text-[12px] font-semibold">Estrutura de responsabilidade</h2><p className="mt-1 text-[11px] leading-5 text-[#607889]">Cadastre centros de custo e vincule despesas mensais para acompanhar a distribuição por área operacional.</p><button type="button" onClick={() => setTab('centros')} className={secondary + ' mt-3'}><Building2 size={13}/>Gerenciar centros</button></article><article className="rounded-[2px] border border-[#cddfe5] border-l-[3px] border-l-[#3A9D78] bg-white p-3"><h2 className="text-[12px] font-semibold">Formação do custo industrial</h2><p className="mt-1 text-[11px] leading-5 text-[#607889]">Consulte a BOM real, aplique o custo/hora da máquina e simule a margem para formar o preço sugerido.</p><button type="button" onClick={() => setTab('calculo')} className={primary}><Calculator size={13}/>Abrir cálculo</button></article></section>
        </>}

        {tab === 'calculo' && <>
          <section className="rounded-[2px] border border-[#cddfe5] bg-white p-3"><div className="mb-3 flex items-center gap-2 border-b border-[#e0ebef] pb-2"><Calculator size={15} className="text-[#2D8DB8]"/><h2 className="text-[12px] font-semibold">Parâmetros do custo padrão</h2></div><div className="grid gap-3 lg:grid-cols-3">
            <label className={label}>Produto alvo<EntityCodeLookup label="" value={productId} records={productRecords} onChange={setProductId} onSelect={(r: LookupRecord) => setProductId(r.id)}/></label>
            <label className={label}>Máquina / recurso<EntityCodeLookup label="" value={machineId} records={machineRecords} onChange={setMachineId} onSelect={(r: LookupRecord) => setMachineId(r.id)}/></label>
            <label className={label}>Centro de custo<select className={field} value={centerId} onChange={e => setCenterId(e.target.value)}><option value="">Não vinculado</option>{centers.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}</select></label>
            <label className={label}>Quantidade de projeção<input className={field} type="number" min="0.001" step="0.001" value={qty} onChange={e => setQty(e.target.value)}/></label>
            <label className={label}>Tempo de ciclo por unidade (segundos)<input className={field} type="number" min="0" step="0.1" value={cycle} onChange={e => setCycle(e.target.value)}/></label>
            <label className={label}>Margem desejada (%)<input className={field} type="number" min="0" max="99.9" step="0.1" value={margin} onChange={e => setMargin(e.target.value)}/></label>
          </div>{centerId && <p className="mt-2 text-[10px] text-[#607889]">Centro selecionado: {centers.find(c => c.id === centerId)?.codigo} · {centers.find(c => c.id === centerId)?.nome}. A seleção é informativa nesta simulação e não grava rateio de produto.</p>}</section>
          <section className="grid gap-3 xl:grid-cols-2"><article className="min-w-0 rounded-[2px] border border-[#cddfe5] bg-white p-3"><h2 className="text-[12px] font-semibold">Estrutura de materiais (BOM/MRP)</h2><div className="mt-2 overflow-auto"><table className="w-full min-w-[480px] text-[10px]"><thead className="bg-[#eaf5f9] text-[9px] uppercase tracking-wider text-[#355b67]"><tr className="h-[30px]"><th className="px-2 text-left">Componente</th><th className="px-2 text-right">Quantidade</th><th className="px-2 text-right">Custo unit.</th><th className="px-2 text-right">Total</th></tr></thead><tbody>{busy ? <tr><td colSpan={4} className="p-5 text-center text-[#607889]">Consultando a estrutura MRP real…</td></tr> : needs.length ? needs.map(row => { const p = products.find(item => item.id === row.componente_id); return <tr key={row.id} className="h-[32px] border-t border-[#e3edf0]"><td className="px-2">{p?.codigo ?? '—'} · {p?.nome ?? 'Componente não localizado'}</td><td className="px-2 text-right">{Number(row.quantidade_bruta).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</td><td className="px-2 text-right">{money(Number(p?.custo_ultimo || 0))}</td><td className="px-2 text-right font-semibold">{money(Number(row.quantidade_bruta || 0) * Number(p?.custo_ultimo || 0))}</td></tr> }) : <tr><td colSpan={4} className="p-5 text-center text-[#607889]">Selecione um produto com estrutura BOM ativa.</td></tr>}</tbody></table></div></article>
            <article className="rounded-[2px] border border-[#cddfe5] bg-white p-3"><h2 className="text-[12px] font-semibold">Resumo de formação do preço</h2><div className="mt-2 divide-y divide-[#e3edf0] text-[11px]"><SummaryRow label="Custo de materiais BOM" value={money(materialCost)}/><SummaryRow label="Custo de fabricação cadastrado" value={money(Number(selected?.custo_fabricacao || 0) * (Number(qty) || 1))}/><SummaryRow label="Custo hora/máquina aplicado" value={money(machineCost)}/><div className="flex items-center justify-between bg-[#eaf5f9] px-2 py-3 font-bold"><span>Custo fábrica calculado</span><strong>{money(total)}</strong></div><SummaryRow label="Margem aplicada" value={marginValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'}/><div className="flex items-center justify-between bg-[#123B50] px-2 py-3 text-white"><span className="font-semibold">Preço sugerido</span><strong className="text-base">{Number.isFinite(price) ? money(price) : '—'}</strong></div></div><p className="mt-2 text-[10px] leading-4 text-[#607889]">O custo/hora só é aplicado quando máquina e tempo de ciclo estão informados. A gravação atualiza preço e margem do produto.</p><button type="button" disabled={!selected || saving} onClick={() => void savePrice()} className={primary + ' mt-3 w-full'}><Save size={13}/>{saving ? 'Salvando…' : 'Salvar preço no produto'}</button></article>
          </section>
        </>}

        {tab === 'centros' && <section className="rounded-[2px] border border-[#cddfe5] bg-white p-3"><div className="mb-3 flex items-center gap-2 border-b border-[#e0ebef] pb-2"><Building2 size={15} className="text-[#2D8DB8]"/><h2 className="text-[12px] font-semibold">Cadastro de centros de custo</h2></div><div className="grid gap-2 md:grid-cols-[1fr_2fr_1fr_auto]"><label className={label}>Código<input className={field} value={newCenter.codigo} onChange={e => setNewCenter({ ...newCenter, codigo: e.target.value })} placeholder="Ex.: CC-001"/></label><label className={label}>Descrição do centro<input className={field} value={newCenter.nome} onChange={e => setNewCenter({ ...newCenter, nome: e.target.value })} placeholder="Ex.: Produção"/></label><label className={label}>Tipo<select className={field} value={newCenter.tipo} onChange={e => setNewCenter({ ...newCenter, tipo: e.target.value })}>{['OPERACIONAL','ADMINISTRATIVO','VENDAS','PRODUCAO','QUALIDADE','LOGISTICA'].map(v => <option key={v}>{v}</option>)}</select></label><div className="flex items-end"><button type="button" onClick={() => void addCenter()} className={primary}><Plus size={13}/>Cadastrar</button></div></div><div className="mt-3 overflow-auto"><table className="w-full min-w-[560px] text-[10px]"><thead className="bg-[#eaf5f9] text-left text-[9px] uppercase tracking-wider text-[#355b67]"><tr className="h-[30px]"><th className="px-2">Código</th><th className="px-2">Centro de custo</th><th className="px-2">Tipo</th><th className="px-2">Hierarquia</th><th className="px-2">Status</th></tr></thead><tbody>{centers.map(row => <tr key={row.id} className="h-[32px] border-t border-[#e3edf0]"><td className="px-2 font-semibold">{row.codigo}</td><td className="px-2">{row.nome}</td><td className="px-2">{row.tipo}</td><td className="px-2">{row.parent_id ? centers.find(c => c.id === row.parent_id)?.nome ?? 'Agrupador não localizado' : 'Principal'}</td><td className="px-2"><span className={row.ativo ? 'font-semibold text-[#3A9D78]' : 'font-semibold text-[#D65B61]'}>{row.ativo ? 'Ativo' : 'Inativo'}</span></td></tr>)}{!centers.length && <tr><td colSpan={5} className="p-5 text-center text-[#607889]">Nenhum centro de custo cadastrado para esta empresa.</td></tr>}</tbody></table></div></section>}

        {tab === 'fixos' && <section className="rounded-[2px] border border-[#cddfe5] bg-white p-3"><div className="mb-3 flex items-center gap-2 border-b border-[#e0ebef] pb-2"><Wallet size={15} className="text-[#2D8DB8]"/><h2 className="text-[12px] font-semibold">Custos fixos mensais e rateio</h2></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6"><label className={label + ' xl:col-span-2'}>Centro de custo<select className={field} value={newFixed.centro} onChange={e => setNewFixed({ ...newFixed, centro: e.target.value })}><option value="">Selecione</option>{centers.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}</select></label><label className={label}>Categoria<select className={field} value={newFixed.categoria} onChange={e => setNewFixed({ ...newFixed, categoria: e.target.value })}>{['ÁGUA','ENERGIA','TELEFONE','INTERNET','ALUGUEL','FOLHA','MANUTENÇÃO','OUTROS'].map(v => <option key={v}>{v}</option>)}</select></label><label className={label + ' xl:col-span-2'}>Descrição<input className={field} value={newFixed.descricao} onChange={e => setNewFixed({ ...newFixed, descricao: e.target.value })} placeholder="Descrição da despesa"/></label><label className={label}>Valor mensal (R$)<input className={field} type="number" min="0" step="0.01" value={newFixed.valor} onChange={e => setNewFixed({ ...newFixed, valor: e.target.value })}/></label><label className={label}>Rateio (%)<input className={field} type="number" min="0" max="100" step="0.1" value={newFixed.rateio} onChange={e => setNewFixed({ ...newFixed, rateio: e.target.value })}/></label></div><button type="button" onClick={() => void addFixed()} className={primary + ' mt-3'}><Save size={13}/>Gravar custo fixo</button><div className="mt-3 overflow-auto"><table className="w-full min-w-[620px] text-[10px]"><thead className="bg-[#eaf5f9] text-left text-[9px] uppercase tracking-wider text-[#355b67]"><tr className="h-[30px]"><th className="px-2">Categoria</th><th className="px-2">Descrição</th><th className="px-2">Centro de custo</th><th className="px-2 text-right">Mensal</th><th className="px-2 text-right">Rateio</th><th className="px-2 text-right">Valor rateado</th></tr></thead><tbody>{fixedCosts.map(row => <tr key={row.id} className="h-[32px] border-t border-[#e3edf0]"><td className="px-2">{row.categoria}</td><td className="px-2">{row.descricao}</td><td className="px-2">{centers.find(c => c.id === row.centro_custo_id)?.nome ?? '—'}</td><td className="px-2 text-right">{money(Number(row.valor_mensal))}</td><td className="px-2 text-right">{Number(row.percentual_rateio).toLocaleString('pt-BR')}%</td><td className="px-2 text-right font-semibold">{money(Number(row.valor_mensal) * Number(row.percentual_rateio) / 100)}</td></tr>)}{!fixedCosts.length && <tr><td colSpan={6} className="p-5 text-center text-[#607889]">Nenhum custo fixo ativo cadastrado.</td></tr>}</tbody></table></div></section>}
      </div>
    </main>
  </ERPHorizontalShell>
}

function Metric({ icon: Icon, label: metricLabel, value, detail }: { icon: typeof Wallet; label: string; value: string; detail: string }) {
  return <article className="flex min-h-[82px] min-w-0 items-center gap-3 rounded-[2px] border border-[#cddfe5] bg-white p-3 shadow-sm"><span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-[#cfe6ed] bg-[#eaf5f9] text-[#2D8DB8]"><Icon size={17}/></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-[#607889]">{metricLabel}</p><b className="block break-words text-lg font-semibold text-[#123B50]">{value}</b><p className="text-[9px] text-[#82949d]">{detail}</p></div></article>
}
function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-[2px] border border-[#cddfe5] border-l-[3px] border-l-[#2D8DB8] bg-white p-3 shadow-sm"><h2 className="text-[12px] font-semibold text-[#123B50]">{title}</h2><p className="mt-1 text-[10px] leading-4 text-[#607889]">{description}</p><div className="mt-2">{children}</div></section>
}
function SummaryRow({ label: rowLabel, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 px-2 py-2"><span className="text-[#526d79]">{rowLabel}</span><strong className="text-right text-[#123B50]">{value}</strong></div>
}
function Empty({ text }: { text: string }) {
  return <p className="grid min-h-48 place-items-center rounded-[2px] border border-dashed border-[#cddfe5] bg-[#f7fbfc] p-5 text-center text-[11px] text-[#607889]">{text}</p>
}
