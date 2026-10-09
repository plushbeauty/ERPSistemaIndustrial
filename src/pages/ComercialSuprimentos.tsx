import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, RefreshCw, Users, Package, ShoppingCart, ArrowRight, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Client = { id: string; nome: string; documento: string | null; ativo: boolean }
type Order = { id: string; numero: number; cliente_id: string | null; status: string; total: number; data_entrada: string | null; created_at: string }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function ComercialSuprimentos() {
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const currentCompany = await supabase.rpc('erp_current_empresa_id')
      if (currentCompany.error || !currentCompany.data) throw currentCompany.error ?? new Error('Empresa não identificada na sessão atual.')
      const empresaId = String(currentCompany.data)
      const [clientRows, orderRows] = await Promise.all([
        fetchAllPages<Client>((from, to) => supabase.from('erp_clientes').select('id,nome,documento,ativo', { count: 'exact' }).eq('empresa_id', empresaId).order('nome').range(from, to)),
        fetchAllPages<Order>((from, to) => supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total,data_entrada,created_at', { count: 'exact' }).eq('empresa_id', empresaId).order('numero', { ascending: false }).range(from, to))
      ])
      setClients(clientRows)
      setOrders(orderRows)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar a central comercial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  const activeClients = clients.filter(client => client.ativo).length
  const pending = useMemo(() => orders.filter(order => !['faturado', 'cancelado'].includes(String(order.status).toLowerCase())), [orders])
  const invoiced = useMemo(() => orders.filter(order => String(order.status).toLowerCase() === 'faturado'), [orders])
  const clientName = (id: string | null) => clients.find(client => client.id === id)?.nome ?? 'Cliente não identificado'
  const go = (path: string) => { window.location.href = path }

  return <main className="erp-page-v3">
    <header className="erp-page-header-v3">
      <div><span className="erp-eyebrow">VENDAS • CENTRAL COMERCIAL</span><h1>Central Comercial</h1><p>Resumo da empresa atual. Cadastros e operações são feitos nas telas canônicas de Vendas, sem formulários duplicados nesta central.</p></div>
      <button type="button" className="erp-btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</button>
    </header>
    {message && <div role="alert" className="erp-card-v3 mb-4">{message}</div>}
    <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
      <article className="erp-card-v3"><ClipboardList size={18} /><strong>{loading ? '—' : orders.length}</strong><span>Pedidos de venda</span><small>Todos os pedidos da empresa</small></article>
      <article className="erp-card-v3"><ShoppingCart size={18} /><strong>{loading ? '—' : pending.length}</strong><span>Carteira em andamento</span><small>Exclui faturados e cancelados</small></article>
      <article className="erp-card-v3"><Package size={18} /><strong>{loading ? '—' : money(invoiced.reduce((sum, order) => sum + Number(order.total || 0), 0))}</strong><span>Valor faturado</span><small>Somente status faturado</small></article>
      <article className="erp-card-v3"><Users size={18} /><strong>{loading ? '—' : activeClients}</strong><span>Clientes ativos</span><small>Cadastro mestre da empresa</small></article>
    </section>
    <nav className="erp-tabs-v3 mb-4">
      <button type="button" onClick={() => go('/vendas/novo-pedido')}><ShoppingCart size={16} /> Novo pedido</button>
      <button type="button" onClick={() => go('/vendas/clientes')}><Users size={16} /> Clientes</button>
      <button type="button" onClick={() => go('/vendas/status')}><ArrowRight size={16} /> Carteira / status</button>
      <button type="button" onClick={() => go('/vendas/metas')}><ClipboardList size={16} /> Metas</button>
      <button type="button" onClick={() => go('/vendas/relatorios')}><FileText size={16} /> Relatórios</button>
    </nav>
    <section className="erp-card-v3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2>Pedidos recentes</h2><p>Consulta somente; para alterar ou criar pedidos use o workspace oficial de Vendas.</p></div><span className="erp-badge-warn">{orders.length} registros</span></div>
      <div className="erp-table-scroll"><table className="erp-table-v3"><thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Total</th><th>Data de entrada</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={5}>Carregando dados da empresa…</td></tr> : orders.slice(0, 10).length ? orders.slice(0, 10).map(order => <tr key={order.id}><td><b>PV-{order.numero}</b></td><td>{clientName(order.cliente_id)}</td><td>{order.status}</td><td>{money(Number(order.total || 0))}</td><td>{order.data_entrada || order.created_at.slice(0, 10)}</td></tr>) : <tr><td colSpan={5}>Nenhum pedido encontrado para esta empresa.</td></tr>}
      </tbody></table></div>
    </section>
  </main>
}