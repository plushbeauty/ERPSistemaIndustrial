/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, BarChart3, ClipboardList, FileText, PackageCheck, Plus, Printer, RefreshCw, Search, ShoppingCart, Truck, Users } from 'lucide-react'
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
  if (['EM_ANALISE', 'EM ANÁLISE', 'AGUARDANDO_COTACAO', 'AGUARDANDO COTAÇÃO', 'PENDENTE', 'RECEBIMENTO_PARCIAL', 'RETIDO', 'RASCUNHO', 'PENDENTE_APROVACAO'].includes(normalized)) return 'compras-status compras-status--warning'
  return 'compras-status'
}

function DataTable({ rows, kind, onEdit }: { rows: DbRow[]; kind: 'requisicoes' | 'alertas' | 'cotacoes' | 'pedidos' | 'recebimentos' | 'fornecedores'; onEdit?: (id: string) => void }) {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const columns: Record<typeof kind, Array<{ label: string; keys: string[]; format?: 'date' | 'money' | 'status' | 'quantity' }>> = {
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
      { label: 'NF', keys: ['nf_numero'] },
      { label: 'Produto', keys: ['produto_codigo', 'produto_id'] },
      { label: 'Descrição', keys: ['produto_nome'] },
      { label: 'Fornecedor', keys: ['fornecedor_nome', 'fornecedor_id'] },
      { label: 'Lote interno', keys: ['lote_interno'] },
      { label: 'Lote fornecedor', keys: ['lote_fornecedor'] },
      { label: 'Qtd. recebida', keys: ['quantidade_recebida'], format: 'quantity' },
      { label: 'Qtd. disponível', keys: ['quantidade_disponivel'], format: 'quantity' },
      { label: 'Inspeção', keys: ['status_inspecao'], format: 'status' },
      { label: 'Data entrada', keys: ['data_entrada'], format: 'date' },
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
  const totalRecebido = kind === 'recebimentos' ? rows.reduce((sum, row) => sum + Number(row.quantidade_recebida || 0), 0) : 0
  const totalDisponivel = kind === 'recebimentos' ? rows.reduce((sum, row) => sum + Number(row.quantidade_disponivel || 0), 0) : 0
  useEffect(() => setPage(1), [kind, rows])
  const exportCsv = () => {
    const lines = [columns[kind].map(column => column.label), ...rows.map(row => columns[kind].map(column => {
      const value = column.keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== '')
      return column.format === 'date' ? dateValue(value) : column.format === 'money' ? moneyValue(value) : column.format === 'quantity' ? Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : value === undefined ? '' : String(value)
    }))]
    const csv = '\ufeff' + lines.map(line => line.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = 'compras-' + kind + '.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  if (!rows.length) return <div className="compras-empty"><PackageCheck size={22} /><strong>{kind === 'alertas' ? 'Nenhum material no ponto de reposição' : kind === 'fornecedores' ? 'Nenhum fornecedor cadastrado' : 'Nenhum registro encontrado'}</strong><span>{kind === 'alertas' ? 'Os alertas aparecem quando o estoque real atinge ou fica abaixo do ponto de reposição cadastrado no produto.' : kind === 'recebimentos' ? 'Nenhum lote de recebimento registrado para esta empresa.' : 'Os registros aparecerão aqui quando existirem dados para a empresa autenticada.'}</span></div>
  return <div className="compras-table-scroll">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 print:hidden"><span className="text-[10px] text-[#607987]">{rows.length} registro(s) · Página {page} de {pageCount}</span><button type="button" className="compras-button compras-button--light" onClick={exportCsv}><FileText size={13}/> Exportar CSV</button></div>
    {kind === 'recebimentos' && <p className="mb-2 rounded-md border border-[#E7D9B6] bg-[#FFF9EB] p-2 text-[10px] text-[#765A20]">Esta grade lê os lotes reais de entrada em erp_estoque_lotes, com NF, produto, fornecedor, lote, quantidades e inspeção; não infere recebimento a partir do status do pedido.</p>}
    <table className="compras-table"><thead><tr className="h-10">{columns[kind].map(column => <th key={column.label}>{column.label}</th>)}{kind === 'pedidos' && <th>Ação</th>}</tr></thead><tbody>{pageRows.map((row, index) => <tr className="h-12" key={textValue(row, 'id') === '—' ? index : textValue(row, 'id')}>{columns[kind].map(column => {
      const value = column.keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== '')
      const formatted = column.format === 'date' ? dateValue(value) : column.format === 'money' ? moneyValue(value) : column.format === 'quantity' ? Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '—'
      return <td key={column.label}>{column.format === 'status' ? <span className={statusClass(formatted)}>{formatted.replaceAll('_', ' ')}</span> : formatted}</td>
    })}{kind === 'pedidos' && <td><button className="compras-button compras-button--light erp-edit-button erp-row-action" type="button" title={['RASCUNHO','PENDENTE_APROVACAO'].includes(textValue(row,'status').toUpperCase())?'Editar pedido em aberto':'Pedido aprovado/recebido: edição bloqueada'} onClick={() => onEdit?.(textValue(row, 'id'))} disabled={textValue(row, 'id') === '—' || !['RASCUNHO','PENDENTE_APROVACAO'].includes(textValue(row,'status').toUpperCase())}>{['RASCUNHO','PENDENTE_APROVACAO'].includes(textValue(row,'status').toUpperCase())?'Editar':'Somente leitura'}</button></td>}</tr>)}</tbody><tfoot><tr className="h-12 border-t-2 border-[#D3E3EA] bg-[#F4F8FA] text-[10px] font-bold"><td colSpan={columns[kind].length + (kind === 'pedidos' ? 1 : 0)}>TOTALIZADORES: {rows.length} registro(s){kind === 'pedidos' ? ' · Valor total ' + moneyValue(totalPedidos) : kind === 'recebimentos' ? ' · Quantidade recebida ' + totalRecebido.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' · Disponível ' + totalDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : ''}</td></tr></tfoot></table>
    {pageCount > 1 && <nav aria-label="Paginação da grade de compras" className="mt-3 flex flex-wrap items-center justify-between gap-2 print:hidden"><span className="text-[10px] text-[#607987]">Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} de {rows.length}</span><div className="flex gap-2"><button type="button" className="compras-button compras-button--light" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Anterior</button><button type="button" className="compras-button compras-button--light" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Próxima</button></div></nav>}
  </div>
}

export default function ComprasWorkspace({ initialTab = 'visao-geral' }: { initialTab?: TabKey }) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
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
          const rows = await fetchAllPages<DbRow>((from, to) => supabase.from('erp_estoque_lotes').select('id,empresa_id,produto_id,fornecedor_id,nf_numero,lote_interno,lote_fornecedor,quantidade_recebida,quantidade_disponivel,quantidade_reservada,localizacao,status_inspecao,data_entrada,created_at', { count: 'exact' }).eq('empresa_id', empresaId).order('data_entrada', { ascending: false }).order('id').range(from, to))
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

  const supplierMap = useMemo(() => new Map(suppliers.rows.map(row => [String(row.id), textValue(row, 'nome_fantasia', 'razao_social')])), [suppliers.rows])
  const ordersWithSupplier = useMemo(() => orders.rows.map(row => ({ ...row, fornecedor_nome: supplierMap.get(String(row.fornecedor_id ?? '')) || row.fornecedor_nome || '—' })), [orders.rows, supplierMap])
  const productMap = useMemo(() => new Map(materials.rows.map(row => [String(row.id), { code: textValue(row, 'codigo'), name: textValue(row, 'nome') }])), [materials.rows])
  const receiptsWithSupplier = useMemo(() => receipts.rows.map(row => ({ ...row, fornecedor_nome: supplierMap.get(String(row.fornecedor_id ?? '')) || row.fornecedor_nome || '—', produto_codigo: productMap.get(String(row.produto_id ?? ''))?.code || '—', produto_nome: productMap.get(String(row.produto_id ?? ''))?.name || '—' })), [receipts.rows, supplierMap, productMap])
  const filtered = useMemo(() => {
    const filterRows = (rows: DbRow[]) => rows.filter(row => Object.values(row).some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))))
    return { rfqs: filterRows(rfqs.rows), requisitions: filterRows(requisitions.rows), orders: filterRows(ordersWithSupplier), receipts: filterRows(receiptsWithSupplier), suppliers: filterRows(suppliers.rows), alerts: filterRows(alertRows) }
  }, [rfqs.rows, requisitions.rows, ordersWithSupplier, receiptsWithSupplier, suppliers.rows, alertRows, search])



  const alertData: TableData = { ...materials, rows: alertRows }
  const activeData = activeTab === 'requisicoes' ? requisitions : activeTab === 'cotacoes' ? rfqs : activeTab === 'pedidos' ? orders : activeTab === 'recebimentos' ? receipts : activeTab === 'fornecedores' ? suppliers : alertData
  const activeRowsBase = activeTab === 'requisicoes' ? filtered.requisitions : activeTab === 'cotacoes' ? filtered.rfqs : activeTab === 'pedidos' ? filtered.orders : activeTab === 'recebimentos' ? filtered.receipts : activeTab === 'fornecedores' ? filtered.suppliers : filtered.alerts
  const activeRows = statusFilter === 'TODOS' ? activeRowsBase : activeRowsBase.filter(row => textValue(row, 'status').toUpperCase() === statusFilter)
  const availableStatuses = Array.from(new Set(activeRowsBase.map(row => textValue(row, 'status')).filter(value => value !== '—'))).sort()
  const tableKind = activeTab === 'requisicoes' ? 'requisicoes' : activeTab === 'pedidos' ? 'pedidos' : activeTab === 'recebimentos' ? 'recebimentos' : activeTab === 'fornecedores' ? 'fornecedores' : activeTab === 'alertas' ? 'alertas' : 'cotacoes'
  const openOrders = filtered.orders.filter(row => !['RECEBIDO','CANCELADO','REJEITADO','CONCLUIDO','CONCLUÍDO'].includes(textValue(row,'status').toLocaleUpperCase('pt-BR')))
  const pendingRequisitions = requisitions.rows.filter(row => !['AUTORIZADA','CONCLUIDA','CONCLUÍDA','CANCELADA'].includes(textValue(row,'status').toLocaleUpperCase('pt-BR'))).length
  const activeRfqs = rfqs.rows.filter(row => !['APROVADO','REJEITADO','CANCELADO','CONCLUIDO','CONCLUÍDO'].includes(textValue(row,'status').toLocaleUpperCase('pt-BR'))).length
  const summaryBusy = [rfqs,requisitions,orders,receipts].some(table => table.loading)
  const summaryError = [rfqs,requisitions,orders,receipts].some(table => Boolean(table.error))

  useEffect(() => { setStatusFilter('TODOS') }, [activeTab])

  return <main className="compras-page min-h-full space-y-4 bg-[#F4FBFD] p-4 text-[#183B4D] print:bg-white print:p-0" aria-label="Módulo de Compras SYSNQRA">
    <style>{'@media print { .compras-tabs,.compras-header-actions,.compras-heading-actions,.compras-footer,.print\\:hidden { display:none!important } .compras-panel { box-shadow:none!important; break-inside:avoid } }'}</style>
    <div className="hidden border-b-2 border-[#123B50] pb-3 print:block"><strong className="text-[19px] tracking-[.16em]">PLASTIBOR</strong><p className="text-[10px]">SYSNQRA ERP INDUSTRIAL · Suprimentos e Compras</p><p className="text-[10px]">Emitido em {new Date().toLocaleString('pt-BR')}</p></div>
    <header className="compras-header flex flex-wrap items-center justify-between gap-3 border-b border-[#D3E3EA] pb-3 print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/pageprincipal" className="inline-flex h-[38px] w-[115px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] shadow-sm transition hover:bg-slate-50"><ArrowLeft size={14}/>Voltar</Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#2D8DB8]">SUPRIMENTOS › COMPRAS</p><h1 className="text-xl font-bold tracking-tight">Central de Compras</h1><p className="mt-1 text-xs text-[#607987]">Requisições, MRP, cotações, pedidos, recebimentos e fornecedores.</p></div>
      </div>
      <div className="compras-header-actions flex flex-wrap gap-2">
        <Link to="/pageprincipal/compras/rfq" className="compras-button compras-button--light"><FileText size={14}/>RFQ completa</Link>
        <Link to="/pageprincipal/compras/analise-precos" className="compras-button compras-button--light"><BarChart3 size={14}/>Análise de preços</Link>
        <Link to="/pageprincipal/compras/relatorios" className="compras-button compras-button--light"><FileText size={14}/>Relatórios</Link>
        <Link to="/pageprincipal/estoque/rastreabilidade" className="compras-button compras-button--light"><Truck size={14}/>Recebimento / rastreabilidade</Link>
        <button type="button" onClick={() => void load()} disabled={summaryBusy} className="compras-button compras-button--light"><RefreshCw size={14}/>Atualizar</button>
        <button type="button" onClick={() => window.print()} className="compras-button compras-button--primary"><Printer size={14}/>Imprimir / PDF</button>
      </div>
    </header>
    {notice && <div className={notice.kind === 'success' ? 'compras-notice compras-notice--success' : 'compras-notice compras-notice--error'} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}</div>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
      {[{label:'Requisições pendentes',value:pendingRequisitions},{label:'Cotações em andamento',value:activeRfqs},{label:'Pedidos em aberto',value:openOrders.length},{label:'Lotes recebidos',value:receipts.rows.length}].map(item=><article key={item.label} className="min-h-[96px] rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#607987]">{item.label}</p><strong className="mt-2 block text-xl font-bold tabular-nums text-[#123B50]">{summaryBusy?'Carregando…':summaryError?'—':item.value}</strong></article>)}
    </section>
    <nav className="compras-tabs flex flex-wrap gap-1 rounded-lg border border-[#D3E3EA] bg-white p-2 print:hidden" aria-label="Etapas do módulo">{tabs.map(tab => { const Icon = tab.icon; const count = tab.key === 'requisicoes' ? requisitions : tab.key === 'cotacoes' ? rfqs : tab.key === 'fornecedores' ? suppliers : tab.key === 'alertas' ? materials : tab.key === 'pedidos' ? orders : tab.key === 'recebimentos' ? receipts : null; const total = count?.rows.length; return <button type="button" key={tab.key} className={activeTab === tab.key ? 'compras-tab is-active' : 'compras-tab'} onClick={() => setActiveTab(tab.key)}><Icon size={15} />{tab.label}{count && !count.loading ? <span>{total}</span> : null}</button> })}</nav>

    {showOrderForm && activeTab === 'pedidos' && <ComprasPedidoForm key={editingOrderId ?? 'novo-pedido'} pedidoId={editingOrderId ?? undefined} onCancel={() => { setShowOrderForm(false); setEditingOrderId(null) }} onSaved={(message) => { setNotice({kind:'success',message}); setSearch(''); setRefreshKey(value => value + 1) }} />}

    {activeTab === 'visao-geral' ? <section className="compras-panel rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm">
      <div className="compras-panel-heading mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">Pedidos de compra em aberto</h2><p className="mt-1 text-[10px] text-[#718792]">Pedidos que ainda precisam de aprovação, envio ou recebimento.</p></div><button className="compras-button compras-button--primary" type="button" onClick={() => { setEditingOrderId(null); setShowOrderForm(true); setActiveTab('pedidos'); setNotice(null) }}><Plus size={14}/>Novo pedido</button></div>
      {orders.loading ? <div className="compras-loading"><RefreshCw size={16}/>Carregando pedidos reais…</div> : orders.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{orders.error}</span></div> : <DataTable key="overview-orders" rows={openOrders} kind="pedidos" onEdit={id => {setEditingOrderId(id);setActiveTab('pedidos');setShowOrderForm(true)}}/>}
    </section> : !showOrderForm && <section className="compras-panel rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm">
      <div className="compras-panel-heading mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{tabs.find(tab => tab.key === activeTab)?.label}</h2><p className="mt-1 text-[10px] text-[#718792]">{activeData.loading ? 'Consultando o banco de dados…' : activeData.error ? 'Não foi possível consultar esta tabela.' : activeRows.length + ' registro(s) após filtros'}</p></div>
        <div className="compras-heading-actions flex flex-wrap items-end gap-2 print:hidden">
          {activeTab === 'pedidos' && <button className="compras-button compras-button--primary" type="button" onClick={() => { setEditingOrderId(null); setShowOrderForm(true); setNotice(null) }}><Plus size={14}/>Novo pedido</button>}
          {activeTab === 'cotacoes' && <Link to="/pageprincipal/compras/rfq" className="compras-button compras-button--primary"><Plus size={14}/>Abrir RFQ completa</Link>}
          {activeTab === 'requisicoes' && <Link to="/pageprincipal/compras/requisicoes" className="compras-button compras-button--light">Gerenciar requisições</Link>}
          <label className="compras-search flex h-10 items-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-2"><Search size={15}/><input className="h-10 min-w-[180px] outline-none" value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar nesta lista…" aria-label="Pesquisar registros"/></label>
          {availableStatuses.length > 0 && <label className="flex flex-col gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-[#607987]">Status</span><select className="h-10 rounded-md border border-[#CBD9E0] bg-white px-3 text-xs" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="TODOS">Todos</option>{availableStatuses.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label>}
        </div>
      </div>
      {activeData.loading ? <div className="compras-loading"><RefreshCw size={16}/>Carregando dados reais…</div> : activeData.error ? <div className="compras-error" role="alert"><strong>Falha na consulta.</strong><span>{activeData.error}</span><button className="compras-button compras-button--light" type="button" onClick={() => setRefreshKey(value => value + 1)}>Tentar novamente</button></div> : <DataTable key={activeTab} rows={activeRows} kind={tableKind} onEdit={id => {setEditingOrderId(id);setShowOrderForm(true)}}/>}
    </section>}

    <section className="compras-panel rounded-lg border border-[#D3E3EA] bg-white p-4 text-[11px] text-[#526C79] print:hidden"><h2 className="font-bold uppercase tracking-wide">Como usar esta tela</h2><p className="mt-2"><strong>Para que serve:</strong> acompanhar o ciclo de suprimentos da empresa: requisição, alerta MRP, cotação, pedido, recebimento e fornecedor.</p><p className="mt-1"><strong>Passo a passo:</strong> revise as requisições e alertas, abra a RFQ completa para cadastrar itens e fornecedores, registre o pedido pela RPC transacional, acompanhe a entrega e consulte a grade de recebimentos.</p><p className="mt-1"><strong>Regras importantes:</strong> todas as consultas são filtradas por empresa e RLS. A grade de recebimentos consulta os lotes reais persistidos em erp_estoque_lotes, com RLS por empresa. Use a página Estoque › Rastreabilidade para registrar e acompanhar lote, NF, inspeção e disponibilidade.</p></section>
    <footer className="compras-footer flex flex-wrap items-center justify-between gap-2 border-t border-[#D3E3EA] pt-3 text-[9px] text-[#718792] print:hidden"><span>SYSNQRA ERP INDUSTRIAL · SUPRIMENTOS</span><span>Dados reais da empresa autenticada · RLS ativo · Atualizado em {new Date().toLocaleString('pt-BR')}</span></footer>
  </main>
}