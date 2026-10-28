import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ClipboardList, FileText, PackageCheck, Plus, RefreshCw, Search, ShoppingCart, Truck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type TabKey = 'visao-geral' | 'requisicoes' | 'cotacoes' | 'pedidos' | 'recebimentos'
type DbRow = Record<string, unknown>
type TableData = { rows: DbRow[]; loading: boolean; error: string | null }
type RfqForm = { dataNecessidade: string; prazoResposta: string; condicaoPagamento: string; comprador: string; observacoes: string }

const tabs: Array<{ key: TabKey; label: string; icon: typeof ClipboardList }> = [
  { key: 'visao-geral', label: 'Visão geral', icon: ShoppingCart },
  { key: 'requisicoes', label: 'Requisições', icon: ClipboardList },
  { key: 'cotacoes', label: 'Cotações', icon: FileText },
  { key: 'pedidos', label: 'Pedidos de compra', icon: Truck },
  { key: 'recebimentos', label: 'Recebimentos', icon: PackageCheck },
]

const emptyTable: TableData = { rows: [], loading: true, error: null }
const today = new Date().toISOString().slice(0, 10)

function textValue(row: DbRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return '—'
}

function moneyValue(value: unknown): string {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(amount) ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
}

function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR')
}

function statusClass(value: string): string {
  const normalized = value.toLocaleUpperCase('pt-BR')
  if (['APROVADO', 'APROVADA', 'CONCLUIDO', 'CONCLUÍDO', 'RECEBIDO', 'FINALIZADO', 'FINALIZADA'].includes(normalized)) return 'compras-status compras-status--success'
  if (['CANCELADO', 'CANCELADA', 'REPROVADO', 'REPROVADA'].includes(normalized)) return 'compras-status compras-status--danger'
  if (['EM_ANALISE', 'EM ANÁLISE', 'AGUARDANDO_COTACAO', 'AGUARDANDO COTAÇÃO', 'PENDENTE'].includes(normalized)) return 'compras-status compras-status--warning'
  return 'compras-status'
}

function DataTable({ rows, kind }: { rows: DbRow[]; kind: 'requisicoes' | 'cotacoes' | 'pedidos' | 'recebimentos' }) {
  if (!rows.length) return <div className="compras-empty"><PackageCheck size={22} /><strong>Nenhum registro encontrado</strong><span>Os registros aparecerão aqui quando existirem dados para a empresa autenticada.</span></div>
  const columns: Record<typeof kind, Array<{ label: string; keys: string[]; format?: 'date' | 'money' | 'status' }>> = {
    requisicoes: [
      { label: 'Código', keys: ['codigo', 'numero', 'id'] },
      { label: 'Ordem de produção', keys: ['ordem_producao_id'] },
      { label: 'Comprador', keys: ['comprador_nome', 'comprador_responsavel'] },
      { label: 'Data limite', keys: ['data_limite', 'data_necessidade'], format: 'date' },
      { label: 'Urgência', keys: ['nivel_urgencia'] },
      { label: 'Status', keys: ['status'], format: 'status' },
    ],
    cotacoes: [
      { label: 'Nº cotação', keys: ['numero', 'id'] },
      { label: 'Emissão', keys: ['data_emissao', 'created_at'], format: 'date' },
      { label: 'Necessidade', keys: ['data_necessidade', 'previsao_entrega'], format: 'date' },
      { label: 'Comprador', keys: ['comprador_responsavel', 'created_by'] },
      { label: 'Menor custo', keys: ['menor_preco_ofertado', 'menor_custo_liquido_atendido'], format: 'money' },
      { label: 'Status', keys: ['status_aprovacao', 'status'], format: 'status' },
    ],
    pedidos: [
      { label: 'Pedido', keys: ['numero', 'id'] },
      { label: 'Fornecedor', keys: ['fornecedor_nome', 'fornecedor_id'] },
      { label: 'Emissão', keys: ['data_pedido', 'created_at'], format: 'date' },
      { label: 'Entrega prevista', keys: ['prazo_entrega'], format: 'date' },
      { label: 'Total', keys: ['total'], format: 'money' },
      { label: 'Status', keys: ['status'], format: 'status' },
    ],
    recebimentos: [
      { label: 'Documento', keys: ['numero', 'numero_documento', 'chave_acesso', 'id'] },
      { label: 'Pedido', keys: ['pedido_compra_id', 'pedido_id'] },
      { label: 'Fornecedor', keys: ['fornecedor_nome', 'fornecedor_id'] },
      { label: 'Data', keys: ['data_recebimento', 'created_at'], format: 'date' },
      { label: 'Status', keys: ['status'], format: 'status' },
    ],
  }
  return <div className="compras-table-scroll"><table className="compras-table"><thead><tr>{columns[kind].map(column => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={textValue(row, 'id') === '—' ? index : textValue(row, 'id')}>{columns[kind].map(column => {
    const value = column.keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== '')
    const formatted = column.format === 'date' ? dateValue(value) : column.format === 'money' ? moneyValue(value) : typeof value === 'string' || typeof value === 'number' ? String(value) : '—'
    return <td key={column.label}>{column.format === 'status' ? <span className={statusClass(formatted)}>{formatted.replaceAll('_', ' ')}</span> : formatted}</td>
  })}</tr>)}</tbody></table></div>
}

export default function ComprasWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>('visao-geral')
  const [search, setSearch] = useState('')
  const [showRfqForm, setShowRfqForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState<RfqForm>({ dataNecessidade: '', prazoResposta: '', condicaoPagamento: '', comprador: '', observacoes: '' })
  const [rfqs, setRfqs] = useState<TableData>(emptyTable)
  const [requisitions, setRequisitions] = useState<TableData>(emptyTable)
  const [orders, setOrders] = useState<TableData>(emptyTable)
  const [receipts, setReceipts] = useState<TableData>(emptyTable)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    const loadTable = async (table: string, setter: (data: TableData) => void, orderColumn: string) => {
      setter({ rows: [], loading: true, error: null })
      const { data, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: false }).limit(100)
      if (error) setter({ rows: [], loading: false, error: error.message })
      else setter({ rows: (data ?? []) as DbRow[], loading: false, error: null })
    }
    await Promise.all([
      loadTable('erp_rfq', setRfqs, 'created_at'),
      loadTable('erp_requisicoes_compra', setRequisitions, 'created_at'),
      loadTable('erp_pedidos_compra', setOrders, 'created_at'),
      loadTable('erp_recebimentos_compra', setReceipts, 'created_at'),
    ])
  }, [])

  useEffect(() => { void load() }, [load, refreshKey])

  const filtered = useMemo(() => {
    const filterRows = (rows: DbRow[]) => rows.filter(row => Object.values(row).some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))))
    return { rfqs: filterRows(rfqs.rows), requisitions: filterRows(requisitions.rows), orders: filterRows(orders.rows), receipts: filterRows(receipts.rows) }
  }, [rfqs.rows, requisitions.rows, orders.rows, receipts.rows, search])

  async function createRfq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (typeof empresaId !== 'string' || !empresaId) throw new Error('Não foi possível identificar a empresa da sessão autenticada.')
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const { data, error } = await supabase.from('erp_rfq').insert({
        empresa_id: empresaId,
        data_emissao: today,
        data_necessidade: form.dataNecessidade || null,
        prazo_resposta: form.prazoResposta || null,
        condicao_pagamento: form.condicaoPagamento.trim() || null,
        comprador_responsavel: form.comprador.trim() || authData.user?.email || null,
        observacoes: form.observacoes.trim() || null,
        status: 'RASCUNHO',
        status_aprovacao: 'EM_ANALISE',
        created_by: authData.user?.id ?? null,
      }).select('id,numero').single()
      if (error) throw error
      setNotice({ kind: 'success', message: 'Solicitação de cotação criada. Agora adicione itens e fornecedores na etapa de cotação.' })
      setForm({ dataNecessidade: '', prazoResposta: '', condicaoPagamento: '', comprador: '', observacoes: '' })
      setShowRfqForm(false)
      setActiveTab('cotacoes')
      setRefreshKey(value => value + 1)
      void data
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Falha ao criar solicitação de cotação.' })
    } finally {
      setSaving(false)
    }
  }

  const activeData = activeTab === 'requisicoes' ? requisitions : activeTab === 'cotacoes' ? rfqs : activeTab === 'pedidos' ? orders : receipts
  const activeRows = activeTab === 'requisicoes' ? filtered.requisitions : activeTab === 'cotacoes' ? filtered.rfqs : activeTab === 'pedidos' ? filtered.orders : filtered.receipts
  const tableKind = activeTab === 'requisicoes' ? 'requisicoes' : activeTab === 'pedidos' ? 'pedidos' : activeTab === 'recebimentos' ? 'recebimentos' : 'cotacoes'

  return <main className="compras-page" aria-label="Módulo de Compras SYSNQRA">
    <header className="compras-header">
      <div><div className="compras-eyebrow">SYSNQRA ERP INDUSTRIAL / SUPRIMENTOS</div><h1>Central de Compras</h1><p>Requisições, cotações, pedidos e recebimentos em um único fluxo.</p></div>
      <div className="compras-header-actions"><button className="compras-button compras-button--light" type="button" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={14} /> Atualizar</button><button className="compras-button compras-button--primary" type="button" onClick={() => { setShowRfqForm(value => !value); setActiveTab('cotacoes'); setNotice(null) }}><Plus size={15} /> Nova cotação</button></div>
    </header>
    {notice && <div className={notice.kind === 'success' ? 'compras-notice compras-notice--success' : 'compras-notice compras-notice--error'} role="status">{notice.message}</div>}
    <section className="compras-kpis" aria-label="Resumo de compras">
      <article className="compras-kpi"><span>Requisições</span><strong>{requisitions.loading ? '—' : requisitions.rows.length}</strong><small>Registros reais da empresa</small></article>
      <article className="compras-kpi"><span>Cotações</span><strong>{rfqs.loading ? '—' : rfqs.rows.length}</strong><small>Solicitações registradas</small></article>
      <article className="compras-kpi"><span>Pedidos de compra</span><strong>{orders.loading ? '—' : orders.rows.length}</strong><small>Pedidos registrados</small></article>
      <article className="compras-kpi"><span>Recebimentos</span><strong>{receipts.loading ? '—' : receipts.rows.length}</strong><small>Documentos localizados</small></article>
    </section>
    <nav className="compras-tabs" aria-label="Etapas do módulo">{tabs.map(tab => { const Icon = tab.icon; return <button type="button" key={tab.key} className={activeTab === tab.key ? 'compras-tab is-active' : 'compras-tab'} onClick={() => setActiveTab(tab.key)}><Icon size={15} />{tab.label}{tab.key === 'requisicoes' && !requisitions.loading ? <span>{requisitions.rows.length}</span> : tab.key === 'cotacoes' && !rfqs.loading ? <span>{rfqs.rows.length}</span> : null}</button> })}</nav>
    {showRfqForm && activeTab === 'cotacoes' && <section className="compras-panel compras-form-panel"><div className="compras-panel-heading"><div><h2>Nova solicitação de cotação</h2><p>Cadastre o cabeçalho. Itens e fornecedores serão vinculados na etapa de detalhamento.</p></div><button className="compras-button compras-button--light" type="button" onClick={() => setShowRfqForm(false)}>Fechar</button></div><form onSubmit={createRfq} className="compras-form-grid">
      <label className="compras-field"><span>Data de emissão</span><input value={dateValue(today)} readOnly aria-label="Data de emissão" /></label>
      <label className="compras-field"><span>Data de necessidade</span><input type="date" value={form.dataNecessidade} onChange={event => setForm(value => ({ ...value, dataNecessidade: event.target.value }))} min={today} /></label>
      <label className="compras-field"><span>Prazo para resposta</span><input type="date" value={form.prazoResposta} onChange={event => setForm(value => ({ ...value, prazoResposta: event.target.value }))} min={today} /></label>
      <label className="compras-field"><span>Condição de pagamento</span><input value={form.condicaoPagamento} onChange={event => setForm(value => ({ ...value, condicaoPagamento: event.target.value }))} maxLength={120} placeholder="Ex.: 28/56 dias" /></label>
      <label className="compras-field compras-field--wide"><span>Comprador responsável</span><input value={form.comprador} onChange={event => setForm(value => ({ ...value, comprador: event.target.value }))} maxLength={100} placeholder="Responsável pela cotação" /></label>
      <label className="compras-field compras-field--full"><span>Observações</span><textarea value={form.observacoes} onChange={event => setForm(value => ({ ...value, observacoes: event.target.value }))} rows={3} maxLength={2000} placeholder="Especificações, condições de fornecimento e orientações para os fornecedores" /></label>
      <div className="compras-form-footer"><span>O registro será salvo na empresa vinculada à sessão autenticada.</span><button className="compras-button compras-button--primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar solicitação'}</button></div>
    </form></section>}
    {activeTab === 'visao-geral' ? <section className="compras-overview-grid">
      <article className="compras-panel"><div className="compras-panel-heading"><div><h2>Fluxo de compras</h2><p>Acompanhe as etapas operacionais do setor.</p></div></div><div className="compras-flow">{tabs.slice(1).map((tab, index) => { const Icon = tab.icon; const count = tab.key === 'requisicoes' ? requisitions.rows.length : tab.key === 'cotacoes' ? rfqs.rows.length : tab.key === 'pedidos' ? orders.rows.length : receipts.rows.length; return <button key={tab.key} className="compras-flow-step" type="button" onClick={() => setActiveTab(tab.key)}><span className="compras-flow-icon"><Icon size={18} /></span><span><strong>{tab.label}</strong><small>{count} registro(s) carregado(s)</small></span><b>{String(index + 1).padStart(2, '0')}</b></button> })}</div></article>
      <article className="compras-panel"><div className="compras-panel-heading"><div><h2>Ações rápidas</h2><p>Atalhos para iniciar o trabalho.</p></div></div><div className="compras-quick-actions"><button type="button" onClick={() => { setActiveTab('cotacoes'); setShowRfqForm(true) }}><Plus size={17} /><span><strong>Nova cotação</strong><small>Registrar uma solicitação de preços</small></span></button><button type="button" onClick={() => setActiveTab('requisicoes')}><ClipboardList size={17} /><span><strong>Consultar requisições</strong><small>Ver demanda interna de materiais</small></span></button><button type="button" onClick={() => setActiveTab('pedidos')}><Truck size={17} /><span><strong>Consultar pedidos</strong><small>Acompanhar pedidos emitidos</small></span></button></div></article>
    </section> : <section className="compras-panel"><div className="compras-panel-heading"><div><h2>{tabs.find(tab => tab.key === activeTab)?.label}</h2><p>{activeData.loading ? 'Consultando o banco de dados…' : activeData.error ? 'Não foi possível consultar esta tabela.' : activeRows.length + ' registro(s) nesta consulta'}</p></div><label className="compras-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar nesta lista…" aria-label="Pesquisar registros" /></label></div>
      {activeData.loading ? <div className="compras-loading"><RefreshCw size={16} /> Carregando dados reais…</div> : activeData.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{activeData.error}</span><button className="compras-button compras-button--light" type="button" onClick={() => setRefreshKey(value => value + 1)}>Tentar novamente</button></div> : <DataTable rows={activeRows} kind={tableKind} />}
    </section>}
    <footer className="compras-footer"><span>SYSNQRA ERP INDUSTRIAL · SUPRIMENTOS</span><span>Dados vinculados à sessão autenticada · Revisão visual em andamento · 28/10/2026</span></footer>
  </main>
}
