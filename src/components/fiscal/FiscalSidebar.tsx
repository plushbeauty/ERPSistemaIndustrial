import { FileText, LayoutDashboard, Receipt, Settings, Truck } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { href: '/fiscal', label: 'Dashboard Fiscal', icon: LayoutDashboard },
  { href: '/fiscal/pendencias', label: 'Pendências', icon: Truck },
  { href: '/fiscal/emissao', label: 'Emissão NF-e', icon: FileText },
  { href: '/fiscal/carteira-nfe', label: 'Carteira NF-e', icon: Receipt },
  { href: '/fiscal/impostos', label: 'Regras tributárias', icon: Settings },
]

export default function FiscalSidebar() {
  return <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-3 lg:w-64 lg:border-b-0 lg:border-r">
    <div className="mb-3 px-2 text-sm font-black uppercase tracking-wide text-slate-950">Fiscal Central</div>
    <nav aria-label="Navegação fiscal" className="grid gap-1">
      {items.map(({ href, label, icon: Icon }) => <NavLink
        key={href}
        to={href}
        end={href === '/fiscal'}
        className={({ isActive }) => 'flex min-h-9 items-center gap-2 rounded-sm border px-2 text-left text-sm font-medium ' + (isActive ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-transparent text-slate-700 hover:bg-slate-50')}
      >
        <Icon size={16} aria-hidden="true" /><span>{label}</span>
      </NavLink>)}
    </nav>
  </aside>
}
