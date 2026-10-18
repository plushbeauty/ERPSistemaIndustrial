/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO_APROVACAO: CATALOGO-UI-001
 * @STATUS_APROVACAO: GESTAO-CATALOGO-UI-ALINHADA
 * @ESCOPO: KPIs, filtros compactos, tabela responsiva e status visuais.
 * @REGRA: manter Supabase real, isolamento por empresa e gravação existente.
 */
import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, EyeOff, Layers, Save, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Product = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  preco_venda: number | null
  foto_url: string | null
  catalogo_disponivel: boolean
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export default function VendasCatalogoDigitalGestao() {
  const [rows, setRows] = useState<Product[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [companyId, setCompanyId] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa não identificada.')
      }

      const currentCompanyId = String(company.data)
      const products = await fetchAllPages<Product>((from, to) =>
        supabase
          .from('erp_produtos')
          .select('id,codigo,nome,descricao,preco_venda,foto_url,catalogo_disponivel', { count: 'exact' })
          .eq('empresa_id', currentCompanyId)
          .eq('ativo', true)
          .order('codigo')
          .range(from, to),
      )

      setCompanyId(currentCompanyId)
      setRows(products)
      setSelected(Object.fromEntries(products.map((product) => [product.id, product.catalogo_disponivel === true])))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o catálogo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(
      (product) =>
        !term ||
        product.codigo.toLocaleLowerCase('pt-BR').includes(term) ||
        product.nome.toLocaleLowerCase('pt-BR').includes(term),
    )
  }, [query, rows])

  const kpis = useMemo(
    () => ({
      total: rows.length,
      published: rows.filter((product) => selected[product.id] === true).length,
      withPhoto: rows.filter((product) => Boolean(product.foto_url)).length,
    }),
    [rows, selected],
  )

  const save = async () => {
    if (!companyId || saving || busy) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const changes = rows.filter(
        (product) => Boolean(selected[product.id]) !== (product.catalogo_disponivel === true),
      )
      for (const product of changes) {
        const result = await supabase
          .from('erp_produtos')
          .update({ catalogo_disponivel: Boolean(selected[product.id]) })
          .eq('id', product.id)
          .eq('empresa_id', companyId)
        if (result.error) throw result.error
      }
      setRows((current) =>
        current.map((product) => ({
          ...product,
          catalogo_disponivel: Boolean(selected[product.id]),
        })),
      )
      setMessage(
        changes.length
          ? `${changes.length} produto(s) atualizado(s) no catálogo.`
          : 'Nenhuma alteração pendente. O catálogo já está sincronizado.',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o catálogo.')
      // Recarrega a fonte real para refletir eventual sucesso parcial sem exibir estado falso.
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendasLayout
      title="Gestão do Catálogo Digital"
      subtitle="Controle de visibilidade pública e publicação de produtos"
      onRefresh={() => void load()}
    >
      <main className="sales-workspace sales-detail space-y-3 p-1 text-[11px]">
        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            <span><strong>Erro operacional:</strong> {error}</span>
            <button type="button" aria-label="Fechar aviso de erro" onClick={() => setError('')} className="shrink-0">
              <X size={14} />
            </button>
          </div>
        )}
        {message && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
            <span className="flex items-center gap-2"><Check size={14} />{message}</span>
            <button type="button" aria-label="Fechar aviso de sucesso" onClick={() => setMessage('')} className="shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        <section aria-label="Resumo do catálogo" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <article className="flex min-h-[76px] items-center justify-between rounded-[2px] border border-slate-200 border-l-4 border-l-slate-400 bg-white p-3 shadow-sm">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Produtos ativos no ERP</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#123B50]">{busy ? '—' : kpis.total}</p>
            </div>
            <Layers size={17} className="text-slate-500" />
          </article>
          <article className="flex min-h-[76px] items-center justify-between rounded-[2px] border border-slate-200 border-l-4 border-l-[#2D8DB8] bg-white p-3 shadow-sm">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Publicados no catálogo</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#123B50]">{busy ? '—' : kpis.published}</p>
            </div>
            <Eye size={17} className="text-[#2D8DB8]" />
          </article>
          <article className="flex min-h-[76px] items-center justify-between rounded-[2px] border border-slate-200 border-l-4 border-l-[#48B7C7] bg-white p-3 shadow-sm">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Com foto cadastrada</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#123B50]">{busy ? '—' : kpis.withPhoto}</p>
            </div>
            <Check size={17} className="text-[#2D8DB8]" />
          </article>
        </section>

        <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex h-[30px] w-full items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-2 sm:max-w-[340px]">
                <Search size={13} className="shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por código SKU ou produto..."
                  aria-label="Buscar produtos do catálogo"
                  className="h-full min-w-0 flex-1 bg-transparent text-[10px] outline-none placeholder:text-slate-400"
                />
                {query && (
                  <button type="button" aria-label="Limpar busca" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-700">
                    <X size={13} />
                  </button>
                )}
              </label>
              <span className="self-start rounded-[2px] border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600 sm:self-auto">
                {visible.length} de {rows.length} produtos
              </span>
            </div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || busy || !companyId}
              className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#1f6281] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Save size={12} /> {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-left text-[10px]">
              <thead>
                <tr className="h-8 border-b border-slate-200 bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  <th scope="col" className="w-[76px] px-2 text-center">Publicar</th>
                  <th scope="col" className="w-[100px] px-2">Código SKU</th>
                  <th scope="col" className="w-[19%] px-2">Produto</th>
                  <th scope="col" className="px-2">Descrição</th>
                  <th scope="col" className="w-[112px] px-2 text-right">Preço</th>
                  <th scope="col" className="w-[90px] px-2 text-center">Foto</th>
                  <th scope="col" className="w-[126px] px-2 text-center">Status público</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((product) => {
                  const isPublished = Boolean(selected[product.id])
                  return (
                    <tr key={product.id} className="h-9 hover:bg-sky-50/50">
                      <td className="px-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Publicar ${product.nome} no catálogo`}
                          className="h-3.5 w-3.5 cursor-pointer accent-[#2D8DB8]"
                          checked={isPublished}
                          disabled={saving}
                          onChange={(event) =>
                            setSelected((current) => ({ ...current, [product.id]: event.target.checked }))
                          }
                        />
                      </td>
                      <td className="truncate px-2 font-mono font-semibold text-slate-700">{product.codigo}</td>
                      <td className="truncate px-2 font-semibold text-slate-800" title={product.nome}>{product.nome}</td>
                      <td className="truncate px-2 text-slate-500" title={product.descricao || ''}>{product.descricao || '—'}</td>
                      <td className="whitespace-nowrap px-2 text-right font-mono font-semibold text-slate-800">{money(Number(product.preco_venda || 0))}</td>
                      <td className="px-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-1 text-[9px] font-semibold ${product.foto_url ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {product.foto_url ? <Check size={11} /> : <X size={11} />}
                          {product.foto_url ? 'Disponível' : 'Sem foto'}
                        </span>
                      </td>
                      <td className="px-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-1 text-[9px] font-semibold ${isPublished ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-500'}`}>
                          {isPublished ? <Eye size={11} /> : <EyeOff size={11} />}
                          {isPublished ? 'Publicado' : 'Oculto'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!visible.length && !busy && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-500">Nenhum produto corresponde à busca.</td></tr>
                )}
                {busy && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-500">Carregando produtos da empresa autenticada…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </VendasLayout>
  )
}
