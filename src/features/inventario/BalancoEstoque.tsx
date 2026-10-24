import { Download, ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import { makeXlsx } from '../../utils/makeXlsx'
import '../../styles/estoque-standard.css'

type Product = { id: string; codigo: string; nome: string; unidade: string | null; estoque_atual: number | null; custo_medio: number | null }
type Warehouse = { id: string; codigo: string; nome: string }
type Row = Product & { saldo: number; custo: number; total: number; status: string }

const input = 'h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600'
const button = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50'

function fuzzy(value: string, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  let index = 0
  for (const character of value.toLowerCase()) {
    if (character === q[index]) index += 1
    if (index === q.length) return true
  }
  return false
}

function exportXlsx(rows: Row[], reportDate: string) {
  const data = [
    ['SKU', 'Descrição', 'Saldo Físico', 'Unidade', 'Custo Unitário', 'Custo Total R$', 'Status do Saldo'],
    ...rows.map(row => [row.codigo, row.nome, String(row.saldo), row.unidade ?? '', row.custo.toFixed(6), row.total.toFixed(2), row.status]),
  ]
  const blob = makeXlsx(data, 'Valoração')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'balanco-estoque-' + reportDate + '.xlsx'
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function BalancoEstoque() {
  const navigate = useNavigate()
  const [cut, setCut] = useState(new Date().toISOString().slice(0, 10))
  const [warehouse, setWarehouse] = useState('')
  const [method, setMethod] = useState('Custo Médio Ponderado')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
        const empresaId = String(company.data)
        const [warehouseRows, productRows] = await Promise.all([
          fetchAllPages<Warehouse>((from, to) => supabase
            .from('erp_almoxarifados')
            .select('id,codigo,nome', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)),
          fetchAllPages<Product>((from, to) => supabase
            .from('erp_produtos')
            .select('id,codigo,nome,unidade,estoque_atual,custo_medio', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)),
        ])
        if (active) {
          setWarehouses(warehouseRows)
          setProducts(productRows)
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar balanço.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const rows = useMemo<Row[]>(() => products
    .filter(product => fuzzy(product.codigo + ' ' + product.nome, search))
    .map(product => {
      const saldo = Number(product.estoque_atual ?? 0)
      const custo = Number(product.custo_medio ?? 0)
      return { ...product, saldo, custo, total: saldo * custo, status: saldo < 0 ? 'DIVERGENTE' : 'SALDO ATUAL' }
    }), [products, search])
  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <main className="stock-standard min-h-screen bg-slate-50 text-slate-900">
      <header>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Estoque • inventário</p>
          <h1>Valoração de estoque</h1>
          <p className="text-xs text-slate-300">Saldo atual por produto e custo médio cadastrado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => navigate('/estoque')} className={button}><ArrowLeft size={14} /> Voltar</button>
          <button type="button" onClick={() => exportXlsx(rows, cut)} disabled={loading || !!error} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} /> Exportar XLSX</button>
        </div>
      </header>

      {error && <div role="alert" className="mb-3 border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</div>}

      <section className="mb-3 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0">
          <span className={label}>Data do relatório</span>
          <input className={input + ' w-full'} type="date" value={cut} onChange={event => setCut(event.target.value)} />
        </label>
        <label className="min-w-0">
          <span className={label}>Almoxarifado / filial</span>
          <select className={input + ' w-full'} value={warehouse} onChange={event => setWarehouse(event.target.value)} disabled title="A fonte atual apresenta saldo global por produto; não foi confirmada a relação do saldo com o almoxarifado.">
            <option value="">Todos (saldo global)</option>
            {warehouses.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.nome}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className={label}>Método de custo</span>
          <select className={input + ' w-full'} value={method} onChange={event => setMethod(event.target.value)} disabled title="A fonte consultada disponibiliza custo_medio; PEPS e último preço exigem uma fonte por lote/movimento validada.">
            <option>Custo Médio Ponderado</option>
            <option>PEPS (Primeiro que Entra, Primeiro que Sai)</option>
            <option>Último Preço de Compra</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className={label}>Buscar SKU / descrição</span>
          <input className={input + ' w-full'} value={search} onChange={event => setSearch(event.target.value)} placeholder="SKU ou descrição" />
        </label>
        <p className="text-[11px] leading-relaxed text-slate-500 md:col-span-2 xl:col-span-4">Consulta de saldo atual, não um snapshot histórico. A data identifica o relatório exportado. A valoração usa saldo do produto × custo médio. Filtros por almoxarifado e métodos PEPS/último preço permanecem indisponíveis até a fonte por endereço/lote ser confirmada.</p>
      </section>

      <section className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px]">
          <thead><tr><th>SKU</th><th>Descrição</th><th className="text-right">Saldo físico</th><th>Unidade</th><th className="text-right">Custo unitário</th><th className="text-right">Custo total (R$)</th><th>Status do saldo</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Carregando estoque real…</td></tr>}
            {!loading && rows.map(row => <tr key={row.id}><td className="font-semibold">{row.codigo}</td><td>{row.nome}</td><td className="text-right tabular-nums">{row.saldo.toLocaleString('pt-BR')}</td><td>{row.unidade ?? 'UN'}</td><td className="text-right tabular-nums">{row.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="text-right font-semibold tabular-nums">{row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{row.status}</td></tr>)}
            {!loading && !rows.length && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Nenhum item real encontrado.</td></tr>}
          </tbody>
        </table>
      </section>

      <div className="mt-3 flex min-h-9 flex-wrap items-center justify-end gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm">
        <span>Total de itens: {rows.length}</span>
        <span>Valor total estimado: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
    </main>
  )
}
