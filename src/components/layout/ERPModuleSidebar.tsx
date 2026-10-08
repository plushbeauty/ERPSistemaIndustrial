import { useState } from 'react'
import { BarChart3, Boxes, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Database, Factory, FilePlus2, PackageSearch, Settings2, ShoppingCart, Users, Wrench } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

type Props = { className?: string }

const salesItems = [
  { label: 'Dashboard comercial', route: '/vendas' },
  { label: 'Pedidos de venda', route: '/vendas/pedidos' },
  { label: 'Novo pedido', route: '/vendas/novo-pedido' },
  { label: 'Pedidos pendentes', route: '/vendas/pendentes' },
  { label: 'Status do pedido', route: '/vendas/status' },
  { label: 'Carteira de pedidos', route: '/vendas/carteira' },
  { label: 'PDV / venda rápida', route: '/vendas/pdv' },
]

const modules = [
  { label: 'Cadastro', route: '/produtos-vendas', icon: Database },
  { label: 'Vendas', route: '/vendas', icon: ShoppingCart, submenu: salesItems },
  { label: 'Compras', route: '/compras', icon: PackageSearch },
  { label: 'Estoque', route: '/estoque', icon: Boxes },
  { label: 'Financeiro', route: '/financeiro', icon: BarChart3 },
  { label: 'Fiscal', route: '/fiscal', icon: FilePlus2 },
  { label: 'PCP', route: '/pcp', icon: Factory },
  { label: 'Qualidade', route: '/qualidade', icon: ClipboardCheck },
  { label: 'Manutenção', route: '/manutencao', icon: Wrench },
  { label: 'Configurações', route: '/configuracoes-adm', icon: Settings2 },
  { label: 'Usuários', route: '/usuarios-admin', icon: Users },
] as const

export default function ERPModuleSidebar({ className = '' }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(true)
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith('/vendas'))

  return (
    <aside className={`erp-module-sidebar ${open ? 'is-open' : 'is-collapsed'} ${className}`} aria-label="Menu principal do ERP">
      <button
        type="button"
        className="erp-module-sidebar-toggle"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        title={open ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      >
        {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      <nav className="erp-module-sidebar-nav">
        {modules.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.route)
          const hasSubmenu = 'submenu' in item
          return (
            <div key={item.label} className="erp-module-sidebar-group">
              <button
                type="button"
                className={`erp-module-sidebar-item ${active ? 'is-active' : ''}`}
                onClick={() => {
                  if (hasSubmenu && open) {
                    setSalesOpen(value => !value)
                    return
                  }
                  navigate(item.route)
                }}
                title={open ? item.label : `Abrir ${item.label}`}
              >
                <Icon size={20} strokeWidth={1.9} />
                {open && <span>{item.label}</span>}
                {open && hasSubmenu && <ChevronDown className={`erp-module-sidebar-expand ${salesOpen ? 'is-open' : ''}`} size={16} />}
              </button>

              {open && hasSubmenu && salesOpen && (
                <div className="erp-module-sidebar-submenu">
                  {item.submenu.map(sub => (
                    <button
                      key={sub.route}
                      type="button"
                      className={`erp-module-sidebar-subitem ${pathname === sub.route ? 'is-active' : ''}`}
                      onClick={() => navigate(sub.route)}
                    >
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
