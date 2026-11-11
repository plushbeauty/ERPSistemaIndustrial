/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-ESTORNO-CONTABIL-SOLICITACAO-20261109-01 + REV-ESTORNO-RBAC-GRADE-20261110-02 — preserva RPC, reforça RBAC/tenant, paginação, totalizadores e exportação.
 * @STATUS_APROVACAO: SOLICITAÇÃO AUDITÁVEL; NÃO EXECUTA REVERSÃO CONTÁBIL OU CANCELAMENTO DE NF-e.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileSpreadsheet, Printer, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type ReversalRequest = {
  id: string
  documento_alvo: string
  data_estorno: string
  justificativa: string
  criado_em: string
}

const localDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return localDate(date)
}

const control = 'h-10 w-full rounded-md border border-[#CBD9E0] bg-white px-3 text-sm text-[#183B4D] outline-none transition focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#526C79]'
const button = 'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-3 text-xs font-semibold text-[#23495B] transition hover:bg-[#F1F7F9] disabled:cursor-not-allowed disabled:opacity-50'

export default function EstornoLancamentos() {
  const navigate = useNavigate()
  const [access, setAccess] = useState<boolean | null>(null)
  const [document, setDocument] = useState('')
  const [reversalDate, setReversalDate] = useState(defaultDate())
  const [justification, setJustification] = useState('')
  const [rows, setRows] = useState<ReversalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filterText, setFilterText] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const checkAccess = useCallback(async () => {
    const auth = await supabase.auth.getUser()
    if (auth.error) throw auth.error
    if (!auth.data.user) {
      navigate('/login', { replace: true })
      return
    }
    const [permission, tenant] = await Promise.all([
      supabase.rpc('erp_has_permission', { p_code: 'finance.create' }),
      supabase.rpc('erp_current_empresa_id'),
    ])
    if (permission.error) throw permission.error
    if (tenant.error) throw tenant.error
    if (!tenant.data) {
      setAccess(false)
      setError('Esta operação exige uma empresa ativa na sessão. O perfil Master sem empresa selecionada não pode gravar solicitações.')
      return
    }
    if (permission.data !== true) {
      setAccess(false)
      setError('A permissão Financeiro: lançar (finance.create) é necessária para registrar solicitações.')
      return
    }
    setAccess(true)
  }, [navigate])

  useEffect(() => {
    void checkAccess().catch(cause => {
      setAccess(false)
      setError(cause instanceof Error ? cause.message : 'Não foi possível validar sessão, empresa e permissão.')
    })
  }, [checkAccess])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const result = await fetchAllPages<ReversalRequest>((from, to) => supabase
        .from('erp_fiscal_estornos')
        .select('id,documento_alvo,data_estorno,justificativa,criado_em', { count: 'exact' })
        .eq('empresa_id', String(tenant.data))
        .order('criado_em', { ascending: false })
        .order('id')
        .range(from, to))
      setRows(result)
      setPage(1)
    } catch (cause) {
      setRows([])
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar solicitações de estorno.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (access === true) void load()
  }, [access, load])

  const filteredRows = useMemo(() => rows.filter(row =>
    (!filterText || row.documento_alvo.toLowerCase().includes(filterText.trim().toLowerCase())) &&
    (!filterMonth || row.data_estorno.slice(0, 7) === filterMonth)
  ), [rows, filterText, filterMonth])

  useEffect(() => setPage(1), [filterText, filterMonth])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const todayCount = rows.filter(row => new Date(row.criado_em).toDateString() === new Date().toDateString()).length
  const distinctDocuments = new Set(rows.map(row => row.documento_alvo)).size
  const distinctDates = new Set(rows.map(row => row.data_estorno)).size
  const cards = [
    ['Solicitações registradas', rows.length],
    ['Registradas hoje', todayCount],
    ['Documentos distintos', distinctDocuments],
    ['Datas solicitadas', distinctDates],
  ] as const

  const exportCsv = () => {
    const lines = [
      ['Documento', 'Data solicitada', 'Justificativa', 'Registrado em'],
      ...filteredRows.map(row => [
        row.documento_alvo,
        row.data_estorno,
        row.justificativa,
        new Date(row.criado_em).toLocaleString('pt-BR'),
      ]),
    ]
    const csv = '\ufeff' + lines.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = 'solicitacoes-estorno-contabil.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const registerRequest = async () => {
    setError('')
    setMessage('')
    if (access !== true) {
      setError('Acesso não autorizado para registrar solicitações.')
      return
    }
    if (!document.trim() || !justification.trim()) {
      setError('Documento e justificativa são obrigatórios.')
      return
    }
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(reversalDate)
      && Number.isFinite(Date.parse(`${reversalDate}T00:00:00Z`))
      && new Date(`${reversalDate}T00:00:00Z`).toISOString().slice(0, 10) === reversalDate
    if (!validDate) {
      setError('Informe uma data solicitada válida.')
      return
    }

    setSaving(true)
    try {
      const result = await supabase.rpc('erp_fiscal_estornar_documento', {
        p_documento: document.trim(),
        p_data: reversalDate,
        p_justificativa: justification.trim(),
      })
      if (result.error) throw result.error
      setDocument('')
      setJustification('')
      setReversalDate(defaultDate())
      setMessage('Solicitação registrada. Nenhum lançamento contábil foi revertido e nenhuma NF-e foi cancelada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar a solicitação de estorno.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="erp-dense fiscal-workspace min-h-full space-y-4 bg-[#F4FBFD] p-4 text-[#183B4D] print:bg-white print:p-0">
      <div className="hidden border-b-2 border-[#123B50] pb-3 print:block">
        <strong className="text-[19px] tracking-[.16em]">PLASTIBOR</strong>
        <p className="text-[10px]">Fiscal / Controladoria · Solicitações de estorno contábil</p>
        <p className="text-[10px]">Emitido em {new Date().toLocaleString('pt-BR')}</p>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3E3EA] pb-3 print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/fiscal" className="inline-flex h-[38px] w-[115px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] shadow-sm transition hover:bg-slate-50">
            <ArrowLeft size={14}/>Voltar
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#2D8DB8]">FISCAL › CONTABILIDADE › ESTORNOS</p>
            <h1 className="text-xl font-bold tracking-tight">Solicitações de estorno contábil</h1>
            <p className="mt-1 text-xs text-[#607987]">Registro auditável por empresa; não executa reversão contábil nem cancelamento de NF-e.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={!filteredRows.length} className={button}><FileSpreadsheet size={14}/>Exportar CSV</button>
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#176B91] px-4 text-xs font-semibold text-white"><Printer size={14}/>Imprimir / PDF</button>
        </div>
      </header>

      <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
        <div className="flex items-center gap-2 font-bold"><ShieldCheck size={15}/>Escopo da operação</div>
        <p className="mt-1">A RPC <code>erp_fiscal_estornar_documento</code> registra documento, data e justificativa no histórico da empresa. Ela não reverte lançamentos, não cancela NF-e e não altera títulos financeiros.</p>
      </section>

      {access === null && <div role="status" className="rounded-lg border border-[#D3E3EA] bg-white p-4 text-sm">Validando sessão, empresa e permissão Financeiro: lançar…</div>}
      {access === false && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error || 'Acesso restrito: empresa ativa e permissão finance.create são obrigatórias.'}</div>}
      {access === true && <>
        {error && <div role="alert" className="rounded-md border border-[#D65B61]/40 bg-[#FFF4F3] px-3 py-2 text-xs text-[#A53D45]">{error}</div>}
        {message && <div role="status" className="rounded-md border border-[#3A9D78]/30 bg-[#EFF9F4] px-3 py-2 text-xs text-[#267653]">{message}</div>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
          {cards.map(([name, value]) => <article key={name} className="min-h-[96px] rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#607987]">{name}</p>
            <strong className="mt-2 block text-xl font-bold tabular-nums text-[#123B50]">{loading || error ? '—' : value}</strong>
          </article>)}
        </section>

        <section className="rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide">Nova solicitação</h2>
          <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(180px,1fr)_170px_minmax(260px,1.5fr)_auto]">
            <label><span className={label}>Documento alvo *</span><input className={control} value={document} onChange={event => setDocument(event.target.value)} maxLength={120} placeholder="Número / identificador"/></label>
            <label><span className={label}>Data solicitada *</span><input type="date" className={control} value={reversalDate} onChange={event => setReversalDate(event.target.value)}/></label>
            <label><span className={label}>Justificativa *</span><input className={control} value={justification} onChange={event => setJustification(event.target.value)} maxLength={2000} placeholder="Motivo documentado da solicitação"/></label>
            <button type="button" onClick={() => void registerRequest()} disabled={saving || loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176B91] px-4 text-xs font-semibold text-white disabled:opacity-50">
              {saving ? 'Registrando…' : 'Registrar solicitação'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-sm font-bold">Histórico de solicitações</h2><p className="mt-1 text-[10px] text-[#718792]">Registro imutável para rastreabilidade; sem edição ou exclusão de auditoria.</p></div>
            <div className="flex flex-wrap items-end gap-2 print:hidden">
              <label><span className={label}>Filtrar documento</span><input className={control+' w-52'} value={filterText} onChange={event => setFilterText(event.target.value)} placeholder="Número ou identificador"/></label>
              <label><span className={label}>Data solicitada</span><input type="month" className={control+' w-40'} value={filterMonth} onChange={event => setFilterMonth(event.target.value)}/></label>
              <button type="button" onClick={() => void load()} disabled={loading} className={button}><RefreshCw size={13} className={loading?'animate-spin':''}/>Atualizar</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-xs">
              <thead className="bg-[#EAF2F6] text-left text-[10px] uppercase tracking-wide text-[#526C79]">
                <tr className="h-10"><th className="px-3">Documento</th><th className="px-3">Data solicitada</th><th className="px-3">Justificativa</th><th className="px-3">Registrado em</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="h-16 text-center text-[#607987]">Carregando solicitações reais…</td></tr>
                  : error ? <tr><td colSpan={4} className="h-16 text-center text-[#A53D45]">Falha ao carregar. Atualize após corrigir o erro.</td></tr>
                  : pageRows.length ? pageRows.map(row => <tr key={row.id} className="h-12 border-b border-[#E6EDF1]">
                    <td className="px-3 font-mono font-semibold">{row.documento_alvo}</td>
                    <td className="px-3 tabular-nums">{new Date(row.data_estorno+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="max-w-[560px] whitespace-pre-wrap px-3">{row.justificativa}</td>
                    <td className="whitespace-nowrap px-3">{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(row.criado_em))}</td>
                  </tr>)
                  : <tr><td colSpan={4} className="h-16 text-center text-[#718792]">Nenhuma solicitação encontrada para os filtros e empresa atuais.</td></tr>}
              </tbody>
              <tfoot><tr className="h-12 border-t-2 border-[#D3E3EA] bg-[#F4F8FA] text-[10px] font-bold">
                <td className="px-3">TOTAL: {filteredRows.length} solicitação(ões)</td>
                <td className="px-3">{new Set(filteredRows.map(row => row.documento_alvo)).size} documento(s)</td>
                <td colSpan={2} className="px-3 text-right">Datas solicitadas: {new Set(filteredRows.map(row => row.data_estorno)).size}</td>
              </tr></tfoot>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#607987] print:hidden">
            <span>Página {page} de {pageCount} · {filteredRows.length} registros filtrados · {rows.length} no histórico completo</span>
            <div className="flex gap-2">
              <button type="button" className={button} disabled={page<=1} onClick={() => setPage(value => Math.max(1,value-1))}>Anterior</button>
              <button type="button" className={button} disabled={page>=pageCount} onClick={() => setPage(value => Math.min(pageCount,value+1))}>Próxima</button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#D3E3EA] bg-white p-4 text-[11px] text-[#526C79] print:hidden">
          <h2 className="font-bold uppercase tracking-wide">Como usar esta tela</h2>
          <p className="mt-2"><strong>Para que serve:</strong> registrar e consultar solicitações de estorno com trilha de auditoria por empresa.</p>
          <p className="mt-1"><strong>Passo a passo:</strong> informe o documento, a data solicitada e a justificativa; revise os dados e acione Registrar solicitação. Use os filtros para localizar registros anteriores.</p>
          <p className="mt-1"><strong>Regras importantes:</strong> exige sessão, empresa ativa e permissão Financeiro: lançar; a RPC grava apenas a solicitação. O histórico é imutável e não substitui o estorno contábil, cancelamento fiscal ou ajuste de títulos.</p>
        </section>
      </>}
      <style>{'@media print { @page { size: landscape; margin: 12mm; } body { background: #fff !important; } main { background: #fff !important; padding: 0 !important; } }'}</style>
    </main>
  )
}
