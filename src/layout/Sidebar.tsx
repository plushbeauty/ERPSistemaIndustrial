import { useState } from 'react'
import { Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'
import { SYNQRA_MODULES } from '../assets/synqra/icons'
import synqraLogo from '../assets/synqra/logo-synqra.png'

type MenuItem = { label: string; route: string }

const submodules: Record<string, MenuItem[]> = {
  vendas: [
    { label: 'Painel de vendas', route: '/vendas/tablet' },
    { label: 'Pedidos de venda', route: '/vendas/pedidos' },
    { label: 'Novo pedido', route: '/vendas/novo-pedido' },
    { label: 'Carteira de pedidos', route: '/vendas/carteira' },
  ],
  compras: [
    { label: 'Cotações / RFQ', route: '/compras/rfq' },
    { label: 'Pedidos de compra', route: '/compras/pedido' },
    { label: 'Recebimento de materiais', route: '/compras/recebimentos' },
  ],
  qualidade: [
    { label: 'Central de Qualidade', route: '/qualidade' },
    { label: 'Especificações técnicas', route: '/qualidade/especificacoes' },
    { label: 'Inspeções de lotes', route: '/qualidade/inspecoes' },
    { label: 'Matriz FMEA / PFMEA', route: '/qualidade/fmea' },
    { label: 'RNC e planos CAPA', route: '/qualidade/rnc-capa' },
    { label: 'Painel CEP / medições', route: '/qualidade/cep' },
  ],
  engenharia: [
    { label: 'Engenharia', route: '/engenharia' },
    { label: 'Catálogo de itens', route: '/engenharia/produtos' },
    { label: 'Estrutura BOM', route: '/engenharia/bom' },
    { label: 'Roteiros de fabricação', route: '/engenharia/roteiros' },
  ],
  estoque: [
    { label: 'Visão geral do estoque', route: '/estoque' },
    { label: 'Saldos por lote', route: '/estoque/saldos' },
    { label: 'Endereços físicos', route: '/estoque/enderecos' },
    { label: 'Movimentações', route: '/estoque/movimentacoes' },
  ],
  pcp: [
    { label: 'Painel PCP', route: '/pcp' },
    { label: 'Ordens industriais', route: '/pcp/ordens-industriais' },
    { label: 'Apontamentos', route: '/pcp/apontamentos' },
    { label: 'Planejamento MRP', route: '/pcp/planejamento' },
    { label: 'Indicadores OEE', route: '/pcp/dashboard-oee' },
  ],
  fiscal: [
    { label: 'Painel fiscal', route: '/fiscal' },
    { label: 'Parâmetros tributários', route: '/fiscal/parametros' },
    { label: 'NF-e de entrada', route: '/compras/recebimentos' },
    { label: 'Emissão NF-e', route: '/fiscal/emissao' },
  ],
  rh: [
    { label: 'Painel de RH', route: '/rh' },
    { label: 'Funcionários', route: '/rh/funcionarios' },
    { label: 'Turnos e escalas', route: '/rh/turnos' },
    { label: 'EPIs e validade CA', route: '/rh/epis' },
    { label: 'Entregas de EPI', route: '/rh/epis/entregas' },
  ],
}

const childKeys = new Set([
  'eng-produtos', 'eng-bom', 'eng-roteiros',
  'wms-enderecos', 'wms-movimentacoes',
  'sgq-especificacoes', 'sgq-inspecoes', 'sgq-fmea', 'sgq-rnc-capa', 'sgq-cep',
  'pcp-ordens-industriais', 'pcp-apontamentos-industriais',
  'fiscal-parametros-industriais', 'fiscal-nfe-entradas',
  'rh-funcionarios-industriais', 'rh-turnos-industriais', 'rh-epis-industriais',
])

export default function Sidebar() {
  const { isExpanded, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(112)

  const modules = SYNQRA_MODULES.filter(module => module.route && !childKeys.has(module.key))
  const current = [...SYNQRA_MODULES]
    .filter(module => module.route)
    .sort((left, right) => (right.route?.length ?? 0) - (left.route?.length ?? 0))
    .find(module => location.pathname === module.route || location.pathname.startsWith(`${module.route}/`))

  const openModule = modules.find(module => module.key === openKey)
  const flyoutItems: MenuItem[] = openModule
    ? (submodules[openModule.key] ?? [{ label: `Abrir ${openModule.label}`, route: openModule.route! }])
    : []

  const goTo = (route: string) => {
    navigate(route)
    setOpenKey(null)
    closeMobileSidebar()
  }

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
        aria-label="Navegação principal do SYSNQRA ERP & SGQ INDUSTRIAL"
      >
        <div className="synqra-sidebar-brand" title="SYSNQRA ERP & SGQ INDUSTRIAL">
          <img src={synqraLogo} alt="SYSNQRA ERP & SGQ INDUSTRIAL" />
        </div>
        <nav className="synqra-sidebar-nav" aria-label="Módulos do ERP">
          {modules.map(({ key, label, route, Icon }) => {
            const active = current?.key === key || Boolean(route && location.pathname.startsWith(route + '/'))
            const expanded = openKey === key
            return (
              <button
                key={key}
                type="button"
                className={`synqra-sidebar-link${active ? ' is-active' : ''}${expanded ? ' is-menu-open' : ''}`}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={expanded}
                title={label}
                onClick={() => {
                  setOpenKey(value => value === key ? null : key)
                }}
              >
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                <span className="synqra-sidebar-link-label">{label}</span>
              </button>
            )
          })}
        </nav>
        {openModule && (
          <section className="synqra-sidebar-flyout" style={{ top: flyoutTop }} aria-label={`Menu ${openModule.label}`} role="menu">
            <div className="synqra-sidebar-flyout-heading">
              <strong>{openModule.label}</strong>
              <button type="button" onClick={() => setOpenKey(null)} aria-label="Fechar submenu" title="Fechar submenu">×</button>
            </div>
            {flyoutItems.map(item => {
              const active = location.pathname === item.route
              return (
                <button
                  key={item.route}
                  type="button"
                  role="menuitem"
                  className={`synqra-sidebar-flyout-item${active ? ' is-active' : ''}`}
                  onClick={() => goTo(item.route)}
                  title={item.label}
                >
                  <span>{item.label}</span>
                </button>
              )
            })}
          </section>
        )}
        <div className="synqra-sidebar-footer" title="SYSNQRA ERP & SGQ INDUSTRIAL">
          <span className="synqra-slashes" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </aside>
    </>
  )
}
