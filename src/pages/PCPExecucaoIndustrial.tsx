import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarClock, Factory, Play, RefreshCw, Save, Search, ClipboardList, Boxes, AlertTriangle, CheckCircle2, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product = { id: string; codigo: string; descricao_tecnica: string; unidade_medida: string }
type Order = { id: string; numero: string; produto_id: string; roteiro_id: string | null; quantidade_planejada: number; aberta_em: string; entrega_prevista: string | null; status: string }
type Failure = { id: string; codigo: string; descricao: string }
type Entry = { id: string; ordem_producao_id: string; operacao_codigo: string; centro_trabalho: string; setup_inicio: string | null; setup_fim: string | null; producao_inicio: string | null; producao_fim: string | null; pecas_boas: number; pecas_refugadas: number; motivo_parada: string | null; observacoes: string | null; created_at: string }
type Bom = { id: string; produto_pai_id: string; status: string; vigente_desde: string; vigente_ate: string | null }
type BomItem = { bom_id: string; componente_id: string; quantidade_liquida: number; perda_percentual: number; quantidade_bruta: number }
type Stock = { produto_id: string; quantidade: number }

const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-slate-600'
const button = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const primary = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-sky-700 bg-sky-700 px-3 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-sky-800 disabled:opacity-50'
const th = 'h-[32px] border-b border-slate-200 bg-slate-100 px-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-600'
const td = 'h-[32px] border-b border-slate-100 px-2 text-[10px] text-slate-700'
const today = () => new Date().toISOString().slice(0, 10)
const isoLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const errText = (e: unknown) => e instanceof Error ? e.message : 'Falha na operação do PCP.'

export default function PCPExecucaoIndustrial() {
  const [tab, setTab] = useState<'ordens' | 'apontamentos' | 'mrp' | 'gantt'>('ordens')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [failures, setFailures] = useState<Failure[]>([])
  const [bom, setBom] = useState<Bom[]>([])
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ numero: '', produto_id: '', roteiro_id: '', quantidade_planejada: '1', entrega_prevista: today(), status: 'planejada' })
  const [entry, setEntry] = useState({ ordem_producao_id: '', operacao_codigo: '10', operador_id: '', centro_trabalho: '', setup_inicio: isoLocal(), setup_fim: '', producao_inicio: isoLocal(), producao_fim: '', pecas_boas: '0', pecas_refugadas: '0', motivo_refugo_id: '', motivo_parada: '', observacoes: '' })
  const [mrpRoot, setMrpRoot] = useState('')
  const [mrpQty, setMrpQty] = useState('1')
  const [mrpResult, setMrpResult] = useState<Array<{id:string;codigo:string;descricao:string;necessidade:number;saldo:number;liquida:number;perda:number}>>([])

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (typeof tenant.data !== 'string' || !tenant.data) throw new Error('Empresa da sessão não identificada; operação bloqueada.')
      const companyId = tenant.data
      const [p, o, a, f, b, bi, s] = await Promise.all([
        supabase.from('engenharia_produtos').select('id,codigo,descricao_tecnica,unidade_medida').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('pcp_ordens_producao').select('id,numero,produto_id,roteiro_id,quantidade_planejada,aberta_em,entrega_prevista,status').eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(1000),
        supabase.from('pcp_apontamentos').select('id,ordem_producao_id,operacao_codigo,centro_trabalho,setup_inicio,setup_fim,producao_inicio,producao_fim,pecas_boas,pecas_refugadas,motivo_parada,observacoes,created_at').eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(1000),
        supabase.from('qualidade_motivos_falha').select('id,codigo,descricao').eq('empresa_id', companyId).eq('ativo', true).order('codigo').limit(1000),
        supabase.from('engenharia_bom').select('id,produto_pai_id,status,vigente_desde,vigente_ate').eq('empresa_id', companyId).eq('status', 'ativo').limit(3000),
        supabase.from('engenharia_bom_componentes').select('bom_id,componente_id,quantidade_liquida,perda_percentual,quantidade_bruta').eq('empresa_id', companyId).limit(10000),
        supabase.from('estoque_saldos').select('produto_id,quantidade').eq('empresa_id', companyId).limit(10000)
      ])
      for (const result of [p,o,a,f,b,bi,s]) if (result.error) throw result.error
      setProducts((p.data ?? []) as Product[]); setOrders((o.data ?? []) as Order[]); setEntries((a.data ?? []) as Entry[])
      setFailures((f.data ?? []) as Failure[]); setBom((b.data ?? []) as Bom[]); setBomItems((bi.data ?? []) as BomItem[]); setStock((s.data ?? []) as Stock[])
    } catch (e) { setError(errText(e)) } finally { setBusy(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  const orderMap = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders])
  const filteredOrders = useMemo(() => orders.filter(o => {
    const p = productMap.get(o.produto_id)
    const haystack = [o.numero, o.status, p?.codigo, p?.descricao_tecnica].join(' ').toLowerCase()
    return !query || haystack.includes(query.toLowerCase())
  }), [orders, productMap, query])
  const metrics = useMemo(() => ({
    open: orders.filter(o => ['planejada','liberada','em_andamento','suspensa'].includes(o.status)).length,
    running: orders.filter(o => o.status === 'em_andamento').length,
    good: entries.reduce((sum, e) => sum + Number(e.pecas_boas || 0), 0),
    scrap: entries.reduce((sum, e) => sum + Number(e.pecas_refugadas || 0), 0)
  }), [orders, entries])

  async function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setNotice('')
    const qty = Number(form.quantidade_planejada)
    if (!form.numero.trim() || !form.produto_id || !Number.isFinite(qty) || qty <= 0) { setError('Informe número, produto e quantidade planejada maior que zero.'); return }
    setBusy(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const result = await supabase.from('pcp_ordens_producao').insert({
        empresa_id: tenant.data, numero: form.numero.trim(), produto_id: form.produto_id,
        roteiro_id: form.roteiro_id || null, quantidade_planejada: qty,
        entrega_prevista: form.entrega_prevista || null, status: form.status
      }).select('id,numero').single()
      if (result.error) throw result.error
      setNotice('OP ' + result.data.numero + ' criada.'); setForm({ numero: '', produto_id: '', roteiro_id: '', quantidade_planejada: '1', entrega_prevista: today(), status: 'planejada' })
      await load()
    } catch (e) { setError(errText(e)) } finally { setBusy(false) }
  }

  async function saveEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setNotice('')
    const good = Number(entry.pecas_boas), scrap = Number(entry.pecas_refugadas)
    if (!entry.ordem_producao_id || !entry.operacao_codigo.trim() || !entry.centro_trabalho.trim()) { setError('OP, operação e centro de trabalho são obrigatórios.'); return }
    if (!Number.isFinite(good) || !Number.isFinite(scrap) || good < 0 || scrap < 0 || good + scrap <= 0) { setError('Informe peças boas/refugadas válidas; o total deve ser maior que zero.'); return }
    if (scrap > 0 && !entry.motivo_refugo_id) { setError('Selecione o código de falha da Qualidade para registrar refugo.'); return }
    if (entry.setup_inicio && entry.setup_fim && entry.setup_fim < entry.setup_inicio) { setError('Fim do setup anterior ao início.'); return }
    if (entry.producao_inicio && entry.producao_fim && entry.producao_fim < entry.producao_inicio) { setError('Fim da produção anterior ao início.'); return }
    setBusy(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const result = await supabase.from('pcp_apontamentos').insert({
        empresa_id: tenant.data, ordem_producao_id: entry.ordem_producao_id,
        operacao_codigo: entry.operacao_codigo.trim(), operador_id: entry.operador_id || null,
        centro_trabalho: entry.centro_trabalho.trim(), setup_inicio: entry.setup_inicio ? new Date(entry.setup_inicio).toISOString() : null,
        setup_fim: entry.setup_fim ? new Date(entry.setup_fim).toISOString() : null,
        producao_inicio: entry.producao_inicio ? new Date(entry.producao_inicio).toISOString() : null,
        producao_fim: entry.producao_fim ? new Date(entry.producao_fim).toISOString() : null,
        pecas_boas: good, pecas_refugadas: scrap, motivo_refugo_id: entry.motivo_refugo_id || null,
        motivo_parada: entry.motivo_parada.trim() || null, observacoes: entry.observacoes.trim() || null
      })
      if (result.error) throw result.error
      if (orderMap.get(entry.ordem_producao_id)?.status === 'liberada' || orderMap.get(entry.ordem_producao_id)?.status === 'planejada') {
        const statusResult = await supabase.from('pcp_ordens_producao').update({ status: 'em_andamento' }).eq('empresa_id', tenant.data).eq('id', entry.ordem_producao_id)
        if (statusResult.error) throw statusResult.error
      }
      setNotice('Apontamento registrado com rastreabilidade da OP e motivo de refugo.'); setEntry(v => ({ ...v, pecas_boas: '0', pecas_refugadas: '0', motivo_refugo_id: '', observacoes: '' }))
      await load()
    } catch (e) { setError(errText(e)) } finally { setBusy(false) }
  }

  async function runMrp() {
    setError(''); setNotice('')
    const rootQty = Number(mrpQty)
    if (!mrpRoot || !Number.isFinite(rootQty) || rootQty <= 0) { setError('Selecione o produto acabado e uma quantidade válida.'); return }
    setBusy(true)
    try {
      const result = await supabase.rpc('erp_pcp_mrp_explodir', { p_produto_pai_id: mrpRoot, p_quantidade: rootQty })
      if (result.error) throw result.error
      const rows = (result.data ?? []) as Array<{produto_id:string;codigo:string;descricao:string;nivel:number;necessidade_bruta:number;saldo_disponivel:number;necessidade_liquida:number;perda_estimada:number}>
      setMrpResult(rows.map(r => ({ id:r.produto_id, codigo:r.codigo, descricao:r.descricao, necessidade:Number(r.necessidade_bruta), saldo:Number(r.saldo_disponivel), liquida:Number(r.necessidade_liquida), perda:Number(r.perda_estimada) })))
      setNotice(rows.length ? 'MRP multinível calculado no PostgreSQL com BOM vigente, perdas e saldo atual.' : 'A BOM vigente não contém componentes para esta demanda.')
    } catch (e) { setMrpResult([]); setError(errText(e)) } finally { setBusy(false) }
  }

  const tabs = [{id:'ordens',label:'Ordens de produção',icon:ClipboardList},{id:'apontamentos',label:'Chão de fábrica',icon:Activity},{id:'mrp',label:'MRP I / materiais',icon:Boxes},{id:'gantt',label:'Capacidade / Gantt',icon:CalendarClock}] as const
  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5 print:bg-white print:p-0">
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 print:mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#123B50] text-white"><Factory size={19}/></div>
        <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-700">SGQ ERP INDUSTRIAL / PCP</p><h1 className="text-lg font-semibold leading-5">Planejamento e controle da produção</h1><p className="mt-1 text-[10px] text-slate-500">Ordens • apontamentos • MRP multinível • capacidade finita</p></div>
        <div className="ml-auto flex gap-1.5 print:hidden"><button type="button" className={button} onClick={() => void load()} disabled={busy}><RefreshCw size={13}/> Atualizar</button><button type="button" className={button} onClick={() => window.print()}><Printer size={13}/> Imprimir A4</button></div>
      </header>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[['OPs abertas',metrics.open,ClipboardList],['Em produção',metrics.running,Play],['Peças boas apontadas',metrics.good,CheckCircle2],['Refugos apontados',metrics.scrap,AlertTriangle]].map(([title,value,Icon]) => <section key={String(title)} className="border border-slate-200 bg-white px-3 py-2"><p className={label}>{String(title)}</p><strong className="text-lg font-semibold tabular-nums">{Number(value).toLocaleString('pt-BR')}</strong></section>)}
      </div>
      {error && <div role="alert" className="mb-2 flex items-start gap-2 border border-rose-300 bg-rose-50 p-2 text-[11px] text-rose-800"><AlertTriangle size={14}/><span>{error}</span></div>}
      {notice && <div role="status" className="mb-2 flex items-start gap-2 border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-emerald-800"><CheckCircle2 size={14}/><span>{notice}</span></div>}
      <nav className="mb-3 flex flex-wrap gap-1 border-b border-slate-200 print:hidden">{tabs.map(t => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tab===t.id?'inline-flex h-[30px] items-center gap-1.5 border-b-2 border-sky-700 bg-white px-3 text-[10px] font-bold text-sky-800':'inline-flex h-[30px] items-center gap-1.5 px-3 text-[10px] font-semibold text-slate-600 hover:bg-white'}><t.icon size={13}/>{t.label}</button>)}</nav>
      {tab==='ordens' && <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={createOrder} className="h-fit border border-slate-200 bg-white p-3">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide">Emitir ordem de produção</h2>
          <label className={label}>Número da OP<input className={field} value={form.numero} onChange={e=>setForm(v=>({...v,numero:e.target.value}))} required maxLength={40}/></label>
          <label className={label}>Produto acabado<select className={field} value={form.produto_id} onChange={e=>setForm(v=>({...v,produto_id:e.target.value}))} required><option value="">Selecione produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.descricao_tecnica}</option>)}</select></label>
          <label className={label}>Quantidade planejada<input className={field} type="number" min="0.000001" step="0.000001" value={form.quantidade_planejada} onChange={e=>setForm(v=>({...v,quantidade_planejada:e.target.value}))} required/></label>
          <label className={label}>Data prometida<input className={field} type="date" value={form.entrega_prevista} onChange={e=>setForm(v=>({...v,entrega_prevista:e.target.value}))}/></label>
          <label className={label}>Roteiro de fabricação (ID)<input className={field} value={form.roteiro_id} onChange={e=>setForm(v=>({...v,roteiro_id:e.target.value}))} placeholder="UUID opcional"/></label>
          <label className={label}>Estado inicial<select className={field} value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}><option value="planejada">Planejada</option><option value="liberada">Liberada</option></select></label>
          <button className={primary+' mt-2 w-full'} type="submit" disabled={busy}><Save size={13}/> Criar OP</button>
          <p className="mt-2 text-[9px] text-slate-500">A gravação usa a empresa da sessão e respeita RLS; número duplicado é rejeitado pelo banco.</p>
        </form>
        <section className="min-w-0 border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-2"><h2 className="mr-auto text-[11px] font-bold uppercase">Carteira de OPs</h2><div className="relative w-full max-w-[300px]"><Search className="absolute left-2 top-2 text-slate-400" size={13}/><input aria-label="Pesquisar ordens de produção" className={field+' pl-7'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="OP, código, produto, status"/></div></div>
          <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className={th}>OP</th><th className={th}>Produto</th><th className={th+' text-right'}>Planejada</th><th className={th}>Abertura</th><th className={th}>Entrega</th><th className={th}>Status</th></tr></thead><tbody>{busy && orders.length===0?<tr><td colSpan={6} className={td+' text-center'}>Carregando ordens...</td></tr>:filteredOrders.length===0?<tr><td colSpan={6} className={td+' py-5 text-center text-slate-400'}>Nenhuma ordem encontrada para esta empresa.</td></tr>:filteredOrders.map(o=><tr key={o.id} className="hover:bg-neutral-50/80"><td className={td+' font-semibold'}>{o.numero}</td><td className={td}>{productMap.get(o.produto_id)?.codigo ?? '—'} · {productMap.get(o.produto_id)?.descricao_tecnica ?? 'Produto'}</td><td className={td+' text-right tabular-nums'}>{Number(o.quantidade_planejada).toLocaleString('pt-BR')}</td><td className={td}>{new Date(o.aberta_em).toLocaleDateString('pt-BR')}</td><td className={td}>{o.entrega_prevista?new Date(o.entrega_prevista+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td><td className={td}><span className="border border-slate-200 px-1.5 py-0.5">{o.status.replace('_',' ').toUpperCase()}</span></td></tr>)}</tbody></table></div>
        </section>
      </div>}
      {tab==='apontamentos' && <div className="grid gap-3 xl:grid-cols-[400px_minmax(0,1fr)]">
        <form onSubmit={saveEntry} className="h-fit border border-slate-200 bg-white p-3">
          <h2 className="mb-3 text-[11px] font-bold uppercase">Apontamento do chão de fábrica</h2>
          <label className={label}>Ordem de produção<select className={field} value={entry.ordem_producao_id} onChange={e=>setEntry(v=>({...v,ordem_producao_id:e.target.value}))} required><option value="">Selecione OP</option>{orders.filter(o=>!['encerrada','cancelada'].includes(o.status)).map(o=><option key={o.id} value={o.id}>{o.numero} — {productMap.get(o.produto_id)?.codigo ?? 'Produto'} ({o.status})</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className={label}>Código da operação<input className={field} value={entry.operacao_codigo} onChange={e=>setEntry(v=>({...v,operacao_codigo:e.target.value}))} required/></label><label className={label}>Centro / máquina<input className={field} value={entry.centro_trabalho} onChange={e=>setEntry(v=>({...v,centro_trabalho:e.target.value}))} required/></label></div>
          <label className={label}>ID do operador (UUID)<input className={field} value={entry.operador_id} onChange={e=>setEntry(v=>({...v,operador_id:e.target.value}))} placeholder="Opcional"/></label>
          <div className="grid grid-cols-2 gap-2"><label className={label}>Início setup<input className={field} type="datetime-local" value={entry.setup_inicio} onChange={e=>setEntry(v=>({...v,setup_inicio:e.target.value}))}/></label><label className={label}>Fim setup<input className={field} type="datetime-local" value={entry.setup_fim} onChange={e=>setEntry(v=>({...v,setup_fim:e.target.value}))}/></label><label className={label}>Início produção<input className={field} type="datetime-local" value={entry.producao_inicio} onChange={e=>setEntry(v=>({...v,producao_inicio:e.target.value}))}/></label><label className={label}>Fim produção<input className={field} type="datetime-local" value={entry.producao_fim} onChange={e=>setEntry(v=>({...v,producao_fim:e.target.value}))}/></label></div>
          <div className="grid grid-cols-2 gap-2"><label className={label}>Peças boas<input className={field} type="number" min="0" step="0.000001" value={entry.pecas_boas} onChange={e=>setEntry(v=>({...v,pecas_boas:e.target.value}))} required/></label><label className={label}>Peças refugadas<input className={field} type="number" min="0" step="0.000001" value={entry.pecas_refugadas} onChange={e=>setEntry(v=>({...v,pecas_refugadas:e.target.value}))} required/></label></div>
          <label className={label}>Código de falha da Qualidade<select className={field} value={entry.motivo_refugo_id} onChange={e=>setEntry(v=>({...v,motivo_refugo_id:e.target.value}))}><option value="">Sem refugo / não aplicável</option>{failures.map(f=><option key={f.id} value={f.id}>{f.codigo} — {f.descricao}</option>)}</select></label>
          <label className={label}>Motivo de parada<input className={field} value={entry.motivo_parada} onChange={e=>setEntry(v=>({...v,motivo_parada:e.target.value}))} placeholder="Manutenção, material, setup..."/></label>
          <label className={label}>Observações técnicas<textarea className="min-h-[60px] w-full rounded-[2px] border border-slate-300 p-2 text-[10px] focus:border-sky-600" value={entry.observacoes} onChange={e=>setEntry(v=>({...v,observacoes:e.target.value}))}/></label>
          <button className={primary+' mt-2 w-full'} type="submit" disabled={busy}><Save size={13}/> Gravar apontamento</button>
        </form>
        <section className="min-w-0 border border-slate-200 bg-white"><div className="border-b border-slate-200 p-2"><h2 className="text-[11px] font-bold uppercase">Histórico de apontamentos</h2></div><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className={th}>Data/hora</th><th className={th}>OP</th><th className={th}>Operação / centro</th><th className={th+' text-right'}>Boas</th><th className={th+' text-right'}>Refugo</th><th className={th}>Parada</th></tr></thead><tbody>{entries.length===0?<tr><td colSpan={6} className={td+' py-5 text-center text-slate-400'}>Sem apontamentos registrados.</td></tr>:entries.map(a=><tr key={a.id} className="hover:bg-neutral-50/80"><td className={td}>{new Date(a.created_at).toLocaleString('pt-BR')}</td><td className={td}>{orderMap.get(a.ordem_producao_id)?.numero??'—'}</td><td className={td}>{a.operacao_codigo} · {a.centro_trabalho}</td><td className={td+' text-right tabular-nums'}>{Number(a.pecas_boas).toLocaleString('pt-BR')}</td><td className={td+' text-right tabular-nums'}>{Number(a.pecas_refugadas).toLocaleString('pt-BR')}</td><td className={td}>{a.motivo_parada??'—'}</td></tr>)}</tbody></table></div></section>
      </div>}
      {tab==='mrp' && <section className="border border-slate-200 bg-white p-3">
        <div className="mb-3"><h2 className="text-[11px] font-bold uppercase">MRP I — explosão de necessidades</h2><p className="mt-1 text-[10px] text-slate-500">Calcula demanda bruta multinível a partir da BOM ativa/vigente e compara com os saldos reais. Não cria pedidos automaticamente sem revisão do planejador.</p></div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]"><label className={label}>Produto pai<select className={field} value={mrpRoot} onChange={e=>setMrpRoot(e.target.value)}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.descricao_tecnica}</option>)}</select></label><label className={label}>Quantidade da demanda<input className={field} type="number" min="0.000001" step="0.000001" value={mrpQty} onChange={e=>setMrpQty(e.target.value)}/></label><div className="flex items-end"><button type="button" className={primary} onClick={runMrp}><Play size={13}/> Calcular necessidades</button></div></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className={th}>Componente</th><th className={th+' text-right'}>Necessidade bruta</th><th className={th+' text-right'}>Saldo atual</th><th className={th+' text-right'}>Necessidade líquida</th><th className={th+' text-right'}>Perda calculada</th><th className={th}>Recomendação</th></tr></thead><tbody>{mrpResult.length===0?<tr><td colSpan={6} className={td+' py-5 text-center text-slate-400'}>Selecione o produto e execute o cálculo.</td></tr>:mrpResult.map(r=><tr key={r.id} className="hover:bg-neutral-50/80"><td className={td}>{r.codigo} · {r.descricao}</td><td className={td+' text-right tabular-nums'}>{r.necessidade.toLocaleString('pt-BR',{maximumFractionDigits:4})}</td><td className={td+' text-right tabular-nums'}>{r.saldo.toLocaleString('pt-BR',{maximumFractionDigits:4})}</td><td className={td+' text-right font-semibold tabular-nums'}>{r.liquida.toLocaleString('pt-BR',{maximumFractionDigits:4})}</td><td className={td+' text-right tabular-nums'}>{r.perda.toLocaleString('pt-BR',{maximumFractionDigits:4})}</td><td className={td}>{r.liquida>0?'Sugerir compra/OP':'Estoque cobre a necessidade'}</td></tr>)}</tbody></table></div>
      </section>}
      {tab==='gantt' && <section className="border border-slate-200 bg-white p-3"><div className="mb-3 flex flex-wrap items-center gap-2"><div className="mr-auto"><h2 className="text-[11px] font-bold uppercase">Sequenciamento visual por data prometida</h2><p className="text-[10px] text-slate-500">Gantt operacional por OP; confirme horários e capacidade real antes de liberar a programação.</p></div><span className="text-[9px] text-slate-500">Escala: hoje → +14 dias</span></div><div className="mb-1 grid grid-cols-[180px_minmax(0,1fr)] text-[9px] font-bold text-slate-500"><span>ORDEM / PRODUTO</span><div className="grid grid-cols-8 border-b border-slate-200">{Array.from({length:8},(_,i)=><span key={i} className="border-l border-slate-100 px-1 py-1">{new Date(Date.now()+i*2*86400000).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>)}</div></div>{orders.filter(o=>!['encerrada','cancelada'].includes(o.status)).map(o=>{const due=o.entrega_prevista?new Date(o.entrega_prevista+'T12:00:00'):new Date(Date.now()+86400000);const days=Math.max(0,Math.min(14,Math.ceil((due.getTime()-Date.now())/86400000)));const left=Math.max(0,Math.min(92,(days/14)*100));const width=Math.max(5,Math.min(100-left,Math.min(35,Number(o.quantidade_planejada)>0?Math.max(8,Number(o.quantidade_planejada)%30):8)));return <div key={o.id} className="grid min-h-[32px] grid-cols-[180px_minmax(0,1fr)] border-b border-slate-100"><div className="flex items-center truncate pr-2 text-[10px]"><b className="mr-1">{o.numero}</b><span className="truncate text-slate-500">{productMap.get(o.produto_id)?.codigo??''}</span></div><div className="relative my-1 bg-[repeating-linear-gradient(to_right,#f8fafc_0,#f8fafc_calc(12.5%-1px),#e2e8f0_calc(12.5%-1px),#e2e8f0_12.5%)]"><div title={o.status+' • entrega '+(o.entrega_prevista??'não definida')} className={'absolute top-1 h-5 rounded-[2px] px-1 text-[9px] font-semibold text-white '+(o.status==='em_andamento'?'bg-emerald-600':o.status==='suspensa'?'bg-amber-500':'bg-sky-700')} style={{left:left+'%',width:width+'%'}}>{o.status.toUpperCase()}</div></div></div>})}{orders.filter(o=>!['encerrada','cancelada'].includes(o.status)).length===0&&<p className="p-5 text-center text-[10px] text-slate-400">Nenhuma OP ativa para sequenciar.</p>}<p className="mt-3 text-[9px] text-slate-500">Visualização de carteira por prazo, não substitui alocação de capacidade finita. A programação de máquina permanece no módulo Sequenciamento.</p></section>}
      <footer className="mt-3 border-t border-slate-200 pt-2 text-[9px] text-slate-500 print:mt-5">SGQ ERP INDUSTRIAL · PCP · Dados vinculados à empresa autenticada · Relatório preparado para impressão A4</footer>
    </div>
  </main>
}
