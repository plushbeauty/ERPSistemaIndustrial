/**
 * @DATA_REVISAO_APROVACAO: 2026-11-24
 * @REVISAO: ESTOQUE-VALIDADE-PEPS-VISUAL-20261124
 * @PADRAO_VISUAL: ComprasRequisicoes / VendasLayout — controles 30px, radius 2px,
 *   azul #2D8DB8, indicadores clicáveis, tabela zebrada e paginação.
 * @MANTIDO: RPC erp_current_empresa_id, filtro empresa_id em todas as consultas,
 *   tabelas e campos já utilizados, somente leitura.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, MapPin, Printer, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import VendasLayout from '../VendasLayout'

type LotRow = {
  id: string
  empresa_id: string
  produto_id: string
  lote_fornecedor: string
  quantidade_inicial: number
  quantidade_disponivel: number
  status_qualidade: string
  data_validade: string | null
  created_at: string
}
type ProductRow = { id: string; codigo: string | null; nome: string | null; unidade_medida: string | null }
type InventoryLot = LotRow & {
  codigo: string
  descricao: string
  unidade: string
  data_entrada: string
  lote_interno: string | null
  localizacao: string | null
  status_inspecao: string | null
  quantidade_recebida: number | null
}
type ExpiryStatus = 'VENCIDO' | 'EXPIRANDO' | 'REGULAR' | 'SEM VALIDADE'

const PAGE_SIZE = 25
const EXPIRING_DAYS = 30
const qtyFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const todayISO = () => {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}
const daysUntil = (expiry: string | null, today: string) =>
  expiry ? Math.round((Date.parse(expiry.slice(0, 10) + 'T00:00:00') - Date.parse(today + 'T00:00:00')) / 86400000) : null

/** A data de validade ainda é válida durante o próprio dia. */
function expiryStatus(expiry: string | null, today: string): ExpiryStatus {
  const days = daysUntil(expiry, today)
  if (days === null) return 'SEM VALIDADE'
  if (days < 0) return 'VENCIDO'
  if (days <= EXPIRING_DAYS) return 'EXPIRANDO'
  return 'REGULAR'
}
function formatDate(value: string | null) {
  if (!value) return '—'
  const parts = value.slice(0, 10).split('-')
  return parts.length === 3 ? parts.reverse().join('/') : value
}

export default function InventarioValidade() {
  const [rows, setRows] = useState<InventoryLot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpiryStatus | ''>('')
  const [error, setError] = useState('')
  const [today, setToday] = useState(todayISO)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (typeof company.data !== 'string' || !company.data) {
        throw new Error('Empresa da sessão não identificada. Entre novamente no ERP.')
      }
      const tenantId = company.data
      const [lotRows, productRows] = await Promise.all([
        fetchAllPages<LotRow>((from, to) => supabase.from('erp_estoque_lotes_rastreabilidade')
          .select('id,empresa_id,produto_id,lote_fornecedor,quantidade_inicial,quantidade_disponivel,status_qualidade,data_validade,created_at', { count: 'exact' })
          .eq('empresa_id', tenantId).order('created_at', { ascending: true }).range(from, to)),
        fetchAllPages<ProductRow>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome,unidade_medida', { count: 'exact' })
          .eq('empresa_id', tenantId).order('codigo', { ascending: true }).range(from, to)),
      ])
      const products = new Map(productRows.map(product => [product.id, product]))
      setRows(lotRows.map(lot => {
        const product = products.get(lot.produto_id)
        return {
          ...lot,
          data_entrada: lot.created_at.slice(0, 10),
          lote_interno: null,
          localizacao: null,
          status_inspecao: lot.status_qualidade,
          quantidade_recebida: lot.quantidade_inicial,
          codigo: product?.codigo ?? '—',
          descricao: product?.nome ?? 'Produto não localizado',
          unidade: product?.unidade_medida ?? '',
        }
      }))
      setToday(todayISO())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar lotes e validade.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => {
    const result: Record<ExpiryStatus, number> = { VENCIDO: 0, EXPIRANDO: 0, REGULAR: 0, 'SEM VALIDADE': 0 }
    for (const row of rows) result[expiryStatus(row.data_validade, today)] += 1
    return result
  }, [rows, today])

  // PEPS/FIFO ordena por data de entrada; validade é alerta independente (FEFO não é FIFO).
  const visibleRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return rows
      .filter(row => !statusFilter || expiryStatus(row.data_validade, today) === statusFilter)
      .filter(row => !term || [row.codigo, row.descricao, row.lote_interno ?? '', row.lote_fornecedor, row.localizacao ?? '']
        .some(value => value.toLocaleLowerCase('pt-BR').includes(term)))
      .sort((a, b) => a.data_entrada.localeCompare(b.data_entrada) || a.created_at.localeCompare(b.created_at))
  }, [rows, search, statusFilter, today])

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount)) }, [pageCount])

  const clearFilters = () => { setSearch(''); setStatusFilter(''); setPage(1) }
  const toggleStatus = (status: ExpiryStatus) => {
    setStatusFilter(current => current === status ? '' : status)
    setPage(1)
  }
  const hasFilter = Boolean(search || statusFilter)

  return (
    <VendasLayout
      title="Controle de validade e PEPS"
      subtitle="Estoque • Lotes recebidos, vencimentos e fila FIFO/PEPS"
      onRefresh={() => void load()}
      titleActions={
        <div className="flex items-center gap-2">
          <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button type="button" className={btnSecondary} onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      }
    >
      <main data-synqra-density="30px" className="mx-auto w-full max-w-[1440px] space-y-3 p-3">
        {error && <div role="alert" className="flex items-start gap-2 rounded-[2px] border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</div>}

        <section aria-label="Indicadores de validade" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi label="Total de lotes" value={rows.length} tone="slate" active={!statusFilter} onClick={() => { setStatusFilter(''); setPage(1) }} />
          <Kpi label="Vencidos" value={totals.VENCIDO} tone="rose" active={statusFilter === 'VENCIDO'} onClick={() => toggleStatus('VENCIDO')} />
          <Kpi label={`Vencem em até ${EXPIRING_DAYS} dias`} value={totals.EXPIRANDO} tone="amber" active={statusFilter === 'EXPIRANDO'} onClick={() => toggleStatus('EXPIRANDO')} />
          <Kpi label="Regulares" value={totals.REGULAR} tone="emerald" active={statusFilter === 'REGULAR'} onClick={() => toggleStatus('REGULAR')} />
        </section>
        <div className="flex justify-end">
          <button type="button" className={`${btnSecondary} ${statusFilter === 'SEM VALIDADE' ? 'border-[#2D8DB8] text-[#2D8DB8]' : ''}`} onClick={() => toggleStatus('SEM VALIDADE')} aria-pressed={statusFilter === 'SEM VALIDADE'}>
            Sem validade: {totals['SEM VALIDADE']}
          </button>
        </div>

        <section className={card}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <div className="grid w-full grid-cols-1 items-end gap-2 sm:w-[640px] sm:grid-cols-12">
              <label className="grid min-w-0 gap-1 sm:col-span-8">
                <span className={labelText}>Pesquisar</span>
                <span className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Código, material ou lote do fornecedor" className={`${input} pl-7`} />
                </span>
              </label>
              <label className="grid min-w-0 gap-1 sm:col-span-4">
                <span className={labelText}>Situação da validade</span>
                <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as ExpiryStatus | ''); setPage(1) }} className={input}>
                  <option value="">Todas</option>
                  <option value="VENCIDO">Vencido</option>
                  <option value="EXPIRANDO">Vence em até {EXPIRING_DAYS} dias</option>
                  <option value="REGULAR">Regular</option>
                  <option value="SEM VALIDADE">Sem validade</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Lotes <b className="ml-1 text-slate-900">{visibleRows.length}</b></span>
              <span>Ordem <b className="ml-1 text-[#2D8DB8]">PEPS</b></span>
              {hasFilter && <button type="button" className={btnSecondary} onClick={clearFilters}><X size={13} /> Limpar</button>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] table-fixed border-collapse text-xs">
              <thead><tr className={theadRow}>
                <th className={`${th} w-12 text-center`}>#</th>
                <th className={`${th} w-28`}>Código</th>
                <th className={th}>Material</th>
                <th className={`${th} w-44`}>Lote fornecedor</th>
                <th className={`${th} w-32 text-right`}>Disponível</th>
                <th className={`${th} w-24 text-center`}>Entrada</th>
                <th className={`${th} w-24 text-center`}>Validade</th>
                <th className={`${th} w-20 text-right`}>Dias</th>
                <th className={`${th} w-32 text-center`}>Qualidade</th>
                <th className={`${th} w-32 text-center`}>Alerta</th>
              </tr></thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const status = expiryStatus(row.data_validade, today)
                  const days = daysUntil(row.data_validade, today)
                  return <tr key={row.id} className={tr}>
                    <td className={`${td} text-center tabular-nums text-slate-400`}>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className={`${td} font-bold text-[#2D8DB8]`}>{row.codigo}</td>
                    <td className={`${td} max-w-0`}><div className="truncate font-semibold text-slate-800" title={row.descricao}>{row.descricao}</div><div className="text-[10px] text-slate-500">{row.unidade || 'Unidade não informada'}</div></td>
                    <td className={`${td} max-w-0`}><div className="truncate font-mono font-semibold" title={row.lote_fornecedor}>{row.lote_fornecedor}</div><div className="truncate text-[10px] text-slate-500">Registro {row.id.slice(0, 8)}</div></td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{qtyFormat.format(Number(row.quantidade_disponivel ?? 0))} <span className="text-[10px] font-normal text-slate-500">{row.unidade}</span></td>
                    <td className={`${td} text-center tabular-nums`}>{formatDate(row.data_entrada)}</td>
                    <td className={`${td} text-center tabular-nums`}>{formatDate(row.data_validade)}</td>
                    <td className={`${td} text-right font-bold tabular-nums ${days === null ? 'text-slate-400' : days < 0 ? 'text-rose-700' : days <= EXPIRING_DAYS ? 'text-amber-700' : 'text-slate-700'}`}>{days === null ? '—' : days}</td>
                    <td className={`${td} text-center`}><Badge tone={qualityTone(row.status_inspecao)}>{row.status_inspecao || 'Não informado'}</Badge></td>
                    <td className={`${td} text-center`}><Badge tone={statusTone[status]}>{statusLabel[status]}</Badge></td>
                  </tr>
                })}
                {!pageRows.length && <tr><td colSpan={10} className="px-3 py-7 text-center text-xs text-slate-500">{loading ? 'Consultando lotes reais do banco…' : hasFilter ? 'Nenhum lote encontrado para o filtro.' : 'Nenhum lote registrado.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <nav aria-label="Paginação dos lotes" className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
            <span aria-live="polite" className="text-[11px] font-semibold text-slate-600">
              {visibleRows.length ? `Exibindo ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visibleRows.length)} de ${visibleRows.length}` : 'Sem registros'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className={btnSecondary} disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Anterior</button>
              <span className="text-[11px] font-semibold text-slate-600">Página {page} de {pageCount}</span>
              <button type="button" className={btnSecondary} disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Próxima</button>
            </div>
          </nav>
          <footer className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
            <span>FIFO/PEPS por data de entrada · validade exibida como alerta independente</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Consulta somente leitura</span>
          </footer>
        </section>
      </main>
    </VendasLayout>
  )
}

const card = 'overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-sm'
const btnBase = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-50'
const btnSecondary = `${btnBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/30'
const labelText = 'text-[9px] font-extrabold uppercase tracking-wider text-slate-500'
const theadRow = 'bg-slate-100 text-left'
const th = 'h-[30px] border-b border-slate-300 px-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-600'
const tr = 'border-b border-slate-200 odd:bg-white even:bg-slate-50/60 hover:bg-sky-50/60'
const td = 'h-10 px-2 align-middle'

type Tone = 'slate' | 'amber' | 'rose' | 'emerald'
const toneClass: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-300',
  amber: 'bg-amber-50 text-amber-800 border-amber-300',
  rose: 'bg-rose-50 text-rose-700 border-rose-300',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
}
const statusTone: Record<ExpiryStatus, Tone> = { VENCIDO: 'rose', EXPIRANDO: 'amber', REGULAR: 'emerald', 'SEM VALIDADE': 'slate' }
const statusLabel: Record<ExpiryStatus, string> = { VENCIDO: 'Vencido', EXPIRANDO: 'Vence em breve', REGULAR: 'Regular', 'SEM VALIDADE': 'Sem validade' }

function qualityTone(value: string | null): Tone {
  const key = (value ?? '').toUpperCase()
  if (['APROVADO', 'LIBERADO', 'ATIVO'].includes(key)) return 'emerald'
  if (['REPROVADO', 'BLOQUEADO', 'SEGREGADO'].includes(key)) return 'rose'
  if (['QUARENTENA', 'PENDENTE', 'EM_INSPECAO'].includes(key)) return 'amber'
  return 'slate'
}
function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex h-5 items-center rounded-[2px] border px-2 text-[9px] font-bold uppercase tracking-wide ${toneClass[tone]}`}>{children}</span>
}
function Kpi({ label, value, tone, active, onClick }: { label: string; value: number; tone: Tone; active: boolean; onClick: () => void }) {
  const valueTone: Record<Tone, string> = { slate: 'text-slate-900', amber: 'text-amber-700', rose: 'text-rose-700', emerald: 'text-emerald-700' }
  const barTone: Record<Tone, string> = { slate: 'border-l-slate-400', amber: 'border-l-amber-500', rose: 'border-l-rose-600', emerald: 'border-l-emerald-600' }
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={`flex h-[62px] flex-col justify-center rounded-[2px] border border-l-4 bg-white px-3 text-left hover:bg-slate-50 ${barTone[tone]} ${active ? 'border-[#2D8DB8] ring-1 ring-[#2D8DB8]/40' : 'border-slate-300'}`}>
    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span>
    <span className={`text-xl font-extrabold tabular-nums ${value ? valueTone[tone] : 'text-slate-400'}`}>{value}</span>
  </button>
}
