import { useLocation, useNavigate } from 'react-router-dom'
import { Boxes, ClipboardCheck, PackageMinus, PackagePlus, Warehouse } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import CompactButton from '../components/ui/CompactButton'
import EstoqueAlmoxarifado from './EstoqueAlmoxarifado'

const modules = [
  ['/estoque/saldos','SALDOS',Boxes],
  ['/estoque/ajustes','AJUSTES',PackagePlus],
  ['/estoque/separacao','SEPARAÇÃO',PackageMinus],
  ['/estoque/recebimento-lotes','RECEBIMENTO',Warehouse],
  ['/estoque/curva-abc','CURVA ABC',ClipboardCheck],
] as const

export default function EstoqueAlmoxarifadoCompact() {
  const location = useLocation()
  const navigate = useNavigate()
  return <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
    <ERPHeader />
    <div className="border-b border-slate-200 bg-white px-2 py-1">
      <nav className="flex min-h-[30px] items-center gap-1 overflow-x-auto" aria-label="Submódulos de estoque">
        {modules.map(([href,label,Icon]) => <CompactButton key={href} type="button" tone={location.pathname === href ? 'primary' : 'default'} onClick={() => navigate(href)} title={label}><Icon size={12}/>{label}</CompactButton>)}
      </nav>
    </div>
    <EstoqueAlmoxarifado />
  </main>
}