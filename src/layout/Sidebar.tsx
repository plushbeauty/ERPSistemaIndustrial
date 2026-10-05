import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import synqraLogo from '../assets/synqra/logo-synqra.png'

export default function Sidebar() {
  const { isExpanded, isMobileOpen, closeMobileSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const current = [...SYNQRA_MODULES]
    .filter(module => module.route)
    .sort((left, right) => (right.route?.length ?? 0) - (left.route?.length ?? 0))
    .find(module => location.pathname === module.route || location.pathname.startsWith(`${module.route}/`))

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          className="synqra-sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label="Fechar navegação"
        />
      )}
      <aside
        className={`synqra-sidebar${isExpanded ? ' is-expanded' : ' is-collapsed'}${isMobileOpen ? ' is-mobile-open' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="synqra-sidebar-brand">
          <img src={synqraLogo} alt="SYNQRA ERP & SGQ Industrial" />
        </div>
        <p className="synqra-sidebar-caption">MÓDULOS</p>
        <nav className="synqra-sidebar-nav" aria-label="Módulos do ERP">
          {SYNQRA_MODULES.map(({ key, label, route, Icon }) => {
            const active = current?.key === key
            return (
              <button
                key={key}
                type="button"
                className={`synqra-sidebar-link${active ? ' is-active' : ''}`}
                disabled={!route}
                aria-current={active ? 'page' : undefined}
                title={!isExpanded ? label : !route ? `${label} — sem rota operacional cadastrada` : undefined}
                onClick={() => {
                  if (!route) return
                  navigate(route)
                  closeMobileSidebar()
                }}
              >
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                <span className="synqra-sidebar-link-label">{label}</span>
                {!route && <span className="synqra-sidebar-unavailable" aria-label="Sem rota">•</span>}
              </button>
            )
          })}
        </nav>
        <div className="synqra-sidebar-footer">
          <span className="synqra-slashes" aria-hidden="true"><i /><i /><i /></span>
          <span className="synqra-sidebar-footer-copy">ERP & SGQ INDUSTRIAL</span>
        </div>
      </aside>
    </>
  )
}
