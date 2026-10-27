/**
 * SYSNQRA ERP INDUSTRIAL — PAGE PRINCIPAL
 * @REVISAO 27/10/2026
 * @STATUS BASE DE NAVEGACAO PADRONIZADA
 * Shell de entrada das telas operacionais. Não cria dados fictícios nem altera o banco.
 */
import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, Gauge, ReceiptText } from 'lucide-react'

const links = [
  { to: '/pageprincipal', label: 'Painel principal', description: 'Indicadores industriais', Icon: Gauge, end: true },
  { to: '/pageprincipal/cadastros', label: 'Cadastros', description: 'Produtos, clientes e fornecedores', Icon: Boxes, end: false },
  { to: '/fiscal', label: 'Fiscal', description: 'Central fiscal aprovada', Icon: ReceiptText, end: false },
]

export default function PagePrincipal() {
  return (
    <main className="min-h-screen bg-[#f4f8fa] p-3 text-slate-900 md:p-5">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className="overflow-hidden rounded-xl bg-[#123b50] px-5 py-4 text-white shadow-sm md:px-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-cyan-200">SYSNQRA ERP INDUSTRIAL</p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight md:text-2xl">Page Principal</h1>
              <p className="mt-1 text-xs text-slate-200">Ambiente centralizado para abrir e organizar as telas do ERP.</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-md border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-[10px] font-bold text-amber-200">Atualizado · Padrão Premium · 27/10/2026</span>
          </div>
        </header>
        <nav aria-label="Navegação principal do ERP" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {links.map(({ to, label, description, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              `group flex min-h-[76px] items-center gap-3 rounded-xl border p-3 transition ${isActive ? 'border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`
            }>
              {({ isActive }) => <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}><Icon size={19}/></span>
                <span className="min-w-0"><span className="block text-xs font-extrabold">{label}</span><span className="mt-1 block text-[11px] text-slate-500">{description}</span></span>
                {isActive && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Tela selecionada"/>}
              </>}
            </NavLink>
          ))}
        </nav>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm md:p-3">
          <Outlet />
        </section>
      </div>
    </main>
  )
}
