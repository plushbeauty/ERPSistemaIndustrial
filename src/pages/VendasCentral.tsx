import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, BarChart3, Eye, Package, Pencil, Plus, RefreshCw, Save, Search, Settings, ShoppingCart, Trash2, TrendingUp, Users, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'

type Cliente = { id: string; codigo: string | null; nome: string; documento: string | null; email: string | null; endereco: string | null; ativo: boolean }
type Produto = { id: string; codigo: string; nome: string; descricao: string | null; estoque_atual: number; preco_venda: number; unidade: string }
type Pedido = { id: string; numero: number; status: string; total: number; data_entrega_prometida: string | null; pedido_cliente: string | null; cliente_id: string; cliente_nome?: string; created_at?: string }
type Item = { produto_id: string; codigo: string; codigoCliente: string; descricao: string; quantidade: number; valor: number; estoque: number }
type Shortage = { pedido_item_id: string; produto_id: string; quantidade_pedida: number; estoque_disponivel: number; quantidade_reservada: number; quantidade_faltante: number; fabricado: boolean; pode_gerar_op: boolean }

const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0)
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const statusConfig = {
  cotacao: { bg: 'bg-amber-50', text: 'text-amber-900', badge: 'bg-amber-100', icon: '📋', label: 'Cotação' },
  em_analise: { bg: 'bg-blue-50', text: 'text-blue-900', badge: 'bg-blue-100', icon: '🔍', label: 'Em análise' },
  necessita_producao: { bg: 'bg-orange-50', text: 'text-orange-900', badge: 'bg-orange-100', icon: '⚙️', label: 'Produção' },
  parcial: { bg: 'bg-yellow-50', text: 'text-yellow-900', badge: 'bg-yellow-100', icon: '⏳', label: 'Parcial' },
  reservado: { bg: 'bg-green-50', text: 'text-green-900', badge: 'bg-green-100', icon: '✅', label: 'Reservado' },
  separado: { bg: 'bg-violet-50', text: 'text-violet-900', badge: 'bg-violet-100', icon: '📦', label: 'Separado' },
  faturado: { bg: 'bg-emerald-50', text: 'text-emerald-900', badge: 'bg-emerald-100', icon: '🧾', label: 'Faturado' },
  cancelado: { bg: 'bg-slate-100', text: 'text-slate-900', badge: 'bg-slate-200', icon: '❌', label: 'Cancelado' }
} as const

export default function VendasCentral() {
  const [view, setView] = useState<'dashboard' | 'novo' | 'pendentes' | 'carteira' | 'clientes' | 'metas' | 'config'>('dashboard')
  const [empresa, setEmpresa] = useState('')
  const [empresaNome, setEmpresaNome] = useState('Empresa não identificada')
  const [usuarioNome, setUsuarioNome] = useState('Usuário')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dataHora, setDataHora] = useState(new Date())

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const e = await supabase.rpc('erp_current_empresa_id')
      if (e.error || !e.data) throw e.error ?? new Error('Empresa não identificada.')
      const id = String(e.data)
      setEmpresa(id)

      const u = await supabase.auth.getUser()
      if (u.data.user) {
        const p = await supabase.from('erp_usuarios').select('nome').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (p.data) setUsuarioNome(p.data.nome)
      }

      const [em, cl, pr, pd] = await Promise.all([
        supabase.from('erp_empresas').select('nome_fantasia').eq('id', id).maybeSingle(),
        supabase.from('erp_clientes').select('id,codigo,nome,documento,email,endereco,ativo').eq('empresa_id', id).eq('ativo', true).order('nome').limit(1000),
        supabase.from('erp_produtos').select('id,codigo,nome,descricao,estoque_atual,preco_venda,unidade').eq('empresa_id', id).eq('ativo', true).order('codigo').limit(3000),
        supabase.from('erp_pedidos_venda').select('id,numero,status,total,data_entrega_prometida,pedido_cliente,cliente_id,created_at').eq('empresa_id', id).order('numero', { ascending: false }).limit(300)
      ])

      if (em.data) setEmpresaNome(String(em.data.nome_fantasia || 'Empresa'))
      if (cl.error) throw cl.error
      if (pr.error) throw pr.error
      if (pd.error) throw pd.error

      const clienteMap = new Map((cl.data || []).map(c => [c.id, c.nome]))
      setClientes(cl.data || [])
      setProdutos(pr.data || [])
      setPedidos((pd.data || []).map(p => ({ ...p, cliente_nome: clienteMap.get(p.cliente_id) || 'Cliente não identificado' })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar Vendas.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => setDataHora(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const stats = useMemo(() => {
    const total = pedidos.reduce((s, p) => s + (p.total || 0), 0)
    const abertos = pedidos.filter(p => !['faturado', 'cancelado'].includes(String(p.status || '').toLowerCase())).length
    const necessidades = pedidos.filter(p => String(p.status || '').toLowerCase() === 'necessita_producao').length
    return { total, abertos, necessidades, count: pedidos.length }
  }, [pedidos])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">ERP INDUSTRIAL • VENDAS</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Painel Comercial</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{usuarioNome}</p>
              <p className="text-xs text-slate-600">{dataHora.toLocaleTimeString('pt-BR')}</p>
            </div>
            <button type="button" onClick={() => void load()} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100" aria-label="Recarregar dados">
              <RefreshCw size={18} className={busy ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="flex gap-1 overflow-x-auto px-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'novo', label: 'Novo Pedido', icon: Plus },
            { id: 'pendentes', label: 'Pendentes', icon: Search },
            { id: 'carteira', label: 'Carteira', icon: TrendingUp },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'metas', label: 'Metas', icon: ShoppingCart },
            { id: 'config', label: 'Configurações', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                view === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 py-6">
        {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"><AlertCircle size={18} /> {error}</div>}
        {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>}

        {view === 'dashboard' && <Dashboard stats={stats} pedidos={pedidos} />}
        {view === 'novo' && <NovoPedido empresa={empresa} clientes={clientes} produtos={produtos} onDone={(id) => { setMessage(`Pedido ${id} salvo com sucesso.`); setView('carteira'); void load() }} />}
        {view === 'pendentes' && <PedidosPendentes pedidos={pedidos} />}
        {view === 'carteira' && <Carteira pedidos={pedidos} />}
        {view === 'clientes' && <Clientes empresa={empresa} clientes={clientes} onSaved={() => void load()} />}
        {view === 'metas' && <Metas />}
        {view === 'config' && <Config />}
      </main>
    </div>
  )
}

function Dashboard({ stats, pedidos }: { stats: { total: number; abertos: number; necessidades: number; count: number }; pedidos: Pedido[] }) {
  const chartData = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const p of pedidos) {
      const key = String(p.status || 'desconhecido').toLowerCase()
      byStatus[key] = (byStatus[key] || 0) + 1
    }
    return Object.entries(byStatus).map(([name, value]) => ({ name: statusConfig[name as keyof typeof statusConfig]?.label || name, value }))
  }, [pedidos])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card icon={<Package size={20} />} title="PEDIDOS" value={String(stats.count)} subtitle="Total no período" color="blue" />
        <Card icon={<TrendingUp size={20} />} title="VALOR EM ABERTO" value={brl(stats.total)} subtitle="Pedidos em processamento" color="amber" />
        <Card icon={<AlertCircle size={20} />} title="PENDENTES" value={String(stats.abertos)} subtitle="Aguardando ação" color="orange" />
        <Card icon={<BarChart3 size={20} />} title="NECESSIDADE PCP" value={String(stats.necessidades)} subtitle="Itens em produção" color="purple" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.15em] text-slate-700">Pedidos por status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.15em] text-slate-700">Status</h2>
          <div className="space-y-2">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold ${cfg.badge} ${cfg.text}`}>
                <span>{cfg.icon} {cfg.label}</span>
                <span>{pedidos.filter(p => String(p.status || '').toLowerCase() === key).length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.15em] text-slate-700">Últimos pedidos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Pedido</th>
                <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Cliente</th>
                <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Data</th>
                <th className="h-12 px-4 text-right text-xs font-black uppercase text-slate-700">Valor</th>
                <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 8).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">PED-{String(p.numero).padStart(6, '0')}</td>
                  <td className="px-4 py-3">{p.cliente_nome}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{brl(p.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.badge || 'bg-slate-100'}`}>
                      {statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.icon || '•'} {statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.label || p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Card({ icon, title, value, subtitle, color }: { icon: ReactNode; title: string; value: string; subtitle: string; color: 'blue' | 'amber' | 'orange' | 'purple' }) {
  const styles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    orange: 'border-orange-200 bg-orange-50 text-orange-900',
    purple: 'border-violet-200 bg-violet-50 text-violet-900'
  }

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${styles[color]}`}>
      <div className="flex items-center justify-between">
        <div className="text-lg">{icon}</div>
      </div>
      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.15em] opacity-80">{title}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs opacity-80">{subtitle}</p>
    </div>
  )
}

function NovoPedido({ empresa, clientes, produtos, onDone }: { empresa: string; clientes: Cliente[]; produtos: Produto[]; onDone: (id: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [shortages, setShortages] = useState<Shortage[]>([])
  const [savedOrder, setSavedOrder] = useState<{ id: string; numero: number } | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ cliente: '', produto: '', qtd: '1', valor: '0', codigoCliente: '', entrega: '', pedidoCliente: '' })

  const selected = produtos.find(x => x.id === form.produto)
  const total = items.reduce((s, i) => s + i.quantidade * i.valor, 0)

  const add = () => {
    setErr('')
    if (!form.cliente) { setErr('Selecione o cliente antes de adicionar itens.'); return }
    if (!selected || Number(form.qtd) <= 0) { setErr('Produto e quantidade são obrigatórios.'); return }
    setItems(x => [...x, { produto_id: selected.id, codigo: selected.codigo, codigoCliente: form.codigoCliente, descricao: selected.nome, quantidade: Number(form.qtd), valor: Number(form.valor) || selected.preco_venda, estoque: selected.estoque_atual }])
    setForm({ ...form, produto: '', qtd: '1', valor: '0', codigoCliente: '' })
  }

  const finish = async () => {
    if (!empresa || !form.cliente || !items.length) { setErr('Cliente e itens são obrigatórios.'); return }
    setBusy(true)
    setErr('')
    try {
      const r = await supabase.rpc('erp_criar_pedido_venda_com_analise', {
        p_cliente_id: form.cliente,
        p_desconto: 0,
        p_itens: items.map(x => ({ produto_id: x.produto_id, quantidade: x.quantidade, valor_unitario: x.valor, codigo_cliente: x.codigoCliente })),
        p_data_entrega: form.entrega || null,
        p_pedido_cliente: form.pedidoCliente || null
      })
      if (r.error) throw r.error
      const result = r.data as { pedido_id: string; numero: number; itens: Shortage[] }
      const faltantes = (result.itens || []).filter(i => Number(i.quantidade_faltante) > 0)
      setSavedOrder({ id: result.pedido_id, numero: Number(result.numero) })
      setShortages(faltantes)
      if (!faltantes.length) onDone(result.pedido_id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao gravar pedido.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">1. Cabeçalho</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Dados gerais do pedido</h2>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-900">Total: {brl(total)}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Cliente</div>
            <EntityCodeLookup
              label="Cliente"
              value={form.cliente}
              records={clientes.map(c => ({ id: c.id, codigo: c.codigo || c.id, nome: c.nome, documento: c.documento }))}
              onChange={(v) => setForm({ ...form, cliente: v })}
              onSelect={(record) => setForm({ ...form, cliente: record.id })}
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Pedido do cliente</div>
            <input type="text" value={form.pedidoCliente} onChange={e => setForm({ ...form, pedidoCliente: e.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Entrega</div>
            <input type="date" value={form.entrega} onChange={e => setForm({ ...form, entrega: e.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">2. Itens</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Grid de produtos e disponibilidade</h2>
          </div>
        </div>

        {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{err}</div>}

        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Produto</div>
            <EntityCodeLookup
              label="Produto"
              value={form.produto}
              records={produtos.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome, estoque_atual: p.estoque_atual, preco_venda: p.preco_venda }))}
              onChange={(v) => setForm({ ...form, produto: v })}
              onSelect={(record) => setForm({ ...form, produto: record.id, valor: String(record.preco_venda || 0) })}
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Cód. Cliente</div>
            <input type="text" value={form.codigoCliente} onChange={e => setForm({ ...form, codigoCliente: e.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Quantidade</div>
            <input type="number" min="1" value={form.qtd} onChange={e => setForm({ ...form, qtd: e.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">Valor</div>
            <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={add} className="h-10 w-full rounded-lg bg-blue-600 text-sm font-black text-white hover:bg-blue-700">
              <span className="inline-flex items-center gap-2"><Plus size={16} /> Adicionar</span>
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Código</th>
                <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Descrição</th>
                <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Qtd</th>
                <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Estoque</th>
                <th className="h-12 px-4 text-right text-xs font-black uppercase text-slate-700">Unit</th>
                <th className="h-12 px-4 text-right text-xs font-black uppercase text-slate-700">Total</th>
                <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={`${i.produto_id}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{i.codigo}</td>
                  <td className="px-4 py-3">{i.descricao}</td>
                  <td className="px-4 py-3 text-center">{i.quantidade}</td>
                  <td className="px-4 py-3 text-center">{i.estoque}</td>
                  <td className="px-4 py-3 text-right">{brl(i.valor)}</td>
                  <td className="px-4 py-3 text-right font-bold">{brl(i.quantidade * i.valor)}</td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => setItems(items.filter((_, index) => index !== idx))} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setItems([])} className="h-10 rounded-lg border border-slate-300 bg-slate-100 px-5 text-sm font-bold text-slate-800">Limpar</button>
        <button type="button" onClick={() => void finish()} disabled={busy || !items.length} className="h-10 rounded-lg bg-green-600 px-5 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50">
          <span className="inline-flex items-center gap-2"><Save size={16} /> Salvar pedido</span>
        </button>
      </div>

      {shortages.length > 0 && savedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-orange-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">Necessidade de produção</h3>
              <button type="button" onClick={() => setShortages([])} className="text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {shortages.map((s) => (
                <div key={s.pedido_item_id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">Produto {s.produto_id}</p>
                      <p className="text-xs text-slate-600">Falta: {s.quantidade_faltante} unidades</p>
                    </div>
                    <button type="button" onClick={async () => { try { await supabase.rpc('erp_gerar_op_pedido_item', { p_pedido_item_id: s.pedido_item_id }); setShortages(c => c.filter(x => x.pedido_item_id !== s.pedido_item_id)); } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao gerar OP.'); } }} className="h-8 rounded-lg bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-700">Gerar OP</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => { setShortages([]); onDone(savedOrder.id) }} className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700">Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PedidosPendentes({ pedidos }: { pedidos: Pedido[] }) {
  const [query, setQuery] = useState('')
  const filtered = pedidos.filter(p => !query || String(p.numero).includes(query) || (p.cliente_nome || '').toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar pedido ou cliente..." className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="button" className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">Buscar</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Pedido</th>
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Cliente</th>
              <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Entrega</th>
              <th className="h-12 px-4 text-right text-xs font-black uppercase text-slate-700">Total</th>
              <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Status</th>
              <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">PED-{String(p.numero).padStart(6, '0')}</td>
                <td className="px-4 py-3">{p.cliente_nome}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">{fmtDate(p.data_entrega_prometida)}</td>
                <td className="px-4 py-3 text-right font-semibold">{brl(p.total)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.badge || 'bg-slate-100'}`}>
                    {statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.icon || '•'} {statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.label || p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button type="button" className="rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100" aria-label="Visualizar pedido"><Eye size={16} /></button>
                    <button type="button" className="rounded-md border border-amber-200 bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100" aria-label="Editar pedido"><Pencil size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Carteira({ pedidos }: { pedidos: Pedido[] }) {
  const [query, setQuery] = useState('')
  const filtered = pedidos.filter(p => !query || String(p.numero).includes(query) || (p.cliente_nome || '').toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar carteira..." className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Pedido</th>
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Cliente</th>
              <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Data</th>
              <th className="h-12 px-4 text-right text-xs font-black uppercase text-slate-700">Valor</th>
              <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">PED-{String(p.numero).padStart(6, '0')}</td>
                <td className="px-4 py-3">{p.cliente_nome}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-3 text-right font-semibold">{brl(p.total)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.badge || 'bg-slate-100'}`}>
                    {statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.icon || '•'} {statusConfig[String(p.status || '').toLowerCase() as keyof typeof statusConfig]?.label || p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Clientes({ empresa, clientes, onSaved }: { empresa: string; clientes: Cliente[]; onSaved: () => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ codigo: '', nome: '', documento: '', email: '', telefone: '', endereco: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = clientes.filter(c => !query || c.nome.toLowerCase().includes(query.toLowerCase()) || String(c.codigo || '').includes(query))

  const save = async () => {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setBusy(true)
    try {
      await supabase.from('erp_clientes').insert({
        empresa_id: empresa,
        codigo: form.codigo || null,
        nome: form.nome,
        documento: form.documento || null,
        email: form.email || null,
        telefone: form.telefone || null,
        endereco: form.endereco || null,
        ativo: true
      })
      setForm({ codigo: '', nome: '', documento: '', email: '', telefone: '', endereco: '' })
      setOpen(false)
      setError('')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o cliente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente..." className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-lg bg-green-600 px-4 text-sm font-black text-white hover:bg-green-700">Novo</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Código</th>
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Nome</th>
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Documento</th>
              <th className="h-12 px-4 text-left text-xs font-black uppercase text-slate-700">Email</th>
              <th className="h-12 px-4 text-center text-xs font-black uppercase text-slate-700">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">{c.codigo || '—'}</td>
                <td className="px-4 py-3">{c.nome}</td>
                <td className="px-4 py-3">{c.documento || '—'}</td>
                <td className="px-4 py-3">{c.email || '—'}</td>
                <td className="px-4 py-3 text-center">{c.ativo ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Novo cliente</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-600"><X size={18} /></button>
            </div>
            {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Código" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
              <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome *" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
              <input type="text" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} placeholder="Documento" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
              <input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone" className="h-10 rounded-lg border border-slate-300 px-3 text-sm md:col-span-2" />
              <input type="text" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Endereço" className="h-10 rounded-lg border border-slate-300 px-3 text-sm md:col-span-2" />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg bg-slate-200 px-4 text-sm font-bold text-slate-800">Cancelar</button>
              <button type="button" onClick={() => void save()} disabled={busy} className="h-10 rounded-lg bg-green-600 px-4 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50">
                <span className="inline-flex items-center gap-2"><Save size={16} /> Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metas() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">Metas comerciais</h2>
      <p className="mt-2 text-sm text-slate-600">Módulo em desenvolvimento para metas e acompanhamento por vendedor.</p>
    </div>
  )
}

function Config() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">Configurações de Vendas</h2>
      <p className="mt-2 text-sm text-slate-600">Configurações do módulo disponíveis ao finalizar a padronização de the flow ERP.</p>
    </div>
  )
}
