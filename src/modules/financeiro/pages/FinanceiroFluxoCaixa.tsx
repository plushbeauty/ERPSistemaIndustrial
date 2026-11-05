/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-FLUXO-CAIXA-COMPACTO-20261105-01
 * @STATUS: Tela dedicada integrada ao shell horizontal; não substitui a Central Financeira.
 *
 * Fluxo de caixa real por empresa. Auth, RLS e INSERT permanecem no Supabase.
 * Leitura paginada integral para não truncar o extrato no limite padrão do PostgREST.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { RefreshCw, Save, Wallet } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { fetchAllPages } from '../../../lib/supabasePagination'
import { SynqraLayoutProvider } from '../../../layout/SynqraLayoutContext'
import IndustrialPageShell, { SectionCard, Table, Field } from '../../../components/industrial/IndustrialPageShell'
import '../../../styles/financeiro-fluxo-caixa.css'

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
const dateLabel = (value: string) => value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

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
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sessão autenticada obrigatória para acessar o fluxo de caixa.')

      const profile = await supabase
        .from('erp_usuarios')
        .select('empresa_id, ativo, deleted_at')
        .eq('auth_user_id', authData.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) {
        throw new Error('Usuário sem empresa ativa. Nenhuma consulta global foi executada.')
      }

      const tenant = profile.data.empresa_id
      setEmpresaId(tenant)

      const loadedRows = await fetchAllPages((from, to) => supabase
        .from('erp_fluxo_caixa')
        .select('id, descricao, tipo, valor, data_vencimento, data_pagamento, status', { count: 'exact' })
        .eq('empresa_id', tenant)
        .order('data_vencimento', { ascending: true })
        .range(from, to))

      setRows(loadedRows.map((row): LancamentoCaixa => ({
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
      const { data, error: insertError } = await supabase
        .from('erp_fluxo_caixa')
        .insert({
          empresa_id: empresaId,
          descricao: descricao.trim(),
          tipo,
          valor: amount,
          data_vencimento: vencimento,
          status: 'PENDENTE',
        })
        .select('id, descricao, tipo, valor, data_vencimento, data_pagamento, status')
        .single()

      if (insertError) throw insertError

      const saved: LancamentoCaixa = {
        id: data.id,
        descricao: data.descricao,
        tipo: data.tipo as TipoCaixa,
        valor: Number(data.valor),
        data_vencimento: data.data_vencimento,
        data_pagamento: data.data_pagamento,
        status: data.status as StatusCaixa,
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

  const saldoProjetado = totals.entradas - totals.saidas
  const saldoLiquidado = totals.recebido - totals.pago
  const movementTag = (movement: TipoCaixa) => movement === 'ENTRADA' ? 'ips-tag ips-tag-entrada' : 'ips-tag ips-tag-saida'
  const statusTag = (status: StatusCaixa) => status === 'PAGO' ? 'ips-tag ips-tag-pago' : 'ips-tag ips-tag-pendente'

  return (
    <SynqraLayoutProvider>
      <IndustrialPageShell
        module="Financeiro / Fluxo de Caixa"
        title="Fluxo de Caixa e Disponibilidades"
        actions={[{ label: 'ATUALIZAR', icon: <RefreshCw size={14} />, onClick: () => void load() }]}
      >
        {error && <p role="alert" className="ips-alert">{error}</p>}
        {notice && <p role="status" className="ips-notice">{notice}</p>}

        <SectionCard title="1. Indicadores financeiros" className="ips-section-card">
          <div className="ips-kpis">
            <div className="ips-kpi"><span>Previsão de entradas</span><strong>{money(totals.entradas)}</strong></div>
            <div className="ips-kpi"><span>Previsão de saídas</span><strong>{money(totals.saidas)}</strong></div>
            <div className={'ips-kpi' + (saldoProjetado < 0 ? ' ips-kpi-neg' : '')}><span>Saldo projetado</span><strong>{money(saldoProjetado)}</strong></div>
            <div className={'ips-kpi' + (saldoLiquidado < 0 ? ' ips-kpi-neg' : '')}><span>Saldo liquidado</span><strong>{money(saldoLiquidado)}</strong></div>
          </div>
          <p className="ips-hint">Calculados apenas com os {rows.length} lançamentos persistidos da empresa autenticada nesta tela.</p>
        </SectionCard>

        <SectionCard title="2. Lançamento manual" className="ips-section-card">
          <form onSubmit={save}>
            <div className="ips-grid-12">
              <Field className="ips-col-5" label="Descrição" required>
                <input required maxLength={255} value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Descrição do título" />
              </Field>
              <Field className="ips-col-2" label="Movimento">
                <select value={tipo} onChange={event => setTipo(event.target.value as TipoCaixa)}>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </Field>
              <Field className="ips-col-2" label="Valor (R$)" required>
                <input required type="number" min="0.01" step="0.01" value={valor} onChange={event => setValor(event.target.value)} />
              </Field>
              <Field className="ips-col-3" label="Vencimento" required>
                <input required type="date" value={vencimento} onChange={event => setVencimento(event.target.value)} />
              </Field>
            </div>
            <div className="ips-bottom-actions">
              <button type="submit" disabled={saving || !empresaId} className="ips-action ips-action-primary">
                <Save size={14} />{saving ? 'GRAVANDO…' : 'REGISTRAR TÍTULO'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="3. Extrato projetado de contas" className="ips-section-card">
          <Table>
            <thead><tr><th>Movimento</th><th>Descrição</th><th>Vencimento</th><th>Baixa</th><th className="ips-num">Valor</th><th>Status</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td className="ips-empty" colSpan={6}>Consultando dados reais do Supabase…</td></tr>
                : rows.length === 0
                  ? <tr><td className="ips-empty" colSpan={6}>Nenhum lançamento encontrado para a empresa autenticada.</td></tr>
                  : visibleRows.map(row => (
                    <tr key={row.id}>
                      <td><span className={movementTag(row.tipo)}>{row.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA'}</span></td>
                      <td>{row.descricao}</td>
                      <td>{dateLabel(row.data_vencimento)}</td>
                      <td>{row.data_pagamento ? dateLabel(row.data_pagamento) : '—'}</td>
                      <td className="ips-num">{money(row.valor)}</td>
                      <td><span className={statusTag(row.status)}>{row.status}</span></td>
                    </tr>
                  ))}
            </tbody>
          </Table>
          <nav aria-label="Paginação do fluxo de caixa" className="ips-pager">
            <button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="ips-action">ANTERIOR</button>
            <p aria-live="polite">Página {page + 1} de {pageCount}</p>
            <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="ips-action">PRÓXIMA</button>
          </nav>
        </SectionCard>

        <footer className="ips-footer"><Wallet size={13} /> Acesso protegido pela sessão Supabase e pelas políticas RLS. Os indicadores refletem os lançamentos carregados integralmente para a empresa ativa.</footer>
      </IndustrialPageShell>
    </SynqraLayoutProvider>
  )
}
