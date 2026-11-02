import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, LogOut, User, Tablet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useSynqraLayout } from './SynqraLayoutContext'

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
  const hostedBySynqra = useSynqraLayout()
  const [operator, setOperator] = useState('Administrador')
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    if (hostedBySynqra) return
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
  }, [hostedBySynqra])

  const pageContent = (
    <div className="synqra-reference-page min-h-screen bg-[#f5f7fb] text-slate-800 antialiased">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <img src="/logo/logo.png" alt="SYNQRA" className="h-12 w-auto object-contain" />
            <div className="leading-none">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">ERP & SGQ INDUSTRIAL</div>
              <div className="mt-1 text-[28px] font-black tracking-[-0.06em] text-slate-900">SYNQRA</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
              {clock.toLocaleDateString('pt-BR')}
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm font-mono">
              {clock.toLocaleTimeString('pt-BR')}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>{operator}</span>
            </div>
            <button
              type="button"
              title="Sair do Sistema"
              onClick={() => void supabase.auth.signOut().then(() => { window.location.href = '/login' })}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">ERP INDUSTRIAL • {moduleLabel}</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">{title}</h1>
        </div>

        <div className="space-y-4">{children}</div>
      </main>
    </div>
  )

  if (hostedBySynqra) return pageContent

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans antialiased text-slate-800">
      <aside className="fixed z-30 flex h-full w-64 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-xl">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center justify-center border-b border-slate-200 p-5 text-left transition-all hover:bg-slate-50"
          aria-label="Voltar à Mesa de Ícones"
        >
          <img src="/logo/logo.png" alt="ERP Industrial" className="h-9 w-[140px] shrink-0 object-contain" />
        </button>

        <div className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 border-b border-slate-200 bg-slate-50">
          {moduleLabel}
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label={moduleLabel}>
          {nav.map(({ id, label, icon: Icon }) => {
            const active = activeId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNav(id)}
                className={[
                  'group flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150',
                  active
                    ? 'bg-sky-600 font-extrabold text-white shadow-md shadow-sky-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
              >
                <span className="flex items-center space-x-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg transition-all ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'}`}>
                    <Icon size={14} className="text-current" />
                  </span>
                  <span className="tracking-wide">{label}</span>
                </span>
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-150 ${active ? 'opacity-100 translate-x-0.5' : 'opacity-30 group-hover:opacity-70'}`} />
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onHome}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180 text-slate-400" />
            Mesa de Ícones
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 font-mono text-[9px] font-bold text-slate-500 bg-slate-50">
          <span>SUPABASE CONNECTED</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </div>
      </aside>

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur-md">
          <div className="flex min-w-0 items-center space-x-2 text-xs font-bold text-slate-400">
            <button type="button" onClick={onHome} className="transition-colors hover:text-sky-600">
              Mesa de Ícones
            </button>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="truncate text-slate-700 font-semibold">{title}</span>
          </div>

          <div className="flex items-center space-x-3">
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}

            <button
              type="button"
              title="Abrir Tablet operacional"
              onClick={() => { window.location.href = '/tablet/dashboard' }}
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
            >
              <Tablet className="h-3.5 w-3.5 text-slate-400" />
              TABLET
            </button>

            <div className="hidden text-right text-[10px] font-bold leading-tight text-slate-400 border-l border-slate-200 pl-3 md:block">
              <div className="text-slate-600">{clock.toLocaleDateString('pt-BR')}</div>
              <div className="text-slate-400 font-mono mt-0.5">{clock.toLocaleTimeString('pt-BR')}</div>
            </div>

            <div className="flex h-8 items-center space-x-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Op: <strong className="text-slate-800 font-black">{operator}</strong></span>
            </div>

            <button
              type="button"
              title="Sair do Sistema"
              onClick={() => void supabase.auth.signOut().then(() => { window.location.href = '/login' })}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 border border-slate-200 bg-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F5F7FB] p-6">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">ERP INDUSTRIAL • {moduleLabel}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
            </div>
            <div className="w-full">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}

