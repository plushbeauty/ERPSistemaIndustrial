import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, CreditCard, FileSpreadsheet, ScanLine, Wallet, CalendarRange } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import CompactButton from '../components/ui/CompactButton'
import FinanceiroTitulos from './FinanceiroTitulos'

const links = [
  ['/financeiro/contas-pagar','CONTAS A PAGAR',CreditCard],
  ['/financeiro/caixa','CAIXA',Wallet],
  ['/financeiro/fluxo-caixa','FLUXO DE CAIXA',CalendarRange],
  ['/financeiro/reconciliacao','CONCILIAÇÃO',FileSpreadsheet],
] as const

export default function FinancasContasPagar() {
  const location = useLocation()
  const navigate = useNavigate()
  return <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
    <ERPHeader />
    <div className="border-b border-slate-200 bg-white px-2 py-1">
      <nav className="flex min-h-[30px] items-center gap-1 overflow-x-auto" aria-label="Submódulos financeiros">
        {links.map(([href,label,Icon]) => <CompactButton key={href} type="button" tone={location.pathname === href ? 'primary' : 'default'} onClick={() => navigate(href)} title={label}><Icon size={12}/>{label}</CompactButton>)}
        <CompactButton type="button" tone="orange" title="Scanner de boleto disponível no módulo de títulos"><Camera size={12}/> CÂMERA / CÓDIGO DE BARRAS</CompactButton>
        <CompactButton type="button" title="Leitura de código de barras"><ScanLine size={12}/> LEITURA</CompactButton>
      </nav>
    </div>
    <FinanceiroTitulos kind="PAGAR" />
  </main>
}