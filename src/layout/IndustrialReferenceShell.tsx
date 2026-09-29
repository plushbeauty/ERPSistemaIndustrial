import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, LogOut, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export type IndustrialReferenceNavItem = {
  id: string
  label: string
  icon: LucideIcon
}

type Props = {
  moduleLabel: string
  title: string
  nav: readonly IndustrialReferenceNavItem[]
  activeId: string
  onNav: (id: string) => void
  onHome: () => void
  children: ReactNode
  actions?: ReactNode
}

export default function IndustrialReferenceShell({
  moduleLabel,
  title,
  nav,
  activeId,
  onNav,
  onHome,
  children,
  actions,
}: Props) {
  const [operator, setOperator] = useState('Administrador')
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!alive || !auth.user) return
      const { data } = await supabase
        .from('erp_usuarios')
        .select('nome')
        .eq('auth_user_id', auth.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (alive && data?.nome) setOperator(data.nome)
    })()

    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans antialiased text-slate-800">
      <aside className="fixed z-30 flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 shadow-2xl">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center space-x-3 border-b border-slate-800 p-6 text-left"
          aria-label="Voltar à Mesa de Ícones"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 text-sm font-black text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
            SQ
          </div>
          <div>
            <span className="block text-base font-black tracking-tight text-white">SGQERP</span>
            <span className="-mt-1 block text-[10px] font-bold uppercase tracking-widest text-cyan-400">Industrial</span>
          </div>
        </button>

        <div className="px-4 pb-3 pl-6 pt-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {moduleLabel}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4" aria-label={moduleLabel}>
          {nav.map(({ id, label, icon: Icon }) => {
            const active = activeId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNav(id)}
                className={[
                  'group flex w-full items-center justify-between rounded-xl border p-3 text-left font-semibold transition-all',
                  active
                    ? 'border-blue-400/30 bg-blue-600 font-bold text-white shadow-lg shadow-blue-950/30'
                    : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center space-x-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 via-blue-700 to-indigo-950 text-white shadow-[0_4px_10px_rgba(15,23,42,.55),inset_0_1px_1px_rgba(255,255,255,.35)]">
                    <Icon size={16} className="text-current" />
                  </span>
                  <span>{label}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-80" />
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={onHome}
          className="mx-4 mb-3 flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-black text-white hover:bg-slate-700"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Mesa de Ícones
        </button>

        <div className="flex items-center justify-between border-t border-slate-800 p-4 pl-6 font-mono text-[10px] text-slate-400">
          <span>SUPABASE CONNECTED</span>
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        </div>
      </aside>

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between border-b border-slate-200/60 bg-white/90 px-8 py-4 shadow-sm backdrop-blur-md">
          <div className="flex min-w-0 items-center space-x-2 text-sm font-bold text-slate-400">
            <button type="button" onClick={onHome} className="hover:text-blue-700">
              Mesa de Ícones
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-slate-800">{title}</span>
          </div>
          <div className="flex items-center space-x-4">
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            <div className="hidden text-right text-[10px] font-bold leading-tight text-slate-400 lg:block">
              <div>{clock.toLocaleDateString('pt-BR')}</div>
              <div>{clock.toLocaleTimeString('pt-BR')}</div>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
              <User className="h-3.5 w-3.5 text-blue-900" />
              <span>Operador: <strong className="text-slate-700">{operator}</strong></span>
            </div>
            <button
              type="button"
              title="Sair"
              onClick={() => void supabase.auth.signOut().then(() => { window.location.href = '/login' })}
              className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-6 border-b border-slate-200/60 pb-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">ERP INDUSTRIAL • {moduleLabel}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
