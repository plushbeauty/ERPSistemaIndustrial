/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-CONTROLADORIA-RAZAO-GERAL-KPI-PRINT-20261111-01
 * @STATUS_APROVACAO: INCREMENTO ADITIVO AUTORIZADO PELO PROPRIETARIO EM 2026-11-11.
 */
import { ArrowLeft, Info, Printer, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Account = {
  id: string
  codigo: string
  nome: string
  banco: string | null
  saldo_inicial: number
  ativo: boolean
}

type LedgerRow = {
  id: string
  documento: string | null
  descricao: string
  debito: number
  credito: number
  criado_em: string
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fieldClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500'
const actionClass = 'inline-flex h-[38px] items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold transition'
const exportCsv = (rows: LedgerRow[]) => {
  const quote = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"'
  const csv = ['Data;Documento;Descrição;Débito;Crédito', ...rows.map(row => [new Date(row.criado_em).toLocaleDateString('pt-BR'),row.documento ?? '',row.descricao,Number(row.debito ?? 0).toFixed(2).replace('.', ','),Number(row.credito ?? 0).toFixed(2).replace('.', ',')].map(quote).join(';'))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'plastibor-razao-geral.csv'; link.click(); URL.revokeObjectURL(url)
}

export default function PainelRazaoGeral() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [balance, setBalance] = useState(0)
  const [empresaId, setEmpresaId] = useState('')
  const [error, setError] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loading, setLoading] = useState(false)
  const [filtered, setFiltered] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    let active = true

    const loadAccounts = async () => {
      setLoadingAccounts(true)
      setError('')

      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        if (active) {
          setError(company.error?.message ?? 'Empresa de trabalho não identificada.')
          setLoadingAccounts(false)
        }
        return
      }

      const tenant = String(company.data)
      const result = await supabase
        .from('erp_contas_bancarias')
        .select('id,codigo,nome,banco,saldo_inicial,ativo')
        .eq('empresa_id', tenant)
        .eq('ativo', true)
        .order('nome')

      if (!active) return
      if (result.error) {
        setError(result.error.message)
      } else {
        setEmpresaId(tenant)
        setAccounts((result.data ?? []) as Account[])
      }
      setLoadingAccounts(false)
    }

    void loadAccounts()
    return () => {
      active = false
    }
  }, [])

  const loadLedger = async () => {
    setError('')
    if (!empresaId) {
      setError('Não foi possível identificar a empresa autenticada.')
      return
    }
    if (!accountId) {
      setRows([])
      setBalance(0)
      setFiltered(false)
      setError('Selecione uma conta bancária ou diário para consultar o razão.')
      return
    }

    setLoading(true)
    setFiltered(false)

    const ledgerRows: LedgerRow[] = []
    for (let offset = 0; ; offset += 1000) {
      const result = await supabase
        .from('erp_fiscal_razao_lancamentos')
        .select('id,documento,descricao,debito,credito,criado_em')
        .eq('empresa_id', empresaId)
        .eq('conta_bancaria_id', accountId)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 999)
      if (result.error) {
        setRows([])
        setBalance(0)
        setError(result.error.message)
        setLoading(false)
        return
      }
      ledgerRows.push(...((result.data ?? []) as LedgerRow[]))
      if (!result.data || result.data.length < 1000) break
    }
    const totalBalance = await supabase.rpc('erp_fiscal_saldo_razao', {
      p_conta_id: accountId,
    })

    if (totalBalance.error) {
      setRows(ledgerRows)
      setBalance(0)
      setError(totalBalance.error.message)
      setLoading(false)
      return
    }

    setRows(ledgerRows)
    setPage(1)
    setBalance(Number(totalBalance.data ?? 0))
    setFiltered(true)
    setLoading(false)
  }

  const totalDebit = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.debito ?? 0), 0),
    [rows],
  )
  const totalCredit = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.credito ?? 0), 0),
    [rows],
  )
  const selectedAccount = accounts.find((account) => account.id === accountId)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <main className="min-h-full bg-[#F4FBFD] p-4 text-slate-800 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1600px] space-y-4 print:max-w-none print:space-y-2">
        <div className="hidden border-b-2 border-[#123B50] pb-3 print:block">
          <div className="text-[19px] font-extrabold tracking-[0.16em] text-[#123B50]">PLASTIBOR</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Controladoria industrial · Razão geral</div>
          <div className="mt-1 text-[10px] text-slate-500">Conta/Diário: {selectedAccount ? `${selectedAccount.codigo} · ${selectedAccount.nome}` : '—'} · Emitido em {new Date().toLocaleString('pt-BR')}</div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={actionClass + ' w-[115px] border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Controladoria <span className="px-1 text-slate-300">›</span> Razão Geral
            </p>
            <h1 className="mt-1 text-[18px] font-bold tracking-tight text-[#123B50]">
              MONITOR DO RAZÃO GERAL — GL
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Consulta analítica de débitos, créditos e saldo contábil consolidado por conta bancária ou diário.
            </p>
          </div>
          <button type="button" onClick={() => window.print()} disabled={!filtered} className={actionClass + ' border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50'}>
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm print:shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Conta / Diário ativo</p>
            <p className="mt-1 truncate text-[14px] font-extrabold text-[#123B50]">{selectedAccount ? selectedAccount.nome : '—'}</p>
            <p className="mt-1 text-[9px] text-slate-500">{selectedAccount ? `${selectedAccount.codigo}${selectedAccount.banco ? ` · ${selectedAccount.banco}` : ''}` : `${accounts.length} conta(s) ativa(s) disponível(is)`}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm print:shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Total débitos da grade</p>
            <p className="mt-1 text-[17px] font-extrabold tabular-nums text-[#123B50]">{filtered ? money(totalDebit) : '—'}</p>
            <p className="mt-1 text-[9px] text-slate-500">{filtered ? `${rows.length} lançamento(s) exibidos` : 'Aguardando consulta'}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm print:shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Total créditos da grade</p>
            <p className="mt-1 text-[17px] font-extrabold tabular-nums text-[#123B50]">{filtered ? money(totalCredit) : '—'}</p>
            <p className="mt-1 text-[9px] text-slate-500">Soma dos lançamentos exibidos</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm print:shadow-none">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Saldo total do razão · RPC</p>
            <p className="mt-1 text-[17px] font-extrabold tabular-nums text-[#123B50]">{filtered ? money(balance) : '—'}</p>
            <p className="mt-1 text-[9px] text-slate-500">Saldo integral calculado no banco</p>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[280px_340px_140px]">
            <div>
              <label htmlFor="razao-empresa" className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                Empresa <span className="text-rose-500">*</span>
              </label>
              <input
                id="razao-empresa"
                className={fieldClass}
                value="Empresa atual"
                readOnly
                disabled
              />
            </div>

            <div>
              <label htmlFor="razao-conta" className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                Banco / Diário <span className="text-rose-500">*</span>
              </label>
              <select
                id="razao-conta"
                className={fieldClass}
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value)
                  setRows([])
                  setBalance(0)
                  setFiltered(false)
                  setError('')
                }}
                disabled={loadingAccounts}
              >
                <option value="">
                  {loadingAccounts ? 'Carregando contas…' : 'Selecione'}
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.codigo} · {account.nome}
                    {account.banco ? ` — ${account.banco}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void loadLedger()}
              disabled={loading || loadingAccounts}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#123B50] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1A536D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Filtrando…' : 'Filtrar'}
            </button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-slate-500">
            <Info size={15} className="mt-0.5 shrink-0 text-sky-600" />
            Grade: todos os lançamentos da conta, paginados na tela. O saldo é calculado no banco sobre todo o razão da conta.
          </p>

          {error && (
            <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </section>

        {error && <div role="alert" className="hidden rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 print:block">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-[14px] font-bold text-[#123B50]">
                Movimentações do Razão Contábil
              </h2>
              {selectedAccount && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedAccount.codigo} · {selectedAccount.nome}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 print:hidden"><span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{rows.length.toLocaleString('pt-BR')} lançamento(s)</span><button type="button" disabled={!filtered} onClick={() => exportCsv(rows)} className={actionClass+' border border-slate-200 bg-white text-slate-700 disabled:opacity-50'}>Exportar CSV</button></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[12px] print:min-w-0 print:text-[9px]">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 print:bg-slate-200 print:text-slate-900">
                <tr className="h-11 border-b border-slate-200 print:h-8">
                  <th className="px-4 text-left">Data</th>
                  <th className="px-4 text-left">Documento</th>
                  <th className="px-4 text-left">Descrição</th>
                  <th className="px-4 text-right">Débito (R$)</th>
                  <th className="px-4 text-right">Crédito (R$)</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="h-12 border-b border-slate-100 text-slate-700 last:border-0 hover:bg-slate-50/70 print:h-8">
                    <td className="whitespace-nowrap px-4">
                      {new Date(row.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4">{row.documento ?? '—'}</td>
                    <td className="px-4">{row.descricao}</td>
                    <td className="whitespace-nowrap px-4 text-right tabular-nums">
                      {money(Number(row.debito ?? 0))}
                    </td>
                    <td className="whitespace-nowrap px-4 text-right tabular-nums">
                      {money(Number(row.credito ?? 0))}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="h-28 px-4 text-center text-[13px] text-slate-400">
                      {loading
                        ? 'Consultando lançamentos reais do razão…'
                        : filtered
                          ? 'Nenhum lançamento encontrado para esta conta.'
                          : 'Selecione uma conta bancária.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/70 px-5 py-4 print:break-inside-avoid">
            <p className="text-[12px] font-medium text-slate-600">
              Débitos <strong className="text-slate-800">{money(totalDebit)}</strong>
              <span className="px-2 text-slate-300">·</span>
              Créditos <strong className="text-slate-800">{money(totalCredit)}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-3 print:hidden"><button type="button" disabled={!filtered || page<=1} onClick={()=>setPage(p=>p-1)} className={actionClass+' border border-slate-200 bg-white text-slate-700 disabled:opacity-40'}>Anterior</button><span className="text-[11px] font-semibold">Página {page} de {pageCount}</span><button type="button" disabled={!filtered || page>=pageCount} onClick={()=>setPage(p=>p+1)} className={actionClass+' border border-slate-200 bg-white text-slate-700 disabled:opacity-40'}>Próxima</button></div>
            <div className="rounded-lg border border-slate-300 bg-[#F8FAFC] px-[18px] py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Saldo total do razão (RPC)
              </p>
              <p className="text-[16px] font-bold tabular-nums text-[#123B50]">
                {money(balance)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
