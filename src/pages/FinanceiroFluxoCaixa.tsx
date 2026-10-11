import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import IndustrialPageShell, { SectionCard, Table, Field, ToolbarButton } from '../components/industrial/IndustrialPageShell'

type Row = { id: string; tipo: string; entidade: string; vencimento: string; valor: number; status: string }
type RawRow = { id: string; tipo: string | null; descricao: string | null; vencimento: string | null; valor: number | null; status: string | null }
const PAGE_SIZE = 25

export default function FinanceiroFluxoCaixa() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [page, setPage] = useState(0)

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const { data: company, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (typeof company !== 'string' || !company) throw new Error('Empresa da sessão não identificada.')
      const data = await fetchAllPages<RawRow>((from, to) => supabase
        .from('erp_financeiro_lancamentos')
        .select('id,tipo,descricao,vencimento,valor,status', { count: 'exact' })
        .eq('empresa_id', company)
        .order('vencimento')
        .range(from, to))
      setRows(data.map(value => ({
        id: value.id,
        tipo: String(value.tipo ?? ''),
        entidade: String(value.descricao ?? ''),
        vencimento: String(value.vencimento ?? ''),
        valor: Number(value.valor ?? 0),
        status: String(value.status ?? ''),
      })))
      setPage(0)
    } catch (cause) {
      setRows([])
      setMsg(`${cause instanceof Error ? cause.message : 'Não foi possível consultar os lançamentos financeiros.'} Nenhum dado fictício foi criado.`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)) }, [pageCount])

  const tone = (status: string) => {
    const value = status.toUpperCase()
    if (['PAGO', 'LIQUIDADO', 'LIBERADO', 'CONFORME'].some(token => value.includes(token))) return 'ips-status-green'
    if (['VENCIDO', 'BLOQUEADO', 'RECUSADO'].some(token => value.includes(token))) return 'ips-status-rose'
    return 'ips-status-amber'
  }
  const totals = useMemo(() => rows.reduce((result, row) => {
    const type = row.tipo.trim().toLowerCase()
    if (type === 'receita' || type === 'entrada') result.receitas += row.valor
    if (type === 'despesa' || type === 'saida' || type === 'saída') result.despesas += row.valor
    return result
  }, { receitas: 0, despesas: 0 }), [rows])
  const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return <IndustrialPageShell
    module="Financeiro / Fluxo de Caixa"
    title="Gestão de Duplicatas e Fluxo de Caixa"
    subtitle="Lançamentos reais da empresa da sessão; listas completas paginadas para consulta."
    actions={[{ label: 'ATUALIZAR', type: 'neutral', icon: <RefreshCw size={18} />, onClick: () => void load() }]}
  >
    <SectionCard title="1. Lançamentos financeiros">
      {msg && <p role="alert" className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{msg}</p>}
      <Table>
        <thead><tr><th>Tipo</th><th>Entidade / Parceiro</th><th>Vencimento</th><th>Valor (R$)</th><th>Status</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5}>Consultando lançamentos...</td></tr> :
            rows.length === 0 ? <tr><td colSpan={5}>{msg ? 'Dados indisponíveis até corrigir a consulta.' : 'Nenhum lançamento financeiro disponível.'}</td></tr> :
              visibleRows.map(row => <tr key={row.id}>
                <td>{row.tipo}</td><td>{row.entidade}</td><td>{row.vencimento || '—'}</td>
                <td>{money(row.valor)}</td><td className={tone(row.status)}>{row.status || '—'}</td>
              </tr>)}
        </tbody>
      </Table>
      <nav aria-label="Paginação do fluxo de caixa" className="flex items-center justify-end gap-3 border-t border-slate-200 p-3">
        <button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-3 text-xs disabled:opacity-50">ANTERIOR</button>
        <span aria-live="polite" className="text-xs text-slate-600">Página {page + 1} de {pageCount}</span>
        <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-3 text-xs disabled:opacity-50">PRÓXIMA</button>
      </nav>
    </SectionCard>
    <SectionCard title="2. Resumo dos lançamentos consultados">
      <div className="ips-grid-2">
        <Field label="Receitas / entradas"><input readOnly value={money(totals.receitas)} /></Field>
        <Field label="Despesas / saídas"><input readOnly value={money(totals.despesas)} /></Field>
        <Field label="Resultado líquido dos lançamentos"><input readOnly value={money(totals.receitas - totals.despesas)} /></Field>
        <Field label="Quantidade de lançamentos"><input readOnly value={String(rows.length)} /></Field>
      </div>
      <p className="mt-3 text-xs text-slate-600">O resultado soma os lançamentos carregados da empresa; não representa saldo bancário conciliado.</p>
      <div className="ips-bottom-actions"><ToolbarButton tone="neutral" onClick={() => void load()}>ATUALIZAR</ToolbarButton></div>
    </SectionCard>
  </IndustrialPageShell>
}
