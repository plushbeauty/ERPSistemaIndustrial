import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Factory, RefreshCw, Save, Printer, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Order = { id: string; numero: string; produto_id: string; quantidade_planejada: number; entrega_prevista: string | null; status: string }
type Product = { id: string; codigo: string; descricao_tecnica: string }
type Schedule = { id: string; ordem_producao_id: string; centro_trabalho: string; inicio_planejado: string; fim_planejado: string; setup_minutos: number; quantidade_planejada: number; prioridade: number; status: string; observacoes: string | null }
const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] focus:border-sky-600 focus:outline-none'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-slate-600'
const btn = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[10px] font-bold uppercase hover:bg-slate-50 disabled:opacity-50'
const primary = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-sky-700 bg-sky-700 px-3 text-[10px] font-bold uppercase text-white hover:bg-sky-800 disabled:opacity-50'
const th = 'h-[32px] bg-slate-100 px-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-600'
const td = 'h-[32px] border-t border-slate-100 px-2 text-[10px] text-slate-700'
const localInputDate = (d: Date) => { const v = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return v.toISOString().slice(0,16) }
const errText = (e: unknown) => e instanceof Error ? e.message : 'Falha na programação de capacidade.'

export default function PCPCapacidadeIndustrial() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ ordem_producao_id:'', centro_trabalho:'', inicio_planejado:localInputDate(new Date()), fim_planejado:localInputDate(new Date(Date.now()+3600000)), setup_minutos:'0', quantidade_planejada:'1', prioridade:'50', status:'planejada', observacoes:'' })
  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const company = tenant.data
      const [o,p,s] = await Promise.all([
        supabase.from('pcp_ordens_producao').select('id,numero,produto_id,quantidade_planejada,entrega_prevista,status').eq('empresa_id',company).not('status','in','(encerrada,cancelada)').order('entrega_prevista').limit(2000),
        supabase.from('engenharia_produtos').select('id,codigo,descricao_tecnica').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(3000),
        supabase.from('pcp_programacao_capacidade').select('id,ordem_producao_id,centro_trabalho,inicio_planejado,fim_planejado,setup_minutos,quantidade_planejada,prioridade,status,observacoes').eq('empresa_id',company).neq('status','cancelada').order('inicio_planejado').limit(5000)
      ])
      for (const r of [o,p,s]) if (r.error) throw r.error
      setOrders((o.data??[]) as Order[]); setProducts((p.data??[]) as Product[]); setSchedules((s.data??[]) as Schedule[])
    } catch (e) { setError(errText(e)) } finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const productMap = useMemo(() => new Map(products.map(p=>[p.id,p])),[products])
  const orderMap = useMemo(() => new Map(orders.map(o=>[o.id,o])),[orders])
  const centers = useMemo(() => [...new Set(schedules.map(s=>s.centro_trabalho))].sort(),[schedules])
  const lanes = useMemo(() => {
    const keys = [...new Set([...centers, ...(form.centro_trabalho.trim() ? [form.centro_trabalho.trim()] : [])])]
    return keys.map(centro => ({centro,rows:schedules.filter(s=>s.centro_trabalho===centro).sort((a,b)=>a.inicio_planejado.localeCompare(b.inicio_planejado))}))
  },[centers,schedules,form.centro_trabalho])
  const range = useMemo(() => {
    const dates = schedules.flatMap(s=>[new Date(s.inicio_planejado).getTime(),new Date(s.fim_planejado).getTime()]).filter(Number.isFinite)
    const start = dates.length ? Math.min(...dates) : Date.now()
    const end = dates.length ? Math.max(...dates) : start + 7*86400000
    return {start,end:Math.max(end,start+86400000)}
  },[schedules])
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setNotice('')
    const start = new Date(form.inicio_planejado), end = new Date(form.fim_planejado)
    if (!form.ordem_producao_id || !form.centro_trabalho.trim() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end<=start) { setError('Informe OP, centro e intervalo de início/fim válido.'); return }
    if (Number(form.quantidade_planejada)<=0 || Number(form.setup_minutos)<0 || Number(form.prioridade)<1 || Number(form.prioridade)>100) { setError('Quantidade deve ser positiva, setup não negativo e prioridade de 1 a 100.'); return }
    setBusy(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data!=='string' || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const r = await supabase.from('pcp_programacao_capacidade').insert({
        empresa_id:tenant.data, ordem_producao_id:form.ordem_producao_id, centro_trabalho:form.centro_trabalho.trim(),
        inicio_planejado:start.toISOString(), fim_planejado:end.toISOString(), setup_minutos:Number(form.setup_minutos),
        quantidade_planejada:Number(form.quantidade_planejada), prioridade:Number(form.prioridade), status:form.status,
        observacoes:form.observacoes.trim()||null
      })
      if (r.error) throw r.error
      setNotice('Programação gravada. A validação transacional impede conflito de horário no mesmo centro.')
      setForm(v=>({...v,observacoes:''})); await load()
    } catch(e) { setError(errText(e)) } finally { setBusy(false) }
  }
  async function setStatus(row:Schedule,status:string) {
    setBusy(true);setError('');setNotice('')
    try {
      const r=await supabase.from('pcp_programacao_capacidade').update({status}).eq('id',row.id)
      if(r.error)throw r.error
      setNotice('Status de programação atualizado.');await load()
    } catch(e) {setError(errText(e))} finally {setBusy(false)}
  }
  const position = (value:string) => Math.max(0,Math.min(100,(new Date(value).getTime()-range.start)/(range.end-range.start)*100))
  const width = (s:Schedule) => Math.max(1,Math.min(100-position(s.inicio_planejado),position(s.fim_planejado)-position(s.inicio_planejado)))
  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5 print:bg-white print:p-0"><div className="mx-auto max-w-[1600px]">
    <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 print:mb-2"><div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#123B50] text-white"><CalendarClock size={18}/></div><div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-700">PCP / MRP II</p><h1 className="text-lg font-semibold">Programação de capacidade finita</h1><p className="text-[10px] text-slate-500">Gantt por centro de trabalho · prevenção transacional de sobreposição</p></div><div className="ml-auto flex gap-1.5 print:hidden"><button className={btn} type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={13}/> Atualizar</button><button className={btn} type="button" onClick={()=>window.print()}><Printer size={13}/> Imprimir A4</button></div></header>
    {error&&<div role="alert" className="mb-2 flex gap-2 border border-rose-300 bg-rose-50 p-2 text-[11px] text-rose-800"><AlertTriangle size={14}/>{error}</div>}{notice&&<div role="status" className="mb-2 flex gap-2 border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-emerald-800"><CheckCircle2 size={14}/>{notice}</div>}
    <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
      <form onSubmit={save} className="h-fit border border-slate-200 bg-white p-3 print:hidden"><h2 className="mb-3 text-[11px] font-bold uppercase">Alocar OP no centro</h2>
        <label className={label}>Ordem de produção<select className={input} value={form.ordem_producao_id} onChange={e=>setForm(v=>({...v,ordem_producao_id:e.target.value}))} required><option value="">Selecione OP</option>{orders.map(o=><option key={o.id} value={o.id}>{o.numero} · {productMap.get(o.produto_id)?.codigo??'Produto'}</option>)}</select></label>
        <label className={label}>Centro de trabalho / máquina<input className={input} value={form.centro_trabalho} onChange={e=>setForm(v=>({...v,centro_trabalho:e.target.value}))} required maxLength={100} placeholder="Ex.: CNC-01"/></label>
        <div className="grid grid-cols-2 gap-2"><label className={label}>Início planejado<input className={input} type="datetime-local" value={form.inicio_planejado} onChange={e=>setForm(v=>({...v,inicio_planejado:e.target.value}))} required/></label><label className={label}>Fim planejado<input className={input} type="datetime-local" value={form.fim_planejado} onChange={e=>setForm(v=>({...v,fim_planejado:e.target.value}))} required/></label></div>
        <div className="grid grid-cols-2 gap-2"><label className={label}>Setup (minutos)<input className={input} type="number" min="0" step=".01" value={form.setup_minutos} onChange={e=>setForm(v=>({...v,setup_minutos:e.target.value}))}/></label><label className={label}>Quantidade<input className={input} type="number" min=".000001" step=".000001" value={form.quantidade_planejada} onChange={e=>setForm(v=>({...v,quantidade_planejada:e.target.value}))} required/></label></div>
        <label className={label}>Prioridade (1–100)<input className={input} type="number" min="1" max="100" value={form.prioridade} onChange={e=>setForm(v=>({...v,prioridade:e.target.value}))}/></label>
        <label className={label}>Status inicial<select className={input} value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}><option value="planejada">Planejada</option><option value="confirmada">Confirmada</option></select></label>
        <label className={label}>Observações<textarea className="min-h-[56px] w-full rounded-[2px] border border-slate-300 p-2 text-[10px]" value={form.observacoes} onChange={e=>setForm(v=>({...v,observacoes:e.target.value}))}/></label>
        <button className={primary+' mt-2 w-full'} type="submit" disabled={busy}><Save size={13}/> Gravar alocação</button>
        <p className="mt-2 text-[9px] text-slate-500">Duas operações ativas não podem ocupar o mesmo centro em intervalos sobrepostos. O banco valida a regra na transação.</p>
      </form>
      <section className="min-w-0 border border-slate-200 bg-white p-3"><div className="mb-3 flex items-center gap-2"><Factory size={15} className="text-sky-700"/><h2 className="text-[11px] font-bold uppercase">Gantt por centro de trabalho</h2><span className="ml-auto text-[9px] text-slate-500">{schedules.length} alocações</span></div>
        {lanes.length===0?<p className="border border-dashed border-slate-300 p-8 text-center text-[10px] text-slate-500">{busy?'Carregando programação...':'Nenhuma alocação cadastrada. Use o formulário para programar a primeira OP.'}</p>:<div className="overflow-x-auto"><div className="min-w-[760px]">
          <div className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-slate-200"><div className="px-2 py-2 text-[9px] font-bold uppercase text-slate-500">Centro / OP</div><div className="grid grid-cols-8 text-[9px] font-bold text-slate-500">{Array.from({length:8},(_,i)=><span key={i} className="border-l border-slate-100 px-1 py-2">{new Date(range.start+(range.end-range.start)*i/8).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>)}</div></div>
          {lanes.map(lane=><div key={lane.centro} className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-slate-100"><div className="flex items-start gap-1 px-2 py-3 text-[10px] font-semibold"><Factory size={12} className="mt-0.5 shrink-0 text-sky-700"/><span className="break-words">{lane.centro}</span></div><div>{lane.rows.map(s=><div key={s.id} className="relative h-[32px] border-b border-slate-50 bg-[repeating-linear-gradient(to_right,#fff_0,#fff_calc(12.5%-1px),#e2e8f0_calc(12.5%-1px),#e2e8f0_12.5%)]"><div title={orderMap.get(s.ordem_producao_id)?.numero+' · '+new Date(s.inicio_planejado).toLocaleString('pt-BR')+' até '+new Date(s.fim_planejado).toLocaleString('pt-BR')} className={'absolute top-[4px] h-[24px] overflow-hidden rounded-[2px] px-1 text-[9px] font-bold text-white '+(s.status==='em_execucao'?'bg-emerald-700':s.status==='concluida'?'bg-slate-500':s.status==='confirmada'?'bg-sky-800':'bg-sky-600')} style={{left:position(s.inicio_planejado)+'%',width:width(s)+'%'}}>{orderMap.get(s.ordem_producao_id)?.numero??'OP'} · {s.status.toUpperCase()}</div></div>)}</div></div>)}
        </div></div>}
        <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className={th}>OP</th><th className={th}>Centro</th><th className={th}>Início</th><th className={th}>Fim</th><th className={th+' text-right'}>Qtd.</th><th className={th}>Status / ação</th></tr></thead><tbody>{schedules.map(s=><tr key={s.id} className="hover:bg-neutral-50/80"><td className={td}>{orderMap.get(s.ordem_producao_id)?.numero??'—'}</td><td className={td}>{s.centro_trabalho}</td><td className={td}>{new Date(s.inicio_planejado).toLocaleString('pt-BR')}</td><td className={td}>{new Date(s.fim_planejado).toLocaleString('pt-BR')}</td><td className={td+' text-right tabular-nums'}>{Number(s.quantidade_planejada).toLocaleString('pt-BR')}</td><td className={td}><div className="flex items-center gap-1"><span>{s.status}</span>{s.status==='planejada'&&<button type="button" className={btn} disabled={busy} onClick={()=>void setStatus(s,'confirmada')}>Confirmar</button>}{s.status==='confirmada'&&<button type="button" className={btn} disabled={busy} onClick={()=>void setStatus(s,'em_execucao')}><Clock3 size={11}/> Iniciar</button>}{s.status==='em_execucao'&&<button type="button" className={btn} disabled={busy} onClick={()=>void setStatus(s,'concluida')}>Concluir</button>}</div></td></tr>)}</tbody></table></div>
      </section>
    </div>
    <footer className="mt-3 border-t border-slate-200 pt-2 text-[9px] text-slate-500 print:mt-5">SGQ ERP INDUSTRIAL · PCP/MRP II · Programação multi-tenant · Relatório A4</footer>
  </div></main>
}
