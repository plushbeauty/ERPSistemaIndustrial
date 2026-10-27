/**
 * @DATA_REVISAO_APROVACAO: 2026-10-27
 * @REVISAO: ESTOQUE-VALIDADE-PADRAO-COMPRAS-02
 * @PADRAO_VISUAL: VendasLayout, h-8, radius 2px, azul #2D8DB8, tabela zebrada e paginação.
 * @REFERENCIA_ERP: SAP S/4HANA — monitor de validade, lotes e fila PEPS/FIFO.
 * @MANTIDO: tenant via erp_current_empresa_id, filtro empresa_id nas consultas, somente leitura.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MapPin, Printer, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import VendasLayout from '../VendasLayout'

type LotRow = { id: string; empresa_id: string; produto_id: string; lote_fornecedor: string; quantidade_inicial: number; quantidade_disponivel: number; status_qualidade: string; data_validade: string | null; created_at: string }
type ProductRow = { id: string; codigo: string | null; nome: string | null; unidade_medida: string | null; instrucoes_armazenagem: string | null; permite_empilhamento: boolean; limite_empilhamento: number | null; temperatura_armazenagem_min_c: number | null; temperatura_armazenagem_max_c: number | null; umidade_relativa_max_pct: number | null }
type MaterialLot = { id: string; empresa_id: string; produto_id: string; lote: string; lote_fabricante: string | null; quantidade_recebida: number; quantidade_disponivel: number; status: string | null; validade: string | null; localizacao_id: string | null; data_entrada: string; created_at: string; documento_recebimento: string | null }
type InventoryLot = { id: string; codigo: string; descricao: string; unidade: string; armazenagem: string; lote_fornecedor: string; lote_interno: string | null; localizacao: string | null; quantidade_disponivel: number; data_entrada: string; data_validade: string | null; status_inspecao: string | null; created_at: string }
type ExpiryStatus = 'VENCIDO' | 'EXPIRANDO' | 'REGULAR' | 'SEM_VALIDADE'
const PAGE_SIZE = 25
const EXPIRING_DAYS = 30
const qtyFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const todayISO = () => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-') }
const daysUntil = (expiry: string | null, today: string) => expiry ? Math.round((Date.parse(expiry.slice(0, 10) + 'T00:00:00') - Date.parse(today + 'T00:00:00')) / 86400000) : null
function expiryStatus(expiry: string | null, today: string): ExpiryStatus { const days = daysUntil(expiry, today); if (days === null) return 'SEM_VALIDADE'; if (days < 0) return 'VENCIDO'; if (days <= EXPIRING_DAYS) return 'EXPIRANDO'; return 'REGULAR' }
const formatDate = (value: string | null) => { if (!value) return '—'; const parts = value.slice(0, 10).split('-'); return parts.length === 3 ? parts.reverse().join('/') : value }
function formatStorage(product: ProductRow | undefined) {
  if (!product) return ''
  const temperature = product.temperatura_armazenagem_min_c != null || product.temperatura_armazenagem_max_c != null ? `${product.temperatura_armazenagem_min_c ?? '—'} a ${product.temperatura_armazenagem_max_c ?? '—'} °C` : ''
  const humidity = product.umidade_relativa_max_pct != null ? `UR máx. ${product.umidade_relativa_max_pct}%` : ''
  const stacking = product.permite_empilhamento ? (product.limite_empilhamento ? `Empilhar até ${product.limite_empilhamento}` : 'Empilhamento permitido') : 'Não empilhar'
  return [product.instrucoes_armazenagem, stacking, temperature, humidity].filter(Boolean).join(' · ')
}
export default function InventarioValidade() {
  const [rows, setRows] = useState<InventoryLot[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpiryStatus | ''>('')
  const [page, setPage] = useState(1)
  const [today, setToday] = useState(todayISO)
  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || typeof company.data !== 'string' || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = company.data
      const [lotRows, materialRows, productRows, locationRows] = await Promise.all([
        fetchAllPages<LotRow>((from, to) => supabase.from('erp_estoque_lotes_rastreabilidade').select('id,empresa_id,produto_id,lote_fornecedor,quantidade_inicial,quantidade_disponivel,status_qualidade,data_validade,created_at', { count: 'exact' }).eq('empresa_id', id).order('created_at', { ascending: true }).range(from, to)),
        fetchAllPages<MaterialLot>((from, to) => supabase.from('erp_lotes_materiais').select('id,empresa_id,produto_id,lote,lote_fabricante,quantidade_recebida,quantidade_disponivel,status,validade,localizacao_id,data_entrada,created_at,documento_recebimento', { count: 'exact' }).eq('empresa_id', id).order('data_entrada', { ascending: true }).range(from, to)),
        fetchAllPages<ProductRow>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,unidade_medida,instrucoes_armazenagem,permite_empilhamento,limite_empilhamento,temperatura_armazenagem_min_c,temperatura_armazenagem_max_c,umidade_relativa_max_pct', { count: 'exact' }).eq('empresa_id', id).order('codigo', { ascending: true }).range(from, to)),
        fetchAllPages<{ id: string; codigo: string; nome: string }>((from, to) => supabase.from('erp_estoque_localizacoes').select('id,codigo,nome', { count: 'exact' }).eq('empresa_id', id).order('codigo').range(from, to)),
      ])
      const products = new Map(productRows.map(product => [product.id, product]))
      const locations = new Map(locationRows.map(location => [location.id, `${location.codigo} • ${location.nome}`]))
      const base = (productId: string) => { const product = products.get(productId); return { codigo: product?.codigo ?? '—', descricao: product?.nome ?? 'Produto não localizado', unidade: product?.unidade_medida ?? '', armazenagem: formatStorage(product) } }
      setRows([
        ...lotRows.map<InventoryLot>(lot => ({ ...base(lot.produto_id), id: lot.id, lote_fornecedor: lot.lote_fornecedor, lote_interno: null, localizacao: null, quantidade_disponivel: Number(lot.quantidade_disponivel ?? 0), data_entrada: lot.created_at.slice(0, 10), data_validade: lot.data_validade, status_inspecao: lot.status_qualidade, created_at: lot.created_at })),
        ...materialRows.map<InventoryLot>(lot => ({ ...base(lot.produto_id), id: lot.id, lote_fornecedor: lot.lote_fabricante || lot.lote, lote_interno: lot.lote, localizacao: locations.get(lot.localizacao_id ?? '') ?? null, quantidade_disponivel: Number(lot.quantidade_disponivel ?? 0), data_entrada: lot.data_entrada.slice(0, 10), data_validade: lot.validade, status_inspecao: lot.status, created_at: lot.created_at })),
      ])
      setToday(todayISO())
    } catch (cause) { setRows([]); setError(cause instanceof Error ? cause.message : 'Não foi possível consultar lotes e validade.') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const totals = useMemo(() => { const result: Record<ExpiryStatus, number> = { VENCIDO: 0, EXPIRANDO: 0, REGULAR: 0, SEM_VALIDADE: 0 }; for (const row of rows) result[expiryStatus(row.data_validade, today)] += 1; return result }, [rows, today])
  const visibleRows = useMemo(() => { const term = search.trim().toLocaleLowerCase('pt-BR'); return rows.filter(row => (!statusFilter || expiryStatus(row.data_validade, today) === statusFilter) && (!term || [row.codigo, row.descricao, row.lote_interno ?? '', row.lote_fornecedor, row.localizacao ?? ''].some(value => value.toLocaleLowerCase('pt-BR').includes(term)))).sort((a, b) => a.data_entrada.localeCompare(b.data_entrada) || a.created_at.localeCompare(b.created_at)) }, [rows, search, statusFilter, today])
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount)) }, [pageCount])
  const hasFilter = Boolean(search || statusFilter)
  const clearFilters = () => { setSearch(''); setStatusFilter(''); setPage(1) }
  const toggleStatus = (status: ExpiryStatus) => { setStatusFilter(current => current === status ? '' : status); setPage(1) }
  return <VendasLayout title="Controle de validade e PEPS" subtitle="Estoque • Lotes recebidos, vencimentos e fila FIFO/PEPS" onRefresh={() => void load()} titleActions={<div className="flex items-center gap-2"><button type="button" className={btnSecondary} onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''}/> Atualizar</button><button type="button" className={btnSecondary} onClick={() => window.print()}><Printer size={14}/> Imprimir</button></div>}>
    <main className="mx-auto w-full max-w-[1440px] space-y-3 p-3">
      {error && <div role="alert" className="rounded-[2px] border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</div>}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Total de lotes" value={rows.length} tone="slate" active={!statusFilter} onClick={() => { setStatusFilter(''); setPage(1) }}/>
        <Kpi label="Vencidos" value={totals.VENCIDO} tone="rose" active={statusFilter === 'VENCIDO'} onClick={() => toggleStatus('VENCIDO')}/>
        <Kpi label={`Vencem em ${EXPIRING_DAYS} dias`} value={totals.EXPIRANDO} tone="amber" active={statusFilter === 'EXPIRANDO'} onClick={() => toggleStatus('EXPIRANDO')}/>
        <Kpi label="Regulares" value={totals.REGULAR} tone="emerald" active={statusFilter === 'REGULAR'} onClick={() => toggleStatus('REGULAR')}/>
        <Kpi label="Sem validade" value={totals.SEM_VALIDADE} tone="sky" active={statusFilter === 'SEM_VALIDADE'} onClick={() => toggleStatus('SEM_VALIDADE')}/>
      </section>
      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="grid grid-cols-1 items-end gap-3 sm:w-[640px] sm:grid-cols-12">
            <label className="grid min-w-0 gap-1 sm:col-span-8"><span className={labelText}>Pesquisar</span><span className="relative"><Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/><input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Código, material, lote ou localização" className={`${input} pl-7`}/></span></label>
            <label className="grid min-w-0 gap-1 sm:col-span-4"><span className={labelText}>Situação da validade</span><select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ExpiryStatus | ''); setPage(1) }} className={input}><option value="">Todas</option><option value="VENCIDO">Vencido</option><option value="EXPIRANDO">Vence em {EXPIRING_DAYS} dias</option><option value="REGULAR">Regular</option><option value="SEM_VALIDADE">Sem validade</option></select></label>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><span>Lotes <b className="ml-1 text-slate-900">{visibleRows.length}</b></span><span>Ordem <b className="ml-1 text-[#2D8DB8]">PEPS</b></span>{hasFilter && <button type="button" className={btnSecondary} onClick={clearFilters}><X size={14}/> Limpar filtro</button>}</div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1180px] table-fixed border-collapse text-xs"><thead><tr className={theadRow}><th className={`${th} w-12 text-center`}>#</th><th className={`${th} w-28`}>Código</th><th className={th}>Material</th><th className={`${th} w-44`}>Lote fornecedor</th><th className={`${th} w-32 text-right`}>Disponível</th><th className={`${th} w-24 text-center`}>Entrada</th><th className={`${th} w-24 text-center`}>Validade</th><th className={`${th} w-20 text-right`}>Dias</th><th className={`${th} w-44`}>Localização</th><th className={`${th} w-28 text-center`}>Qualidade</th><th className={`${th} w-32 text-center`}>Alerta</th></tr></thead>
        <tbody>{pageRows.map((row, index) => { const status = expiryStatus(row.data_validade, today); const days = daysUntil(row.data_validade, today); const quality = qualityInfo(row.status_inspecao); return <tr key={row.id} className={tr}><td className={`${td} text-center tabular-nums text-slate-400`}>{(page - 1) * PAGE_SIZE + index + 1}</td><td className={`${td} font-bold text-[#2D8DB8]`}>{row.codigo}</td><td className={`${td} max-w-0`}><div className="truncate font-semibold text-slate-800" title={row.descricao}>{row.descricao}</div>{row.armazenagem && <div className="truncate text-[11px] text-slate-500" title={row.armazenagem}>{row.armazenagem}</div>}</td><td className={`${td} max-w-0`}><div className="truncate font-mono font-semibold" title={row.lote_fornecedor}>{row.lote_fornecedor}</div>{row.lote_interno && row.lote_interno !== row.lote_fornecedor && <div className="truncate text-[11px] text-slate-500">Interno: {row.lote_interno}</div>}</td><td className={`${td} text-right font-semibold tabular-nums`}>{qtyFormat.format(row.quantidade_disponivel)} <span className="text-[11px] font-normal text-slate-500">{row.unidade}</span></td><td className={`${td} text-center tabular-nums`}>{formatDate(row.data_entrada)}</td><td className={`${td} text-center tabular-nums`}>{formatDate(row.data_validade)}</td><td className={`${td} text-right font-bold tabular-nums ${days === null ? 'text-slate-400' : days < 0 ? 'text-rose-700' : days <= EXPIRING_DAYS ? 'text-amber-700' : 'text-slate-700'}`}>{days === null ? '—' : days}</td><td className={`${td} max-w-0`}>{row.localizacao ? <span className="flex min-w-0 items-center gap-1" title={row.localizacao}><MapPin size={12} className="shrink-0 text-slate-400"/><span className="truncate">{row.localizacao}</span></span> : <span className="text-slate-400">Não informada</span>}</td><td className={`${td} text-center`}><Badge tone={quality.tone}>{quality.label}</Badge></td><td className={`${td} text-center`}><Badge tone={statusTone[status]}>{statusLabel[status]}</Badge></td></tr> })}
        {!pageRows.length && <tr><td colSpan={11} className="px-3 py-6 text-center text-xs text-slate-500">{busy ? 'Carregando…' : hasFilter ? 'Nenhum lote encontrado para o filtro.' : 'Nenhum lote registrado.'}</td></tr>}</tbody></table></div>
        <nav aria-label="Paginação dos lotes" className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2"><span aria-live="polite" className="text-xs font-semibold text-slate-600">{visibleRows.length ? `Exibindo ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visibleRows.length)} de ${visibleRows.length}` : 'Sem registros'}</span><div className="flex items-center gap-2"><button type="button" className={btnSecondary} disabled={page === 1} onClick={() => setPage(c => Math.max(1, c - 1))}>Anterior</button><span className="text-xs font-semibold text-slate-600">Página {page} de {pageCount}</span><button type="button" className={btnSecondary} disabled={page === pageCount} onClick={() => setPage(c => Math.min(pageCount, c + 1))}>Próxima</button></div></nav>
      </section>
    </main>
  </VendasLayout>
}
const card = 'overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-sm'
const btnBase = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50'
const btnSecondary = `${btnBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`
const input = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/30'
const labelText = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-500'
const theadRow = 'bg-slate-100 text-left'
const th = 'h-8 border-b border-slate-300 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600'
const tr = 'border-b border-slate-200 odd:bg-white even:bg-slate-50/60 hover:bg-sky-50/60'
const td = 'h-10 px-2 align-middle'
type Tone = 'slate' | 'amber' | 'rose' | 'emerald' | 'sky'
const toneClass: Record<Tone, string> = { slate: 'bg-slate-100 text-slate-700 border-slate-300', amber: 'bg-amber-50 text-amber-800 border-amber-300', rose: 'bg-rose-50 text-rose-700 border-rose-300', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300', sky: 'bg-sky-50 text-sky-700 border-sky-300' }
const kpiValueClass: Record<Tone, string> = { slate: 'text-slate-900', amber: 'text-amber-700', rose: 'text-rose-700', emerald: 'text-emerald-700', sky: 'text-sky-700' }
const kpiBarClass: Record<Tone, string> = { slate: 'border-l-slate-400', amber: 'border-l-amber-500', rose: 'border-l-rose-600', emerald: 'border-l-emerald-600', sky: 'border-l-sky-600' }
const statusTone: Record<ExpiryStatus, Tone> = { VENCIDO: 'rose', EXPIRANDO: 'amber', REGULAR: 'emerald', SEM_VALIDADE: 'slate' }
const statusLabel: Record<ExpiryStatus, string> = { VENCIDO: 'Vencido', EXPIRANDO: 'Vence em breve', REGULAR: 'Regular', SEM_VALIDADE: 'Sem validade' }
function qualityInfo(value: string | null): { tone: Tone; label: string } { const key = (value ?? '').toUpperCase(); if (!key) return { tone: 'slate', label: 'Não inspec.' }; if (['APROVADO', 'LIBERADO', 'ATIVO'].includes(key)) return { tone: 'emerald', label: key === 'ATIVO' ? 'Ativo' : 'Aprovado' }; if (['REPROVADO', 'BLOQUEADO', 'SEGREGADO'].includes(key)) return { tone: 'rose', label: key.charAt(0) + key.slice(1).toLowerCase() }; if (['QUARENTENA', 'PENDENTE', 'EM_INSPECAO'].includes(key)) return { tone: 'amber', label: key === 'EM_INSPECAO' ? 'Em inspeção' : key.charAt(0) + key.slice(1).toLowerCase() }; return { tone: 'slate', label: value ?? '' } }
function Badge({ tone, children }: { tone: Tone; children: ReactNode }) { return <span className={`inline-flex h-5 items-center rounded-[2px] border px-2 text-[10px] font-bold uppercase tracking-wide ${toneClass[tone]}`}>{children}</span> }
function Kpi({ label, value, tone, active, onClick }: { label: string; value: number; tone: Tone; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} aria-pressed={active} className={`flex h-16 flex-col justify-center rounded-[2px] border border-l-4 bg-white px-3 text-left shadow-sm hover:bg-slate-50 ${kpiBarClass[tone]} ${active ? 'border-[#2D8DB8] ring-1 ring-[#2D8DB8]/40' : 'border-slate-300'}`}><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span><span className={`text-xl font-extrabold tabular-nums ${value ? kpiValueClass[tone] : 'text-slate-400'}`}>{value}</span></button> }
