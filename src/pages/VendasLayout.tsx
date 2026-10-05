import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PackageSearch,
  PackagePlus,
  RefreshCw,
  Settings2,
  ShoppingCart,
  Tablet,
  Target,
  Users,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useIsMobile } from '../hooks/useIsMobile'
import { useSynqraLayout } from '../layout/SynqraLayoutContext'
import '../styles/premium-workspaces.css'

type SalesNavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

type SalesNavSection = {
  label: string
  items: SalesNavItem[]
}

const sections: SalesNavSection[] = [
  {
    label: 'Visão geral',
    items: [
      { label: 'Dashboard comercial', href: '/vendas/dashboard', icon: LayoutDashboard },
      { label: 'Faturamento', href: '/vendas/dashboard-graficos', icon: BarChart3 },
    ],
  },
  {
    label: 'Operação',
    items: [
      { label: 'Pedidos de venda', href: '/vendas/pedidos', icon: ClipboardList },
      { label: 'Novo pedido', href: '/vendas/novo-pedido', icon: FilePlus2 },
      { label: 'Pedidos pendentes', href: '/vendas/pendentes', icon: ListChecks },
      { label: 'Status do pedido', href: '/vendas/status', icon: ListChecks },
      { label: 'Carteira de pedidos', href: '/vendas/carteira', icon: FolderKanban },
      { label: 'PDV / venda rápida', href: '/vendas/pdv', icon: ShoppingCart },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { label: 'Clientes', href: '/vendas/clientes', icon: Users },
      { label: 'Orçamentos e custos', href: '/vendas/orcamentos', icon: PackageSearch },
      { label: 'Análise de custos', href: '/vendas/analise-custos', icon: PackageSearch },
      { label: 'Metas', href: '/vendas/metas', icon: Target },
      { label: 'Vendedores / comissões', href: '/comissoes/perfil', icon: Users },
      { label: 'Relatórios', href: '/vendas/relatorios', icon: BookOpen },
      { label: 'Cadastro de Produtos', href: '/produtos-vendas', icon: PackagePlus },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { label: 'Catálogo digital', href: '/vendas/catalogo-digital', icon: BookOpen },
      { label: 'Gestão do catálogo', href: '/vendas/catalogo-digital/gestao', icon: BookOpen },
      { label: 'Ajuste global / preços', href: '/vendas/reajuste', icon: Settings2 },
    ],
  },
]

const allItems = sections.flatMap(section => section.items)

export default function VendasLayout({
  children,
  title,
  subtitle,
  onRefresh,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  onRefresh?: () => void
}) {
  const hostedBySynqra = useSynqraLayout()
  const [isTabletMode, setIsTabletMode] = useState(false)
  const isMobile = useIsMobile()
  const tabletMode = isTabletMode || isMobile
  const { pathname } = useLocation()

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  const isActive = (href: string) => {
    if (href === '/vendas/dashboard') return pathname === '/vendas' || pathname === '/vendas/dashboard'
    if (href === '/vendas/pedidos') return pathname === '/vendas/pedidos' || pathname.startsWith('/vendas/pedido/')
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderNav = (compact = false) => (
    <nav className={compact ? 'sales-mobile-nav' : 'sales-sidebar-nav'} aria-label="Navegação de vendas">
      {compact
        ? allItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            )
          })
        : sections.map(section => (
            <div className="sales-nav-section" key={section.label}>
              <div className="sales-nav-section-label">{section.label}</div>
              {section.items.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={`sales-nav-link${active ? ' is-active' : ''}`}>
                    <Icon size={16} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))
      }
    </nav>
  )

  if (hostedBySynqra) {
    return (
      <div className="synqra-sales-layout">
        <header className="synqra-sales-heading">
          <div>
            <p>Vendas</p>
            <h1>{title}</h1>
            {subtitle && <span>{subtitle}</span>}
          </div>
          {onRefresh && (
            <button type="button" onClick={onRefresh} className="synqra-sales-refresh" title="Atualizar" aria-label="Atualizar">
              <RefreshCw size={15} />
            </button>
          )}
        </header>
        <div className="synqra-sales-nav-wrap">{renderNav(true)}</div>
        <div className="synqra-sales-content">{children}</div>
      </div>
    )
  }

  return (
    <div className={`sales-shell${tabletMode ? ' tablet-mode' : ''}`}>
      <main className={`sales-main${tabletMode ? ' tablet-main' : ''}`}>
        <header className="sales-topbar">
          <div className="sales-topbar-title">
            <span>VENDAS</span>
            <strong>{title}</strong>
            {subtitle && <small>{subtitle}</small>}
          </div>
          <div className="sales-topbar-actions">
            <button
              type="button"
              onClick={() => {
                setIsTabletMode(true)
                document.documentElement.classList.add('tablet-mode')
                if (window.location.pathname !== '/erp-industrial') window.location.assign('/erp-industrial')
              }}
              className="sales-topbar-button"
              title="Abrir modo touch"
              aria-label="Abrir modo touch"
            >
              <Tablet size={15} />
              <span>Touch</span>
            </button>
            {onRefresh && (
              <button type="button" onClick={onRefresh} className="sales-topbar-button" title="Atualizar" aria-label="Atualizar">
                <RefreshCw size={15} />
              </button>
            )}
            <button type="button" onClick={() => void logout()} className="sales-topbar-button" title="Sair">
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <div className="sales-global-nav">{renderNav(true)}</div>

        <div className="sales-content">{children}</div>
      </main>
    </div>
  )
}
