/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-FLUXO-CAIXA-CRUD-PARCIAL-20261105-03 — filtros de periodo/tipo/status no banco, edicao e baixa persistidas, previstos separados de liquidados
 * @STATUS_APROVACAO: REVISAO TECNICA OBRIGATORIA DO PROPRIETARIO EM 2026-11-05; exclusao logica e historico seguem pendentes do laudo de schema
 */
/**
 * SYSNQRA ERP & SGQ INDUSTRIAL — Financeiro / Fluxo de Caixa.
 * Ordem visual de 2026-11-05 (print desta rota): "ta uma merda de feia arrumar essa tela depois edit
 * grande de mais barra lateral azul feia de mais". Revisao tecnica do mesmo dia, item 8: conservar a
 * regua aprovada (campos 30px, KPI em ladrilho, sem sidebar nem cabecalho duplicado).
 *
 * O que esta tela faz no PostgreSQL — apenas colunas atestadas pela migration
 * 20261020143000_erp_fluxo_caixa_tenant.sql, que e a unica que cria a tabela:
 * - SELECT com empresa_id = tenant da sessao, ordenado por data_vencimento, e filtros de
 *   data_vencimento (>= / <=), tipo e status aplicados no servidor (itens 4, 5 e 6).
 * - INSERT de titulo em aberto (status PENDENTE), com empresa_id explicito (item 6).
 * - UPDATE de descricao/tipo/valor/data_vencimento e UPDATE de baixa (status + data_pagamento),
 *   sempre com o filtro duplo id + empresa_id; a policy erp_fluxo_caixa_tenant ainda vale
 *   "with check (empresa_id = erp_current_empresa_id() or erp_is_master())", entao a barreira e
 *   do banco, nao desta folha (item 6).
 * - Nenhum UPDATE escreve coluna que a tabela nao tem: os CHECKs de tipo e status continuam
 *   valendo, e nao existe coluna de valor pago, de usuario que baixou nem de exclusao logica.
 *
 * PENDENCIA ASSUMIDA (itens 2, 3 e 9 da mesma revisao): exclusao logica e historico com usuario e
 * data nao podem ser feitos por esta folha sem a migration, porque erp_fluxo_caixa nao tem
 * deleted_at e a policy de INSERT em erp_audit_logs foi retirada em 20261005180000 (so existe a de
 * SELECT). Isso exige funcao security definer no banco. Antes de criar qualquer coluna, o laudo
 * somente-leitura supabase/diagnosticos/20261105_laudo_fluxo_caixa_schema.sql precisa ser rodado no
 * banco real: enquanto ele nao voltar, nada aqui e apresentado como modulo financeiro completo.
 * @REVISAO_ANTERIOR: 2026-11-05 | REV-FLUXO-CAIXA-COMPACTO-20261105-02 — titulo no shell global e estado de banco provado por consulta.
 * @REVISAO_ANTERIOR_2: 2026-11-05 | REV-FLUXO-CAIXA-COMPACTO-20261105-01 — regua 30px, KPI em ladrilho, chrome duplicado fora da tela.
 * @REVISAO_ANTERIOR_3: 2026-10-20 | Fluxo de caixa real com escopo por empresa.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Pencil, RefreshCw, RotateCcw, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import IndustrialPageShell, { SectionCard, Table, Field, type PageConnection } from '../components/industrial/IndustrialPageShell'

type TipoCaixa = 'ENTRADA' | 'SAIDA'
type StatusCaixa = 'PENDENTE' | 'PAGO'
type FiltroTipo = 'TODOS' | TipoCaixa
type FiltroStatus = 'TODOS' | StatusCaixa
interface LancamentoCaixa {
  id: string
  descricao: string
  tipo: TipoCaixa
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: StatusCaixa
}
const COLUNAS = 'id, descricao, tipo, valor, data_vencimento, data_pagamento, status'
const PAGE_SIZE = 25
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'
const hoje = () => new Date().toLocaleDateString('en-CA')
const mapRow = (row: { id: string; descricao: string; tipo: string; valor: string | number; data_vencimento: string; data_pagamento: string | null; status: string }): LancamentoCaixa => ({
  id: row.id,
  descricao: row.descricao,
  tipo: row.tipo as TipoCaixa,
  valor: Number(row.valor),
  data_vencimento: row.data_vencimento,
  data_pagamento: row.data_pagamento,
  status: row.status as StatusCaixa,
})

export default function FinanceiroFluxoCaixa() {
  const [rows, setRows] = useState<LancamentoCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoCaixa>('ENTRADA')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [baixa, setBaixa] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [filtroDe, setFiltroDe] = useState('')
  const [filtroAte, setFiltroAte] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Sessão autenticada obrigatória para acessar o fluxo de caixa.')
      const profile = await supabase.from('erp_usuarios').select('empresa_id, ativo, deleted_at').eq('auth_user_id', user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profile.error) throw profile.error
      if (!profile.data?.empresa_id) throw new Error('Usuário sem empresa ativa. Nenhuma consulta global foi executada.')
      const tenant = profile.data.empresa_id
      setEmpresaId(tenant)
      let query = supabase.from('erp_fluxo_caixa')
        .select(COLUNAS)
        .eq('empresa_id', tenant)
        .order('data_vencimento', { ascending: true })
      if (filtroDe) query = query.gte('data_vencimento', filtroDe)
      if (filtroAte) query = query.lte('data_vencimento', filtroAte)
      if (filtroTipo !== 'TODOS') query = query.eq('tipo', filtroTipo)
      if (filtroStatus !== 'TODOS') query = query.eq('status', filtroStatus)
      const result = await query
      if (result.error) throw result.error
      setRows((result.data ?? []).map(mapRow))
      setPage(0)
    } catch (cause) {
      setRows([])
      setEmpresaId(null)
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar o fluxo de caixa.')
    } finally {
      setLoading(false)
    }
  }, [filtroDe, filtroAte, filtroTipo, filtroStatus])

  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => rows.reduce((acc, row) => {
    if (row.status === 'PAGO') {
      if (row.tipo === 'ENTRADA') acc.recebido += row.valor
      else acc.pago += row.valor
    } else {
      if (row.tipo === 'ENTRADA') acc.aReceber += row.valor
      else acc.aPagar += row.valor
    }
    return acc
  }, { aReceber: 0, aPagar: 0, recebido: 0, pago: 0 }), [rows])
  const saldoProjetado = totals.aReceber + totals.recebido - totals.aPagar - totals.pago
  const saldoLiquidado = totals.recebido - totals.pago
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const filtrosAtivos = filtroDe !== '' || filtroAte !== '' || filtroTipo !== 'TODOS' || filtroStatus !== 'TODOS'

  function limparFiltros() {
    setFiltroDe('')
    setFiltroAte('')
    setFiltroTipo('TODOS')
    setFiltroStatus('TODOS')
  }

  function fecharEdicao() {
    setEditId(null)
    setDescricao('')
    setTipo('ENTRADA')
    setValor('')
    setVencimento('')
    setBaixa('')
  }

  function abrirEdicao(row: LancamentoCaixa) {
    setError('')
    setNotice('')
    setEditId(row.id)
    setDescricao(row.descricao)
    setTipo(row.tipo)
    setValor(row.valor.toFixed(2))
    setVencimento(row.data_vencimento)
    setBaixa(row.data_pagamento ?? '')
  }

  /** Item 2 da revisao: INSERT e UPDATE sempre com empresa_id do tenant; nunca uma escrita global. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const amount = Number(valor)
    if (!empresaId) {
      setError('Empresa autenticada obrigatória antes de gravar. Nenhuma escrita global é permitida.')
      return
    }
    if (!descricao.trim() || !vencimento || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe descrição, valor maior que zero e vencimento.')
      return
    }
    const payload = {
      descricao: descricao.trim(),
      tipo,
      valor: amount,
      data_vencimento: vencimento,
    }
    setSaving(true)
    try {
      if (editId) {
        const alvo = rows.find((row) => row.id === editId)
        const result = await supabase.from('erp_fluxo_caixa')
          .update(alvo?.status === 'PAGO' ? { ...payload, data_pagamento: baixa || alvo.data_pagamento } : payload)
          .eq('id', editId)
          .eq('empresa_id', empresaId)
          .select(COLUNAS)
        if (result.error) throw result.error
        const atualizado = (result.data ?? []).map(mapRow)
        if (atualizado.length !== 1) throw new Error('A alteração não confirmou exatamente um lançamento da empresa autenticada.')
        setRows((current) => current.map((row) => (row.id === atualizado[0].id ? atualizado[0] : row)))
        setNotice(`Lançamento alterado e relido do PostgreSQL (id ${atualizado[0].id.slice(0, 8)}…).`)
        fecharEdicao()
      } else {
        const { data, error: insertError } = await supabase.from('erp_fluxo_caixa').insert({
          empresa_id: empresaId,
          ...payload,
          status: 'PENDENTE',
        }).select(COLUNAS).single()
        if (insertError) throw insertError
        const saved = mapRow(data)
        setRows((current) => [...current, saved].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))
        setDescricao('')
        setTipo('ENTRADA')
        setValor('')
        setVencimento('')
        setNotice('Lançamento confirmado pelo PostgreSQL.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  /** Baixa financeira persistida com as colunas que a tabela tem: status + data_pagamento. */
  async function baixar(row: LancamentoCaixa) {
    if (!empresaId || workingId) return
    setError('')
    setNotice('')
    setWorkingId(row.id)
    try {
      const result = await supabase.from('erp_fluxo_caixa')
        .update({ status: 'PAGO', data_pagamento: hoje() })
        .eq('id', row.id)
        .eq('empresa_id', empresaId)
        .select(COLUNAS)
      if (result.error) throw result.error
      const baixado = (result.data ?? []).map(mapRow)
      if (baixado.length !== 1) throw new Error('A baixa não confirmou exatamente um lançamento da empresa autenticada.')
      setRows((current) => current.map((item) => (item.id === baixado[0].id ? baixado[0] : item)))
      setNotice(`Baixa registrada em ${dateLabel(baixado[0].data_pagamento ?? '')}: ${money(baixado[0].valor)}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a baixa.')
    } finally {
      setWorkingId(null)
    }
  }

  async function estornar(row: LancamentoCaixa) {
    if (!empresaId || workingId) return
    setError('')
    setNotice('')
    setWorkingId(row.id)
    try {
      const result = await supabase.from('erp_fluxo_caixa')
        .update({ status: 'PENDENTE', data_pagamento: null })
        .eq('id', row.id)
        .eq('empresa_id', empresaId)
        .select(COLUNAS)
      if (result.error) throw result.error
      const devolvido = (result.data ?? []).map(mapRow)
      if (devolvido.length !== 1) throw new Error('O estorno não confirmou exatamente um lançamento da empresa autenticada.')
      setRows((current) => current.map((item) => (item.id === devolvido[0].id ? devolvido[0] : item)))
      setNotice('Lançamento devolvido para PENDENTE; a data de baixa foi limpa no PostgreSQL.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível estornar a baixa.')
    } finally {
      setWorkingId(null)
    }
  }

  const movementTag = (tipo: TipoCaixa) => tipo === 'ENTRADA' ? 'ips-tag ips-tag-entrada' : 'ips-tag ips-tag-saida'
  const statusTag = (status: StatusCaixa) => status === 'PAGO' ? 'ips-tag ips-tag-pago' : 'ips-tag ips-tag-pendente'

  // Item 4 da revisao tecnica de 2026-11-05: o rotulo de banco so aparece depois de a propria tela
  // provar sessao, empresa autenticada e retorno da consulta. Sem consulta, nao ha texto de "conectado".
  const connection = useMemo<PageConnection>(() => {
    if (loading) return { status: 'consultando', message: 'Verificando sessão, empresa autenticada e retorno do banco.' }
    if (!empresaId) return { status: 'erro', message: error || 'Sem sessão ou sem empresa autenticada: nenhuma leitura é exibida.' }
    return {
      status: 'ok',
      message: `Sessão e empresa autenticada validadas · ${rows.length} lançamento(s) lidos de erp_fluxo_caixa com filtro por empresa_id${filtrosAtivos ? ' e filtros de período/tipo/status no servidor' : ''}.`,
    }
  }, [loading, empresaId, error, rows.length, filtrosAtivos])

  return <IndustrialPageShell module="Financeiro / Fluxo de Caixa" title="Fluxo de Caixa e Disponibilidades" connection={connection} actions={[{ label: 'ATUALIZAR', icon: <RefreshCw size={14} />, onClick: () => void load() }]}>
    {error && <p role="alert" className="ips-alert">{error}</p>}
    {notice && <p role="status" className="ips-notice">{notice}</p>}
    <SectionCard title="1. Previsto x liquidado">
      <div className="ips-kpis">
        <div className="ips-kpi"><span>A receber (previsto)</span><strong>{money(totals.aReceber)}</strong></div>
        <div className="ips-kpi"><span>A pagar (previsto)</span><strong>{money(totals.aPagar)}</strong></div>
        <div className="ips-kpi"><span>Recebido (liquidado)</span><strong>{money(totals.recebido)}</strong></div>
        <div className="ips-kpi"><span>Pago (liquidado)</span><strong>{money(totals.pago)}</strong></div>
        <div className={`ips-kpi${saldoProjetado < 0 ? ' ips-kpi-neg' : ''}`}><span>Saldo projetado</span><strong>{money(saldoProjetado)}</strong></div>
        <div className={`ips-kpi${saldoLiquidado < 0 ? ' ips-kpi-neg' : ''}`}><span>Saldo liquidado</span><strong>{money(saldoLiquidado)}</strong></div>
      </div>
      <p className="ips-hint">Calculados apenas com os {rows.length} lançamentos retornados pela consulta da empresa autenticada{filtrosAtivos ? ', já filtrada no PostgreSQL' : ''}. Previsto = status PENDENTE; liquidado = status PAGO.</p>
    </SectionCard>
    <SectionCard title="2. Lançamento e alteração de título">
      <form onSubmit={submit}>
        <div className="ips-grid-12">
          <Field className="ips-col-5" label="Descrição" required><input required maxLength={255} value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Descrição do título" /></Field>
          <Field className="ips-col-2" label="Movimento"><select value={tipo} onChange={event => setTipo(event.target.value as TipoCaixa)}><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></Field>
          <Field className="ips-col-2" label="Valor (R$)" required><input required type="number" min="0.01" step="0.01" value={valor} onChange={event => setValor(event.target.value)} /></Field>
          <Field className="ips-col-3" label="Vencimento" required><input required type="date" value={vencimento} onChange={event => setVencimento(event.target.value)} /></Field>
        </div>
        {editId && <>
          <div className="ips-grid-12" style={{ marginTop: 8 }}>
            <Field className="ips-col-3" label="Data da baixa"><input type="date" value={baixa} onChange={event => setBaixa(event.target.value)} /></Field>
          </div>
          <p className="ips-hint">Editando o lançamento {editId.slice(0, 8)}… A data da baixa só é gravada quando o status já está PAGO; para baixar um título em aberto use o botão BAIXA na tabela.</p>
        </>}
        <div className="ips-bottom-actions">
          {editId && <button type="button" onClick={fecharEdicao} className="ips-action"><X size={14} />CANCELAR</button>}
          <button type="submit" disabled={saving || !empresaId} className="ips-action ips-action-primary">
            {editId ? <><Check size={14} />{saving ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}</> : <><Save size={14} />{saving ? 'GRAVANDO…' : 'REGISTRAR TÍTULO'}</>}
          </button>
        </div>
      </form>
    </SectionCard>
    <SectionCard title="3. Extrato de contas">
      <div className="ips-grid-12">
        <Field className="ips-col-3" label="Vencimento de"><input type="date" value={filtroDe} onChange={event => setFiltroDe(event.target.value)} /></Field>
        <Field className="ips-col-3" label="Vencimento até"><input type="date" value={filtroAte} onChange={event => setFiltroAte(event.target.value)} /></Field>
        <Field className="ips-col-2" label="Tipo"><select value={filtroTipo} onChange={event => setFiltroTipo(event.target.value as FiltroTipo)}><option value="TODOS">Todos</option><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></Field>
        <Field className="ips-col-2" label="Status"><select value={filtroStatus} onChange={event => setFiltroStatus(event.target.value as FiltroStatus)}><option value="TODOS">Todos</option><option value="PENDENTE">Pendente</option><option value="PAGO">Pago</option></select></Field>
        <div className="ips-col-2">
          <button type="button" onClick={limparFiltros} disabled={!filtrosAtivos} className="ips-action">LIMPAR</button>
        </div>
      </div>
      <Table>
        <thead><tr><th>Movimento</th><th>Descrição</th><th>Vencimento</th><th>Baixa</th><th className="ips-num">Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="ips-empty" colSpan={7}>Consultando dados reais do Supabase…</td></tr>
            : rows.length === 0 ? <tr><td className="ips-empty" colSpan={7}>{filtrosAtivos ? 'Nenhum lançamento da empresa autenticada atende aos filtros aplicados no banco.' : 'Nenhum lançamento encontrado para a empresa autenticada.'}</td></tr>
            : visibleRows.map(row => <tr key={row.id}>
              <td><span className={movementTag(row.tipo)}>{row.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA'}</span></td>
              <td>{row.descricao}</td>
              <td>{dateLabel(row.data_vencimento)}</td>
              <td>{row.data_pagamento ? dateLabel(row.data_pagamento) : '—'}</td>
              <td className="ips-num">{money(row.valor)}</td>
              <td><span className={statusTag(row.status)}>{row.status}</span></td>
              <td>
                <div className="ips-row-actions">
                  <button type="button" onClick={() => abrirEdicao(row)} disabled={!!workingId} className="ips-action ips-action-mini"><Pencil size={12} />EDITAR</button>
                  {row.status === 'PENDENTE'
                    ? <button type="button" onClick={() => void baixar(row)} disabled={!!workingId || !empresaId} className="ips-action ips-action-success ips-action-mini"><Check size={12} />{workingId === row.id ? 'BAIXANDO…' : 'BAIXA'}</button>
                    : <button type="button" onClick={() => void estornar(row)} disabled={!!workingId || !empresaId} className="ips-action ips-action-mini"><RotateCcw size={12} />ESTORNAR</button>}
                </div>
              </td>
            </tr>)}
        </tbody>
      </Table>
      <p className="ips-hint">Exclusão lógica e histórico de usuário/data ainda não são exibidos aqui: dependem da migration conferida pelo laudo de schema (a tabela não tem deleted_at e a auditoria só tem policy de SELECT). Nada é fingido na tela.</p>
      <nav aria-label="Paginação do fluxo de caixa" className="ips-pager">
        <button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="ips-action">ANTERIOR</button>
        <p aria-live="polite">Página {page + 1} de {pageCount} · {rows.length} lançamento(s) da empresa autenticada</p>
        <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="ips-action">PRÓXIMA</button>
      </nav>
    </SectionCard>
  </IndustrialPageShell>
}
