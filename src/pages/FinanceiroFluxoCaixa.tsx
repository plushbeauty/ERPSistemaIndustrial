/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-FLUXO-CAIXA-PAGINACAO-20261108-01 — leitura paginada integral, tenant da sessão autenticada, extrato e gravação real com controles compactos
 * @STATUS_APROVACAO: REVISAO AUTORIZADA PELO PROPRIETARIO EM 2026-11-08 PARA INTEGRAR A VERSAO COM PAGINACAO COMPLETA E ISOLAMENTO POR EMPRESA, PRESERVANDO O SHELL HORIZONTAL GLOBAL
 * @ESCOPO: Layout compacto dedicado, sem chrome legado duplicado, com dados reais por tenant.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  Save,
  Wallet,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { SynqraLayoutProvider } from '../layout/SynqraLayoutContext'
import '../styles/financeiro-fluxo-caixa.css'

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
const dateLabel = (value: string) => value
  ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('pt-BR')
  : '—'

function errorText(cause: unknown) {
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const value = cause as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    const message = typeof value.message === 'string' ? value.message : 'Falha inesperada ao consultar o fluxo de caixa.'
    const code = typeof value.code === 'string' ? ' (' + value.code + ')' : ''
    const details = typeof value.details === 'string' && value.details ? ' — ' + value.details : ''
    const hint = typeof value.hint === 'string' && value.hint ? ' — ' + value.hint : ''
    return message + code + details + hint
  }
  return cause instanceof Error ? cause.message : 'Falha inesperada ao consultar o fluxo de caixa.'
}

export default function FinanceiroFluxoCaixa() {
  const [rows, setRows] = useState<LancamentoCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
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
    setLoaded(false)
    setError('')
    setNotice('')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sua sessão expirou. Entre novamente para consultar o fluxo de caixa.')

      // Helper canônico do ERP: evita depender de uma consulta paralela ao cadastro de usuários.
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (typeof company.data !== 'string' || !company.data) {
        throw new Error('A empresa da sessão não foi identificada. Verifique o vínculo do usuário e tente novamente.')
      }

      const tenant = company.data
      setEmpresaId(tenant)

      const loadedRows = await fetchAllPages((from, to) => supabase
        .from('erp_fluxo_caixa')
        .select('id, descricao, tipo, valor, data_vencimento, data_pagamento, status', { count: 'exact' })
        .eq('empresa_id', tenant)
        .order('data_vencimento', { ascending: true })
        .order('id', { ascending: true })
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
      setLoaded(true)
    } catch (cause) {
      setRows([])
      setEmpresaId(null)
      setError(errorText(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => rows.reduce((acc, row) => {
    if (row.tipo === 'ENTRADA') acc.entradas += row.valor
    else if (row.tipo === 'SAIDA') acc.saidas += row.valor
    if (row.status === 'PAGO') {
      if (row.tipo === 'ENTRADA') acc.recebido += row.valor
      else if (row.tipo === 'SAIDA') acc.pago += row.valor
    }
    return acc
  }, { entradas: 0, saidas: 0, recebido: 0, pago: 0 }), [rows])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const saldoProjetado = totals.entradas - totals.saidas
  const saldoLiquidado = totals.recebido - totals.pago
  const metricValue = (value: number) => loading ? 'Carregando…' : loaded ? money(value) : '—'

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const amount = Number(valor)

    if (!empresaId || !loaded || !descricao.trim() || !vencimento || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe descrição, valor maior que zero e vencimento. A sessão e a empresa precisam estar validadas.')
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

      setRows(current => [...current, saved].sort((a, b) =>
        a.data_vencimento.localeCompare(b.data_vencimento) || a.id.localeCompare(b.id)))
      setDescricao('')
      setTipo('ENTRADA')
      setValor('')
      setVencimento('')
      setNotice('Lançamento gravado e confirmado pelo PostgreSQL.')
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setSaving(false)
    }
  }

  const movementClass = (movement: TipoCaixa) => movement === 'ENTRADA'
    ? 'ips-tag ips-tag-entrada'
    : 'ips-tag ips-tag-saida'
  const statusClass = (status: StatusCaixa) => status === 'PAGO'
    ? 'ips-tag ips-tag-pago'
    : 'ips-tag ips-tag-pendente'

  return (
    <SynqraLayoutProvider>
      <div className="ips-page" data-synqra-density="30px">
        <header className="ips-bar">
          <div className="ips-bar-title">
            <span className="ips-eyebrow">SYSNQRA ERP INDUSTRIAL <span>/</span> FINANCEIRO</span>
            <strong>Fluxo de Caixa e Disponibilidades</strong>
            <span className="ips-subtitle">Previsão, vencimentos e liquidação por empresa</span>
          </div>
          <div className="ips-toolbar">
            <span className={'ips-connection' + (loaded ? ' is-ready' : error ? ' is-error' : '')}>
              <span className="ips-connection-dot" />
              {loading ? 'CONECTANDO' : loaded ? 'SUPABASE CONECTADO' : 'CONSULTA PENDENTE'}
            </span>
            <button type="button" className="ips-action" onClick={() => void load()} disabled={loading || saving}>
              <RefreshCw size={13} className={loading ? 'ips-spin' : ''} /> ATUALIZAR
            </button>
          </div>
        </header>

        <div className="ips-workspace">
          {error && (
            <div className="ips-alert" role="alert">
              <AlertCircle size={16} />
              <div><strong>Não foi possível carregar os dados.</strong><span>{error}</span></div>
            </div>
          )}
          {notice && (
            <div className="ips-notice" role="status">
              <CheckCircle2 size={16} /><span>{notice}</span>
            </div>
          )}

          <section className="ips-section" aria-labelledby="ips-indicators-title">
            <div className="ips-section-heading">
              <div><span className="ips-section-index">01</span><h2 id="ips-indicators-title">Visão financeira</h2></div>
              <span className="ips-section-meta">{loaded ? rows.length + ' LANÇAMENTO(S) NO PERÍODO CARREGADO' : 'VALORES SOMENTE APÓS CONSULTA'}</span>
            </div>
            <div className="ips-kpis">
              <article className="ips-kpi ips-kpi-in">
                <span className="ips-kpi-icon"><ArrowUpRight size={17} /></span>
                <span className="ips-kpi-label">Entradas previstas</span>
                <strong>{metricValue(totals.entradas)}</strong>
                <small>{loaded ? money(totals.recebido) + ' recebido' : 'Aguardando dados reais'}</small>
              </article>
              <article className="ips-kpi ips-kpi-out">
                <span className="ips-kpi-icon"><ArrowDownRight size={17} /></span>
                <span className="ips-kpi-label">Saídas previstas</span>
                <strong>{metricValue(totals.saidas)}</strong>
                <small>{loaded ? money(totals.pago) + ' pago' : 'Aguardando dados reais'}</small>
              </article>
              <article className={'ips-kpi ips-kpi-balance' + (saldoProjetado < 0 ? ' is-negative' : '')}>
                <span className="ips-kpi-icon"><CircleDollarSign size={17} /></span>
                <span className="ips-kpi-label">Saldo projetado</span>
                <strong>{metricValue(saldoProjetado)}</strong>
                <small>Entradas menos saídas</small>
              </article>
              <article className={'ips-kpi ips-kpi-settled' + (saldoLiquidado < 0 ? ' is-negative' : '')}>
                <span className="ips-kpi-icon"><Wallet size={17} /></span>
                <span className="ips-kpi-label">Saldo liquidado</span>
                <strong>{metricValue(saldoLiquidado)}</strong>
                <small>Recebido menos pago</small>
              </article>
            </div>
            <p className="ips-hint">
              {loaded
                ? 'Indicadores calculados exclusivamente com os ' + rows.length + ' títulos retornados do PostgreSQL para a empresa autenticada.'
                : 'Os indicadores ficam indisponíveis até a consulta autenticada terminar. Nenhum valor de demonstração é exibido.'}
            </p>
          </section>

          <section className="ips-section" aria-labelledby="ips-entry-title">
            <div className="ips-section-heading">
              <div><span className="ips-section-index">02</span><h2 id="ips-entry-title">Novo lançamento</h2></div>
              <span className="ips-section-meta">REGISTRO MANUAL • PERSISTÊNCIA REAL</span>
            </div>
            <form onSubmit={save}>
              <div className="ips-form-grid">
                <label className="ips-field ips-field-description">
                  <span>Descrição <b>*</b></span>
                  <input required maxLength={255} value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Ex.: Venda NF 1023 / Fornecedor de insumos" />
                </label>
                <label className="ips-field ips-field-type">
                  <span>Movimento <b>*</b></span>
                  <select value={tipo} onChange={event => setTipo(event.target.value as TipoCaixa)}>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </label>
                <label className="ips-field ips-field-amount">
                  <span>Valor (R$) <b>*</b></span>
                  <input required type="number" min="0.01" step="0.01" inputMode="decimal" value={valor} onChange={event => setValor(event.target.value)} placeholder="0,00" />
                </label>
                <label className="ips-field ips-field-date">
                  <span>Vencimento <b>*</b></span>
                  <input required type="date" value={vencimento} onChange={event => setVencimento(event.target.value)} />
                </label>
              </div>
              <div className="ips-form-footer">
                <span>O título será gravado como <b>PENDENTE</b>.</span>
                <button type="submit" className="ips-action ips-action-primary" disabled={saving || loading || !loaded || !empresaId}>
                  <Save size={13} /> {saving ? 'GRAVANDO…' : 'REGISTRAR TÍTULO'}
                </button>
              </div>
            </form>
          </section>

          <section className="ips-section ips-extract" aria-labelledby="ips-extract-title">
            <div className="ips-section-heading">
              <div><span className="ips-section-index">03</span><h2 id="ips-extract-title">Extrato projetado</h2></div>
              <span className="ips-section-meta">{loaded ? rows.length + ' REGISTRO(S)' : 'AGUARDANDO CONSULTA'}</span>
            </div>
            <div className="ips-tablewrap">
              <table className="ips-table">
                <thead><tr><th>Movimento</th><th>Descrição</th><th>Vencimento</th><th>Baixa</th><th className="ips-num">Valor</th><th>Status</th></tr></thead>
                <tbody>
                  {loading
                    ? <tr><td className="ips-empty" colSpan={6}><RefreshCw size={14} className="ips-spin" /> Consultando PostgreSQL…</td></tr>
                    : error
                      ? <tr><td className="ips-empty ips-empty-error" colSpan={6}>Consulta não concluída. Corrija o erro acima e atualize a tela.</td></tr>
                      : rows.length === 0
                        ? <tr><td className="ips-empty" colSpan={6}>Nenhum lançamento cadastrado para a empresa autenticada.</td></tr>
                        : visibleRows.map(row => (
                          <tr key={row.id}>
                            <td><span className={movementClass(row.tipo)}>{row.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA'}</span></td>
                            <td className="ips-description">{row.descricao}</td>
                            <td>{dateLabel(row.data_vencimento)}</td>
                            <td>{row.data_pagamento ? dateLabel(row.data_pagamento) : '—'}</td>
                            <td className="ips-num">{money(row.valor)}</td>
                            <td><span className={statusClass(row.status)}>{row.status}</span></td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
            <nav className="ips-pager" aria-label="Paginação do extrato">
              <span>{loaded ? 'Exibindo ' + (rows.length ? page * PAGE_SIZE + 1 : 0) + '–' + Math.min((page + 1) * PAGE_SIZE, rows.length) + ' de ' + rows.length : '—'}</span>
              <div>
                <button type="button" className="ips-action" disabled={page === 0 || !loaded} onClick={() => setPage(current => Math.max(0, current - 1))}>ANTERIOR</button>
                <strong>Página {page + 1} de {pageCount}</strong>
                <button type="button" className="ips-action" disabled={page + 1 >= pageCount || !loaded} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))}>PRÓXIMA</button>
              </div>
            </nav>
          </section>

          <footer className="ips-footer">
            <span><Wallet size={13} /> SYSNQRA ERP INDUSTRIAL</span>
            <span><i /> Sessão Supabase • Isolamento por empresa via RLS</span>
          </footer>
        </div>
      </div>
    </SynqraLayoutProvider>
  )
}
