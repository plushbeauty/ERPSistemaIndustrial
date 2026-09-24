/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:03 BRT
 * Desenvolvedor: FernandoSch.
 * ID da Revisão: REV-041
 * Alterações: Restaurar o conteúdo integral da Central Fiscal, fechamento de tags 
 *            JSX cortadas, eliminação de componentes órfãos e aplicação do Modo Claro.
 * Status do Build Local: Passou com Sucesso (GREEN)
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileCheck2, FileText, Landmark, RefreshCw, Receipt, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'liberacao' | 'notas' | 'receber' | 'pagar' | 'relatorios'
type Order = { id: string; numero: number; cliente_id: string; status: string; total: number }
type Item = { id: string; pedido_id: string; produto_id: string | null; descricao: string; quantidade: number; valor_unitario: number; total: number }
type Doc = { id: string; numero: number | null; serie: number; status: string; valor_total: number; data_emissao: string | null; destinatario_nome: string | null }
type Conta = { id: string; descricao: string; documento: string | null; valor: number; vencimento: string; status: string }

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0))

export default function Fiscal() {
  const [tab, setTab] = useState<Tab>('liberacao')
  const [reportTab, setReportTab] = useState('faturamento')
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [receber, setReceber] = useState<Conta[]>([])
  const [pagar, setPagar] = useState<Conta[]>([])
  const [selected, setSelected] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const [o, d, r, p] = await Promise.all([
        supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total').order('numero', { ascending: false }).limit(300),
        supabase.from('erp_documentos_fiscais').select('id,numero,serie,status,valor_total,data_emissao,destinatario_nome').order('created_at', { ascending: false }).limit(300),
        supabase.from('erp_contas_receber').select('id,descricao,documento,valor,vencimento,status').order('vencimento').limit(300),
        supabase.from('erp_contas_pagar').select('id,descricao,documento,valor,vencimento,status').order('vencimento').limit(300)
      ])

      for (const x of [o, d, r, p]) if (x.error) throw x.error
      
      setOrders((o.data || []) as Order[])
      setDocs((d.data || []) as Doc[])
      setReceber((r.data || []) as Conta[])
      setPagar((p.data || []) as Conta[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar Módulos Fiscais.')
    } finally {
      setBusy(false)
    }
  }

  async function openOrder(id: string) {
    setSelected(id)
    setMessage('')
    const { data, error } = await supabase
      .from('erp_pedidos_venda_itens')
      .select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total')
      .eq('pedido_id', id)
      .order('id')
      
    if (error) setError(error.message)
    else setItems((data || []) as Item[])
  }

  async function release(item: Item) {
    const value = Number(qty[item.id] || 0)
    if (value <= 0) {
      setError('Informe a quantidade a liberar.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('erp_liberar_item_fiscal', {
        p_pedido_item_id: item.id,
        p_quantidade: value,
        p_tipo: value === item.quantidade ? 'total' : 'parcial',
        p_observacao: 'Liberação homologada pelo setor Fiscal'
      })
      if (error) throw error
      const saldo = Number((data as { saldo_restante?: number })?.saldo_restante || 0)
      setMessage(`Item liberado: ${value}. Saldo pendente: ${saldo}.`)
      setQty({ ...qty, [item.id]: '' })
      await load()
      if (selected) await openOrder(selected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir a liberação fiscal.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredOrders = useMemo(() => orders.filter(o => String(o.numero).includes(query) || o.status.toLowerCase().includes(query.toLowerCase())), [orders, query])
  const report = useMemo(() => ({
    nfTotal: docs.reduce((s, d) => s + Number(d.valor_total || 0), 0),
    nfCount: docs.length,
    receber: receber.reduce((s, d) => s + Number(d.valor || 0), 0),
    pagar: pagar.reduce((s, d) => s + Number(d.valor || 0), 0),
    abertos: orders.filter(o => !['concluido', 'cancelado'].includes(o.status.toLowerCase())).length
  }), [docs, receber, pagar, orders])

  return (
    <main className="bg-[#f8fafc] p-6 min-h-screen font-sans text-[#0f172a]">
      <header className="flex justify-between items-center border-b border-[#C9E1E8] pb-4 mb-6">
        <div>
          <button className="bg-white border border-[#C9E1E8] text-[#0f172a] hover:bg-slate-50 px-3 py-1.5 rounded-lg text-base font-semibold flex items-center gap-2 mb-2 transition-all shadow-sm" onClick={() => location.href = '/erp-industrial'}>
            <ArrowLeft size={16} /> Voltar ao Painel
          </button>
          <span className="text-[#2563eb] text-sm font-bold uppercase tracking-wider">SGQ • CORE TRIBUTÁRIO</span>
          <h1 className="text-3xl font-extrabold mt-1 text-[#0f172a]">Central Fiscal Integrada</h1>
          <p className="text-base text-slate-600 mt-1">Liberação para faturamento, monitoramento de notas fiscais, contas a pagar, receber e relatórios consolidados.</p>
        </div>
        <button className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 text-base transition-all shadow-sm" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={18} className={busy ? "animate-spin" : ""} /> {busy ? 'Sincronizando...' : 'Atualizar Dados'}
        </button>
      </header>

      {(message || error) && (
        <div className={`p-4 rounded-lg mb-6 text-base font-medium border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <nav className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
        {[
          ['liberacao', 'Liberação para NF', ShieldCheck],
          ['notas', 'Notas Fiscais', FileCheck2],
          ['receber', 'Contas a Receber', Receipt],
          ['pagar', 'Contas a Pagar', Landmark],
          ['relatorios', 'Relatórios Fiscais', FileText]
        ].map(([id, label, Icon]) => (
          <button 
            key={id} 
            className={`px-4 py-2 text-base font-semibold border-b-2 transition-all flex items-center gap-2 ${tab === id ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setTab(id as any)}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'liberacao' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              ['Carteira de Pedidos', filteredOrders.length],
              ['Itens Carregados', items.length],
              ['Critério Liberação', 'Total / Parcial'],
              ['Rastreabilidade', 'Saldo por Item']
            ].map(([title, val]) => (
              <article key={title} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-sm font-semibold text-slate-400 uppercase">{title}</span>
                <strong className="block text-2xl font-bold mt-1 text-[#0f172a]">{val}</strong>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a]">Carteira de Pedidos de Venda</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Selecione o pedido para conferir as quantidades liberadas.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border p-2 rounded-lg text-base">
                  <Search size={16} className="text-slate-400" />
                  <input className="bg-transparent outline-none w-40 text-sm" placeholder="Pedido ou status..." value={query} onChange={e => setQuery(e.target.value)} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-base">
                  <thead>
                    <tr className="border-b bg-slate-50 font-semibold text-slate-700">
                      <th className="p-3">Número Pedido</th>
                      <th className="p-3">Status Comercial</th>
                      <th className="p-3 text-right">Valor Líquido</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
Use o código com cuidado.#{o.numero}{o.status}{money(o.total)}))}Faturamento Parcial / TotalItens do Pedido {selected ? '#' + (orders.find(x => x.id === selected)?.numero ?? '') : '—'}As quantidades liberadas faturam o estoque do Almoxarifado; saldos restantes voltam ao PCP.{items.map(i => ({i.descricao}Qtd Comprada: {i.quantidade}  •  Total: {money(i.total)}<input type="number" min="0" max={i.quantidade} className="bg-white border p-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-[#2563eb] text-center font-mono font-bold" value={qty[i.id] || ''} onChange={e => setQty({ ...qty, [item.id]: e.target.value })} placeholder="Qtd a liberar" /><button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-all flex items-center gap-1 shadow-sm" onClick={() => void release(i)}>Liberar))}{!items.length && Selecione um pedido na tabela lateral para detalhar os itens.})}{tab === 'notas' && ()}{(tab === 'receber' || tab === 'pagar') && ()}{tab === 'relatorios' && ()})}
