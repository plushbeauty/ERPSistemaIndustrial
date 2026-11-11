/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-11
 * @REVISAO: REV-RAZAO-GERAL-GL-REAL-20261111-01 — filtros oficiais, grade de 1.000 linhas e saldo integral calculado sobre todo o razão.
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO EM BRANCH DE INTEGRAÇÃO; aguardando gates e validação visual.
 */
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import BankAccountManager from '../banking/BankAccountManager'

type Account = { id: string; codigo: string; nome: string; banco: string | null; saldo_inicial: number; ativo: boolean }
type LedgerRow = { id: string; documento: string | null; descricao: string; debito: number; credito: number; criado_em: string }
const input = 'h-10 rounded-md border border-[#D3E3EA] bg-white px-3 text-xs text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#547080]'
const button = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-bold'
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PainelRazaoGeral() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [balance, setBalance] = useState(0)
  const [empresaId, setEmpresaId] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadAccounts = useCallback(async () => {
    setError('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) throw company.error ?? new Error('Empresa de trabalho não identificada.')
    const tenant = String(company.data)
    setEmpresaId(tenant)
    const [accountResult, companyResult] = await Promise.all([
      supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco,saldo_inicial,ativo').eq('empresa_id', tenant).eq('ativo', true).order('nome'),
      supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', tenant).maybeSingle(),
    ])
    if (accountResult.error) throw accountResult.error
    if (companyResult.error) throw companyResult.error
    setAccounts((accountResult.data ?? []) as Account[])
    setEmpresaNome(companyResult.data?.nome_fantasia?.trim() || companyResult.data?.razao_social?.trim() || 'Empresa ativa')
  }, [])

  const loadLedger = useCallback(async () => {
    if (!accountId || !empresaId) {
      setRows([])
      setBalance(0)
      return
    }
    setLoading(true)
    setError('')
    try {
      const account = accounts.find(item => item.id === accountId)
      if (!account) throw new Error('Conta bancária não encontrada na empresa ativa.')
      const allRows = await fetchAllPages<LedgerRow>((from, to) => supabase
        .from('erp_fiscal_razao_lancamentos')
        .select('id,documento,descricao,debito,credito,criado_em', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('conta_bancaria_id', accountId)
        .order('criado_em', { ascending: false })
        .range(from, to))
      setRows(allRows.slice(0, 1000))
      const movementBalance = allRows.reduce((total, row) => total + Number(row.debito || 0) - Number(row.credito || 0), 0)
      setBalance(Number(account.saldo_inicial || 0) + movementBalance)
    } catch (cause) {
      setRows([])
      setBalance(0)
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar o razão geral.')
    } finally {
      setLoading(false)
    }
  }, [accountId, accounts, empresaId])

  useEffect(() => {
    void loadAccounts().catch(cause => setError(cause instanceof Error ? cause.message : 'Falha ao carregar empresa e contas.'))
  }, [loadAccounts])
  useEffect(() => { void loadLedger() }, [loadLedger])

  const totalDebit = useMemo(() => rows.reduce((sum, row) => sum + Number(row.debito || 0), 0), [rows])
  const totalCredit = useMemo(() => rows.reduce((sum, row) => sum + Number(row.credito || 0), 0), [rows])

  return (
    <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <nav aria-label="Breadcrumb" className="text-[11px] font-semibold uppercase tracking-wide text-[#66808D]">Controladoria › Razão Geral</nav>
        <header className="flex flex-wrap items-center gap-3">
          <button type="button" className={button + ' w-[115px] border border-[#D3E3EA] bg-white text-[#315466]'} onClick={() => navigate(-1)}><ArrowLeft size={14} />Voltar</button>
          <div><h1 className="text-base font-bold">Monitor do Razão Geral — GL</h1><p className="text-[10px] text-[#66808D]">Consulta de lançamentos contábeis por banco/diário, com saldo integral da conta.</p></div>
        </header>
        <section className="rounded-lg border border-[#D3E3EA] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-[280px]">
              <label className={label}>Empresa</label>
              <input className={input + ' w-full bg-[#F3F6F8]'} value={empresaNome} readOnly aria-readonly="true" />
            </div>
            <div className="w-full sm:w-[340px]">
              <label className={label}>Banco / Diário *</label>
              <select className={input + ' w-full'} value={accountId} onChange={event => setAccountId(event.target.value)}>
                <option value="">Selecione uma conta bancária</option>
                {accounts.map(account => <option key={account.id} value={account.id}>{account.codigo} · {account.nome}</option>)}
              </select>
            </div>
            <BankAccountManager onCreated={() => { void loadAccounts().then(() => void loadLedger()).catch(cause => setError(cause instanceof Error ? cause.message : 'Falha ao atualizar contas.')) }} />
            <button type="button" className={button + ' w-[140px] bg-[#176487] text-white'} onClick={() => void loadLedger()} disabled={loading || !accountId}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Filtrar</button>
          </div>
          {error && <div className="mt-3 rounded border border-[#D65B61]/30 bg-[#FFF4F4] px-3 py-2 text-xs text-[#A63C3C]" role="alert">{error}</div>}
          <p className="mt-3 text-[10px] text-[#66808D]">Exibindo os últimos 1.000 lançamentos. O saldo integral considera o saldo inicial da conta e todos os lançamentos recuperados do razão.</p>
          <div className="mt-2 max-h-[560px] overflow-auto rounded border border-[#D3E3EA]">
            <table className="w-full min-w-[760px] border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#123B50] text-white"><tr className="h-10"><th className="px-3 text-left">Data</th><th className="px-3 text-left">Documento</th><th className="px-3 text-left">Descrição</th><th className="px-3 text-right">Débito (R$)</th><th className="px-3 text-right">Crédito (R$)</th></tr></thead>
              <tbody>{rows.map(row => <tr key={row.id} className="h-12 border-b border-[#E6EEF2] even:bg-[#F8FBFC]"><td className="px-3">{new Date(row.criado_em).toLocaleDateString('pt-BR')}</td><td className="px-3">{row.documento ?? '—'}</td><td className="px-3">{row.descricao}</td><td className="px-3 text-right tabular-nums">{money(Number(row.debito))}</td><td className="px-3 text-right tabular-nums">{money(Number(row.credito))}</td></tr>)}
                {!rows.length && <tr><td colSpan={5} className="h-16 text-center text-[#66808D]">{loading ? 'Consultando razão…' : accountId ? 'Nenhum lançamento encontrado para esta conta.' : 'Selecione uma conta bancária.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded bg-[#123B50] px-3 py-3 text-xs font-bold text-white">
            <span>Débitos exibidos: {money(totalDebit)} · Créditos exibidos: {money(totalCredit)}</span>
            <span className="tabular-nums">SALDO TOTAL DO RAZÃO: {money(balance)}</span>
          </footer>
        </section>
      </div>
    </main>
  )
}
