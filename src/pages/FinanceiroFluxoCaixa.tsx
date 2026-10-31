/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP & SGQ INDUSTRIAL
 * @REVISAO_ANTERIOR: 2026-10-20 | Fluxo de caixa real com escopo por empresa.
 * Mantém IndustrialPageShell, sem dados fictícios e sem fallback de persistência.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import IndustrialPageShell, { SectionCard, Table, Field, ToolbarButton } from '../components/industrial/IndustrialPageShell'

type TipoCaixa = 'ENTRADA' | 'SAIDA'
type StatusCaixa = 'PENDENTE' | 'PAGO'
interface LancamentoCaixa {
  id: string
  descricao: string
  tipo: TipoCaixa
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: StatusCaixa
}
const PAGE_SIZE = 25
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'

export default function FinanceiroFluxoCaixa() {
  const [rows, setRows] = useState<LancamentoCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoCaixa>('ENTRADA')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Sessão autenticada obrigatória para acessar o fluxo de caixa.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id, ativo, deleted_at').eq('auth_user_id', user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) throw new Error('Usuário sem empresa ativa. Nenhuma consulta global foi executada.')
      const tenant = profile.data.empresa_id
      setEmpresaId(tenant)
      const result = await supabase.from('erp_fluxo_caixa')
        .select('id, descricao, tipo, valor, data_vencimento, data_pagamento, status')
        .eq('empresa_id', tenant)
        .order('data_vencimento', { ascending: true })
      if (result.error) throw result.error
      setRows((result.data ?? []).map((row): LancamentoCaixa => ({
        id: row.id,
        descricao: row.descricao,
        tipo: row.tipo as TipoCaixa,
        valor: Number(row.valor),
        data_vencimento: row.data_vencimento,
        data_pagamento: row.data_pagamento,
        status: row.status as StatusCaixa,
      })))
      setPage(0)
    } catch (cause) {
      setRows([])
      setEmpresaId(null)
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar o fluxo de caixa.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => rows.reduce((acc, row) => {
    if (row.tipo === 'ENTRADA') acc.entradas += row.valor
    else acc.saidas += row.valor
    if (row.status === 'PAGO') {
      if (row.tipo === 'ENTRADA') acc.recebido += row.valor
      else acc.pago += row.valor
    }
    return acc
  }, { entradas: 0, saidas: 0, recebido: 0, pago: 0 }), [rows])
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const amount = Number(valor)
    if (!empresaId || !descricao.trim() || !vencimento || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe descrição, valor maior que zero e vencimento. A empresa precisa estar autenticada.')
      return
    }
    setSaving(true)
    try {
      const { data, error: insertError } = await supabase.from('erp_fluxo_caixa').insert({
        empresa_id: empresaId,
        descricao: descricao.trim(),
        tipo,
        valor: amount,
        data_vencimento: vencimento,
        status: 'PENDENTE',
      }).select('id, descricao, tipo, valor, data_vencimento, data_pagamento, status').single()
      if (insertError) throw insertError
      const saved: LancamentoCaixa = {
        id: data.id, descricao: data.descricao, tipo: data.tipo as TipoCaixa,
        valor: Number(data.valor), data_vencimento: data.data_vencimento,
        data_pagamento: data.data_pagamento, status: data.status as StatusCaixa,
      }
      setRows(current => [...current, saved].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))
      setDescricao('')
      setTipo('ENTRADA')
      setValor('')
      setVencimento('')
      setNotice('Lançamento confirmado pelo PostgreSQL.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  const statusClass = (status: string) => status === 'PAGO' ? 'ips-status-green' : 'ips-status-amber'
  return <IndustrialPageShell module="Financeiro / Fluxo de Caixa" title="Fluxo de Caixa e Disponibilidades" actions={[{ label: 'ATUALIZAR', type: 'neutral', icon: <RefreshCw size={16} />, onClick: () => void load() }]}>
    <SectionCard title="1. Indicadores financeiros">
      <div className="ips-grid-2">
        <Field label="Previsão de entradas"><input readOnly value={money(totals.entradas)} /></Field>
        <Field label="Previsão de saídas"><input readOnly value={money(totals.saidas)} /></Field>
        <Field label="Saldo projetado"><input readOnly value={money(totals.entradas - totals.saidas)} /></Field>
        <Field label="Saldo liquidado"><input readOnly value={money(totals.recebido - totals.pago)} /></Field>
      </div>
      <p className="mt-2 text-xs text-slate-500">Valores calculados somente com os lançamentos persistidos da empresa autenticada.</p>
    </SectionCard>
    <SectionCard title="2. Lançamento manual">
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-12 items-end gap-3">
          <div className="col-span-12 md:col-span-5"><Field label="Descrição"><input required maxLength={255} value={descricao} onChange={event => setDescricao(event.target.value)} className="h-9 w-full" placeholder="Descrição do título" /></Field></div>
          <div className="col-span-12 sm:col-span-4 md:col-span-2"><Field label="Movimento"><select value={tipo} onChange={event => setTipo(event.target.value as TipoCaixa)} className="h-9 w-full"><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></Field></div>
          <div className="col-span-12 sm:col-span-4 md:col-span-2"><Field label="Valor (R$)"><input required type="number" min="0.01" step="0.01" value={valor} onChange={event => setValor(event.target.value)} className="h-9 w-full" /></Field></div>
          <div className="col-span-12 sm:col-span-4 md:col-span-3"><Field label="Vencimento"><input required type="date" value={vencimento} onChange={event => setVencimento(event.target.value)} className="h-9 w-full" /></Field></div>
        </div>
        <div className="ips-bottom-actions"><button type="submit" disabled={saving || !empresaId} className="inline-flex min-h-[36px] items-center gap-2 rounded border border-[#123B50] bg-[#123B50] px-3 text-[12px] font-bold text-white disabled:opacity-50"><Save size={14} className="mr-1 inline" />{saving ? 'GRAVANDO…' : 'REGISTRAR TÍTULO'}</button></div>
      </form>
    </SectionCard>
    <SectionCard title="3. Extrato projetado de contas">
      {error && <p role="alert" className="mb-3 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-3 text-sm font-semibold text-emerald-700">{notice}</p>}
      <Table><thead><tr><th>Movimento</th><th>Descrição</th><th>Vencimento</th><th>Valor líquido</th><th>Status</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={5}>Consultando dados reais do Supabase…</td></tr> : rows.length === 0 ? <tr><td colSpan={5}>Nenhum lançamento encontrado para a empresa autenticada.</td></tr> : visibleRows.map(row => <tr key={row.id}><td>{row.tipo}</td><td>{row.descricao}</td><td>{dateLabel(row.data_vencimento)}</td><td>{money(row.valor)}</td><td className={statusClass(row.status)}>{row.status}</td></tr>)}
      </tbody></Table>
      <nav aria-label="Paginação do fluxo de caixa" className="flex items-center justify-end gap-3 border-t border-slate-200 p-3">
        <button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="h-9 border border-slate-300 bg-white px-3 text-sm disabled:opacity-50">Anterior</button>
        <span aria-live="polite" className="text-xs text-slate-600">Página {page + 1} de {pageCount}</span>
        <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="h-9 border border-slate-300 bg-white px-3 text-sm disabled:opacity-50">Próxima</button>
      </nav>
    </SectionCard>
  </IndustrialPageShell>
}
