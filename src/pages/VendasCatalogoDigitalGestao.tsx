import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
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
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      setError(company.error?.message || 'Empresa não identificada.')
      setBusy(false)
      return
    }

    const result = await supabase
      .from('erp_produtos')
      .select('id,codigo,nome,descricao,preco_venda,foto_url,catalogo_disponivel')
      .eq('empresa_id', String(company.data))
      .eq('ativo', true)
      .order('codigo')
      .limit(2000)

    if (result.error) {
      setError(result.error.message)
      setBusy(false)
      return
    }

    const products = (result.data ?? []) as Product[]
    setCompanyId(String(company.data))
    setRows(products)
    setSelected(Object.fromEntries(products.map((product) => [product.id, product.catalogo_disponivel])))
    setBusy(false)
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
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-medium text-[#123B50]">Produtos publicados no catálogo</h2>
              <p className="mt-1 text-xs text-slate-500">Marque os produtos que devem aparecer no catálogo digital. A fonte é o cadastro real de produtos.</p>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código ou produto" className="h-10 w-72 rounded-md border px-3 text-sm" />
          </div>
          {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {message && <div className="mt-4 flex gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={16} />{message}</div>}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr className="h-[54px] bg-slate-100 text-left text-sm"><th className="w-16">Catálogo</th><th>Código</th><th>Produto</th><th>Descrição</th><th>Preço</th><th>Foto</th><th>Status</th></tr></thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.id} className="h-[54px] border-t">
                    <td><input type="checkbox" className="h-5 w-5" checked={Boolean(selected[product.id])} onChange={(event) => setSelected((current) => ({ ...current, [product.id]: event.target.checked }))} /></td>
                    <td className="font-medium">{product.codigo}</td>
                    <td>{product.nome}</td>
                    <td>{product.descricao || '—'}</td>
                    <td>{money(Number(product.preco_venda || 0))}</td>
                    <td>{product.foto_url ? 'Disponível' : 'Sem foto'}</td>
                    <td>{selected[product.id] ? 'Publicado' : 'Não publicado'}</td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={7} className="py-12 text-center text-slate-500">Nenhum produto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </VendasLayout>
}