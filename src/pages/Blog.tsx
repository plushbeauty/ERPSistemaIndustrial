/**
 * @DATA_REVISAO: 2026-10-18
 * @ESCOPO: Portal de Conhecimento e POPs industriais
 * @STATUS: IMPLEMENTAÇÃO PARCIAL — depende da migration e validação autenticada.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Factory,
  Filter,
  Package,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Article = {
  id: string
  category: string
  title: string
  excerpt: string
  content: string[]
  created_at: string
}

const icons: Record<string, typeof Factory> = {
  'PCP / MRP': Factory,
  Estoque: Package,
  Qualidade: ShieldCheck,
  Produção: Boxes,
  Custos: BarChart3,
  Manutenção: Wrench,
  Tecnologia: Factory,
  Fiscal: BookOpen,
  Gestão: BarChart3,
}

export default function Blog() {
  const [category, setCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Article | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    const fetchArticles = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
        if (sessionError) throw sessionError
        if (!sessionData.user) throw new Error('AUTH_SESSION_REQUIRED')

        const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
        if (companyError) throw companyError
        if (typeof companyId !== 'string' || !companyId.trim()) {
          throw new Error('TENANT_CONTEXT_REQUIRED')
        }

        const { data, error } = await supabase
          .from('erp_portal_conhecimento')
          .select('id, category, title, excerpt, content, created_at')
          .eq('empresa_id', companyId)
          .eq('status', 'publicado')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (active) setArticles((data ?? []) as Article[])
      } catch (error) {
        if (!active) return
        setArticles([])
        const code = error instanceof Error ? error.message : ''
        setErrorMessage(
          code === 'AUTH_SESSION_REQUIRED'
            ? 'Entre no sistema para consultar os procedimentos da sua empresa.'
            : code === 'TENANT_CONTEXT_REQUIRED'
              ? 'Não foi possível identificar a empresa da sessão. Verifique o vínculo do usuário.'
              : 'Não foi possível carregar a biblioteca. Confirme se a migration do portal foi aplicada e tente novamente.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchArticles()
    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(articles.map((article) => article.category)))],
    [articles],
  )

  const visibleArticles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('pt-BR')
    return articles.filter((article) => {
      const matchesCategory = category === 'Todos' || article.category === category
      const matchesSearch =
        !query ||
        article.title.toLocaleLowerCase('pt-BR').includes(query) ||
        article.excerpt.toLocaleLowerCase('pt-BR').includes(query) ||
        article.category.toLocaleLowerCase('pt-BR').includes(query)
      return matchesCategory && matchesSearch
    })
  }, [articles, category, searchQuery])

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 font-sans text-[#123B50] antialiased sm:p-4">
      <div className="mx-auto max-w-[1500px] space-y-3">
        <section className="rounded border border-slate-700 bg-[#123B50] p-4 text-white shadow-sm sm:p-6">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
            SGQ · Capacitação operacional
          </span>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            Portal de Conhecimento e POPs Industriais
          </h1>
          <p className="mt-1.5 max-w-3xl text-[11px] font-medium leading-relaxed text-cyan-50/80">
            Manuais de chão de fábrica, instruções de processo, roteiros de qualidade e orientações de
            compliance — consultados a partir da biblioteca publicada para a empresa autenticada.
          </p>
        </section>

        <section className="grid grid-cols-1 items-center gap-2 rounded border border-slate-200 bg-white p-2.5 shadow-sm md:grid-cols-12">
          <label className="flex h-8 min-w-0 items-center gap-2 rounded border border-slate-300 bg-white px-2 md:col-span-8">
            <Search size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Pesquisar procedimentos</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Pesquisar por título, categoria ou palavra-chave..."
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[11px] font-medium outline-none placeholder:text-slate-400 focus:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                aria-label="Limpar pesquisa"
              >
                <X size={12} />
              </button>
            )}
          </label>
          <div className="flex h-8 items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold text-slate-500 md:col-span-4">
            <span className="flex items-center gap-1.5"><Filter size={11} /> Artigos publicados</span>
            <span className="tabular-nums">{loading ? '—' : visibleArticles.length}</span>
          </div>
        </section>

        <section className="flex gap-1 overflow-x-auto rounded border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Filtrar por categoria">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`h-6 shrink-0 rounded border px-3 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                category === item
                  ? 'border-[#123B50] bg-[#123B50] text-white'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            <div className="col-span-full rounded border border-slate-200 bg-white p-10 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400" role="status">
              Carregando biblioteca do Supabase...
            </div>
          ) : errorMessage ? (
            <div className="col-span-full rounded border border-amber-200 bg-amber-50 p-5 text-[11px] font-medium text-amber-900" role="alert">
              {errorMessage}
            </div>
          ) : (
            <>
              {visibleArticles.map((article) => {
                const Icon = icons[article.category] ?? Factory
                return (
                  <article key={article.id} className="flex min-w-0 flex-col justify-between rounded border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="max-w-[80%] truncate rounded border border-sky-100 bg-sky-50 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-sky-700">
                          {article.category}
                        </span>
                        <Icon size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                      </div>
                      <h2 className="line-clamp-2 min-h-8 text-[11px] font-bold uppercase leading-tight tracking-wide text-slate-800">
                        {article.title}
                      </h2>
                      <p className="line-clamp-3 min-h-12 text-[10px] font-medium leading-relaxed text-slate-500">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="mt-2 flex justify-end border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setSelected(article)}
                        className="flex h-7 items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2.5 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        Ler instrução <ArrowRight size={11} />
                      </button>
                    </div>
                  </article>
                )
              })}
              {!visibleArticles.length && (
                <div className="col-span-full rounded border border-dashed border-slate-300 bg-white p-10 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nenhum artigo publicado corresponde aos filtros.
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null)
          }}
        >
          <article
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-article-title"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-3 py-2 text-white">
              <div className="min-w-0 space-y-1">
                <span className="inline-block max-w-full truncate rounded bg-sky-900 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-wide text-cyan-200">
                  {selected.category}
                </span>
                <h2 id="portal-article-title" className="truncate text-[11px] font-bold uppercase tracking-wide">
                  {selected.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
                aria-label="Fechar artigo"
              >
                <X size={14} />
              </button>
            </header>
            <div className="space-y-3 p-4 text-xs font-medium leading-relaxed text-slate-600">
              <p className="rounded-r border-l-2 border-sky-600 bg-slate-50 py-2 pl-2 text-[11px] font-bold text-slate-800">
                RESUMO: {selected.excerpt}
              </p>
              <div className="space-y-2.5">
                {selected.content.map((paragraph, index) => (
                  <p key={`${selected.id}-paragraph-${index}`}>{paragraph}</p>
                ))}
              </div>
              <div className="flex justify-start border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex h-7 items-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <ArrowLeft size={12} /> Voltar à biblioteca
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </main>
  )
}
