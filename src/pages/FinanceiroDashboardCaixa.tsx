/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-CAIXA-TESOURARIA-GRADE-PROJECAO-20261110-01 — 8 indicadores, filtros temporais, grade diária e totais; parcelas/baixas reais por empresa
 * @STATUS_APROVACAO: AJUSTE VISUAL AUTORIZADO PELO PROPRIETARIO EM 2026-11-10
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout, { type SalesNavSection } from './VendasLayout'

type Direction = 'PAGAR' | 'RECEBER'
type TimeScale = 'DIA' | 'SEMANA' | 'MÊS' | 'ANO'
type TitleRef = { tipo: Direction; descricao: string }
type RawInstallment = { id: string; vencimento: string; saldo: number; status: string; title: TitleRef | TitleRef[] | null }
type Installment = Omit<RawInstallment, 'title'> & { title: TitleRef }
type RawSettlement = { valor: number; ocorrido_em: string; title: TitleRef | TitleRef[] | null }
type Settlement = Omit<RawSettlement, 'title'> & { title: TitleRef }
type Bucket = { key: string; label: string; entries: number; exits: number; net: number }

const nav: SalesNavSection[] = [{ label: 'Financeiro', items: [
  { label: 'Caixa', href: '/financeiro/caixa', icon: CalendarClock },
  { label: 'Contas a pagar', href: '/financeiro/contas-pagar', icon: CalendarClock },
  { label: 'Contas a receber', href: '/financeiro/contas-receber', icon: CalendarClock },
  { label: 'Fluxo de caixa', href: '/financeiro/fluxo-caixa', icon: CalendarClock },
  { label: 'Conciliação', href: '/financeiro/reconciliacao', icon: CalendarClock },
] }]
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const keyOf = (date: Date) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-')
const fromKey = (value: string) => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d) }
const monthOf = (value: string) => value.slice(0,7)
const relation = (value: TitleRef | TitleRef[] | null): TitleRef | null => Array.isArray(value) ? value[0] ?? null : value
const dateText = (value: string) => fromKey(value).toLocaleDateString('pt-BR')

export default function FinanceiroDashboardCaixa() {
  const [parts,setParts] = useState<Installment[]>([])
  const [settlements,setSettlements] = useState<Settlement[]>([])
  const [scale,setScale] = useState<TimeScale>('DIA')
  const [anchor,setAnchor] = useState(() => keyOf(new Date()))
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [accountWarning,setAccountWarning] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setAccountWarning('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão não localizada. Entre novamente.')
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (typeof company.data !== 'string' || !company.data) throw new Error('Empresa ativa não identificada.')
      const tenant = company.data
      const [p,b,accounts] = await Promise.all([
        fetchAllPages<RawInstallment>((from,to) => supabase.from('erp_financeiro_parcelas')
          .select('id,vencimento,saldo,status,title:erp_financeiro_titulos!inner(tipo,descricao)',{count:'exact'})
          .eq('empresa_id',tenant).neq('status','CANCELADO').order('vencimento').range(from,to)),
        fetchAllPages<RawSettlement>((from,to) => supabase.from('erp_financeiro_baixas')
          .select('valor,ocorrido_em,title:erp_financeiro_titulos!inner(tipo,descricao)',{count:'exact'})
          .eq('empresa_id',tenant).order('ocorrido_em').range(from,to)),
        supabase.from('erp_contas_bancarias').select('id').eq('empresa_id',tenant).eq('ativo',true).limit(1),
      ])
      if (accounts.error) throw accounts.error
      setParts(p.flatMap(item => { const title=relation(item.title); return title ? [{...item,title}] : [] }))
      setSettlements(b.flatMap(item => { const title=relation(item.title); return title ? [{...item,title}] : [] }))
      setAccountWarning('O cadastro de parcelas ainda não possui vínculo com conta bancária; a projeção considera todas as contas.')
    } catch (cause) {
      setParts([]); setSettlements([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o caixa.')
    } finally { setLoading(false) }
  },[])
  useEffect(() => { void load() },[load])

  const today = keyOf(new Date())
  const month = today.slice(0,7)
  const year = today.slice(0,4)
  const openSum = (type: Direction, match: (date: string) => boolean) => parts
    .filter(row => row.title.tipo===type && Number(row.saldo)>0 && match(row.vencimento))
    .reduce((sum,row) => sum+Number(row.saldo),0)
  const settledSum = (type: Direction, match: (date: string) => boolean) => settlements
    .filter(row => row.title.tipo===type && match(row.ocorrido_em.slice(0,10)))
    .reduce((sum,row) => sum+Number(row.valor),0)
  const cards = [
    ['A receber hoje',openSum('RECEBER',d=>d===today)],
    ['A pagar hoje',openSum('PAGAR',d=>d===today)],
    ['A receber no mês',openSum('RECEBER',d=>monthOf(d)===month)],
    ['A pagar no mês',openSum('PAGAR',d=>monthOf(d)===month)],
    ['Recebido no mês',settledSum('RECEBER',d=>monthOf(d)===month)],
    ['Pago no mês',settledSum('PAGAR',d=>monthOf(d)===month)],
    ['A receber no ano',openSum('RECEBER',d=>d.startsWith(year))],
    ['A pagar no ano',openSum('PAGAR',d=>d.startsWith(year))],
  ] as const

  const buckets = useMemo(() => {
    const base=fromKey(anchor); base.setHours(0,0,0,0)
    const start=new Date(base)
    const count=scale==='DIA'?14:scale==='SEMANA'?12:scale==='MÊS'?12:5
    if(scale==='DIA') start.setDate(start.getDate()-6)
    if(scale==='SEMANA') { start.setDate(start.getDate()-((start.getDay()+6)%7)-35) }
    if(scale==='MÊS') start.setDate(1), start.setMonth(start.getMonth()-5)
    if(scale==='ANO') start.setMonth(0,1), start.setFullYear(start.getFullYear()-2)
    const result: Bucket[]=[]
    for(let i=0;i<count;i++) {
      const from=new Date(start)
      if(scale==='DIA') from.setDate(start.getDate()+i)
      if(scale==='SEMANA') from.setDate(start.getDate()+i*7)
      if(scale==='MÊS') from.setMonth(start.getMonth()+i)
      if(scale==='ANO') from.setFullYear(start.getFullYear()+i)
      const to=new Date(from)
      if(scale==='DIA') to.setDate(to.getDate()+1)
      if(scale==='SEMANA') to.setDate(to.getDate()+7)
      if(scale==='MÊS') to.setMonth(to.getMonth()+1)
      if(scale==='ANO') to.setFullYear(to.getFullYear()+1)
      const a=keyOf(from), z=keyOf(to)
      const incoming=parts.filter(x=>x.title.tipo==='RECEBER'&&Number(x.saldo)>0&&x.vencimento>=a&&x.vencimento<z).reduce((s,x)=>s+Number(x.saldo),0)
        +settlements.filter(x=>x.title.tipo==='RECEBER'&&x.ocorrido_em.slice(0,10)>=a&&x.ocorrido_em.slice(0,10)<z).reduce((s,x)=>s+Number(x.valor),0)
      const outgoing=parts.filter(x=>x.title.tipo==='PAGAR'&&Number(x.saldo)>0&&x.vencimento>=a&&x.vencimento<z).reduce((s,x)=>s+Number(x.saldo),0)
        +settlements.filter(x=>x.title.tipo==='PAGAR'&&x.ocorrido_em.slice(0,10)>=a&&x.ocorrido_em.slice(0,10)<z).reduce((s,x)=>s+Number(x.valor),0)
      const label=scale==='DIA'?dateText(a):scale==='SEMANA'?dateText(a)+' – '+dateText(keyOf(new Date(to.getTime()-86400000))):scale==='MÊS'?from.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}):String(from.getFullYear())
      result.push({key:a,label,entries:incoming,exits:outgoing,net:incoming-outgoing})
    }
    return result
  },[anchor,parts,scale,settlements])
  const summary=buckets.reduce((acc,row)=>({entries:acc.entries+row.entries,exits:acc.exits+row.exits,net:acc.net+row.net}),{entries:0,exits:0,net:0})
  let accumulated=0
  const rows=buckets.map(row=>{ accumulated+=row.net; return {...row,accumulated} })

  return <VendasLayout title="Fluxo de caixa" subtitle="Tesouraria • parcelas • baixas • projeção" onRefresh={()=>void load()} navSections={nav}>
    <main className="min-h-full bg-[#F4FBFD] p-4 text-[#123B50] md:p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D3E3EA] bg-white px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#2D8DB8]">Financeiro / Tesouraria › Caixa</p><h1 className="mt-1 text-[22px] font-bold">Fluxo de caixa</h1><p className="mt-1 text-xs text-slate-600">Tesouraria • parcelas • baixas • projeção</p></div>
          <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-[40px] w-[135px] items-center justify-center gap-2 rounded-md border border-[#B8CCD6] bg-white text-xs font-bold text-[#123B50] hover:bg-[#F4FBFD] disabled:opacity-50"><RefreshCw size={14}/>Atualizar</button>
        </header>
        <div className="flex items-start gap-2 rounded-md border border-[#C8E3EE] bg-[#EAF6FA] px-4 py-3 text-[11px] text-[#24566B]"><span className="font-bold">Integridade:</span><span>Entradas e saídas são parcelas e baixas registradas no financeiro da empresa.</span></div>
        {error&&<div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de tesouraria">
          {cards.map(([label,value])=><article key={label} className="flex h-[95px] flex-col justify-center rounded-lg border border-[#D3E3EA] bg-white px-4 shadow-[0_1px_2px_rgba(18,59,80,.04)]"><span className="text-[11px] font-medium text-slate-600">{label}</span><strong className="mt-2 text-[22px] font-bold leading-none text-[#123B50]">{loading?'—':money(value)}</strong></article>)}
        </section>
        <section className="rounded-lg border border-[#D3E3EA] bg-white p-5">
          <div className="mb-4"><h2 className="text-[15px] font-bold">Entradas, saídas e variação projetada</h2><p className="mt-1 text-[11px] text-slate-500">Saldo projetado exibido como variação acumulada dos títulos e baixas; não substitui saldo bancário conciliado.</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap gap-2">{(['DIA','SEMANA','MÊS','ANO'] as TimeScale[]).map(item=><button key={item} type="button" onClick={()=>setScale(item)} aria-pressed={scale===item} className={`h-[40px] ${item==='SEMANA'?'w-[100px]':'w-[90px]'} rounded-md border text-[11px] font-bold ${scale===item?'border-[#176487] bg-[#176487] text-white':'border-[#C8D8E0] bg-white text-[#31586B] hover:bg-[#F4FBFD]'}`}>{item}</button>)}</div>
            <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">Data base / referência<input type="date" value={anchor} onChange={e=>e.target.value&&setAnchor(e.target.value)} className="h-[40px] w-[160px] rounded-md border border-[#C8D8E0] bg-white px-3 text-xs font-medium text-[#123B50]"/></label>
            <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">Conta / caixa<select disabled value="" className="h-[40px] w-[260px] rounded-md border border-[#C8D8E0] bg-slate-50 px-3 text-xs text-slate-600"><option value="">Todas as contas</option></select></label>
          </div>
          {accountWarning&&<p className="mt-3 text-[10px] text-amber-700">{accountWarning}</p>}
          <div className="mt-5 overflow-x-auto rounded-md border border-[#D3E3EA]">
            <table className="w-full min-w-[850px] border-collapse text-[11px]">
              <thead className="bg-[#F1F7F9] text-[#31586B]"><tr className="h-10"><th className="px-4 text-left font-bold">Data / Período</th><th className="px-4 text-right font-bold">Entradas (R$)</th><th className="px-4 text-right font-bold">Saídas (R$)</th><th className="px-4 text-right font-bold">Variação do Dia (R$)</th><th className="px-4 text-right font-bold">Variação Acumulada (R$)</th></tr></thead>
              <tbody>{rows.map(row=><tr key={row.key} className="h-[48px] border-t border-[#E5EEF2] hover:bg-[#F8FBFC]"><td className="px-4 font-semibold text-[#31586B]">{row.label}</td><td className="px-4 text-right tabular-nums">{loading?'—':money(row.entries)}</td><td className="px-4 text-right tabular-nums">{loading?'—':money(row.exits)}</td><td className={`px-4 text-right font-semibold tabular-nums ${row.net<0?'text-rose-700':'text-emerald-700'}`}>{loading?'—':money(row.net)}</td><td className="px-4 text-right font-bold tabular-nums text-[#123B50]">{loading?'—':money(row.accumulated)}</td></tr>)}</tbody>
              <tfoot><tr className="h-[48px] border-t border-[#D3E3EA] bg-[#F7FAFB] font-bold"><td className="px-4">Total do período</td><td className="px-4 text-right">{loading?'—':money(summary.entries)}</td><td className="px-4 text-right">{loading?'—':money(summary.exits)}</td><td className="px-4 text-right">{loading?'—':money(summary.net)}</td><td className="px-4 text-right">{loading?'—':money(summary.net)}</td></tr></tfoot>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 border-t border-[#E5EEF2] pt-4 text-[11px]"><span>Total Entradas Período: <strong>{loading?'—':money(summary.entries)}</strong></span><span>Total Saídas Período: <strong>{loading?'—':money(summary.exits)}</strong></span><span>Variação Líquida: <strong className={summary.net<0?'text-rose-700':'text-emerald-700'}>{loading?'—':money(summary.net)}</strong></span></div>
        </section>
      </div>
    </main>
  </VendasLayout>
}
