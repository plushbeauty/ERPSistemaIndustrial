import { useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, ClipboardList, FilePlus2, ListChecks, LogOut, RefreshCw, Settings, Tablet } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useIsMobile } from '../hooks/useIsMobile'
import { useSynqraLayout } from '../layout/SynqraLayoutContext'
import '../styles/premium-workspaces.css'

const menu = [
  { label: 'Dashboard Comercial', href: '/vendas/dashboard', icon: BarChart3 },
  { label: 'Dashboard de faturamento', href: '/vendas/dashboard-graficos', icon: BarChart3 },
  { label: 'Pedidos de venda', href: '/vendas/pedidos', icon: ClipboardList },
  { label: 'Novo Pedido de Venda', href: '/vendas/novo-pedido', icon: FilePlus2 },
  { label: 'Análise de Orçamentos', href: '/vendas/orcamentos', icon: ClipboardList },
  { label: 'Pedidos Pendentes', href: '/vendas/pendentes', icon: ListChecks },
  { label: 'Ajuste Global', href: '/vendas/reajuste', icon: Settings },
]

export default function VendasLayout({ children, title, subtitle, onRefresh }: { children: ReactNode; title: string; subtitle?: string; onRefresh?: () => void }) {
  const hostedBySynqra = useSynqraLayout()
  const [isTabletMode, setIsTabletMode] = useState(false)
  const isMobile = useIsMobile()
  const tabletMode = isTabletMode || isMobile
  const { pathname } = useLocation()
  const logout = async () => { await supabase.auth.signOut(); window.location.assign('/login') }
  const isActive = (href: string) => pathname === href
    || (href !== '/vendas/dashboard' && pathname.startsWith(href + '/'))
    || (href === '/vendas/dashboard' && pathname === '/vendas')
    || (href === '/vendas/pedidos' && (pathname.startsWith('/vendas/pedido/') || pathname === '/vendas/carteira'))

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
              <RefreshCw size={16} />
            </button>
          )}
        </header>
        <nav className="synqra-sales-nav" aria-label="Navegação de vendas">
          {menu.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}><Icon size={16}/>{item.label}</Link>
          })}
        </nav>
        <div className="synqra-sales-content">{children}</div>
      </div>
    )
  }

  return (
    <div className={`sales-shell min-h-screen bg-[#f5f8fa] text-slate-800 ${tabletMode ? 'tablet-mode' : ''}`}>
      <aside className="sales-sidebar fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-slate-200 bg-white text-slate-700 lg:flex lg:flex-col">
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="sales-brand-mark">E</span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">ERP Industrial</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-800">Workspace comercial</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegação de vendas">
          {menu.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
              || (item.href !== '/vendas/dashboard' && pathname.startsWith(item.href + '/'))
              || (item.href === '/vendas/dashboard' && pathname === '/vendas')
              || (item.href === '/vendas/pedidos' && pathname.startsWith('/vendas/pedido/'))
            return <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={`sales-nav-link${active ? ' is-active' : ''}`}><Icon size={17}/>{item.label}</Link>
          })}
        </nav>
        <div className="border-t border-slate-100 p-4 text-[10px] leading-relaxed text-slate-400">Comercial integrado a Estoque, PCP, Expedição e Fiscal.</div>
      </aside>

      <main className={`min-w-0 ${tabletMode ? 'ml-0' : 'lg:ml-60'}`}>
        <header className="sales-topbar sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 text-slate-800 lg:px-7">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={()=>{setIsTabletMode(true);document.documentElement.classList.add('tablet-mode');if(window.location.pathname!=='/erp-industrial')window.location.assign('/erp-industrial')}} className="sales-topbar-button hidden sm:inline-flex" title="Alternar modo touch"><Tablet size={15}/> Touch</button>
            {onRefresh && <button type="button" onClick={onRefresh} className="sales-topbar-button" title="Atualizar" aria-label="Atualizar"><RefreshCw size={15}/></button>}
            <button type="button" onClick={()=>void logout()} className="sales-topbar-button" title="Sair"><LogOut size={15}/><span className="hidden sm:inline">Sair</span></button>
          </div>
        </header>
        <nav className="sales-mobile-nav lg:hidden" aria-label="Navegação de vendas">
          {menu.slice(0, 3).map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}><Icon size={15}/>{item.label}</Link>
          })}
        </nav>
        <div className="px-3 py-5 sm:px-5 lg:px-8">{children}</div>
      </main>
      <style>{`
        .tablet-mode aside{display:none !important}
        .tablet-mode{font-size:14px}
        .tablet-mode input,.tablet-mode select,.tablet-mode button{min-height:40px;padding-top:8px;padding-bottom:8px}
        .tablet-mode table td,.tablet-mode table th{padding-top:8px;padding-bottom:8px}
        .tablet-mode .tablet-hide-column{display:none !important}
      `}</style>
    </div>
  )
}
