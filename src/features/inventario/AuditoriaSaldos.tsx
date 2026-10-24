import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import '../../styles/estoque-standard.css'

type Log = {
  id: string
  ajustado_em: string
  operador: string
  sku: string
  saldo_antigo: number
  saldo_novo: number
  ajuste_financeiro: number
  motivo: string
  justificativa: string
}
type Filters = { date: string; motivo: string; sku: string }

const PAGE_SIZE = 50
const input = 'h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600'
const button = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export default function AuditoriaSaldos() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [motivo, setMotivo] = useState('')
  const [sku, setSku] = useState('')
  const [filters, setFilters] = useState<Filters>({ date: '', motivo: '', sku: '' })
  const [rows, setRows] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error) throw tenant.error
        if (typeof tenant.data !== 'string' || !tenant.data) {
          throw new Error('Empresa da sessão não identificada. A auditoria exige contexto de empresa.')
        }

        let query = supabase
          .from('erp_inventario_auditoria_saldos')
          .select('id,ajustado_em,operador,sku,saldo_antigo,saldo_novo,ajuste_financeiro,motivo,justificativa', { count: 'exact' })
          .eq('empresa_id', tenant.data)

        if (filters.date) {
          const start = new Date(filters.date + 'T00:00:00')
          const end = new Date(start)
          end.setDate(end.getDate() + 1)
          query = query.gte('ajustado_em', start.toISOString()).lt('ajustado_em', end.toISOString())
        }
        if (filters.motivo) query = query.eq('motivo', filters.motivo)
        if (filters.sku.trim()) query = query.ilike('sku', '%' + filters.sku.trim() + '%')

        const result = await query
          .order('ajustado_em', { ascending: false })
          .order('id', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw result.error
        if (active) {
          setRows((result.data ?? []) as Log[])
          setTotal(result.count ?? 0)
        }
      } catch (cause) {
        if (active) {
          setRows([])
          setTotal(0)
          setError(cause instanceof Error ? cause.message : 'Falha ao carregar auditoria.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [filters, page])

  const applyFilters = () => {
    setPage(0)
    setFilters({ date, motivo, sku })
  }
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="stock-standard min-h-screen bg-slate-50 p-3 text-slate-900 md:p-4">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Estoque · controle interno</p>
            <h1>Auditoria de saldos e inventário físico</h1>
            <p className="text-xs text-slate-300">Consulta paginada do histórico disponível para a empresa autenticada.</p>
          </div>
          <button type="button" onClick={() => navigate('/estoque')} className={button}><ArrowLeft size={14} /> Voltar ao estoque</button>
        </header>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</div>}

        <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0"><span className={label}>Data do ajuste</span><input id="edDataLog" className={input} type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
          <label className="min-w-0"><span className={label}>Motivo da divergência</span><select id="cbMotivoLog" className={input} value={motivo} onChange={event => setMotivo(event.target.value)}><option value="">Todos</option><option>Quebra de Estoque</option><option>Sobra de Inventário</option><option>Ajuste Técnico</option></select></label>
          <label className="min-w-0"><span className={label}>Buscar SKU</span><input id="edSkuLog" className={input} value={sku} onChange={event => setSku(event.target.value)} placeholder="Código do produto" /></label>
          <div className="flex items-end"><button id="btnFiltrar" type="button" onClick={applyFilters} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"><Search size={14} /> Filtrar auditoria</button></div>
        </section>

        <section id="gridLogValores" className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[950px]">
            <thead><tr><th>Data</th><th>Operador</th><th>SKU</th><th className="text-right">Saldo antigo</th><th className="text-right">Saldo novo</th><th className="text-right">Ajuste financeiro</th><th>Motivo</th><th>Justificativa</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Consultando auditoria real…</td></tr>}
              {!loading && rows.map(row => <tr key={row.id}><td className="whitespace-nowrap">{new Date(row.ajustado_em).toLocaleString('pt-BR')}</td><td>{row.operador}</td><td className="font-semibold">{row.sku}</td><td className="text-right tabular-nums">{Number(row.saldo_antigo).toLocaleString('pt-BR')}</td><td className="text-right tabular-nums">{Number(row.saldo_novo).toLocaleString('pt-BR')}</td><td className="text-right tabular-nums">{Number(row.ajuste_financeiro).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{row.motivo}</td><td>{row.justificativa}</td></tr>)}
              {!loading && !rows.length && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Nenhum ajuste encontrado para os filtros.</td></tr>}
            </tbody>
          </table>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
          <span className="font-semibold text-slate-600">{total.toLocaleString('pt-BR')} registro(s) · página {page + 1} de {pageCount}</span>
          <div className="flex items-center gap-2">
            <button type="button" className={button} disabled={loading || page === 0} onClick={() => setPage(current => Math.max(0, current - 1))}><ChevronLeft size={14} /> Anterior</button>
            <button type="button" className={button} disabled={loading || page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))}>Próxima <ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </main>
  )
}
