/**
 * @DATA_REVISAO: 2026-10-16
 * @REVISAO: VENDAS-004
 * @ESCOPO_REVISADO: carregamento multiempresa, filtro, seleção em lote, salvamento e grade de produtos do catálogo.
 * @ALTERACOES: painel sem raio/sombra exagerados, espaçamento compacto, cabeçalho/linhas da grade em 32px; schema e salvamento preservados.
 * @VALIDACAO: conferir CI do commit corrente no PR; inspeção visual autenticada e teste funcional por sessão ainda pendentes.
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

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

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

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((product) => !term || product.codigo.toLowerCase().includes(term) || product.nome.toLowerCase().includes(term))
  }, [query, rows])

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
        <section className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-medium text-[#123B50]">Produtos publicados no catálogo</h2>
              <p className="mt-1 text-xs text-slate-500">Marque os produtos que devem aparecer no catálogo digital. A fonte é o cadastro real de produtos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código ou produto" className="h-[30px] w-full min-w-0 max-w-[18rem] rounded-[2px] border border-slate-300 px-2 text-[10px] outline-none focus:border-[#2D8DB8]" />
              <button type="button" onClick={() => void save()} disabled={saving || busy} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Save size={12} /> {saving ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </div>
          {busy && <p className="mt-2 text-[10px] text-slate-500" role="status">Carregando produtos reais…</p>}
          {error && <div className="mt-2 rounded-[2px] border border-red-200 bg-red-50 p-2 text-[10px] text-red-800">{error}</div>}
          {message && <div className="mt-2 flex gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800"><Check size={16} />{message}</div>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr className="h-8 bg-slate-100 text-left text-[9px] uppercase"><th className="w-16">Catálogo</th><th>Código</th><th>Produto</th><th>Descrição</th><th>Preço</th><th>Foto</th><th>Status</th></tr></thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.id} className="h-8 border-t border-slate-200 text-[10px]">
                    <td><input type="checkbox" className="h-4 w-4" checked={Boolean(selected[product.id])} onChange={(event) => setSelected((current) => ({ ...current, [product.id]: event.target.checked }))} /></td>
                    <td className="font-medium">{product.codigo}</td>
                    <td>{product.nome}</td>
                    <td>{product.descricao || '—'}</td>
                    <td>{money(Number(product.preco_venda || 0))}</td>
                    <td>{product.foto_url ? 'Disponível' : 'Sem foto'}</td>
                    <td>{selected[product.id] ? 'Publicado' : 'Não publicado'}</td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={7} className="py-6 text-center text-[10px] text-slate-500">Nenhum produto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </VendasLayout>
  )
}