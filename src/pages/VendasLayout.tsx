import { useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, ClipboardList, FilePlus2, ListChecks, LogOut, RefreshCw, Settings, Tablet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useIsMobile } from '../hooks/useIsMobile'

const menu = [
  { label: 'Dashboard Comercial', href: '/vendas', icon: BarChart3 },
  { label: 'Novo Pedido de Venda', href: '/vendas/novo-pedido', icon: FilePlus2 },
  { label: 'Análise de Orçamentos', href: '/vendas/orcamentos', icon: ClipboardList },
  { label: 'Pedidos Pendentes', href: '/vendas/pendentes', icon: ListChecks },
  { label: 'Ajuste Global', href: '/vendas/reajuste', icon: Settings },
]

export default function VendasLayout({ children, title, subtitle, onRefresh }: { children: ReactNode; title: string; subtitle?: string; onRefresh?: () => void }) {
  const [isTabletMode, setIsTabletMode] = useState(false)
  const isMobile = useIsMobile()
  const tabletMode = isTabletMode || isMobile
  const path = window.location.pathname
  const logout = async () => { await supabase.auth.signOut(); window.location.assign('/login') }

  return (
    <div className={`erp-global-density min-h-screen bg-slate-50 text-gray-800 ${tabletMode ? 'tablet-mode' : ''}`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-gray-200 bg-slate-100 text-gray-700 lg:flex lg:flex-col">
        <div className="border-b border-gray-200 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700">ERP Industrial</div>
          <div className="mt-1 text-[13px] font-semibold text-gray-800">Módulo de Vendas</div>
        </div>
        <nav className="flex-1 px-2 py-2">
          {menu.map(item => { const Icon=item.icon; const active=path===item.href; return <button key={item.href} type="button" onClick={()=>window.location.assign(item.href)} className={`mb-1 flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left text-[11px] ${active?'font-bold text-blue-700':'text-gray-700 hover:bg-white'}`}><Icon size={14}/>{item.label}</button> })}
        </nav>
        <div className="border-t border-gray-200 p-2 text-[9px] text-gray-500">Vendas • Estoque • PCP • Expedição • Fiscal</div>
      </aside>

      <main className={`min-w-0 ${tabletMode ? 'ml-0' : 'lg:ml-56'}`}>
        <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3 text-gray-800">
          <div className="truncate text-[12px] font-semibold">{title}<span className="ml-2 text-[10px] font-normal text-gray-500">{subtitle ?? ''}</span></div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={()=>{setIsTabletMode(true);document.documentElement.classList.add('tablet-mode');if(window.location.pathname!=='/erp-industrial')window.location.assign('/erp-industrial')}} className="flex h-7 items-center gap-1 rounded border border-gray-200 px-2 text-[10px]" title="Alternar modo touch"><Tablet size={13}/>TABLET</button>
            {onRefresh && <button type="button" onClick={onRefresh} className="flex h-7 items-center rounded border border-slate-500 px-2" title="Atualizar"><RefreshCw size={13}/></button>}
            <button type="button" onClick={()=>void logout()} className="flex h-7 items-center gap-1 rounded border border-slate-500 px-2 text-[10px]" title="Sair"><LogOut size={13}/>SAIR</button>
          </div>
        </header>
        <div className="p-3 lg:p-4">{children}</div>
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
