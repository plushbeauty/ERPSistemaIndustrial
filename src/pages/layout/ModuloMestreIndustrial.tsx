/**
 * ERPSis — CENTRAL MESTRE INDUSTRIAL
 * Data: 2026-10-16 | Revisão: REV-066
 * Escopo: centralizar acesso aos módulos operacionais existentes de Compras, PCP e Qualidade.
 * Segurança: não grava dados; cada ação abre a tela real que mantém suas validações, RPCs e permissões.
 */
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Factory, ShoppingCart, ArrowUpRight } from 'lucide-react'

const modules = [
  {
    id: 'compras',
    title: 'Compras / Suprimentos',
    description: 'Pedidos, requisições, cotações e recebimentos no fluxo operacional existente.',
    route: '/compras',
    icon: ShoppingCart,
  },
  {
    id: 'pcp',
    title: 'PCP / Manufatura',
    description: 'Planejamento, ordens de produção, capacidade e apontamentos.',
    route: '/pcp/ordens',
    icon: Factory,
  },
  {
    id: 'qualidade',
    title: 'Qualidade / SGQ',
    description: 'Inspeções, RNC/CAPA, documentos controlados e quarentena.',
    route: '/qualidade',
    icon: ClipboardCheck,
  },
] as const

export default function ModuloMestreIndustrial() {
  const navigate = useNavigate()

  return (
    <main className="min-h-full bg-[#f4f6f9] p-3 text-slate-800 sm:p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-slate-900 px-3 py-3 text-white rounded-[2px]">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-300">ERPSis Industrial</p>
          <h1 className="mt-1 text-sm font-extrabold uppercase tracking-wide">Central Mestre — Compras, PCP e Qualidade</h1>
        </div>
        <span className="text-[10px] font-semibold text-slate-300">Acesso aos fluxos operacionais reais</span>
      </header>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3" aria-label="Módulos industriais">
        {modules.map(({ id, title, description, route, icon: Icon }) => (
          <article key={id} className="flex min-w-0 flex-col border border-slate-300 bg-white p-3 shadow-sm rounded-[2px]">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-sky-200 bg-sky-50 text-[#2D8DB8] rounded-[2px]">
                <Icon size={16} aria-hidden="true" />
              </span>
              <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">{title}</h2>
            </div>
            <p className="flex-1 text-xs leading-5 text-slate-600">{description}</p>
            <button
              type="button"
              onClick={() => navigate(route)}
              className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#23769b] focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              Abrir módulo <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </article>
        ))}
      </section>

      <p className="mt-3 border border-slate-200 bg-white px-3 py-2 text-[10px] leading-4 text-slate-600 rounded-[2px]">
        Esta central não simula gravações nem substitui os formulários existentes. As operações são executadas nas telas de cada módulo, respeitando a sessão, as permissões e a persistência já implementadas.
      </p>
    </main>
  )
}
