/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardList, FileText, PackageCheck, Plus, RefreshCw, Search, ShoppingCart, Truck, Users } from 'lucide-react'
import ComprasPedidoForm from './ComprasPedidoForm'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { Link } from 'react-router-dom'

type TabKey = 'visao-geral' | 'requisicoes' | 'alertas' | 'cotacoes' | 'pedidos' | 'recebimentos' | 'fornecedores'
type DbRow = Record<string, unknown>
type TableData = { rows: DbRow[]; loading: boolean; error: string | null }

const tabs: Array<{ key: TabKey; label: string; icon: typeof ClipboardList }> = [
  { key: 'visao-geral', label: 'Visão geral', icon: ShoppingCart },
  { key: 'requisicoes', label: 'Requisições', icon: ClipboardList },
  { key: 'alertas', label: 'Alertas MRP', icon: AlertTriangle },
  { key: 'cotacoes', label: 'Cotações', icon: FileText },
  { key: 'pedidos', label: 'Pedidos de compra', icon: Truck },
  { key: 'recebimentos', label: 'Recebimentos', icon: PackageCheck },
  { key: 'fornecedores', label: 'Fornecedores', icon: Users },
]

const emptyTable: TableData = { rows: [], loading: true, error: null }

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

function DataTable({ rows, kind, onEdit }: { rows: DbRow[]; kind: 'requisicoes' | 'alertas' | 'cotacoes' | 'pedidos' | 'recebimentos' | 'fornecedores'; onEdit?: (id: string) => void }) {
  const [page, setPage] = useState(1)
  const pageSize = 20
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
      { label: 'Prazo para resposta', keys: ['prazo_resposta'], format: 'date' },
      { label: 'Condição de pagamento', keys: ['condicao_pagamento'] },
      { label: 'Status', keys: ['status'], format: 'status' },
    ],
    pedidos: [
      { label: 'Pedido', keys: ['numero', 'id'] },
      { label: 'Fornecedor', keys: ['fornecedor_nome', 'fornecedor_id'] },
      { label: 'Emissão', keys: ['data_pedido', 'created_at'], format: 'date' },
      { label: 'Entrega prevista', keys: ['data_prevista'], format: 'date' },
      { label: 'Total', keys: ['total'], format: 'money' },
      { label: 'Status', keys: ['status'], format: 'status' },
    ],
    recebimentos: [
      { label: 'Pedido', keys: ['numero', 'id'] },
      { label: 'Fornecedor', keys: ['fornecedor_nome', 'fornecedor_id'] },
      { label: 'Recebido em', keys: ['recebido_em'], format: 'date' },
      { label: 'Lote informado', keys: ['lote_recebimento'] },
      { label: 'Valor do pedido', keys: ['total'], format: 'money' },
      { label: 'Status', keys: ['status'], format: 'status' },
      { label: 'Observações do recebimento', keys: ['observacoes_recebimento'] },
    ],
    fornecedores: [
      { label: 'Código', keys: ['codigo'] },
      { label: 'Razão social', keys: ['razao_social'] },
      { label: 'Nome fantasia', keys: ['nome_fantasia'] },
      { label: 'Documento', keys: ['documento'] },
      { label: 'Ativo', keys: ['ativo'] },
    ],
    alertas: [
      { label: 'Código', keys: ['codigo'] },
      { label: 'Produto', keys: ['nome', 'descricao'] },
      { label: 'Estoque atual', keys: ['estoque_atual'] },
      { label: 'Ponto de reposição', keys: ['ponto_reposicao'] },
      { label: 'Diferença', keys: ['saldo_reposicao'] },
      { label: 'Unidade', keys: ['unidade'] },
    ],
  }
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const totalPedidos = kind === 'pedidos' ? rows.reduce((sum, row) => sum + Number(row.total || 0), 0) : 0
  useEffect(() => setPage(1), [kind, rows])
  const exportCsv = () => {
    const lines = [columns[kind].map(column => column.label), ...rows.map(row => columns[kind].map(column => {
      const value = column.keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== '')
      return column.format === 'date' ? dateValue(value) : column.format === 'money' ? moneyValue(value) : value === undefined ? '' : String(value)
    }))]
    const csv = '\ufeff' + lines.map(line => line.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = 'compras-' + kind + '.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  if (!rows.length) return <div className="compras-empty"><PackageCheck size={22} /><strong>{kind === 'alertas' ? 'Nenhum material no ponto de reposição' : kind === 'fornecedores' ? 'Nenhum fornecedor cadastrado' : 'Nenhum registro encontrado'}</strong><span>{kind === 'alertas' ? 'Os alertas aparecem quando o estoque real atinge ou fica abaixo do ponto de reposição cadastrado no produto.' : kind === 'recebimentos' ? 'Nenhum pedido está marcado como recebimento parcial ou recebido.' : 'Os registros aparecerão aqui quando existirem dados para a empresa autenticada.'}</span></div>
  return <div className="compras-table-scroll">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 print:hidden"><span className="text-[10px] text-[#607987]">{rows.length} registro(s) · Página {page} de {pageCount}</span><button type="button" className="compras-button compras-button--light" onClick={exportCsv}><FileText size={13}/> Exportar CSV</button></div>
    {kind === 'recebimentos' && <p className="mb-2 rounded-md border border-[#E7D9B6] bg-[#FFF9EB] p-2 text-[10px] text-[#765A20]">O schema atual registra recebimento no próprio pedido (status, data, lote e observações); esta grade é uma visão separada dos pedidos com recebimento informado, não um livro de eventos parciais por item.</p>}
    <table className="compras-table"><thead><tr className="h-10">{columns[kind].map(column => <th key={column.label}>{column.label}</th>)}{kind === 'pedidos' && <th>Ação</th>}</tr></thead><tbody>{pageRows.map((row, index) => <tr className="h-12" key={textValue(row, 'id') === '—' ? index : textValue(row, 'id')}>{columns[kind].map(column => {
      const value = column.keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== '')
      const formatted = column.format === 'date' ? dateValue(value) : column.format === 'money' ? moneyValue(value) : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '—'
      return <td key={column.label}>{column.format === 'status' ? <span className={statusClass(formatted)}>{formatted.replaceAll('_', ' ')}</span> : formatted}</td>
    })}{kind === 'pedidos' && <td><button className="compras-button compras-button--light erp-edit-button erp-row-action" type="button" onClick={() => onEdit?.(textValue(row, 'id'))} disabled={textValue(row, 'id') === '—'}>Editar</button></td>}</tr>)}</tbody><tfoot><tr className="h-12 border-t-2 border-[#D3E3EA] bg-[#F4F8FA] text-[10px] font-bold"><td colSpan={columns[kind].length + (kind === 'pedidos' ? 1 : 0)}>TOTALIZADORES: {rows.length} registro(s){kind === 'pedidos' ? ' · Valor total ' + moneyValue(totalPedidos) : ''}</td></tr></tfoot></table>
    {pageCount > 1 && <nav aria-label="Paginação da grade de compras" className="mt-3 flex flex-wrap items-center justify-between gap-2 print:hidden"><span className="text-[10px] text-[#607987]">Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} de {rows.length}</span><div className="flex gap-2"><button type="button" className="compras-button compras-button--light" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Anterior</button><button type="button" className="compras-button compras-button--light" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Próxima</button></div></nav>}
  </div>
}

export default function ComprasWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>('visao-geral')
  const [search, setSearch] = useState('')
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [rfqs, setRfqs] = useState<TableData>(emptyTable)
  const [requisitions, setRequisitions] = useState<TableData>(emptyTable)
  const [orders, setOrders] = useState<TableData>(emptyTable)
  const [receipts, setReceipts] = useState<TableData>(emptyTable)
  const [suppliers, setSuppliers] = useState<TableData>(emptyTable)
  const [materials, setMaterials] = useState<TableData>(emptyTable)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('TODOS')

  const load = useCallback(async () => {
    const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
    if (empresaError || typeof empresaId !== 'string' || !empresaId) {
      const message = empresaError?.message ?? 'Empresa da sessão não identificada.'
      ;[setRfqs, setRequisitions, setOrders, setReceipts, setSuppliers, setMaterials].forEach(setter => setter({ rows: [], loading: false, error: message }))
      return
    }
    const loadTable = async (table: string, setter: (data: TableData) => void, orderColumn: string, ascending = false) => {
      setter({ rows: [], loading: true, error: null })
      try {
        const rows = await fetchAllPages<DbRow>((from, to) => supabase.from(table).select('*', { count: 'exact' }).eq('empresa_id', empresaId).order(orderColumn, { ascending }).order('id').range(from, to))
        setter({ rows, loading: false, error: null })
      } catch (cause) {
        setter({ rows: [], loading: false, error: cause instanceof Error ? cause.message : 'Falha na consulta.' })
      }
    }
    await Promise.all([
      loadTable('erp_rfq', setRfqs, 'created_at'),
      loadTable('erp_requisicoes_compra', setRequisitions, 'created_at'),
      loadTable('erp_pedidos_compra', setOrders, 'created_at'),
      loadTable('erp_fornecedores', setSuppliers, 'razao_social', true),
      loadTable('erp_produtos', setMaterials, 'codigo', true),
      (async () => {
        setReceipts({ rows: [], loading: true, error: null })
        try {
          const rows = await fetchAllPages<DbRow>((from, to) => supabase.from('erp_pedidos_compra').select('*', { count: 'exact' }).eq('empresa_id', empresaId).in('status', ['RECEBIMENTO_PARCIAL', 'RECEBIDO']).order('recebido_em', { ascending: false }).order('id').range(from, to))
          setReceipts({ rows, loading: false, error: null })
        } catch (cause) {
          setReceipts({ rows: [], loading: false, error: cause instanceof Error ? cause.message : 'Falha ao consultar recebimentos.' })
        }
      })(),
    ])
  }, [])

  useEffect(() => { void load() }, [load, refreshKey])

  const alertRows = useMemo(() => materials.rows.flatMap(row => {
    const stockRaw = row.estoque_atual
    const reorderRaw = row.ponto_reposicao
    if (stockRaw === null || stockRaw === undefined || reorderRaw === null || reorderRaw === undefined) return []
    const stock = Number(stockRaw)
    const reorder = Number(reorderRaw)
    if (!Number.isFinite(stock) || !Number.isFinite(reorder) || stock > reorder) return []
    return [{ ...row, saldo_reposicao: stock - reorder }]
  }), [materials.rows])

  const filtered = useMemo(() => {
    const filterRows = (rows: DbRow[]) => rows.filter(row => Object.values(row).some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))))
    return { rfqs: filterRows(rfqs.rows), requisitions: filterRows(requisitions.rows), orders: filterRows(orders.rows), receipts: filterRows(receipts.rows), suppliers: filterRows(suppliers.rows), alerts: filterRows(alertRows) }
  }, [rfqs.rows, requisitions.rows, orders.rows, receipts.rows, suppliers.rows, alertRows, search])



  const alertData: TableData = { ...materials, rows: alertRows }
  const activeData = activeTab === 'requisicoes' ? requisitions : activeTab === 'cotacoes' ? rfqs : activeTab === 'pedidos' ? orders : activeTab === 'recebimentos' ? receipts : activeTab === 'fornecedores' ? suppliers : alertData
  const activeRows = activeTab === 'requisicoes' ? filtered.requisitions : activeTab === 'cotacoes' ? filtered.rfqs : activeTab === 'pedidos' ? filtered.orders : activeTab === 'recebimentos' ? filtered.receipts : activeTab === 'fornecedores' ? filtered.suppliers : filtered.alerts
  const tableKind = activeTab === 'requisicoes' ? 'requisicoes' : activeTab === 'pedidos' ? 'pedidos' : activeTab === 'recebimentos' ? 'recebimentos' : activeTab === 'fornecedores' ? 'fornecedores' : activeTab === 'alertas' ? 'alertas' : 'cotacoes'

  return <main className="compras-page" aria-label="Módulo de Compras SYSNQRA">
    <header className="compras-header">
      <div><h1>Central de Compras</h1><p>Requisições, MRP, cotações, pedidos, recebimentos e fornecedores em um único fluxo.</p></div>
    </header>
    {notice && <div className={notice.kind === 'success' ? 'compras-notice compras-notice--success' : 'compras-notice compras-notice--error'} role="status">{notice.message}</div>}
    <nav className="compras-tabs" aria-label="Etapas do módulo">{tabs.map(tab => { const Icon = tab.icon; const count = tab.key === 'requisicoes' ? requisitions : tab.key === 'cotacoes' ? rfqs : tab.key === 'fornecedores' ? suppliers : tab.key === 'alertas' ? materials : null; const total = tab.key === 'alertas' ? alertRows.length : count?.rows.length; return <button type="button" key={tab.key} className={activeTab === tab.key ? 'compras-tab is-active' : 'compras-tab'} onClick={() => setActiveTab(tab.key)}><Icon size={15} />{tab.label}{count && !count.loading ? <span>{total}</span> : null}</button> })}</nav>

    {showOrderForm && activeTab === 'pedidos' && <ComprasPedidoForm key={editingOrderId ?? 'novo-pedido'} pedidoId={editingOrderId ?? undefined} onCancel={() => { setShowOrderForm(false); setEditingOrderId(null) }} onSaved={(message) => { setNotice({kind:'success',message}); setSearch(''); setRefreshKey(value => value + 1) }} />}
    {activeTab === 'visao-geral' ? <section className="compras-panel compras-open-orders"><div className="compras-panel-heading"><div><h2>Pedidos de compra em aberto</h2><p>Pedidos que ainda precisam de aprovação, envio ou recebimento.</p></div><button className="compras-button compras-button--primary" type="button" onClick={() => { setEditingOrderId(null); setShowOrderForm(true); setActiveTab('pedidos'); setNotice(null) }}><Plus size={14} /> Novo pedido</button></div>
      {orders.loading ? <div className="compras-loading"><RefreshCw size={16} /> Carregando pedidos reais…</div> : orders.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{orders.error}</span></div> : (() => { const openOrders = filtered.orders.filter(row => !['RECEBIDO','CANCELADO','REJEITADO','CONCLUIDO','CONCLUÍDO'].includes(textValue(row,'status').toLocaleUpperCase('pt-BR'))); return openOrders.length ? <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Nº pedido</th><th>Fornecedor</th><th>Emissão</th><th>Entrega prevista</th><th>Status</th><th>Valor total</th><th>Ação</th></tr></thead><tbody>{openOrders.map((row,index) => <tr key={textValue(row,'id') === '—' ? index : textValue(row,'id')}><td><strong>{textValue(row,'numero','id')}</strong></td><td>{textValue(row,'fornecedor_nome','razao_social','fornecedor_id')}</td><td>{dateValue(row.data_pedido ?? row.created_at)}</td><td>{dateValue(row.data_prevista)}</td><td><span className={statusClass(textValue(row,'status'))}>{textValue(row,'status').replaceAll('_',' ')}</span></td><td>{moneyValue(row.total)}</td><td><button className="compras-button compras-button--light erp-edit-button erp-row-action" type="button" onClick={() => { setEditingOrderId(textValue(row,'id')); setActiveTab('pedidos'); setShowOrderForm(true) }} disabled={textValue(row,'id') === '—'}>Editar pedido</button></td></tr>)}</tbody></table></div> : <div className="compras-empty"><ShoppingCart size={22}/><strong>Nenhum pedido em aberto</strong><span>Quando houver pedidos em rascunho, aguardando aprovação ou recebimento, eles aparecerão neste grid.</span><button className="compras-button compras-button--primary" type="button" onClick={() => { setEditingOrderId(null); setShowOrderForm(true); setActiveTab('pedidos') }}><Plus size={14}/> Criar primeiro pedido</button></div> })()}
    </section> : !showOrderForm && <section className="compras-panel"><div className="compras-panel-heading"><div><h2>{tabs.find(tab => tab.key === activeTab)?.label}</h2><p>{activeData.loading ? 'Consultando o banco de dados…' : activeData.error ? 'Não foi possível consultar esta tabela.' : activeRows.length + ' registro(s) nesta consulta'}</p></div><div className="compras-heading-actions">{activeTab === 'pedidos' && <button className="compras-button compras-button--primary" type="button" onClick={() => { setEditingOrderId(null); setShowOrderForm(true); setNotice(null) }}><Plus size={14}/> Novo pedido</button>}{activeTab === 'cotacoes' && <button className="compras-button compras-button--primary" type="button" onClick={() => { setShowRfqForm(true); setNotice(null) }}><Plus size={14}/> Nova cotação</button>}<label className="compras-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar nesta lista…" aria-label="Pesquisar registros" /></label></div></div>
      {activeData.loading ? <div className="compras-loading"><RefreshCw size={16} /> Carregando dados reais…</div> : activeData.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{activeData.error}</span><button className="compras-button compras-button--light" type="button" onClick={() => setRefreshKey(value => value + 1)}>Tentar novamente</button></div> : <DataTable rows={activeRows} kind={tableKind} onEdit={(id) => { setEditingOrderId(id); setShowOrderForm(true) }} />}
    </section>}    <footer className="compras-footer"><span>SYSNQRA ERP INDUSTRIAL · SUPRIMENTOS</span><span>Dados vinculados à sessão autenticada · Revisão visual em andamento · 28/10/2026</span></footer>
  </main>
}
