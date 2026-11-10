/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-COMPRAS-CENTRAL-ABAS-20261110-01 — central única com abas internas, alertas MRP e fornecedores reais; ações principais em laranja
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ClipboardList, FileText, PackageCheck, Plus, RefreshCw, Search, ShoppingCart, Truck, Users } from 'lucide-react'
import ComprasPedidoForm from './ComprasPedidoForm'
import { supabase } from '../lib/supabaseClient'

type TabKey = 'visao-geral' | 'requisicoes' | 'alertas' | 'cotacoes' | 'pedidos' | 'recebimentos' | 'fornecedores'
type DbRow = Record<string, unknown>
type TableData = { rows: DbRow[]; loading: boolean; error: string | null }
type RfqForm = { dataNecessidade: string; prazoResposta: string; condicaoPagamento: string; comprador: string; observacoes: string }

const tabs: Array<{ key: TabKey; label: string; icon: typeof ClipboardList }> = [
  { key: 'visao-geral', label: 'Painel', icon: ShoppingCart },
  { key: 'requisicoes', label: 'Requisições', icon: ClipboardList },
  { key: 'alertas', label: 'Alertas MRP', icon: AlertTriangle },
  { key: 'cotacoes', label: 'Cotações', icon: FileText },
  { key: 'pedidos', label: 'Pedidos', icon: Truck },
  { key: 'recebimentos', label: 'Recebimentos', icon: PackageCheck },
  { key: 'fornecedores', label: 'Fornecedores', icon: Users },
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

function DataTable({ rows, kind }: { rows: DbRow[]; kind: 'requisicoes' | 'alertas' | 'cotacoes' | 'pedidos' | 'recebimentos' | 'fornecedores' }) {
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
      { label: 'Pedido', keys: ['numero', 'id'] },
      { label: 'Fornecedor', keys: ['fornecedor_nome', 'fornecedor_id'] },
      { label: 'Data do pedido', keys: ['data_pedido', 'created_at'], format: 'date' },
      { label: 'Status', keys: ['status'], format: 'status' },
    ],
    fornecedores: [
      { label: 'Razão social', keys: ['razao_social', 'nome'] },
      { label: 'Nome fantasia', keys: ['nome_fantasia'] },
      { label: 'CNPJ / documento', keys: ['documento', 'cnpj'] },
      { label: 'Homologação', keys: ['status_homologacao', 'situacao'] },
      { label: 'Ativo', keys: ['ativo'] },
    ],
    alertas: [
      { label: 'Código', keys: ['codigo', 'referencia'] },
      { label: 'Material', keys: ['nome', 'descricao'] },
      { label: 'Saldo projetado', keys: ['saldo_projetado'] },
      { label: 'Estoque de segurança', keys: ['estoque_seguranca', 'estoque_minimo'] },
      { label: 'Ponto de pedido', keys: ['ponto_pedido'] },
      { label: 'Unidade', keys: ['unidade'] },
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
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState<RfqForm>({ dataNecessidade: '', prazoResposta: '', condicaoPagamento: '', comprador: '', observacoes: '' })
  const [rfqs, setRfqs] = useState<TableData>(emptyTable)
  const [requisitions, setRequisitions] = useState<TableData>(emptyTable)
  const [orders, setOrders] = useState<TableData>(emptyTable)
  const [receipts, setReceipts] = useState<TableData>(emptyTable)
  const [suppliers, setSuppliers] = useState<TableData>(emptyTable)
  const [materials, setMaterials] = useState<TableData>(emptyTable)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
    if (empresaError || typeof empresaId !== 'string' || !empresaId) {
      const message = empresaError?.message ?? 'Empresa da sessão não identificada.'
      ;[setRfqs, setRequisitions, setOrders, setReceipts, setSuppliers, setMaterials].forEach(setter => setter({ rows: [], loading: false, error: message }))
      return
    }
    const loadTable = async (table: string, setter: (data: TableData) => void, orderColumn: string) => {
      setter({ rows: [], loading: true, error: null })
      const { data, error } = await supabase.from(table).select('*').eq('empresa_id', empresaId).order(orderColumn, { ascending: false }).limit(100)
      if (error) setter({ rows: [], loading: false, error: error.message })
      else setter({ rows: (data ?? []) as DbRow[], loading: false, error: null })
    }
    await Promise.all([
      loadTable('erp_rfq', setRfqs, 'created_at'),
      loadTable('erp_requisicoes_compra', setRequisitions, 'created_at'),
      loadTable('erp_fornecedores', setSuppliers, 'razao_social'),
      loadTable('erp_produtos', setMaterials, 'codigo'),
      loadTable('erp_pedidos_compra', setOrders, 'created_at'),
      (async () => {
        setReceipts({ rows: [], loading: true, error: null })
        const { data, error } = await supabase.from('erp_pedidos_compra').select('*').eq('empresa_id', empresaId).in('status', ['RECEBIMENTO_PARCIAL', 'RECEBIDO']).order('created_at', { ascending: false }).limit(100)
        if (error) setReceipts({ rows: [], loading: false, error: error.message })
        else setReceipts({ rows: (data ?? []) as DbRow[], loading: false, error: null })
      })(),
    ])
  }, [])

  useEffect(() => { void load() }, [load, refreshKey])

  const filtered = useMemo(() => {
    const filterRows = (rows: DbRow[]) => rows.filter(row => Object.values(row).some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))))
    const alertRows = materials.rows.flatMap(row => {
      const stock = Number(row.estoque_atual ?? 0)
      const incoming = Number(row.em_pedido ?? row.quantidade_em_pedido ?? 0)
      const demand = Number(row.demanda_pcp ?? row.quantidade_reservada ?? 0)
      const safety = Number(row.estoque_seguranca ?? row.estoque_minimo ?? 0)
      const reorder = Number(row.ponto_pedido ?? safety)
      const saldo = stock + incoming - demand
      const hasThreshold = row.estoque_seguranca != null || row.estoque_minimo != null || row.ponto_pedido != null
      if (!Number.isFinite(saldo) || !hasThreshold || saldo > reorder) return []
      return [{ ...row, saldo_projetado: saldo }]
    })
    return { rfqs: filterRows(rfqs.rows), requisitions: filterRows(requisitions.rows), orders: filterRows(orders.rows), receipts: filterRows(receipts.rows), suppliers: filterRows(suppliers.rows), alerts: filterRows(alertRows) }
  }, [rfqs.rows, requisitions.rows, orders.rows, receipts.rows, suppliers.rows, materials.rows, search])

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

  const activeData = activeTab === 'requisicoes' ? requisitions : activeTab === 'cotacoes' ? rfqs : activeTab === 'pedidos' ? orders : activeTab === 'recebimentos' ? receipts : activeTab === 'fornecedores' ? suppliers : materials
  const activeRows = activeTab === 'requisicoes' ? filtered.requisitions : activeTab === 'cotacoes' ? filtered.rfqs : activeTab === 'pedidos' ? filtered.orders : activeTab === 'recebimentos' ? filtered.receipts : activeTab === 'fornecedores' ? filtered.suppliers : filtered.alerts
  const tableKind = activeTab === 'requisicoes' ? 'requisicoes' : activeTab === 'pedidos' ? 'pedidos' : activeTab === 'recebimentos' ? 'recebimentos' : activeTab === 'fornecedores' ? 'fornecedores' : activeTab === 'alertas' ? 'alertas' : 'cotacoes'

  return <main className="compras-page" aria-label="Módulo de Compras SYSNQRA">
    <header className="compras-header">
      <div><h1>Central de Compras</h1><p>Requisições, cotações, pedidos e recebimentos em um único fluxo.</p></div>
    </header>
    {notice && <div className={notice.kind === 'success' ? 'compras-notice compras-notice--success' : 'compras-notice compras-notice--error'} role="status">{notice.message}</div>}
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
    {showOrderForm && activeTab === 'pedidos' && <ComprasPedidoForm onCancel={() => setShowOrderForm(false)} onSaved={(message) => { setNotice({kind:'success',message}); setShowOrderForm(false); setSearch(''); setRefreshKey(value => value + 1) }} />}
    {activeTab === 'visao-geral' ? <section className="compras-panel compras-open-orders"><div className="compras-panel-heading"><div><h2>Pedidos de compra em aberto</h2><p>Pedidos que ainda precisam de aprovação, envio ou recebimento.</p></div><button className="compras-button compras-button--primary" type="button" onClick={() => { setShowOrderForm(true); setActiveTab('pedidos'); setNotice(null) }}><Plus size={14} /> Novo pedido</button></div>
      {orders.loading ? <div className="compras-loading"><RefreshCw size={16} /> Carregando pedidos reais…</div> : orders.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{orders.error}</span></div> : (() => { const openOrders = filtered.orders.filter(row => !['RECEBIDO','CANCELADO','REJEITADO','CONCLUIDO','CONCLUÍDO'].includes(textValue(row,'status').toLocaleUpperCase('pt-BR'))); return openOrders.length ? <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Nº pedido</th><th>Fornecedor</th><th>Emissão</th><th>Entrega prevista</th><th>Status</th><th>Valor total</th><th>Ação</th></tr></thead><tbody>{openOrders.map((row,index) => <tr key={textValue(row,'id') === '—' ? index : textValue(row,'id')}><td><strong>{textValue(row,'numero','id')}</strong></td><td>{textValue(row,'fornecedor_nome','razao_social','fornecedor_id')}</td><td>{dateValue(row.data_pedido ?? row.created_at)}</td><td>{dateValue(row.prazo_entrega)}</td><td><span className={statusClass(textValue(row,'status'))}>{textValue(row,'status').replaceAll('_',' ')}</span></td><td>{moneyValue(row.total)}</td><td><button className="compras-button compras-button--light" type="button" onClick={() => { setActiveTab('pedidos'); setSearch(textValue(row,'numero','id')) }}>Abrir pedido</button></td></tr>)}</tbody></table></div> : <div className="compras-empty"><ShoppingCart size={22}/><strong>Nenhum pedido em aberto</strong><span>Quando houver pedidos em rascunho, aguardando aprovação ou recebimento, eles aparecerão neste grid.</span><button className="compras-button compras-button--primary" type="button" onClick={() => { setShowOrderForm(true); setActiveTab('pedidos') }}><Plus size={14}/> Criar primeiro pedido</button></div> })()}
    </section> : !showOrderForm && <section className="compras-panel"><div className="compras-panel-heading"><div><h2>{tabs.find(tab => tab.key === activeTab)?.label}</h2><p>{activeData.loading ? 'Consultando o banco de dados…' : activeData.error ? 'Não foi possível consultar esta tabela.' : activeRows.length + ' registro(s) nesta consulta'}</p></div><div className="compras-heading-actions">{activeTab === 'pedidos' && <button className="compras-button compras-button--primary" type="button" onClick={() => { setShowOrderForm(true); setNotice(null) }}><Plus size={14}/> Novo pedido</button>}{activeTab === 'cotacoes' && <button className="compras-button compras-button--primary" type="button" onClick={() => { setShowRfqForm(true); setNotice(null) }}><Plus size={14}/> Nova cotação</button>}<label className="compras-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar nesta lista…" aria-label="Pesquisar registros" /></label></div></div>
      {activeData.loading ? <div className="compras-loading"><RefreshCw size={16} /> Carregando dados reais…</div> : activeData.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{activeData.error}</span><button className="compras-button compras-button--light" type="button" onClick={() => setRefreshKey(value => value + 1)}>Tentar novamente</button></div> : <DataTable rows={activeRows} kind={tableKind} />}
    </section>}    <footer className="compras-footer"><span>SYSNQRA ERP INDUSTRIAL · SUPRIMENTOS</span><span>Dados vinculados à sessão autenticada · Revisão visual em andamento · 28/10/2026</span></footer>
  </main>
}
