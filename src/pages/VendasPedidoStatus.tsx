import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Item = {
  id: string
  produto_id: string
  descricao: string
  quantidade: number
  valor_unitario: number
  desconto: number
  total: number
  produto_cliente: string | null
}
type Order = {
  numero: number
  status: string
  pedido_cliente: string | null
  total: number
  subtotal: number
  desconto_valor: number
  valor_outras_despesas: number
  data_entrada: string | null
  data_entrega_prometida: string | null
  condicao_pagamento: string | null
  vendedor_nome: string | null
  observacoes: string | null
  cliente: { nome: string; documento: string | null } | null
}
type Production = {
  numero_op: string
  status: string
  quantidade: number
  quantidade_planejada: number
  quantidade_produzida: number
  data_prevista: string | null
}
type Expedition = {
  numero: number
  status: string
  transportadora: string | null
  rastreio: string | null
  data_expedicao: string | null
}
type Fiscal = {
  tipo: string
  status: string
  quantidade_solicitada: number
  quantidade_liberada: number
  quantidade_pendente: number
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

export default function VendasPedidoStatus() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [production, setProduction] = useState<Production[]>([])
  const [expedition, setExpedition] = useState<Expedition[]>([])
  const [fiscal, setFiscal] = useState<Fiscal[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!id) return
    setBusy(true)
    setError('')
    const [orderResult, itemsResult, productionResult, expeditionResult, fiscalResult] = await Promise.all([
      supabase
        .from('erp_pedidos_venda')
        .select('numero,status,pedido_cliente,total,subtotal,desconto_valor,valor_outras_despesas,data_entrada,data_entrega_prometida,condicao_pagamento,vendedor_nome,observacoes,cliente:erp_clientes(nome,documento)')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('erp_pedidos_venda_itens')
        .select('id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente')
        .eq('pedido_id', id)
        .order('id'),
      supabase
        .from('erp_ordens_producao')
        .select('numero_op,status,quantidade,quantidade_planejada,quantidade_produzida,data_prevista')
        .eq('pedido_venda_id', id),
      supabase
        .from('erp_expedicoes')
        .select('numero,status,transportadora,rastreio,data_expedicao')
        .eq('pedido_venda_id', id),
      supabase
        .from('erp_liberacoes_fiscais')
        .select('tipo,status,quantidade_solicitada,quantidade_liberada,quantidade_pendente')
        .eq('pedido_venda_id', id),
    ])

    if (orderResult.error) setError(orderResult.error.message)
    if (itemsResult.error) setError(itemsResult.error.message)
    if (productionResult.error) setError(productionResult.error.message)
    if (expeditionResult.error) setError(expeditionResult.error.message)
    if (fiscalResult.error) setError(fiscalResult.error.message)

    setOrder((orderResult.data ?? null) as unknown as Order | null)
    setItems((itemsResult.data ?? []) as Item[])
    setProduction((productionResult.data ?? []) as Production[])
    setExpedition((expeditionResult.data ?? []) as Expedition[])
    setFiscal((fiscalResult.data ?? []) as Fiscal[])
    setBusy(false)
  }

  useEffect(() => {
    void load()
  }, [id])

  if (!id) return <div className="p-8">Pedido não informado.</div>

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="flex min-h-[70px] items-center justify-between gap-4 px-5 lg:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-[#2D8DB8]">ERP Industrial • Vendas</p>
            <h1 className="text-xl font-medium text-[#123B50]">Acompanhamento do Pedido</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => location.assign('/vendas/status')} className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs">
              <ArrowLeft size={15} /> Status Pedido
            </button>
            <button type="button" onClick={() => void load()} className="h-9 rounded-md border px-3">
              <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-5 lg:p-8">
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
        {order && (
          <>
            <section className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-9">
                <Info label="Pedido" value={`PV-${String(order.numero).padStart(6, '0')}`} />
                <div><Info label="Cliente" value={order.cliente?.nome || '—'} /><p className="text-[11px] text-slate-500">{order.cliente?.documento || '—'}</p></div>
                <Info label="Data entrada" value={order.data_entrada || '—'} />
                <Info label="Pedido cliente" value={order.pedido_cliente || '—'} />
                <Info label="Entrega" value={order.data_entrega_prometida || '—'} />
                <Info label="Status" value={order.status} />
                <Info label="Pagamento" value={order.condicao_pagamento || '—'} />
                <Info label="Vendedor" value={order.vendedor_nome || '—'} />
              </div>
            </section>

            <section className="mt-5 rounded-lg border bg-white p-5">
              <h2 className="font-medium text-[#123B50]">Itens do pedido</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead><tr className="h-[50px] bg-slate-100 text-left text-sm"><th>Descrição</th><th>Cód. cliente</th><th>Quantidade</th><th>Valor unitário</th><th>Desconto</th><th>Total</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="h-[50px] border-t">
                        <td>{item.descricao}</td><td>{item.produto_cliente || '—'}</td><td>{item.quantidade}</td>
                        <td>{money(Number(item.valor_unitario))}</td><td>{money(Number(item.desconto || 0))}</td><td>{money(Number(item.total))}</td>
                      </tr>
                    ))}
                    {!items.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum item encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-5 rounded-lg border bg-white p-5">
              <h2 className="font-medium text-[#123B50]">Condições comerciais</h2>
              <div className="mt-4 grid gap-4 text-sm md:grid-cols-5">
                <Info label="Subtotal" value={money(Number(order.subtotal || 0))} />
                <Info label="Desconto" value={money(Number(order.desconto_valor || 0))} />
                <Info label="Outras despesas" value={money(Number(order.valor_outras_despesas || 0))} />
                <Info label="Total" value={money(Number(order.total || 0))} />
              </div>
              {order.observacoes && <div className="mt-4 rounded border bg-slate-50 p-3 text-sm whitespace-pre-wrap"><strong>Observações:</strong> {order.observacoes}</div>}
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-3">
              <StatusBlock title="Produção" rows={production.map((row) => `OP ${row.numero_op} • ${row.status} • ${row.quantidade_produzida ?? 0}/${row.quantidade_planejada ?? row.quantidade}`)} empty="Nenhuma OP vinculada a este pedido." />
              <StatusBlock title="Expedição" rows={expedition.map((row) => `Expedição ${row.numero} • ${row.status}${row.transportadora ? ' • ' + row.transportadora : ''}`)} empty="Nenhuma expedição vinculada." />
              <StatusBlock title="NF / Saída" rows={fiscal.map((row) => `${row.tipo} • ${row.status} • pendente ${row.quantidade_pendente ?? 0}`)} empty="Nenhuma liberação fiscal vinculada." />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>
}

function StatusBlock({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="font-medium text-[#123B50]">{title}</h2>
      <div className="mt-4 space-y-2">
        {rows.length ? rows.map((row, index) => <div key={index} className="rounded border bg-slate-50 p-3 text-sm">{row}</div>) : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  )
}
