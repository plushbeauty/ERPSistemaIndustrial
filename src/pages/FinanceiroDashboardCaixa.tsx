/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-FINANCEIRO-CAIXA-FLUXO-20261110-01 — tesouraria em grade 4x2 e projeção diária/semanal/mensal/anual com parcelas e baixas reais.
 * @STATUS_APROVACAO: ALTERAÇÃO AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-10; build e validação bancária pendentes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, RefreshCw, Wallet, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout, { type SalesNavSection } from './VendasLayout'
import { fetchAllPages } from '../lib/supabasePagination'

type Direction = 'PAGAR' | 'RECEBER'
type Scale = 'DIA' | 'SEMANA' | 'MÊS' | 'ANO'
type TitleRef = { tipo: Direction; descricao: string }
type RawPart = { id: string; titulo_id: string; numero: number; vencimento: string; valor: number; saldo: number; status: string; title: TitleRef | TitleRef[] | null }
type Part = RawPart & { title: TitleRef }
type RawSettlement = { empresa_id: string; titulo_id: string; parcela_id: string; valor: number; ocorrido_em: string; title: TitleRef | TitleRef[] | null }
type Settlement = Omit<RawSettlement, 'title'> & { title: TitleRef }
type Account = { id: string; codigo: string | null; nome: string; banco: string | null }
type Bucket = { key: string; label: string; from: string; to: string }
type Projection = { key: string; label: string; entries: number; exits: number; variation: number; accumulated: number }

const nav: SalesNavSection[] = [{ label: 'Financeiro', items: [
  { label: 'Caixa', href: '/financeiro/caixa', icon: CalendarClock },
  { label: 'Contas a pagar', href: '/financeiro/contas-pagar', icon: CalendarClock },
  { label: 'Contas a receber', href: '/financeiro/contas-receber', icon: CalendarClock },
  { label: 'Fluxo de caixa', href: '/financeiro/fluxo-caixa', icon: CalendarClock },
  { label: 'Conciliação', href: '/financeiro/conciliacao-bancaria', icon: CalendarClock },
  { label: 'Importar extratos', href: '/financeiro/importar-extratos', icon: CalendarClock },
]}]
const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0)
const dateKey = (d: Date) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
const parseDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d,12) }
const monthKey = (s: string) => s.slice(0,7)
const relation = (v: TitleRef | TitleRef[] | null): TitleRef | null => Array.isArray(v) ? v[0] ?? null : v

function periods(anchor: Date, scale: Scale): Bucket[] {
  const count = scale === 'DIA' ? 10 : scale === 'SEMANA' ? 8 : scale === 'MÊS' ? 12 : 5
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(anchor)
    if (scale === 'DIA') start.setDate(anchor.getDate()+i)
    if (scale === 'SEMANA') start.setDate(anchor.getDate()+i*7)
    if (scale === 'MÊS') start.setMonth(anchor.getMonth()+i,1)
    if (scale === 'ANO') start.setFullYear(anchor.getFullYear()+i,0,1)
    const end = new Date(start)
    if (scale === 'DIA') end.setDate(start.getDate()+1)
    if (scale === 'SEMANA') end.setDate(start.getDate()+7)
    if (scale === 'MÊS') end.setMonth(start.getMonth()+1,1)
    if (scale === 'ANO') end.setFullYear(start.getFullYear()+1,0,1)
    const label = scale === 'DIA' ? start.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
      : scale === 'SEMANA' ? `${start.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} a ${new Date(end.getTime()-86400000).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`
      : scale === 'MÊS' ? start.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).toUpperCase()
      : String(start.getFullYear())
    return { key: dateKey(start), label, from: dateKey(start), to: dateKey(end) }
  })
}

export default function FinanceiroDashboardCaixa() {
  const [parts,setParts] = useState<Part[]>([])
  const [settlements,setSettlements] = useState<Settlement[]>([])
  const [accounts,setAccounts] = useState<Account[]>([])
  const [scale,setScale] = useState<Scale>('DIA')
  const [baseDate,setBaseDate] = useState(() => dateKey(new Date()))
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [accountNotice,setAccountNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setAccountNotice('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão não localizada. Entre novamente no SYSNQRA.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id,ativo,deleted_at')
        .eq('auth_user_id',auth.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) throw new Error('Empresa ativa não localizada para o fluxo financeiro.')
      const tenant = profile.data.empresa_id
      const [p,b,a] = await Promise.all([
        fetchAllPages<RawPart>((from,to) => supabase.from('erp_financeiro_parcelas')
          .select('id,titulo_id,numero,vencimento,valor,saldo,status,title:erp_financeiro_titulos!inner(tipo,descricao)',{count:'exact'})
          .eq('empresa_id',tenant).neq('status','CANCELADO').order('vencimento').range(from,to)),
        fetchAllPages<RawSettlement>((from,to) => supabase.from('erp_financeiro_baixas')
          .select('empresa_id,titulo_id,parcela_id,valor,ocorrido_em,title:erp_financeiro_titulos!inner(tipo,descricao)',{count:'exact'})
          .eq('empresa_id',tenant).order('ocorrido_em').range(from,to)),
        supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco')
          .eq('empresa_id',tenant).eq('ativo',true).order('nome'),
      ])
      setParts(p.flatMap(x => { const t=relation(x.title); return t ? [{...x,title:t}] : [] }))
      setSettlements(b.flatMap(x => { const t=relation(x.title); return t ? [{...x,title:t}] : [] }))
      if (a.error) { setAccounts([]); setAccountNotice('Não foi possível consultar as contas bancárias desta empresa.') }
      else setAccounts((a.data ?? []) as Account[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao consultar parcelas e baixas financeiras.')
      setParts([]); setSettlements([]); setAccounts([])
    } finally { setLoading(false) }
  },[])
  useEffect(() => { void load() },[load])

  const indicators = useMemo(() => {
    const month = monthKey(baseDate), year = baseDate.slice(0,4)
    const open = (type: Direction, test: (date:string)=>boolean) => parts
      .filter(p=>p.title.tipo===type && p.status!=='CANCELADO' && Number(p.saldo)>0 && test(p.vencimento))
      .reduce((s,p)=>s+Number(p.saldo||0),0)
    const paid = (type: Direction) => settlements.filter(s=>s.title.tipo===type && monthKey(s.ocorrido_em.slice(0,10))===month)
      .reduce((sum,s)=>sum+Number(s.valor||0),0)
    return {
      receiveToday:open('RECEBER',d=>d===baseDate),payToday:open('PAGAR',d=>d===baseDate),
      receiveMonth:open('RECEBER',d=>monthKey(d)===month),payMonth:open('PAGAR',d=>monthKey(d)===month),
      receivedMonth:paid('RECEBER'),paidMonth:paid('PAGAR'),
      receiveYear:open('RECEBER',d=>d.slice(0,4)===year),payYear:open('PAGAR',d=>d.slice(0,4)===year),
    }
  },[parts,settlements,baseDate])

  const rows = useMemo<Projection[]>(() => {
    let accumulated = 0
    return periods(parseDate(baseDate),scale).map(bucket => {
      const outstanding = (type:Direction) => parts.filter(p=>p.title.tipo===type && p.status!=='CANCELADO' && Number(p.saldo)>0 && p.vencimento>=bucket.from && p.vencimento<bucket.to)
        .reduce((sum,p)=>sum+Number(p.saldo||0),0)
      const settled = (type:Direction) => settlements.filter(s=>s.title.tipo===type && s.ocorrido_em.slice(0,10)>=bucket.from && s.ocorrido_em.slice(0,10)<bucket.to)
        .reduce((sum,s)=>sum+Number(s.valor||0),0)
      const entries=outstanding('RECEBER')+settled('RECEBER')
      const exits=outstanding('PAGAR')+settled('PAGAR')
      const variation=entries-exits
      accumulated+=variation
      return {key:bucket.key,label:bucket.label,entries,exits,variation,accumulated}
    })
  },[parts,settlements,baseDate,scale])
  const totals = useMemo(()=>rows.reduce((a,r)=>({entries:a.entries+r.entries,exits:a.exits+r.exits,variation:a.variation+r.variation}),{entries:0,exits:0,variation:0}),[rows])

  const cards = [
    {label:'A receber hoje',value:indicators.receiveToday,color:'text-emerald-700',icon:ArrowDownRight},
    {label:'A pagar hoje',value:indicators.payToday,color:'text-rose-700',icon:ArrowUpRight},
    {label:'A receber no mês',value:indicators.receiveMonth,color:'text-[#123B50]',icon:Wallet},
    {label:'A pagar no mês',value:indicators.payMonth,color:'text-[#123B50]',icon:Wallet},
    {label:'Recebido no mês',value:indicators.receivedMonth,color:'text-emerald-700',icon:ArrowDownRight},
    {label:'Pago no mês',value:indicators.paidMonth,color:'text-rose-700',icon:ArrowUpRight},
    {label:'A receber no ano',value:indicators.receiveYear,color:'text-[#123B50]',icon:Wallet},
    {label:'A pagar no ano',value:indicators.payYear,color:'text-[#123B50]',icon:Wallet},
  ]

  return <VendasLayout title="Fluxo de caixa" subtitle="Tesouraria • parcelas • baixas • projeção" onRefresh={()=>void load()} navSections={nav}>
    <main className="min-h-full bg-[#F4FBFD] p-4 text-[#123B50] md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3E3EA] pb-4">
          <div>
            <nav aria-label="Caminho de navegação" className="mb-1 text-xs font-semibold text-[#547080]">Financeiro / Tesouraria › Caixa</nav>
            <h1 className="text-2xl font-bold tracking-tight">Fluxo de caixa</h1>
            <p className="mt-1 text-sm text-[#547080]">Tesouraria • parcelas • baixas • projeção</p>
            <p className="mt-2 flex items-start gap-2 text-xs text-[#547080]"><Info size={14} className="mt-0.5 shrink-0"/>Entradas e saídas são parcelas e baixas registradas no financeiro da empresa.</p>
          </div>
          <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-10 w-[135px] items-center justify-center gap-2 rounded-md border border-[#B9CDD6] bg-white px-3 text-sm font-semibold text-[#123B50] shadow-sm hover:bg-[#EDF6F9] disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/>Atualizar</button>
        </header>
        {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">Erro ao carregar dados financeiros: {error}</div>}

        <section aria-label="Indicadores de tesouraria" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(card=>{const Icon=card.icon;return <article key={card.label} className="flex h-[95px] flex-col justify-between rounded-md border border-[#D3E3EA] bg-white p-4 shadow-[0_1px_3px_rgba(18,59,80,0.05)]">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#547080]">{card.label}</span><Icon size={16} className={card.color}/></div>
            <strong className={`text-[22px] font-bold tracking-tight ${card.color}`}>{money(card.value)}</strong>
          </article>})}
        </section>

        <section className="overflow-hidden rounded-md border border-[#D3E3EA] bg-white p-4 md:p-5">
          <div className="mb-4"><h2 className="flex items-center gap-2 text-base font-bold"><CalendarClock size={18}/>Entradas, saídas e variação projetada</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#547080]">Saldo projetado exibido como variação acumulada dos títulos e baixas; não substitui saldo bancário conciliado.</p></div>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex h-10 items-center gap-1 rounded-md border border-[#D3E3EA] bg-[#F7FBFC] p-1">
              {(['DIA','SEMANA','MÊS','ANO'] as Scale[]).map(mode=><button key={mode} type="button" onClick={()=>setScale(mode)} aria-pressed={scale===mode} className={`h-8 min-w-[76px] rounded px-3 text-xs font-bold transition ${scale===mode?'bg-[#123B50] text-white shadow-sm':'text-[#547080] hover:bg-white hover:text-[#123B50]'}`}>{mode}</button>)}
            </div>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#547080]">Data base / referência
              <input type="date" value={baseDate} onChange={e=>setBaseDate(e.target.value)} className="h-10 w-[160px] rounded-md border border-[#B9CDD6] bg-white px-3 text-sm font-medium text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15"/>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#547080]">Conta / caixa
              <select disabled value="TODAS" onChange={()=>undefined} title="O modelo atual de parcelas e baixas ainda não possui vínculo com conta bancária." className="h-10 w-[260px] max-w-full rounded-md border border-[#B9CDD6] bg-[#F4F8FA] px-3 text-sm text-[#547080]">
                <option value="TODAS">Todas as contas / caixas</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.codigo? a.codigo+' · ':''}{a.nome}</option>)}
              </select>
            </label>
            <span className="pb-2 text-[10px] text-[#718895]">Filtro por conta indisponível: parcelas e baixas ainda não possuem vínculo bancário.</span>
          </div>
          {accountNotice && <p className="mb-3 text-xs text-amber-700">{accountNotice}</p>}
          <div className="overflow-x-auto rounded-md border border-[#D3E3EA]">
            <table className="w-full min-w-[850px] border-collapse text-xs">
              <thead className="bg-[#EAF3F6] text-[#36596A]"><tr className="h-11">
                <th scope="col" className="px-4 text-left font-bold">Data / Período</th><th scope="col" className="px-4 text-right font-bold">Entradas (R$)</th><th scope="col" className="px-4 text-right font-bold">Saídas (R$)</th><th scope="col" className="px-4 text-right font-bold">Variação do Dia (R$)</th><th scope="col" className="px-4 text-right font-bold">Variação Acumulada (R$)</th>
              </tr></thead>
              <tbody>{rows.map(row=><tr key={row.key} className="h-12 border-t border-[#E5EEF2] odd:bg-white even:bg-[#FAFCFD]">
                <th scope="row" className="px-4 text-left font-semibold text-[#36596A]">{row.label}</th>
                <td className="px-4 text-right tabular-nums text-emerald-700">{money(row.entries)}</td><td className="px-4 text-right tabular-nums text-rose-700">{money(row.exits)}</td>
                <td className={`px-4 text-right tabular-nums font-semibold ${row.variation<0?'text-rose-700':'text-[#36596A]'}`}>{money(row.variation)}</td>
                <td className={`px-4 text-right tabular-nums font-bold ${row.accumulated<0?'text-rose-700':'text-[#123B50]'}`}>{money(row.accumulated)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <footer className="flex flex-wrap justify-end gap-x-6 gap-y-2 border-t border-[#E5EEF2] pt-4 text-xs">
            <span className="text-[#547080]">Total Entradas Período: <strong className="ml-1 text-emerald-700">{money(totals.entries)}</strong></span>
            <span className="text-[#547080]">Total Saídas Período: <strong className="ml-1 text-rose-700">{money(totals.exits)}</strong></span>
            <span className="text-[#547080]">Variação Líquida: <strong className={`ml-1 ${totals.variation<0?'text-rose-700':'text-[#123B50]'}`}>{money(totals.variation)}</strong></span>
          </footer>
          {loading && <p role="status" className="mt-3 text-[11px] text-[#718895]">Atualizando parcelas e baixas do banco…</p>}
        </section>
      </div>
    </main>
  </VendasLayout>
}
