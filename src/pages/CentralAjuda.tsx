import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CircleHelp, Search, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { contextualHelpRoutes, resolveContextualHelp } from '../help/contextualHelpCatalog'

export default function CentralAjuda() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const entries = useMemo(() => contextualHelpRoutes
    .map(route => ({ route, help: resolveContextualHelp(route) }))
    .sort((a, b) => a.help.title.localeCompare(b.help.title, 'pt-BR')), [])
  const filtered = entries.filter(({ route, help }) =>
    !query.trim() || [route, help.title, help.purpose, ...help.steps, ...help.fields]
      .join(' ').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
  const current = resolveContextualHelp(pathname)

  return <main className="space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c9dde5] pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">SYSNQRA ERP INDUSTRIAL</p>
        <h1 className="text-xl font-extrabold text-[#123B50]">Central de Ajuda</h1>
        <p className="text-xs text-slate-500">Encontre a finalidade da rotina, o passo a passo, os campos e as ações disponíveis.</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[#2D8DB8]"><BookOpen size={17}/> Guia operacional contextual</div>
    </header>

    <section className="erp-card space-y-3 p-4">
      <div className="flex items-center gap-2"><CircleHelp size={18} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold text-[#123B50]">Ajuda da tela em que você está</h2></div>
      <p className="text-sm font-bold text-[#123B50]">{current.title}</p>
      <p className="text-xs leading-5 text-slate-600">{current.purpose}</p>
      <button type="button" onClick={() => navigate(-1)} className="rounded border border-[#b9d4df] px-3 py-2 text-xs font-semibold text-[#123B50] hover:bg-[#F4FBFD]">Voltar à tela anterior</button>
    </section>

    <section className="erp-card space-y-3 p-4">
      <div className="flex items-center gap-2"><Search size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold text-[#123B50]">Pesquisar ajuda por tela ou assunto</h2></div>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: RPNC, frete, máquina, nota fiscal, conciliação..." aria-label="Pesquisar na Central de Ajuda" className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2D8DB8]"/>
      <p className="text-[11px] text-slate-500">{filtered.length} rotinas no catálogo contextual. Abra uma rotina para acessar sua tela.</p>
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map(({ route, help }) => <article key={route} className="erp-card flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-bold text-[#123B50]">{help.title}</h2>
          {help.verified
            ? <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Orientação cadastrada</span>
            : <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Validar conteúdo</span>}
        </div>
        <p className="flex-1 text-xs leading-5 text-slate-600">{help.purpose}</p>
        <p className="truncate text-[10px] text-slate-400" title={route}>{route}</p>
        <button type="button" onClick={() => navigate(route)} className="flex items-center justify-between rounded border border-[#b9d4df] px-3 py-2 text-xs font-semibold text-[#123B50] hover:bg-[#F4FBFD]">
          Abrir tela <ArrowRight size={14}/>
        </button>
      </article>)}
    </section>

    <section className="erp-card flex items-start gap-3 p-4">
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#2D8DB8]"/>
      <div><h2 className="text-xs font-bold text-[#123B50]">Segurança e qualidade da orientação</h2>
        <p className="mt-1 text-[10px] leading-4 text-slate-600">A ajuda explica o processo sem substituir permissões do sistema. Quando uma rotina estiver marcada como “Validar conteúdo”, os campos e ações ainda precisam ser conferidos contra a implementação real antes de serem considerados procedimento oficial. Nunca informe dados fictícios nem execute ações irreversíveis sem autorização.</p>
      </div>
    </section>
  </main>
}
