/**
 * SYSNQRA ERP & SGQ INDUSTRIAL
 * REVISÃO: 1.0 | DATA: 20/10/2026
 * ESCOPO: consulta operacional de lotes, validade, FIFO/PEPS e localização física.
 * PRESERVADO: shell global e geometria das telas existentes; esta página não altera estilos globais.
 * SEGURANÇA: tenant obtido pela RPC erp_current_empresa_id e filtro empresa_id em todas as consultas.
 * NOTA: utiliza o contrato existente de erp_estoque_lotes; não cria tabela paralela.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, CalendarClock, MapPin, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type LotRow = {
  id: string
  empresa_id: string
  produto_id: string
  lote_interno: string
  lote_fornecedor: string | null
  quantidade_recebida: number | null
  quantidade_disponivel: number | null
  quantidade_reservada: number | null
  localizacao: string | null
  status_inspecao: string | null
  data_entrada: string
  data_validade: string | null
  created_at: string
}
type ProductRow = { id: string; codigo: string | null; nome: string | null; unidade_medida: string | null }
type InventoryLot = LotRow & { codigo: string; descricao: string; unidade: string }

type ExpiryStatus = 'VENCIDO' | 'EXPIRANDO' | 'REGULAR' | 'SEM VALIDADE'

const todayISO = () => {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

function expiryStatus(expiry: string | null, today: string): ExpiryStatus {
  if (!expiry) return 'SEM VALIDADE'
  const days = Math.floor((Date.parse(expiry + 'T00:00:00') - Date.parse(today + 'T00:00:00')) / 86400000)
  if (days <= 0) return 'VENCIDO'
  if (days <= 30) return 'EXPIRANDO'
  return 'REGULAR'
}

function formatDate(value: string | null) {
  if (!value) return 'Não informada'
  const parts = value.slice(0, 10).split('-')
  return parts.length === 3 ? parts.reverse().join('/') : value
}

export default function InventarioValidade() {
  const [rows, setRows] = useState<InventoryLot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [today, setToday] = useState(todayISO)

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
        fetchAllPages<LotRow>((from, to) => supabase
          .from('erp_estoque_lotes')
          .select('id,empresa_id,produto_id,lote_interno,lote_fornecedor,quantidade_recebida,quantidade_disponivel,quantidade_reservada,localizacao,status_inspecao,data_entrada,data_validade,created_at', { count: 'exact' })
          .eq('empresa_id', tenantId)
          .order('data_entrada', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, to)),
        fetchAllPages<ProductRow>((from, to) => supabase
          .from('erp_produtos')
          .select('id,codigo,nome,unidade_medida', { count: 'exact' })
          .eq('empresa_id', tenantId)
          .order('codigo', { ascending: true })
          .range(from, to)),
      ])
      const products = new Map(productRows.map(product => [product.id, product]))
      setRows(lotRows.map(lot => {
        const product = products.get(lot.produto_id)
        return {
          ...lot,
          codigo: product?.codigo ?? '—',
          descricao: product?.nome ?? 'Produto não localizado',
          unidade: product?.unidade_medida ?? '',
        }
      }))
      setCompanyId(tenantId)
      setToday(todayISO())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar lotes e validade.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return rows.filter(row => !term || [
      row.codigo, row.descricao, row.lote_interno, row.lote_fornecedor ?? '', row.localizacao ?? '',
    ].some(value => value.toLocaleLowerCase('pt-BR').includes(term)))
      // PEPS/FIFO usa data de entrada; validade é um alerta independente (FEFO não é sinônimo de FIFO).
      .sort((a, b) => a.data_entrada.localeCompare(b.data_entrada) || a.created_at.localeCompare(b.created_at))
  }, [rows, search])

  const totals = useMemo(() => {
    let expired = 0
    let expiring = 0
    let missingExpiry = 0
    for (const row of rows) {
      const status = expiryStatus(row.data_validade, today)
      if (status === 'VENCIDO') expired += 1
      if (status === 'EXPIRANDO') expiring += 1
      if (status === 'SEM VALIDADE') missingExpiry += 1
    }
    return { expired, expiring, missingExpiry, total: rows.length }
  }, [rows, today])

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 antialiased sm:p-6">
      <header className="mb-5 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">ESTOQUE • RASTREABILIDADE</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Controle de Validade e FIFO / PEPS</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">SYSNQRA ERP &amp; SGQ INDUSTRIAL · lotes, shelf-life e localização física</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </header>

      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className={'rounded-lg border bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ' + (totals.expired ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200')}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Lotes vencidos</span><AlertTriangle size={17} className="text-rose-600" /></div>
          <div className={'mt-2 text-2xl font-extrabold ' + (totals.expired ? 'text-rose-600' : 'text-slate-900')}>{totals.expired}</div>
          <p className="mt-1 text-[10px] text-slate-500">Bloqueio operacional deve ser aplicado no fluxo de baixa</p>
        </article>
        <article className="rounded-lg border border-amber-200 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Vencem em até 30 dias</span><CalendarClock size={17} className="text-amber-600" /></div>
          <div className={'mt-2 text-2xl font-extrabold ' + (totals.expiring ? 'text-amber-600' : 'text-slate-900')}>{totals.expiring}</div>
          <p className="mt-1 text-[10px] text-slate-500">Lotes que exigem prioridade de consumo</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Total de lotes</span><Boxes size={17} className="text-sky-700" /></div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{totals.total}</div>
          <p className="mt-1 text-[10px] text-slate-500">Registros existentes na empresa autenticada</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Sem validade informada</span><ShieldCheck size={17} className="text-slate-500" /></div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{totals.missingExpiry}</div>
          <p className="mt-1 text-[10px] text-slate-500">Não classificado como regular sem data registrada</p>
        </article>
      </section>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <label htmlFor="inventory-expiry-search" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-600">Filtro de rastreabilidade</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="inventory-expiry-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Código, descrição, lote ou localização..." className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600" />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div><h2 className="text-xs font-bold text-slate-900">Fila de lotes · PEPS</h2><p className="mt-1 text-[10px] text-slate-500">Ordenação pela data de entrada mais antiga primeiro</p></div>
          <span className="text-[10px] font-semibold text-slate-500">{filtered.length} registro(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">Código</th><th className="min-w-44 px-3 py-3">Material</th><th className="whitespace-nowrap px-3 py-3">Lote interno / fornecedor</th><th className="whitespace-nowrap px-3 py-3 text-right">Disponível</th><th className="whitespace-nowrap px-3 py-3">Entrada</th><th className="whitespace-nowrap px-3 py-3">Validade</th><th className="whitespace-nowrap px-3 py-3">Localização física</th><th className="whitespace-nowrap px-3 py-3">Qualidade</th><th className="whitespace-nowrap px-3 py-3">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">Consultando lotes reais do banco…</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">Nenhum lote encontrado para a pesquisa.</td></tr> :
                filtered.map(row => {
                  const status = expiryStatus(row.data_validade, today)
                  const rowStyle = status === 'VENCIDO' ? 'bg-rose-50/70 hover:bg-rose-50' : status === 'EXPIRANDO' ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/70'
                  const badgeStyle = status === 'VENCIDO' ? 'bg-rose-100 text-rose-800' : status === 'EXPIRANDO' ? 'bg-amber-100 text-amber-800' : status === 'REGULAR' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  return <tr key={row.id} className={rowStyle}>
                    <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-800">{row.codigo}</td>
                    <td className="px-3 py-3"><div className="font-semibold text-slate-800">{row.descricao}</div><div className="mt-0.5 text-[10px] text-slate-500">{row.unidade || 'Unidade não informada'}</div></td>
                    <td className="whitespace-nowrap px-3 py-3"><div className="font-semibold">{row.lote_interno}</div><div className="mt-0.5 text-[10px] text-slate-500">{row.lote_fornecedor || 'Fornecedor não informado'}</div></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{Number(row.quantidade_disponivel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(row.data_entrada)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(row.data_validade)}</td>
                    <td className="min-w-36 px-3 py-3"><span className="inline-flex items-center gap-1"><MapPin size={12} className="text-slate-400" />{row.localizacao || 'Não informada'}</span></td>
                    <td className="whitespace-nowrap px-3 py-3">{row.status_inspecao || 'Não informado'}</td>
                    <td className="whitespace-nowrap px-3 py-3"><span className={'inline-flex rounded px-2 py-1 text-[9px] font-bold ' + badgeStyle}>{status}</span></td>
                  </tr>
                })
              }
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500">
          <span>Tenant: {companyId ? 'empresa autenticada' : 'aguardando sessão'} · RLS/PostgreSQL</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Leitura tenant-scoped · sem gravação direta de saldo</span>
        </footer>
      </section>
    </main>
  )
}
