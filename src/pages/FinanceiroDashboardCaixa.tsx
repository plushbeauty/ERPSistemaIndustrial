import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarClock, RefreshCw, Wallet, CreditCard, ArrowDownToLine, GitCompare, FileSpreadsheet, CalendarRange, Factory } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout, { type SalesNavSection } from './VendasLayout'
import { fetchAllPages } from '../lib/supabasePagination'

type Direction = 'PAGAR' | 'RECEBER'
const financeNav: SalesNavSection[] = [{ label:'Financeiro', items:[{label:'Caixa',href:'/financeiro/caixa',icon:CalendarClock},{label:'Contas a pagar',href:'/financeiro/contas-pagar',icon:CalendarClock},{label:'Contas a receber',href:'/financeiro/contas-receber',icon:CalendarClock},{label:'Fluxo de caixa',href:'/financeiro/fluxo-caixa',icon:CalendarClock},{label:'Conciliação',href:'/financeiro/reconciliacao',icon:CalendarClock},{label:'Importar extratos',href:'/financeiro/importar-extratos',icon:CalendarClock},{label:'Ano fiscal',href:'/financeiro/ano-fiscal',icon:CalendarClock},{label:'Custos padrão',href:'/financeiro/custo-padrao',icon:CalendarClock}] }]
type TitleRef = { tipo: Direction; descricao: string }
type RawInstallment = {
  id: string
  titulo_id: string
  numero: number
  vencimento: string
  valor: number
  saldo: number
  status: string
  title: TitleRef | TitleRef[] | null
}
type Installment = RawInstallment & { title: TitleRef }
type Settlement = { empresa_id: string; titulo_id: string; parcela_id: string; valor: number; ocorrido_em: string; title: TitleRef | TitleRef[] | null }
type NormalizedSettlement = Omit<Settlement, 'title'> & { title: TitleRef }
type TimeScale = 'DIA' | 'SEMANA' | 'MÊS' | 'ANO'
type FlowBucket = { key: string; label: string; entries: number; exits: number; net: number }

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const dayKey = (value: Date) => [
  value.getFullYear(),
  String(value.getMonth()+1).padStart(2,'0'),
  String(value.getDate()).padStart(2,'0'),
].join('-')
const dateFromKey = (value: string) => {
  const [year,month,day] = value.split('-').map(Number)
  return new Date(year,month-1,day)
}
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
const titleRef = (value: TitleRef | TitleRef[] | null): TitleRef | null => Array.isArray(value) ? value[0] ?? null : value

export default function FinanceiroDashboardCaixa() {
  const [installments,setInstallments] = useState<Installment[]>([])
  const [settlements,setSettlements] = useState<NormalizedSettlement[]>([])
  const [scale,setScale] = useState<TimeScale>('DIA')
  const [anchor,setAnchor] = useState(() => new Date())
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão não localizada.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id,ativo,deleted_at')
        .eq('auth_user_id',auth.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) throw new Error('Empresa ativa não localizada para o fluxo financeiro.')
      const tenant = profile.data.empresa_id
      const [parts,payments] = await Promise.all([
        fetchAllPages<RawInstallment>((from,to) => supabase.from('erp_financeiro_parcelas')
          .select('id,titulo_id,numero,vencimento,valor,saldo,status,title:erp_financeiro_titulos!inner(tipo,descricao)',{count:'exact'})
          .eq('empresa_id',tenant).neq('status','CANCELADO').order('vencimento').range(from,to)),
        fetchAllPages<Settlement>((from,to) => supabase.from('erp_financeiro_baixas')
          .select('empresa_id,titulo_id,parcela_id,valor,ocorrido_em,title:erp_financeiro_titulos!inner(tipo,descricao)',{count:'exact'})
          .eq('empresa_id',tenant).order('ocorrido_em').range(from,to)),
      ])
      setInstallments(parts.flatMap((part): Installment[] => {
        const relation = titleRef(part.title)
        return relation ? [{...part,title:relation}] : []
      }))
      setSettlements(payments.flatMap((item): NormalizedSettlement[] => {
        const relation = titleRef(item.title)
        return relation ? [{...item,title:relation}] : []
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível calcular o fluxo de caixa.')
      setInstallments([])
      setSettlements([])
    } finally {
      setLoading(false)
    }
  },[])

  useEffect(() => { void load() },[load])

  const today = dayKey(new Date())
  const currentMonth = monthKey(new Date())
  const currentYear = new Date().getFullYear()
  const sumOpen = (direction: Direction, predicate: (value: string) => boolean) => installments
    .filter(item=>item.title.tipo===direction&&item.saldo>0&&predicate(item.vencimento))
    .reduce((sum,item)=>sum+Number(item.saldo),0)
  const sumSettled = (direction: Direction, predicate: (value: string) => boolean) => settlements
    .filter(item=>item.title.tipo===direction&&predicate(item.ocorrido_em.slice(0,10)))
    .reduce((sum,item)=>sum+Number(item.valor),0)

  const cards = [
    {label:'A receber hoje',value:sumOpen('RECEBER',d=>d===today)},
    {label:'A pagar hoje',value:sumOpen('PAGAR',d=>d===today)},
    {label:'A receber no mês',value:sumOpen('RECEBER',d=>monthKey(dateFromKey(d))===currentMonth)},
    {label:'A pagar no mês',value:sumOpen('PAGAR',d=>monthKey(dateFromKey(d))===currentMonth)},
    {label:'Recebido no mês',value:sumSettled('RECEBER',d=>monthKey(dateFromKey(d))===currentMonth)},
    {label:'Pago no mês',value:sumSettled('PAGAR',d=>monthKey(dateFromKey(d))===currentMonth)},
    {label:'A receber no ano',value:sumOpen('RECEBER',d=>dateFromKey(d).getFullYear()===currentYear)},
    {label:'A pagar no ano',value:sumOpen('PAGAR',d=>dateFromKey(d).getFullYear()===currentYear)},
  ]

  const buckets = useMemo(() => {
    const result: FlowBucket[] = []
    const anchorDate = new Date(anchor)
    anchorDate.setHours(0,0,0,0)
    const count = scale==='DIA'?14:scale==='SEMANA'?12:scale==='MÊS'?12:5
    let start: Date
    if(scale==='DIA') {
      start=new Date(anchorDate)
      start.setDate(start.getDate()-6)
    } else if(scale==='SEMANA') {
      start=new Date(anchorDate)
      start.setDate(start.getDate()-((start.getDay()+6)%7))
      start.setDate(start.getDate()-7*5)
    } else if(scale==='MÊS') {
      start=new Date(anchorDate.getFullYear(),anchorDate.getMonth()-5,1)
    } else {
      start=new Date(anchorDate.getFullYear()-2,0,1)
    }

    for(let i=0;i<count;i++) {
      const periodStart=new Date(start)
      if(scale==='DIA') periodStart.setDate(start.getDate()+i)
      if(scale==='SEMANA') periodStart.setDate(start.getDate()+i*7)
      if(scale==='MÊS') periodStart.setMonth(start.getMonth()+i)
      if(scale==='ANO') periodStart.setFullYear(start.getFullYear()+i)
      let periodEnd=new Date(periodStart)
      if(scale==='DIA') periodEnd.setDate(periodStart.getDate()+1)
      if(scale==='SEMANA') periodEnd.setDate(periodStart.getDate()+7)
      if(scale==='MÊS') periodEnd=new Date(periodStart.getFullYear(),periodStart.getMonth()+1,1)
      if(scale==='ANO') periodEnd=new Date(periodStart.getFullYear()+1,0,1)
      const from=dayKey(periodStart)
      const to=dayKey(periodEnd)
      const entries=installments.filter(item=>item.title.tipo==='RECEBER'&&item.saldo>0&&item.vencimento>=from&&item.vencimento<to).reduce((s,item)=>s+Number(item.saldo),0)
      const exits=installments.filter(item=>item.title.tipo==='PAGAR'&&item.saldo>0&&item.vencimento>=from&&item.vencimento<to).reduce((s,item)=>s+Number(item.saldo),0)
      const paidIn=settlements.filter(item=>item.title.tipo==='RECEBER'&&item.ocorrido_em.slice(0,10)>=from&&item.ocorrido_em.slice(0,10)<to).reduce((s,item)=>s+Number(item.valor),0)
      const paidOut=settlements.filter(item=>item.title.tipo==='PAGAR'&&item.ocorrido_em.slice(0,10)>=from&&item.ocorrido_em.slice(0,10)<to).reduce((s,item)=>s+Number(item.valor),0)
      const label=scale==='DIA'?periodStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):scale==='SEMANA'?`${periodStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}–${new Date(periodStart.getFullYear(),periodStart.getMonth(),periodStart.getDate()+6).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`:scale==='MÊS'?periodStart.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}):String(periodStart.getFullYear())
      result.push({key:from,label,entries:entries+paidIn,exits:exits+paidOut,net:entries+paidIn-exits-paidOut})
    }
    return result
  },[anchor,installments,scale,settlements])

  const shift = (direction: number) => {
    setAnchor(current => {
      const next=new Date(current)
      if(scale==='DIA') next.setDate(next.getDate()+direction*14)
      if(scale==='SEMANA') next.setDate(next.getDate()+direction*84)
      if(scale==='MÊS') next.setMonth(next.getMonth()+direction*12)
      if(scale==='ANO') next.setFullYear(next.getFullYear()+direction*5)
      return next
    })
  }
  const maxScale=Math.max(1,...buckets.flatMap(item=>[item.entries,item.exits]))

  return <VendasLayout title="Fluxo de caixa" subtitle="Tesouraria • parcelas • baixas • projeção" onRefresh={()=>void load()} navSections={financeNav}><main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6"><div className="mx-auto max-w-[1600px] space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">Financeiro / Tesouraria</p><h1 className="text-2xl font-semibold text-[#123B50]">Fluxo de caixa</h1><p className="mt-1 text-sm text-slate-600">Entradas e saídas são parcelas e baixas registradas no financeiro da empresa.</p></div><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-sm disabled:opacity-50"><RefreshCw size={15}/>Atualizar</button></header>
    {error&&<div role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card=><article key={card.label} className="border border-slate-200 bg-white p-3"><span className="block text-xs text-slate-600">{card.label}</span><strong className="mt-1 block text-lg font-semibold text-[#123B50]">{loading?'…':currency(card.value)}</strong></article>)}
    </section>
    <section className="border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3"><div><h2 className="flex items-center gap-2 font-semibold"><CalendarClock size={17}/>Entradas, saídas e variação projetada</h2><p className="text-xs text-slate-600">Saldo projetado exibido como variação acumulada dos títulos e baixas; não substitui saldo bancário conciliado.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={()=>shift(-1)} aria-label="Períodos anteriores" className="grid size-9 place-items-center border border-slate-300"><ArrowLeft size={16}/></button>{(['DIA','SEMANA','MÊS','ANO'] as TimeScale[]).map(value=><button key={value} type="button" onClick={()=>setScale(value)} aria-pressed={scale===value} className={`h-9 border px-3 text-xs font-semibold ${scale===value?'border-sky-800 bg-sky-800 text-white':'border-slate-300 bg-white'}`}>{value}</button>)}<button type="button" onClick={()=>shift(1)} aria-label="Próximos períodos" className="grid size-9 place-items-center border border-slate-300"><ArrowRight size={16}/></button></div></div>
      <div className="overflow-x-auto p-3"><div className="flex min-w-max items-stretch gap-2">
        {buckets.map((item,index)=><article key={item.key} className="w-36 border border-slate-200 bg-slate-50 p-2"><strong className="block text-xs text-slate-700">{item.label}</strong><div className="mt-3 space-y-2 text-[11px]"><div><span className="flex justify-between"><span className="text-emerald-800">Entradas</span><span>{currency(item.entries)}</span></span><div className="mt-1 h-2 bg-emerald-100"><div className="h-2 bg-emerald-600" style={{width:`${Math.min(100,item.entries/maxScale*100)}%`}}/></div></div><div><span className="flex justify-between"><span className="text-rose-800">Saídas</span><span>{currency(item.exits)}</span></span><div className="mt-1 h-2 bg-rose-100"><div className="h-2 bg-rose-600" style={{width:`${Math.min(100,item.exits/maxScale*100)}%`}}/></div></div><div className="border-t border-slate-200 pt-1"><span className="text-slate-600">Variação</span><strong className={`block ${item.net<0?'text-rose-800':'text-emerald-800'}`}>{currency(item.net)}</strong><small className="text-slate-500">acumulada {currency(buckets.slice(0,index+1).reduce((sum,part)=>sum+part.net,0))}</small></div></div></article>)}
      </div></div>
    </section>
  </div></main></VendasLayout>
}
