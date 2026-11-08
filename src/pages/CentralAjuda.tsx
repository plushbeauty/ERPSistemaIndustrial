/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-CENTRAL-AJUDA-MERGE-20261108-01 — une o catálogo oficial de telas
 * com a ajuda contextual da main, sem perder busca, instruções operacionais ou rotas.
 * @STATUS: INTEGRAÇÃO DAS DUAS LINHAGENS — preserva o visual atual do SYSNQRA.
 */
import { useMemo, useState } from 'react'
import {
  ArrowRight, BookOpen, ChevronDown, ChevronRight, CircleHelp,
  RotateCcw, Search, ShieldCheck,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listPageIntros } from '../components/layout/pageIntroCatalog'
import type { PageIntro } from '../components/layout/PageIntroCard'
import { contextualHelpRoutes, resolveContextualHelp } from '../help/contextualHelpCatalog'

const pagePrincipalPrefix = '/pageprincipal'

type HelpEntry = {
  route: string
  path: string
  intro: PageIntro
  contextual: ReturnType<typeof resolveContextualHelp>
}

function routeDaChave(path: string): string {
  return path === '/' ? pagePrincipalPrefix : `${pagePrincipalPrefix}${path}`
}

function chaveDaRota(route: string): string {
  const relative = route.startsWith(pagePrincipalPrefix)
    ? route.slice(pagePrincipalPrefix.length)
    : route
  return relative || '/'
}

function grupoPorModulo(entries: HelpEntry[]) {
  const mapa = new Map<string, HelpEntry[]>()
  for (const entry of entries) {
    const modulo = entry.intro.module?.trim() || 'SYSNQRA ERP'
    const lista = mapa.get(modulo)
    if (lista) lista.push(entry)
    else mapa.set(modulo, [entry])
  }
  return [...mapa.entries()]
    .map(([module, itens]) => ({ module, itens }))
    .sort((a, b) => a.module.localeCompare(b.module, 'pt-BR'))
}

function normalizarBusca(value: string): string {
  return value.normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export default function CentralAjuda() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState('')

  // União dos dois catálogos: o verbete oficial fornece finalidade e instruções
  // de preenchimento/uso; o catálogo contextual complementa etapas, campos,
  // botões e avisos de validação. Nenhuma das duas fontes é descartada.
  const entries = useMemo<HelpEntry[]>(() => {
    const byRoute = new Map<string, HelpEntry>()

    for (const { path, intro } of listPageIntros()) {
      const route = routeDaChave(path)
      byRoute.set(route, {
        route,
        path,
        intro,
        contextual: resolveContextualHelp(route),
      })
    }

    for (const route of contextualHelpRoutes) {
      if (byRoute.has(route)) continue
      const contextual = resolveContextualHelp(route)
      const path = chaveDaRota(route)
      byRoute.set(route, {
        route,
        path,
        contextual,
        intro: {
          module: 'SYSNQRA ERP',
          title: contextual.title,
          description: contextual.purpose,
          help: {
            fill: contextual.fields,
            use: contextual.steps,
            watch: contextual.tips?.join(' '),
          },
        },
      })
    }

    return [...byRoute.values()].sort((a, b) =>
      a.intro.title.localeCompare(b.intro.title, 'pt-BR'))
  }, [])

  const termo = normalizarBusca(busca.trim())
  const filtradas = useMemo(() => {
    if (!termo) return entries
    return entries.filter(({ route, path, intro, contextual }) => {
      const texto = normalizarBusca([
        route, path, intro.module, intro.title, intro.description,
        ...(intro.help?.fill ?? []), ...(intro.help?.use ?? []),
        intro.help?.watch ?? '', contextual.purpose,
        ...contextual.steps, ...contextual.fields,
        ...(contextual.buttons ?? []), ...(contextual.tips ?? []),
      ].join(' '))
      return termo.split(/\\s+/).every((palavra) => texto.includes(palavra))
    })
  }, [entries, termo])

  const grupos = useMemo(() => grupoPorModulo(filtradas), [filtradas])
  const current = resolveContextualHelp(pathname)

  return (
    <main className="min-h-full space-y-4 bg-[#F2F7F9] p-4 text-[#123B50] md:p-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5E1E6] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9A7937]">SYSNQRA ERP INDUSTRIAL</p>
            <h1 className="text-xl font-extrabold text-[#123B50]">Central de Ajuda</h1>
            <p className="text-xs text-slate-600">Finalidade, preenchimento, passo a passo e ações de cada rotina. {entries.length} telas indexadas.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#123B50]"><BookOpen size={17} /> Guia operacional contextual</div>
        </header>

        <section className="erp-card space-y-3 p-4">
          <div className="flex items-center gap-2">
            <CircleHelp size={18} className="text-[#9A7937]" />
            <h2 className="text-sm font-bold text-[#123B50]">Ajuda da tela em que você está</h2>
            {current.verified
              ? <span className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Orientação cadastrada</span>
              : <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Validar conteúdo</span>}
          </div>
          <p className="text-sm font-bold text-[#123B50]">{current.title}</p>
          <p className="text-xs leading-5 text-slate-600">{current.purpose}</p>
          <button type="button" onClick={() => navigate(-1)} className="rounded border border-[#C7D4DA] px-3 py-2 text-xs font-semibold text-[#123B50] hover:bg-[#F2F7F9]">Voltar à tela anterior</button>
        </section>

        <section className="erp-card flex flex-wrap items-center gap-2 p-3">
          <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded border border-[#D5E1E6] bg-white px-3">
            <Search size={14} className="shrink-0 text-[#9A7937]" />
            <span className="sr-only">Buscar tela na ajuda</span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por tela ou assunto: certificado, refugo, saldo, NF-e..."
              className="h-9 w-full bg-transparent text-xs font-semibold text-[#123B50] outline-none placeholder:text-slate-500"
            />
          </label>
          {busca && (
            <button type="button" onClick={() => setBusca('')} className="inline-flex h-9 items-center gap-1.5 rounded border border-[#D5E1E6] bg-white px-3 text-[10px] font-bold uppercase text-[#123B50] hover:bg-[#F2F7F9]">
              <RotateCcw size={13} /> Limpar
            </button>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{filtradas.length} de {entries.length} telas</span>
        </section>

        <section className="erp-card space-y-2 p-4">
          <h2 className="text-sm font-extrabold text-[#123B50]">Como utilizar as telas</h2>
          <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-600">
            <li>Entre com seu usuário autorizado; o sistema valida empresa, perfil e sessão.</li>
            <li>Abra o módulo pelo menu. Use a ajuda contextual para consultar a orientação da tela atual.</li>
            <li>Pesquise registros existentes antes de criar ou alterar informações.</li>
            <li>Confira campos obrigatórios, permissões e mensagens antes de gravar.</li>
            <li>Não compartilhe senha, PIN ou sessão; encerre o acesso ao sair do posto de trabalho.</li>
          </ol>
        </section>

        {filtradas.length === 0 && (
          <section className="erp-card border-dashed p-8 text-center text-xs text-slate-500">
            <CircleHelp size={22} className="mx-auto mb-2 text-[#9A7937]" />
            Nenhuma tela encontrada para “{busca}”. Tente um termo mais curto, como estoque, qualidade ou nota.
          </section>
        )}

        {grupos.map((grupo) => (
          <section key={grupo.module} className="erp-card overflow-hidden">
            <h2 className="flex items-center gap-2 border-b border-[#D5E1E6] bg-[#E9EFF2] px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#123B50]">
              <ShieldCheck size={15} className="text-[#9A7937]" /> {grupo.module}
              <span className="ml-auto rounded bg-white px-1.5 py-0.5 text-[9px] font-black text-slate-600">{grupo.itens.length}</span>
            </h2>
            <div className="divide-y divide-[#E1E8EB]">
              {grupo.itens.map(({ route, intro, contextual }) => {
                const expandido = aberto === route
                const fill = intro.help?.fill ?? []
                const use = intro.help?.use ?? []
                return (
                  <article key={route}>
                    <div className="flex items-start gap-2 px-4 py-3">
                      <button type="button" onClick={() => setAberto(expandido ? '' : route)} aria-expanded={expandido} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                        {expandido ? <ChevronDown size={15} className="mt-0.5 shrink-0 text-[#9A7937]" /> : <ChevronRight size={15} className="mt-0.5 shrink-0 text-[#9A7937]" />}
                        <span className="min-w-0">
                          <strong className="block text-xs font-extrabold text-[#123B50]">{intro.title}</strong>
                          <span className="mt-1 block text-[10px] leading-4 text-slate-600"><strong className="font-bold text-[#526A76]">Para que serve:</strong> {intro.description}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => navigate(route)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-[#C7D4DA] bg-white px-2.5 text-[9px] font-black uppercase text-[#123B50] hover:bg-[#F2F7F9]">
                        Abrir tela <ArrowRight size={12} />
                      </button>
                    </div>
                    {expandido && (
                      <div className="space-y-3 px-4 pb-4">
                        {fill.length > 0 && (
                          <div className="rounded border-l-2 border-[#9A7937] bg-[#F7F9FA] p-3">
                            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#526A76]">Como preencher</h3>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{fill.map((item) => <li key={item}>{item}</li>)}</ul>
                          </div>
                        )}
                        {use.length > 0 && (
                          <div className="rounded border-l-2 border-[#526A76] bg-[#F7F9FA] p-3">
                            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#526A76]">Como usar no sistema</h3>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{use.map((item) => <li key={item}>{item}</li>)}</ul>
                          </div>
                        )}
                        {contextual.steps.length > 0 && (
                          <div className="rounded border-l-2 border-[#9A7937] bg-[#F7F9FA] p-3">
                            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#526A76]">Passo a passo contextual</h3>
                            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{contextual.steps.map((item) => <li key={item}>{item}</li>)}</ol>
                          </div>
                        )}
                        {contextual.fields.length > 0 && (
                          <div className="rounded border-l-2 border-[#526A76] bg-[#F7F9FA] p-3">
                            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#526A76]">Campos e informações</h3>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{contextual.fields.map((item) => <li key={item}>{item}</li>)}</ul>
                          </div>
                        )}
                        {(contextual.buttons?.length ?? 0) > 0 && (
                          <div className="rounded border-l-2 border-[#526A76] bg-[#F7F9FA] p-3">
                            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#526A76]">Ações disponíveis</h3>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{contextual.buttons?.map((item) => <li key={item}>{item}</li>)}</ul>
                          </div>
                        )}
                        {contextual.tips?.map((item) => <p key={item} className="rounded border-l-2 border-amber-500 bg-[#FFF9ED] p-3 text-[10px] leading-4 font-semibold text-slate-700">{item}</p>)}
                        {intro.help?.watch && <p className="rounded border-l-2 border-amber-500 bg-[#FFF9ED] p-3 text-[10px] leading-4 font-semibold text-slate-700">{intro.help.watch}</p>}
                        {!contextual.verified && <p className="text-[10px] font-bold text-amber-700">Orientação pendente de validação técnica. Confirme os campos e ações na implementação real antes de tratá-la como procedimento oficial.</p>}
                        <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">rota: {route}</p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ))}

        <section className="erp-card flex items-start gap-3 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#9A7937]" />
          <div>
            <h2 className="text-xs font-bold text-[#123B50]">Dados, segurança e qualidade da orientação</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">Os registros respeitam a sessão, a empresa ativa e as políticas RLS do Supabase. A ajuda não substitui permissões. Conteúdos marcados como pendentes precisam ser conferidos contra a implementação real; nunca utilize dados fictícios nem execute ações irreversíveis sem autorização.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
