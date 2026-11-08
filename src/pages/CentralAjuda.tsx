/**
 * @AUTOR: FernandoSchui
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-CENTRAL-AJUDA-MERGE-20261108-01 — união do catálogo oficial de telas com a ajuda contextual por rota, sem perder busca, instruções operacionais nem rotas
 * @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-04 ("todas as telas tem que explicar para que serve, como preencher e como usar") + ordem de integração main ↔ prod-telas-novas em 2026-11-08
 */
import { useMemo, useState } from 'react'
import {
  ArrowRight, BookOpen, ChevronDown, ChevronRight, CircleHelp, FileText,
  Package, RotateCcw, Search, ShieldCheck,
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
  const relativa = route.startsWith(pagePrincipalPrefix) ? route.slice(pagePrincipalPrefix.length) : route
  return relativa || '/'
}

function semAcento(texto: string): string {
  return texto.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

function grupoPorModulo(entries: HelpEntry[]): Array<{ module: string; itens: HelpEntry[] }> {
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

export default function CentralAjuda() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState('')
  const current = resolveContextualHelp(pathname)

  // União dos dois catálogos: o verbete oficial fornece finalidade e instruções de
  // preenchimento/uso; a ajuda contextual complementa etapas, campos, botões e avisos.
  const entries = useMemo<HelpEntry[]>(() => {
    const porRota = new Map<string, HelpEntry>()

    for (const { path, intro } of listPageIntros()) {
      const route = routeDaChave(path)
      porRota.set(route, { route, path, intro, contextual: resolveContextualHelp(route) })
    }

    for (const route of contextualHelpRoutes) {
      if (porRota.has(route)) continue
      const contextual = resolveContextualHelp(route)
      porRota.set(route, {
        route,
        path: chaveDaRota(route),
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

    return [...porRota.values()].sort((a, b) => a.intro.title.localeCompare(b.intro.title, 'pt-BR'))
  }, [])

  const termo = semAcento(busca.trim())

  const filtradas = useMemo(() => {
    if (!termo) return entries
    return entries.filter(({ route, path, intro, contextual }) => {
      const texto = semAcento([
        route, path, intro.module, intro.title, intro.description,
        ...(intro.help?.fill ?? []), ...(intro.help?.use ?? []), intro.help?.watch ?? '',
        contextual.purpose, ...contextual.steps, ...contextual.fields,
        ...(contextual.buttons ?? []), ...(contextual.tips ?? []),
      ].join(' '))
      return termo.split(/\s+/).every((palavra) => texto.includes(palavra))
    })
  }, [entries, termo])

  const grupos = useMemo(() => grupoPorModulo(filtradas), [filtradas])

  return <main className="min-h-screen bg-[#F4FBFD] p-4 text-[#123B50] md:p-6">
    <div className="mx-auto max-w-[1240px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CFE1E7] pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">SYSNQRA ERP INDUSTRIAL</p>
          <h1 className="text-xl font-extrabold text-[#123B50]">Central de Ajuda</h1>
          <p className="text-xs text-slate-500">Para que serve cada tela, como preencher e como usar no sistema. {entries.length} telas documentadas e {contextualHelpRoutes.length} rotas com orientação contextual.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2D8DB8]"><BookOpen size={17} /> Guia operacional</div>
      </header>

      <section className="border border-[#CFE1E7] bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#123B50]"><CircleHelp size={16} className="text-[#176487]" /> Ajuda da tela em que você está</h2>
        <p className="mt-2 text-xs font-bold text-[#123B50]">{current.title}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-600">{current.purpose}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-3 inline-flex h-8 items-center gap-1.5 border border-[#CFE1E7] bg-white px-2.5 text-[9px] font-black uppercase text-[#123B50] hover:bg-[#EAF6FA]">Voltar à tela anterior</button>
      </section>

      <section className="flex flex-wrap items-center gap-2 border border-[#CFE1E7] bg-white p-3 shadow-sm">
        <label className="flex min-w-[260px] flex-1 items-center gap-2 border border-[#CFE1E7] bg-[#F8FAFC] px-3">
          <Search size={14} className="shrink-0 text-[#176487]" />
          <span className="sr-only">Pesquisar ajuda por tela ou assunto</span>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar ajuda por tela ou assunto: certificado, RPNC, frete, conciliação…"
            className="h-9 w-full bg-transparent text-xs font-semibold text-[#123B50] outline-none placeholder:text-slate-500"
          />
        </label>
        {busca && <button type="button" onClick={() => setBusca('')} className="inline-flex h-9 items-center gap-1.5 border border-[#CFE1E7] bg-white px-3 text-[10px] font-bold uppercase text-[#123B50] hover:bg-[#EAF6FA]"><RotateCcw size={13} /> Limpar</button>}
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{filtradas.length} de {entries.length} telas</span>
      </section>

      <section className="border border-[#CFE1E7] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-[#123B50]">Como utilizar as telas</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-600">
          <li>Entre com seu usuário autorizado; o sistema valida empresa, perfil e sessão.</li>
          <li>Abra o módulo pelo menu. Em qualquer tela, o assistente de ajuda explica a rotina aberta.</li>
          <li>Pesquise e selecione registros já cadastrados antes de criar ou alterar informações.</li>
          <li>Confira os campos obrigatórios e grave. Em caso de erro, leia a mensagem exibida e corrija o dado.</li>
          <li>Não compartilhe senha, PIN ou sessão. Encerre o acesso ao sair do posto de trabalho.</li>
        </ol>
      </section>

      {filtradas.length === 0 && (
        <section className="border border-dashed border-[#CFE1E7] bg-white p-8 text-center text-xs text-slate-500">
          <CircleHelp size={22} className="mx-auto mb-2 text-[#176487]" />
          Nenhuma tela encontrada para “{busca}”. Tente um termo mais curto, como <em>estoque</em>, <em>qualidade</em> ou <em>nota</em>.
        </section>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.module} className="border border-[#CFE1E7] bg-white shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-[#CFE1E7] bg-[#EAF6FA] px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#123B50]">
            <ShieldCheck size={15} className="text-[#176487]" /> {grupo.module}
            <span className="ml-auto rounded-[2px] bg-white px-1.5 py-0.5 text-[9px] font-black text-slate-600">{grupo.itens.length}</span>
          </h2>
          <div className="divide-y divide-[#CFE1E7]">
            {grupo.itens.map(({ route, intro, contextual }) => {
              const expandido = aberto === route
              const fill = intro.help?.fill ?? []
              const use = intro.help?.use ?? []
              const botoes = contextual.buttons ?? []
              const dicas = contextual.tips ?? []
              return (
                <article key={route}>
                  <div className="flex items-start gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setAberto(expandido ? '' : route)}
                      aria-expanded={expandido}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      {expandido ? <ChevronDown size={15} className="mt-0.5 shrink-0 text-[#176487]" /> : <ChevronRight size={15} className="mt-0.5 shrink-0 text-[#176487]" />}
                      <span className="min-w-0">
                        <strong className="block text-xs font-extrabold text-[#123B50]">{intro.title}</strong>
                        <span className="mt-1 block text-[10px] leading-4 text-slate-600"><strong className="font-bold text-[#176487]">Para que serve:</strong> {intro.description}</span>
                      </span>
                    </button>
                    {contextual.verified
                      ? <span className="mt-0.5 shrink-0 rounded-[2px] bg-[#EAF7EF] px-2 py-1 text-[9px] font-black uppercase text-[#1F7A4D]">Orientação cadastrada</span>
                      : <span className="mt-0.5 shrink-0 rounded-[2px] bg-[#FFF4DF] px-2 py-1 text-[9px] font-black uppercase text-[#9A5B08]">Validar conteúdo</span>}
                    <button type="button" onClick={() => navigate(route)} className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[#2D8DB8] bg-white px-2.5 text-[9px] font-black uppercase text-[#17617A] hover:bg-[#EAF6FA]">
                      Abrir tela <ArrowRight size={12} />
                    </button>
                  </div>
                  {expandido && (
                    <div className="space-y-3 px-4 pb-4">
                      {fill.length > 0 && (
                        <div className="border-l-2 border-[#2D8DB8] bg-[#F8FAFC] p-3">
                          <h3 className="text-[10px] font-black uppercase tracking-wide text-[#176487]">Como preencher</h3>
                          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{fill.map((item) => <li key={item}>{item}</li>)}</ul>
                        </div>
                      )}
                      {use.length > 0 && (
                        <div className="border-l-2 border-[#3A9D78] bg-[#F8FAFC] p-3">
                          <h3 className="text-[10px] font-black uppercase tracking-wide text-[#176487]">Como usar no sistema</h3>
                          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{use.map((item) => <li key={item}>{item}</li>)}</ul>
                        </div>
                      )}
                      {botoes.length > 0 && (
                        <div className="border-l-2 border-[#2D8DB8] bg-[#F8FAFC] p-3">
                          <h3 className="text-[10px] font-black uppercase tracking-wide text-[#176487]">Botões e ações</h3>
                          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-700">{botoes.map((item) => <li key={item}>{item}</li>)}</ul>
                        </div>
                      )}
                      {intro.help?.watch && (
                        <p className="border-l-2 border-[#E6A34A] bg-[#F8FAFC] p-3 text-[10px] leading-4 font-bold text-slate-700">{intro.help.watch}</p>
                      )}
                      {dicas.length > 0 && (
                        <p className="border-l-2 border-[#E6A34A] bg-[#F8FAFC] p-3 text-[10px] leading-4 text-slate-700">{dicas.join(' · ')}</p>
                      )}
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">rota: {route}</p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}

      <section className="flex items-start gap-3 border border-[#CFE1E7] bg-white p-4 shadow-sm">
        <Package size={18} className="mt-0.5 text-[#2D8DB8]" />
        <div>
          <h2 className="text-xs font-bold text-[#123B50]">Dados e segurança</h2>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">Os registros são carregados conforme a sessão, a empresa e as políticas de acesso (RLS) do Supabase. Uma tela sem permissão ou sem conexão não deve ser contornada; solicite ao administrador a liberação adequada. Quando uma rota estiver marcada como “Validar conteúdo”, os campos e ações ainda precisam ser conferidos contra a implementação real antes de serem considerados procedimento oficial.</p>
        </div>
        <FileText size={16} className="ml-auto shrink-0 text-[#2D8DB8]" />
      </section>
    </div>
  </main>
}
