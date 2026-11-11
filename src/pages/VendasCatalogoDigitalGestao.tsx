/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-11
 * @REVISAO: REV-VENDAS-CATALOGO-GESTAO-PAGINACAO-20261111-01 — filtro de publicação, limpar filtros, paginação de 25 registros, estados de loading e alinhamento monetário; gravação por empresa preservada
 * @STATUS_APROVACAO: REVISÃO AUTORIZADA PELO PROPRIETÁRIO NO COMANDO MESTRE DE 2026-11-11; pendente de CI e validação funcional
 */
import { useEffect, useMemo, useState } from 'react'
import { Check, Save } from 'lucide-react'
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

const PAGE_SIZE = 25

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export default function VendasCatalogoDigitalGestao() {
  const [rows, setRows] = useState<Product[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PUBLICADOS' | 'NAO_PUBLICADOS'>('TODOS')
  const [pagina, setPagina] = useState(1)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [companyId, setCompanyId] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa não identificada.')
      }

      const products = await fetchAllPages<Product>((from, to) => supabase
        .from('erp_produtos')
        .select('id,codigo,nome,descricao,preco_venda,foto_url,catalogo_disponivel', { count: 'exact' })
        .eq('empresa_id', String(company.data))
        .eq('ativo', true)
        .order('codigo')
        .range(from, to))
      setCompanyId(String(company.data))
      setRows(products)
      setSelected(Object.fromEntries(products.map((product) => [product.id, product.catalogo_disponivel])))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o catálogo.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(product => {
      const matchesStatus = statusFilter === 'TODOS' || (statusFilter === 'PUBLICADOS' ? product.catalogo_disponivel : !product.catalogo_disponivel)
      const matchesQuery = !term || [product.codigo, product.nome, product.descricao ?? ''].join(' ').toLowerCase().includes(term)
      return matchesStatus && matchesQuery
    })
  }, [query, rows, statusFilter])
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = useMemo(() => filtered.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE), [filtered, pagina])
  useEffect(() => { setPagina(current => Math.min(current, totalPaginas)) }, [totalPaginas])

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const changes = rows.filter((product) => selected[product.id] !== product.catalogo_disponivel)
      for (const product of changes) {
        const result = await supabase
          .from('erp_produtos')
          .update({ catalogo_disponivel: Boolean(selected[product.id]) })
          .eq('id', product.id)
           .eq('empresa_id', companyId)
        if (result.error) {
          throw result.error
        }
      }
      setRows((current) => current.map((product) => ({ ...product, catalogo_disponivel: Boolean(selected[product.id]) })))
      setMessage('Catálogo atualizado com os produtos selecionados.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o catálogo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendasLayout title="Gestão do catálogo" subtitle="Publicação de produtos no catálogo digital" onRefresh={() => void load()}>
      <main className="sales-workspace sales-detail">
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-medium text-[#123B50]">Produtos publicados no catálogo</h2>
              <p className="mt-1 text-xs text-slate-500">Marque os produtos que devem aparecer no catálogo digital. A fonte é o cadastro real de produtos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={query} maxLength={120} onChange={(event) => { setQuery(event.target.value); setPagina(1) }} placeholder="Buscar código, produto ou descrição" aria-label="Buscar produtos do catálogo" className="h-8 w-72 max-w-full rounded-[2px] border border-slate-300 px-2 text-[10px] outline-none focus:border-[#2D8DB8]" />
              <select aria-label="Filtrar produtos por publicação" value={statusFilter} onChange={event => { setStatusFilter(event.target.value as 'TODOS' | 'PUBLICADOS' | 'NAO_PUBLICADOS'); setPagina(1) }} className="h-8 border border-slate-300 bg-white px-2 text-[10px]">
                <option value="TODOS">Todos</option><option value="PUBLICADOS">Publicados</option><option value="NAO_PUBLICADOS">Não publicados</option>
              </select>
              <button type="button" onClick={() => { setQuery(''); setStatusFilter('TODOS'); setPagina(1) }} className="h-8 border border-slate-300 bg-white px-2 text-[10px] font-semibold">LIMPAR FILTROS</button>
              <span className="text-[9px] text-slate-500">{filtered.length} produto(s)</span>
              <button type="button" onClick={() => void save()} disabled={saving || busy} className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Save size={12} /> {saving ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </div>
          {busy && <p className="mt-2 text-[10px] text-slate-500" role="status">Carregando produtos reais…</p>}
          {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {message && <div className="mt-4 flex gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={16} />{message}</div>}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr className="h-[54px] bg-slate-100 text-left text-sm"><th className="w-16">Catálogo</th><th>Código</th><th>Produto</th><th>Descrição</th><th className="text-right">Preço</th><th>Foto</th><th>Status</th></tr></thead>
              <tbody>
                {busy && <tr><td colSpan={7} className="py-10 text-center text-[10px] text-slate-500">Carregando produtos reais…</td></tr>}
                {visible.map((product) => (
                  <tr key={product.id} className="h-[54px] border-t">
                    <td><input type="checkbox" className="h-5 w-5" aria-label={`Publicar ${product.nome} no catálogo`} checked={Boolean(selected[product.id])} onChange={(event) => setSelected((current) => ({ ...current, [product.id]: event.target.checked }))} /></td>
                    <td className="font-medium">{product.codigo}</td>
                    <td>{product.nome}</td>
                    <td>{product.descricao || '—'}</td>
                    <td className="text-right tabular-nums">{money(Number(product.preco_venda || 0))}</td>
                    <td>{product.foto_url ? 'Disponível' : 'Sem foto'}</td>
                    <td>{selected[product.id] ? 'Publicado' : 'Não publicado'}</td>
                  </tr>
                ))}
                {!busy && !visible.length && <tr><td colSpan={7} className="py-12 text-center text-slate-500">Nenhum produto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
          <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2" aria-label="Paginação do catálogo">
            <span className="text-[10px] text-slate-600">Página {pagina} de {totalPaginas} · {filtered.length} produto(s)</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPagina(current => Math.max(1, current - 1))} disabled={busy || pagina <= 1} className="h-8 border border-slate-300 bg-white px-3 text-[10px] disabled:opacity-40">ANTERIOR</button>
              <button type="button" onClick={() => setPagina(current => Math.min(totalPaginas, current + 1))} disabled={busy || pagina >= totalPaginas} className="h-8 border border-slate-300 bg-white px-3 text-[10px] disabled:opacity-40">PRÓXIMA</button>
            </div>
          </nav>
        </section>
      </main>
    </VendasLayout>
  )
}