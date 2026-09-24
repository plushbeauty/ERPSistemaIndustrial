/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:06 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-011
 * Alterações: Reconstrução integral da Central Fiscal após JSX corrompido;
 *            fechamento de tags, tipagem estrita, modo claro clínico,
 *            grade responsiva e transmissão NF-e por Edge Function real.
 * Status do Build Local: Não executado — gate remoto em homologação.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileCheck2, FileText, Landmark, RefreshCw, Receipt, Search, ShieldCheck, Send } from 'lucide-react'
import { supabase, invokeSecureEdgeFunction } from '../lib/supabaseClient'

type Tab = 'liberacao' | 'notas' | 'receber' | 'pagar' | 'relatorios'
type Order = { id: string; numero: number; cliente_id: string; status: string; total: number }
type Item = { id: string; pedido_id: string; produto_id: string | null; descricao: string; quantidade: number; valor_unitario: number; total: number }
type Doc = { id: string; numero: number | null; serie: number; status: string; valor_total: number; data_emissao: string | null; destinatario_nome: string | null }
type Conta = { id: string; descricao: string; documento: string | null; valor: number; vencimento: string; status: string }
type ReportTab = 'faturamento' | 'receber' | 'pagar'
type TabDefinition = { id: Tab; label: string; icon: typeof ShieldCheck }

const money = (value: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))

const tabs: TabDefinition[] = [
  { id: 'liberacao', label: 'Liberação para NF', icon: ShieldCheck },
  { id: 'notas', label: 'Notas Fiscais', icon: FileCheck2 },
  { id: 'receber', label: 'Contas a Receber', icon: Receipt },
  { id: 'pagar', label: 'Contas a Pagar', icon: Landmark },
  { id: 'relatorios', label: 'Relatórios Fiscais', icon: FileText }
]

export default function Fiscal() {
  const [tab, setTab] = useState<Tab>('liberacao')
  const [reportTab, setReportTab] = useState<ReportTab>('faturamento')
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

  async function load(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const [ordersResult, docsResult, receberResult, pagarResult] = await Promise.all([
        supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total').order('numero', { ascending: false }).limit(300),
        supabase.from('erp_documentos_fiscais').select('id,numero,serie,status,valor_total,data_emissao,destinatario_nome').order('created_at', { ascending: false }).limit(300),
        supabase.from('erp_contas_receber').select('id,descricao,documento,valor,vencimento,status').order('vencimento').limit(300),
        supabase.from('erp_contas_pagar').select('id,descricao,documento,valor,vencimento,status').order('vencimento').limit(300)
      ])

      for (const result of [ordersResult, docsResult, receberResult, pagarResult]) {
        if (result.error) throw result.error
      }

      setOrders((ordersResult.data ?? []) as Order[])
      setDocs((docsResult.data ?? []) as Doc[])
      setReceber((receberResult.data ?? []) as Conta[])
      setPagar((pagarResult.data ?? []) as Conta[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os módulos fiscais.')
    } finally {
      setBusy(false)
    }
  }

  async function openOrder(id: string): Promise<void> {
    setSelected(id)
    setMessage('')
    setError('')
    const { data, error: loadError } = await supabase
      .from('erp_pedidos_venda_itens')
      .select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total')
      .eq('pedido_id', id)
      .order('id')

    if (loadError) setError(loadError.message)
    else setItems((data ?? []) as Item[])
  }

  async function release(item: Item): Promise<void> {
    const value = Number(qty[item.id] ?? 0)
    if (!Number.isFinite(value) || value <= 0 || value > item.quantidade) {
      setError('Informe uma quantidade válida, maior que zero e não superior ao saldo do item.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_liberar_item_fiscal', {
        p_pedido_item_id: item.id,
        p_quantidade: value,
        p_tipo: value === item.quantidade ? 'total' : 'parcial',
        p_observacao: 'Liberação homologada pelo setor Fiscal'
      })
      if (rpcError) throw rpcError

      const result = data as { saldo_restante?: number } | null
      const saldo = Number(result?.saldo_restante ?? 0)
      setMessage('Item liberado: ' + value.toLocaleString('pt-BR') + '. Saldo pendente: ' + saldo.toLocaleString('pt-BR') + '.')
      setQty(previous => ({ ...previous, [item.id]: '' }))
      await load()
      if (selected) await openOrder(selected)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a liberação fiscal.')
    } finally {
      setBusy(false)
    }
  }

  async function emitNfe(doc: Doc): Promise<void> {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: invokeError } = await invokeSecureEdgeFunction<{ success?: boolean; data?: { invoiceId?: string }; error?: string }>('emitir-nfe', { documento_id: doc.id })
      if (invokeError) throw invokeError
      const invoiceId = data?.data?.invoiceId
      setMessage(invoiceId ? 'NF-e enviada à Notaas. Invoice ID: ' + invoiceId : 'NF-e enviada para processamento fiscal.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao transmitir a NF-e.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredOrders = useMemo(
    () => orders.filter(order => String(order.numero).includes(query) || order.status.toLowerCase().includes(query.toLowerCase())),
    [orders, query]
  )

  const report = useMemo(() => ({
    nfTotal: docs.reduce((sum, doc) => sum + Number(doc.valor_total || 0), 0),
    nfCount: docs.length,
    receber: receber.reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
    pagar: pagar.reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
    abertos: orders.filter(order => !['concluido', 'cancelado'].includes(order.status.toLowerCase())).length
  }), [docs, receber, pagar, orders])

  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-[#0f172a]">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#C9E1E8] pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <button
            className="mb-2 flex min-h-11 items-center gap-2 rounded-lg border border-[#C9E1E8] bg-white px-3 py-2 text-base font-semibold text-[#0f172a] shadow-sm hover:bg-slate-50"
            onClick={() => { window.location.href = '/erp-industrial' }}
          >
            <ArrowLeft size={17} /> Voltar ao Painel
          </button>
          <span className="text-sm font-bold uppercase tracking-wider text-[#2563eb]">SGQ • CORE TRIBUTÁRIO</span>
          <h1 className="mt-1 text-3xl font-extrabold text-[#0f172a]">Central Fiscal Integrada</h1>
          <p className="mt-1 text-base text-slate-600">Liberação para faturamento, monitoramento de notas fiscais, contas a pagar, receber e relatórios consolidados.</p>
        </div>
        <button
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-base font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60"
          onClick={() => void load()}
          disabled={busy}
        >
          <RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> {busy ? 'Sincronizando...' : 'Atualizar Dados'}
        </button>
      </header>

      {(message || error) && (
        <div className={error ? 'mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700' : 'mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-base font-medium text-emerald-700'}>
          {error || message}
        </div>
      )}

      <nav className="mb-6 grid grid-cols-1 gap-2 border-b border-slate-200 pb-2 md:grid-cols-5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={'flex min-h-11 items-center justify-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-base font-semibold transition-all ' + (tab === id ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-800')}
            onClick={() => setTab(id)}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'liberacao' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              ['Carteira de Pedidos', String(filteredOrders.length)],
              ['Itens Carregados', String(items.length)],
              ['Critério Liberação', 'Total / Parcial'],
              ['Rastreabilidade', 'Saldo por Item']
            ].map(([title, value]) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-sm font-semibold uppercase text-slate-400">{title}</span>
                <strong className="mt-1 block text-2xl font-bold text-[#0f172a]">{value}</strong>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#0f172a]">Carteira de Pedidos de Venda</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Selecione o pedido para conferir as quantidades liberadas.</p>
                </div>
                <label className="flex min-h-11 items-center gap-2 rounded-lg border bg-slate-50 px-3 text-base">
                  <Search size={17} className="text-slate-400" />
                  <input className="w-full bg-transparent text-base outline-none md:w-56" placeholder="Pedido ou status..." value={query} onChange={event => setQuery(event.target.value)} />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-base">
                  <thead>
                    <tr className="border-b bg-slate-50 font-semibold text-slate-700">
                      <th className="p-3">Número Pedido</th>
                      <th className="p-3">Status Comercial</th>
                      <th className="p-3 text-right">Valor Líquido</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-bold text-[#2563eb]">#{order.numero}</td>
                        <td className="p-3">{order.status}</td>
                        <td className="p-3 text-right font-semibold">{money(order.total)}</td>
                        <td className="p-3 text-center">
                          <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50" onClick={() => void openOrder(order.id)}>
                            Conferir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredOrders.length && <p className="p-6 text-center text-base text-slate-500">Nenhum pedido real encontrado para o filtro informado.</p>}
              </div>
            </div>

            <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-[#0f172a]">Itens do Pedido</h2>
              <p className="mt-1 text-base text-slate-500">Pedido selecionado: {selected ? '#' + (orders.find(order => order.id === selected)?.numero ?? '') : '—'}</p>
              <div className="mt-5 space-y-4">
                {items.map(item => (
                  <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <strong className="block text-base">{item.descricao}</strong>
                    <span className="mt-1 block text-sm text-slate-600">Quantidade: {item.quantidade} • Total: {money(item.total)}</span>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="text-base font-semibold">Qtd. a liberar
                        <input
                          type="number"
                          min="0"
                          max={item.quantidade}
                          step="any"
                          className="mt-1 min-h-11 w-full rounded-lg border bg-white p-2 text-base outline-none focus:ring-2 focus:ring-[#2563eb]"
                          value={qty[item.id] ?? ''}
                          onChange={event => setQty(previous => ({ ...previous, [item.id]: event.target.value }))}
                          placeholder="0"
                        />
                      </label>
                      <button className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={busy} onClick={() => void release(item)}>
                        <CheckCircle2 size={17} /> Liberar
                      </button>
                    </div>
                  </article>
                ))}
                {!items.length && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-base text-slate-500">Selecione um pedido na tabela para detalhar os itens.</p>}
              </div>
            </aside>
          </div>
        </section>
      )}

      {tab === 'notas' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0f172a]">Notas Fiscais</h2>
              <p className="text-base text-slate-500">Documentos fiscais reais da empresa e transmissão pela Edge Function protegida.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-base font-bold text-blue-800">{docs.length} documentos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-base">
              <thead><tr className="border-b bg-slate-50 font-semibold"><th className="p-3">Número</th><th className="p-3">Destinatário</th><th className="p-3">Emissão</th><th className="p-3">Status</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Ação</th></tr></thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} className="border-b border-slate-100">
                    <td className="p-3 font-bold text-[#1e3a8a]">{doc.numero ?? '—'} / {doc.serie}</td>
                    <td className="p-3">{doc.destinatario_nome ?? '—'}</td>
                    <td className="p-3">{doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="p-3">{doc.status}</td>
                    <td className="p-3 text-right font-semibold">{money(doc.valor_total)}</td>
                    <td className="p-3 text-center">
                      <button className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3 py-2 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-60" disabled={busy || ['autorizada','Processando'].includes(doc.status)} onClick={() => void emitNfe(doc)}>
                        <Send size={16} /> Transmitir NF-e
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!docs.length && <p className="p-6 text-center text-base text-slate-500">Nenhum documento fiscal real encontrado.</p>}
          </div>
        </section>
      )}

      {(tab === 'receber' || tab === 'pagar') && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#0f172a]">{tab === 'receber' ? 'Contas a Receber' : 'Contas a Pagar'}</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-base">
              <thead><tr className="border-b bg-slate-50 font-semibold"><th className="p-3">Descrição</th><th className="p-3">Documento</th><th className="p-3">Vencimento</th><th className="p-3">Status</th><th className="p-3 text-right">Valor</th></tr></thead>
              <tbody>
                {(tab === 'receber' ? receber : pagar).map(conta => (
                  <tr key={conta.id} className="border-b border-slate-100">
                    <td className="p-3">{conta.descricao}</td>
                    <td className="p-3">{conta.documento ?? '—'}</td>
                    <td className="p-3">{new Date(conta.vencimento).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">{conta.status}</td>
                    <td className="p-3 text-right font-semibold">{money(conta.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'relatorios' && (
        <section className="space-y-5">
          <nav className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {([
              ['faturamento', 'Faturamento'],
              ['receber', 'Recebimentos'],
              ['pagar', 'Pagamentos']
            ] as Array<[ReportTab, string]>).map(([id, label]) => (
              <button key={id} className={'min-h-11 rounded-lg border px-4 py-2 text-base font-semibold ' + (reportTab === id ? 'border-[#2563eb] bg-blue-50 text-[#1e3a8a]' : 'border-slate-200 bg-white text-slate-600')} onClick={() => setReportTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-semibold uppercase text-slate-400">NF-e monitoradas</span><strong className="mt-1 block text-2xl">{report.nfCount}</strong></article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-semibold uppercase text-slate-400">Valor NF-e</span><strong className="mt-1 block text-2xl">{money(report.nfTotal)}</strong></article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-semibold uppercase text-slate-400">A receber</span><strong className="mt-1 block text-2xl">{money(report.receber)}</strong></article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-semibold uppercase text-slate-400">A pagar</span><strong className="mt-1 block text-2xl">{money(report.pagar)}</strong></article>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-[#0f172a]">{reportTab === 'faturamento' ? 'Faturamento fiscal' : reportTab === 'receber' ? 'Recebimentos' : 'Pagamentos'}</h2>
            <p className="mt-2 text-base text-slate-600">Dados consolidados diretamente das tabelas fiscais reais. Pedidos ainda abertos: <strong>{report.abertos}</strong>.</p>
          </div>
        </section>
      )}
    </main>
  )
}
