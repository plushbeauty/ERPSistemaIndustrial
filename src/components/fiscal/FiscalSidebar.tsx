import { FileText, LayoutDashboard, Receipt, Settings, ShoppingCart, Truck } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { href: '/fiscal', label: 'Dashboard Fiscal', icon: LayoutDashboard },
  { href: '/fiscal/pendencias', label: 'Pendências', icon: Truck },
  { href: '/fiscal/emissao', label: 'Emissão NF-e', icon: FileText },
  { href: '/fiscal/carteira-nfe', label: 'Carteira NF-e', icon: Receipt },
  { href: '/fiscal/impostos', label: 'Regras tributárias', icon: Settings },
  { href: '/fiscal/compras', label: 'Fiscal de Compras', icon: ShoppingCart },
]

export default function FiscalSidebar() {
  return (
    <nav aria-label="Navegação fiscal" className="flex h-9 w-full items-center gap-1 overflow-x-auto border-b border-slate-300 bg-white px-2">
      <span className="mr-1 shrink-0 px-1 text-[10px] uppercase tracking-wide text-[#123B50]">Fiscal</span>
      {items.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          end={href === '/fiscal'}
          title={label}
          className={({ isActive }) =>
            'flex h-7 shrink-0 items-center gap-1 border px-2 text-[10px] transition-colors ' +
            (isActive
              ? 'border-[#2D8DB8] bg-[#2D8DB8] text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')
          }
        >
          <Icon size={13} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
