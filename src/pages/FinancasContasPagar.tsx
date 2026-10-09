import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, CreditCard, FileSpreadsheet, ScanLine, Wallet, CalendarRange } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import CompactButton from '../components/ui/CompactButton'
import FinanceiroTitulos from './FinanceiroTitulos'
import { supabase } from '../lib/supabaseClient'

type FinanceKind = 'PAGAR' | 'RECEBER'
type Props = { kind?: FinanceKind }
type Row = { valor: number; saldo: number; vencimento: string; status: string }
type Baixa = { valor: number; ocorrido_em: string }

const links = [
  ['/financeiro/contas-pagar','CONTAS A PAGAR',CreditCard],
  ['/financeiro/caixa','CAIXA',Wallet],
  ['/financeiro/fluxo-caixa','FLUXO DE CAIXA',CalendarRange],
  ['/financeiro/reconciliacao','CONCILIAÇÃO',FileSpreadsheet],
] as const

const money = (value: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)

export default function FinancasContasPagar({ kind = 'PAGAR' }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const [rows,setRows] = useState<Row[]>([])
  const [baixas,setBaixas] = useState<Baixa[]>([])
  const [error,setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      const year = new Date().getFullYear()
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) { if(active) setError(empresa.error?.message ?? 'Empresa da sessão não localizada.'); return }
      const id = String(empresa.data)
      const [parcelas, pagamentos] = await Promise.all([
        supabase.from('erp_financeiro_parcelas').select('valor,saldo,vencimento,status').eq('empresa_id',id).eq('status','ABERTO').gte('vencimento', year + '-01-01').lt('vencimento', (year + 1) + '-01-01'),
        supabase.from('erp_financeiro_baixas').select('valor,ocorrido_em').eq('empresa_id',id).gte('ocorrido_em', year + '-01-01T00:00:00').lt('ocorrido_em', (year + 1) + '-01-01T00:00:00')
      ])
      if (!active) return
      if (parcelas.error) { setError(parcelas.error.message); return }
      if (pagamentos.error) { setError(pagamentos.error.message); return }
      setRows((parcelas.data ?? []) as Row[])
      setBaixas((pagamentos.data ?? []) as Baixa[])
    })()
    return () => { active = false }
  }, [kind])

  const metrics = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const due = rows.reduce((sum,row)=>sum+Number(row.saldo || 0),0)
    const overdue = rows.filter(row => new Date(row.vencimento + 'T00:00:00') < now).reduce((sum,row)=>sum+Number(row.saldo || 0),0)
    const monthDue = rows.filter(row => { const d = new Date(row.vencimento + 'T00:00:00'); return d.getUTCFullYear()===currentYear && d.getUTCMonth()+1===currentMonth }).reduce((sum,row)=>sum+Number(row.saldo || 0),0)
    const annualPaid = baixas.reduce((sum,row)=>sum+Number(row.valor || 0),0)
    const monthPaid = baixas.filter(row => { const d=new Date(row.ocorrido_em); return d.getUTCFullYear()===currentYear && d.getUTCMonth()+1===currentMonth }).reduce((sum,row)=>sum+Number(row.valor || 0),0)
    const count = rows.length
    return [
      [`A PAGAR EM ${currentYear}`,due],
      ['VENCIDO',overdue],
      ['VENCIMENTO NO MÊS',monthDue],
      [`PAGAMENTOS ${currentYear}`,annualPaid],
      ['PAGAMENTOS NO MÊS',monthPaid],
      ['TÍTULOS ABERTOS',count],
    ] as const
  },[rows,baixas])

  return <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
    <ERPHeader />
    <div className="border-b border-slate-200 bg-white px-2 py-1">
      <nav className="flex min-h-[30px] items-center gap-1 overflow-x-auto" aria-label="Submódulos financeiros">
        {links.map(([href,label,Icon]) => <CompactButton key={href} type="button" tone={location.pathname === href ? 'primary' : 'default'} onClick={() => navigate(href)} title={label}><Icon size={12}/>{label}</CompactButton>)}
        <CompactButton type="button" tone="orange" title="Scanner de boleto disponível no módulo de títulos"><Camera size={12}/> CÂMERA / CÓDIGO DE BARRAS</CompactButton>
        <CompactButton type="button" title="Leitura de código de barras"><ScanLine size={12}/> LEITURA</CompactButton>
      </nav>
    </div>
    <section className="px-2 pt-2">
      {error ? <div role="alert" className="mb-2 border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-800">{error}</div> : null}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label,value]) => <article key={label} className="border border-slate-200 bg-white px-2 py-1"><span className="block text-[9px] uppercase tracking-wider text-slate-500">{label}</span><strong className="block h-[30px] text-[12px] leading-[30px] text-[#123B50]">{typeof value === 'number' && label !== 'TÍTULOS ABERTOS' ? money(value) : String(value)}</strong></article>)}
      </div>
    </section>
    <FinanceiroTitulos kind={kind} />
  </main>
}