/**
 * SYNQRA ERP — MOLDURA MESTRE DA INTERFACE INDUSTRIAL (SHELL)
 * REVISÃO: 1.2 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-SHELL-20261016-04
 * ESCOPO: Correção de desalinhamento e padronização visual premium baseada no ecossistema LaraERP.
 * ALTERAÇÃO: Removidas bordas duplicadas, unificados os paddings das tabelas e inputs (Edits h-8),
 *            e adicionada a folha de auditoria e rastreamento imutável no topo do arquivo.
 */

/**
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-PADRAO-COR-CLARO-20261104-01 — shell convertido do tema escuro para o padrao industrial claro (trilho navy #123B50 com texto claro, area de conteudo #F4FBFD); nenhuma alteracao de logica ou de consulta
 * @AUTOR: Fernando Schuinsekel
 * @STATUS_APROVACAO: PADRAO UNICO DE COR APLICADO POR ORDEM DO PROPRIETARIO EM 2026-11-04
 */

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
    <div className="synqra-reference-page p-4 bg-[#F4F7FE]">
      <header className="synqra-reference-heading border-b border-slate-200 pb-4 mb-4 flex items-center justify-between">
        <div className="synqra-reference-title">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">ERP INDUSTRIAL • {moduleLabel}</p>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">{title}</h1>
        </div>
        {actions && <div className="synqra-reference-actions flex items-center gap-2">{actions}</div>}
      </header>
      <div className="synqra-reference-body">
        <div className="synqra-reference-content">{children}</div>
      </div>
    </div>
  )

  if (hostedBySynqra) return pageContent

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans antialiased text-slate-800">
      {/* MENU LATERAL ESQUERDO (ASIDE) — Alinhamento Premium LaraERP */}
      <aside className="fixed z-30 flex h-full w-64 flex-col border-r border-[#2D8DB8]/30 bg-[#123B50] text-white shadow-2xl">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center justify-center border-b border-[#2D8DB8]/30 p-5 text-left transition-all hover:bg-[#176487]"
          aria-label="Voltar à Mesa de Ícones"
        >
          <img
            src="/logo/logo.png"
            alt="ERP Industrial"
            className="h-9 w-[140px] shrink-0 object-contain"
          />
        </button>

        <div className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/70 border-b border-[#2D8DB8]/30 bg-[#2D8DB8]/10">
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
                  'group flex w-full items-center justify-between rounded-[4px] px-4 py-2.5 text-xs font-bold transition-all duration-150',
                  active
                    ? 'bg-[#2D8DB8] font-extrabold text-white shadow-md shadow-blue-950/20'
                    : 'text-white/80 hover:bg-[#176487] hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center space-x-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-[2px] transition-all ${active ? 'bg-white/20 text-white' : 'bg-[#2D8DB8]/20 text-white/70 group-hover:text-white'}`}>
                    <Icon size={14} className="text-current" />
                  </span>
                  <span className="tracking-wide">{label}</span>
                </span>
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-150 ${active ? 'opacity-100 translate-x-0.5' : 'opacity-30 group-hover:opacity-70'}`} />
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[#2D8DB8]/30 bg-[#2D8DB8]/10">
          <button
            type="button"
            onClick={onHome}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] text-xs font-bold text-white shadow-sm transition-all hover:bg-[#236F91] hover:text-white active:scale-[0.98]"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180 text-white" />
            Mesa de Ícones
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-[#2D8DB8]/30 px-6 py-3 font-mono text-[9px] font-bold text-white/70 bg-[#2D8DB8]/10">
          <span>SUPABASE CONNECTED</span>
          <span className="h-1.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </div>
      </aside>

      {/* PAINEL DE CONTEÚDO PRINCIPAL (DIREITA) */}
      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        {/* BARRA DE NAVEGAÇÃO SUPERIOR (STICKY NAVBAR) */}
        <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 py-3 shadow-sm backdrop-blur-md">
          <div className="flex min-w-0 items-center space-x-2 text-xs font-bold text-slate-400">
            <button type="button" onClick={onHome} className="transition-colors hover:text-[#2D8DB8]">
              Mesa de Ícones
            </button>
            <ChevronRight className="h-3 w-3 text-slate-500" />
            <span className="truncate text-slate-700 font-semibold">{title}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            
            <button 
              type="button" 
              title="Abrir Tablet operacional" 
              onClick={() => { window.location.href = '/tablet/dashboard' }} 
              className="inline-flex h-8 items-center gap-2 rounded-[2px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Tablet className="h-3.5 w-3.5 text-slate-400" /> 
              TABLET
            </button>

            <div className="hidden text-right text-[10px] font-bold leading-tight text-slate-400 border-l border-slate-200 pl-3 md:block">
              <div className="text-slate-600">{clock.toLocaleDateString('pt-BR')}</div>
              <div className="text-slate-400 font-mono mt-0.5">{clock.toLocaleTimeString('pt-BR')}</div>
            </div>

            <div className="flex h-8 items-center space-x-2 rounded-[2px] border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Op: <strong className="text-slate-800 font-black">{operator}</strong></span>
            </div>

            <button
              type="button"
              title="Sair do Sistema"
              onClick={() => void supabase.auth.signOut().then(() => { window.location.href = '/login' })}
              className="flex h-8 w-8 items-center justify-center rounded-[2px] text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* CONTAINER DO PROJETO - Renderização Simétrica dos Módulos */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F4F7FE]">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-4 border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#2D8DB8]">ERP INDUSTRIAL • {moduleLabel}</p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-900">{title}</h1>
              </div>
            </div>
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
