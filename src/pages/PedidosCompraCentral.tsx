import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardList, CreditCard, FilePlus2, RefreshCw, Search, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ComprasPedidoForm from './ComprasPedidoForm'

type Row = Record<string, unknown>
type Tab = 'pedidos' | 'formulario' | 'aprovacao' | 'financeiro'
type LoadState = { rows: Row[]; loading: boolean; error: string | null }
const empty: LoadState = { rows: [], loading: true, error: null }
const tabs: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'formulario', label: 'Novo / Editar', icon: FilePlus2 },
  { id: 'aprovacao', label: 'Aprovação', icon: CheckCircle2 },
  { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
]
const str = (row: Row, key: string): string => {
  const value = row[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}
const money = (value: unknown): string => {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(amount) ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
}
const date = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '—'
  const parsed = new Date(value.length === 10 ? value + 'T12:00:00' : value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR')
}
const statusLabel = (value: string): string => value.replaceAll('_', ' ')
const statusClass = (value: string): string => {
  if (['APROVADO', 'RECEBIDO', 'VALIDADO', 'PAGO'].includes(value)) return 'compras-status compras-status--success'
  if (['CANCELADO', 'REJEITADO', 'BLOQUEADO', 'VENCIDO'].includes(value)) return 'compras-status compras-status--danger'
  if (['PENDENTE_APROVACAO', 'RASCUNHO', 'EM_ANALISE', 'PENDENTE'].includes(value)) return 'compras-status compras-status--warning'
  return 'compras-status'
}

export default function PedidosCompraCentral({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('pedidos')
  const [orders, setOrders] = useState<LoadState>(empty)
  const [payables, setPayables] = useState<LoadState>(empty)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setOrders({ rows: [], loading: true, error: null })
    setPayables({ rows: [], loading: true, error: null })
    const { data: companyId, error: companyError } = await supabase.rpc('erp_current_empresa_id')
    if (companyError || typeof companyId !== 'string' || !companyId) {
      const message = companyError?.message ?? 'Empresa da sessão autenticada não identificada.'
      setOrders({ rows: [], loading: false, error: message })
      setPayables({ rows: [], loading: false, error: message })
      return
    }
    const [ordersResult, payablesResult] = await Promise.all([
      supabase.from('erp_pedidos_compra').select('id,numero,fornecedor_id,comprador_nome,data_pedido,prazo_entrega,total,status,fiscal_status,created_at').eq('empresa_id', companyId).order('created_at', { ascending: false }).limit(500),
      supabase.from('erp_contas_pagar').select('id,descricao,documento,valor,vencimento,status').eq('empresa_id', companyId).order('vencimento', { ascending: true }).limit(500),
    ])
    setOrders(ordersResult.error
      ? { rows: [], loading: false, error: ordersResult.error.message }
      : { rows: (ordersResult.data ?? []) as Row[], loading: false, error: null })
    setPayables(payablesResult.error
      ? { rows: [], loading: false, error: payablesResult.error.message }
      : { rows: (payablesResult.data ?? []) as Row[], loading: false, error: null })
  }, [])

  useEffect(() => { void load() }, [load, refreshKey])

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return orders.rows.filter(row => [str(row, 'numero'), str(row, 'fornecedor_id'), str(row, 'status'), str(row, 'comprador_nome'), str(row, 'prazo_entrega')].some(value => value.toLocaleLowerCase('pt-BR').includes(term)))
  }, [orders.rows, search])
  const approvalRows = filteredOrders.filter(row => ['PENDENTE_APROVACAO', 'REJEITADO'].includes(str(row, 'status')))

  async function decide(orderId: string, approved: boolean) {
    setSaving(true)
    setNotice(null)
    try {
      const { error } = await supabase.rpc('erp_compras_aprovar_pedido', {
        p_pedido_id: orderId,
        p_aprovado: approved,
        p_motivo: approved ? null : 'Reprovado pela Central de Pedidos de Compra',
      })
      if (error) throw error
      setNotice({ kind: 'success', text: approved ? 'Pedido aprovado pelo serviço de autorização do ERP.' : 'Pedido rejeitado pelo serviço de autorização do ERP.' })
      setRefreshKey(value => value + 1)
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível concluir a decisão.' })
    } finally {
      setSaving(false)
    }
  }

  const submitForm = (event: FormEvent<HTMLFormElement>) => event.preventDefault()
  const heading = tabs.find(item => item.id === tab)?.label ?? 'Pedidos'
  return <main className="compras-page" aria-label="Central de Pedidos de Compra SYSNQRA">
    <header className="compras-header">
      <div><h1>Central de Pedidos de Compra</h1><p>SYSNQRA ERP INDUSTRIAL · Padrão Premium · 30/10/2026</p></div>
      <button type="button" className="compras-button compras-button--light" onClick={onBack}><ArrowLeft size={15} /> Voltar à Central de Compras</button>
    </header>
    {notice && <div className={notice.kind === 'success' ? 'compras-notice compras-notice--success' : 'compras-notice compras-notice--error'} role="status">{notice.text}</div>}
    <nav className="compras-tabs" aria-label="Etapas do pedido">{tabs.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={tab === item.id ? 'compras-tab is-active' : 'compras-tab'} onClick={() => { setTab(item.id); setNotice(null) }}><Icon size={15} />{item.label}</button> })}</nav>
    {tab === 'pedidos' && <section className="compras-panel">
      <div className="compras-panel-heading"><div><h2>Pedidos de compra</h2><p>Pesquisa por número, fornecedor, período disponível no registro e situação.</p></div><div className="compras-heading-actions"><button className="compras-button compras-button--primary" type="button" onClick={() => setTab('formulario')}><FilePlus2 size={14}/> Novo pedido</button><label className="compras-search"><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Número, fornecedor ou status" aria-label="Pesquisar pedidos"/></label><button className="compras-button compras-button--light" type="button" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={14}/> Atualizar</button></div></div>
      {orders.loading ? <div className="compras-loading"><RefreshCw size={16}/> Consultando pedidos reais…</div> : orders.error ? <div className="compras-error" role="alert">{orders.error}</div> : filteredOrders.length === 0 ? <div className="compras-empty"><ClipboardList size={22}/><strong>Nenhum pedido encontrado</strong><span>Não há pedidos que correspondam à pesquisa da empresa autenticada.</span></div> : <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Nº pedido</th><th>Fornecedor (ID)</th><th>Emissão</th><th>Entrega prevista</th><th>Valor total</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{filteredOrders.map(row => <tr key={str(row, 'id')}><td><strong>PC-{str(row, 'numero').padStart(4, '0')}</strong></td><td>{str(row, 'fornecedor_id')}</td><td>{date(row.data_pedido ?? row.created_at)}</td><td>{date(row.prazo_entrega)}</td><td>{money(row.total)}</td><td><span className={statusClass(str(row, 'status'))}>{statusLabel(str(row, 'status'))}</span></td><td><button className="compras-button compras-button--light" type="button" onClick={() => { setSearch(str(row, 'numero')); setNotice({ kind: 'success', text: 'Pedido selecionado. Para alterar, use a ação Novo / Editar; pedidos já enviados para aprovação ficam bloqueados para edição.' }) }}>Visualizar</button></td></tr>)}</tbody></table></div>}
    </section>}
    {tab === 'formulario' && <section className="compras-panel"><div className="compras-panel-heading"><div><h2>Novo / Editar pedido</h2><p>Cabeçalho e itens são gravados pela RPC transacional já definida no ERP.</p></div></div><form onSubmit={submitForm}><ComprasPedidoForm onCancel={() => setTab('pedidos')} onSaved={message => { setNotice({ kind: 'success', text: message }); setTab('pedidos'); setRefreshKey(value => value + 1) }}/></form></section>}
    {tab === 'aprovacao' && <section className="compras-panel"><div className="compras-panel-heading"><div><h2>Fila de aprovação</h2><p>A decisão é validada no backend pela RPC erp_compras_aprovar_pedido e pelas permissões reais do ERP.</p></div></div>
      {orders.loading ? <div className="compras-loading"><RefreshCw size={16}/> Carregando fila…</div> : orders.error ? <div className="compras-error" role="alert">{orders.error}</div> : approvalRows.length === 0 ? <div className="compras-empty"><CheckCircle2 size={22}/><strong>Fila sem pedidos pendentes</strong><span>Pedidos pendentes ou rejeitados aparecerão aqui.</span></div> : <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Valor</th><th>Status</th><th>Decisão</th></tr></thead><tbody>{approvalRows.map(row => <tr key={str(row, 'id')}><td>PC-{str(row, 'numero').padStart(4, '0')}</td><td>{str(row, 'fornecedor_id')}</td><td>{money(row.total)}</td><td><span className={statusClass(str(row, 'status'))}>{statusLabel(str(row, 'status'))}</span></td><td><div className="compras-heading-actions"><button className="compras-button compras-button--primary" type="button" disabled={saving || str(row, 'status') !== 'PENDENTE_APROVACAO'} onClick={() => void decide(str(row, 'id'), true)}><CheckCircle2 size={14}/> Aprovar</button><button className="compras-button compras-button--light" type="button" disabled={saving || str(row, 'status') !== 'PENDENTE_APROVACAO'} onClick={() => void decide(str(row, 'id'), false)}><XCircle size={14}/> Rejeitar</button></div></td></tr>)}</tbody></table></div>}
    </section>}
    {tab === 'financeiro' && <section className="compras-panel"><div className="compras-panel-heading"><div><h2>Financeiro · Contas a pagar</h2><p>Consulta de títulos reais. A criação de título vinculada ao pedido deve usar o contrato financeiro instalado; não cria duplicatas nem altera recebimento.</p></div><button type="button" className="compras-button compras-button--light" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={14}/> Atualizar</button></div>
      {payables.loading ? <div className="compras-loading"><RefreshCw size={16}/> Consultando contas a pagar…</div> : payables.error ? <div className="compras-error" role="alert">{payables.error}</div> : payables.rows.length === 0 ? <div className="compras-empty"><CreditCard size={22}/><strong>Nenhum título financeiro encontrado</strong><span>Os títulos aparecerão após serem gerados pelo fluxo financeiro autorizado.</span></div> : <div className="compras-table-scroll"><table className="compras-table"><thead><tr><th>Descrição</th><th>Documento</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>{payables.rows.map(row => <tr key={str(row, 'id')}><td>{str(row, 'descricao')}</td><td>{str(row, 'documento')}</td><td>{money(row.valor)}</td><td>{date(row.vencimento)}</td><td><span className={statusClass(str(row, 'status'))}>{statusLabel(str(row, 'status'))}</span></td></tr>)}</tbody></table></div>}
    </section>}
    <footer className="compras-footer"><span>SYSNQRA ERP INDUSTRIAL · COMPRAS</span><span>Dados reais Supabase · Isolamento por empresa · Revisão 30/10/2026</span></footer>
  </main>
}
