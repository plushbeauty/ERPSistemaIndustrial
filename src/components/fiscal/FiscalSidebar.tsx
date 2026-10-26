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
    <nav aria-label="Navegação fiscal" className="fiscal-module-nav">
      <span className="fiscal-module-label">Fiscal</span>
      {items.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          end={href === '/fiscal'}
          title={label}
          className={({ isActive }) => 'fiscal-module-link' + (isActive ? ' active' : '')}
        >
          <Icon size={13} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
      <style>{`.fiscal-module-nav{display:flex;align-items:center;gap:5px;width:100%;min-height:48px;overflow-x:auto;padding:6px 8px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.04)}.fiscal-module-label{flex:none;padding:0 6px;color:#64748b;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.fiscal-module-link{display:inline-flex;flex:none;align-items:center;gap:6px;height:34px;padding:0 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:#52677f;font-size:10px;font-weight:750;text-decoration:none;white-space:nowrap;transition:background .14s,color .14s}.fiscal-module-link:hover{background:#f1f5f9;color:#173452}.fiscal-module-link.active{border-color:#0b2545;background:#0b2545;color:#fff;box-shadow:0 2px 5px rgba(11,37,69,.2)}.fiscal-module-link:focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}`}</style>
    </nav>
  )
}
