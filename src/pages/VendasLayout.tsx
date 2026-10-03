import { useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, ClipboardList, FilePlus2, ListChecks, LogOut, Mail, RefreshCw, Settings, Tablet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const menu = [
  { label: 'Dashboard Comercial', href: '/vendas', icon: BarChart3 },
  { label: 'Novo Pedido de Venda', href: '/vendas/novo-pedido', icon: FilePlus2 },
  { label: 'Análise de Orçamentos', href: '/vendas/orcamentos', icon: ClipboardList },
  { label: 'Pedidos Pendentes', href: '/vendas/pendentes', icon: ListChecks },
  { label: 'Ajuste Global', href: '/vendas/reajuste', icon: Settings },
]

export default function VendasLayout({ children, title, subtitle, onRefresh }: { children: ReactNode; title: string; subtitle?: string; onRefresh?: () => void }) {
  const [tablet, setTablet] = useState(false)
  const [mailBusy, setMailBusy] = useState(false)
  const [mailMessage, setMailMessage] = useState('')
  const path = window.location.pathname

  const importEmail = async () => {
    setMailBusy(true); setMailMessage('')
    try {
      const result = await supabase.functions.invoke('vendas-importar-email', { body: { action: 'drafts' } })
      if (result.error) throw result.error
      const count = Number((result.data as { imported?: number } | null)?.imported ?? 0)
      setMailMessage(count ? `${count} rascunho(s) importado(s).` : 'Nenhum novo pedido de e-mail encontrado.')
    } catch (e) {
      setMailMessage(e instanceof Error ? e.message : 'Serviço de importação de e-mail indisponível.')
    } finally { setMailBusy(false) }
  }

  const logout = async () => { await supabase.auth.signOut(); window.location.assign('/login') }

  return (
    <div className={`min-h-screen bg-[#F4F7FE] text-[#123B50] ${tablet ? 'vendas-tablet' : ''}`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 bg-[#212529] text-slate-200 lg:flex lg:flex-col">
        <div className="border-b border-slate-700 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#48B7C7]">ERP Industrial</div>
          <div className="mt-1 text-[13px] font-semibold text-white">Módulo de Vendas</div>
        </div>
        <nav className="flex-1 px-2 py-2">
          {menu.map(item => { const Icon=item.icon; const active=path===item.href; return <button key={item.href} type="button" onClick={()=>window.location.assign(item.href)} className={`mb-1 flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[11px] ${active?'bg-[#3A9D78] text-white':'text-slate-300 hover:bg-slate-700'}`}><Icon size={14}/>{item.label}</button> })}
        </nav>
        <div className="border-t border-slate-700 p-2 text-[9px] text-slate-400">Vendas • Estoque • PCP • Expedição • Fiscal</div>
      </aside>

      <main className="min-w-0 lg:ml-56">
        <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-[#212529] px-3 text-white">
          <div className="truncate text-[12px] font-semibold">{title}<span className="ml-2 text-[10px] font-normal text-slate-400">{subtitle ?? ''}</span></div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={()=>setTablet(v=>!v)} className="flex h-7 items-center gap-1 rounded border border-slate-500 px-2 text-[10px]" title="Alternar modo touch"><Tablet size={13}/>TABLET</button>
            <button type="button" onClick={()=>void importEmail()} disabled={mailBusy} className="flex h-7 items-center gap-1 rounded border border-slate-500 px-2 text-[10px]" title="Importar pedidos do serviço de e-mail"><Mail size={13}/>IMPORTAR E-MAIL</button>
            {onRefresh && <button type="button" onClick={onRefresh} className="flex h-7 items-center rounded border border-slate-500 px-2" title="Atualizar"><RefreshCw size={13}/></button>}
            <button type="button" onClick={()=>void logout()} className="flex h-7 items-center gap-1 rounded border border-slate-500 px-2 text-[10px]" title="Sair"><LogOut size={13}/>SAIR</button>
          </div>
        </header>
        {mailMessage && <div className="mx-3 mt-2 border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700">{mailMessage}</div>}
        <div className="p-3 lg:p-4">{children}</div>
      </main>
      <style>{`
        .vendas-tablet input,.vendas-tablet select,.vendas-tablet button{min-height:34px}
        .vendas-tablet table td,.vendas-tablet table th{padding-top:8px;padding-bottom:8px}
      `}</style>
    </div>
  )
}
