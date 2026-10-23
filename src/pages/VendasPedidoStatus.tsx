import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

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
  valor_frete: number
  valor_outras_despesas: number
  data_entrada: string | null
  data_entrega_prometida: string | null
  condicao_pagamento: string | null
  vendedor_nome: string | null
  modalidade_frete: string | null
  transportadora: string | null
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

  const load = async () => {
    if (!id) return
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const companyId = String(tenant.data)
      const [orderResult, itemsResult, productionResult, expeditionResult, fiscalResult] = await Promise.all([
      supabase
        .from('erp_pedidos_venda')
        .select('numero,status,pedido_cliente,total,subtotal,desconto_valor,valor_frete,valor_outras_despesas,data_entrada,data_entrega_prometida,condicao_pagamento,vendedor_nome,modalidade_frete,transportadora,observacoes,cliente:erp_clientes(nome,documento)')
        .eq('empresa_id', companyId)
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('erp_pedidos_venda_itens')
        .select('id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente')
        .eq('empresa_id', companyId)
        .eq('pedido_id', id)
        .order('id'),
      supabase
        .from('erp_ordens_producao')
        .select('numero_op,status,quantidade,quantidade_planejada,quantidade_produzida,data_prevista')
        .eq('empresa_id', companyId)
        .eq('empresa_id', companyId)
        .eq('empresa_id', companyId)
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o pedido.')
      setOrder(null)
      setItems([])
      setProduction([])
      setExpedition([])
      setFiscal([])
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  if (!id) return <div className="p-8">Pedido não informado.</div>

  return (
    <VendasLayout title="Acompanhamento do pedido" subtitle={order ? `PV-${String(order.numero).padStart(6, '0')}` : 'Vendas'} onRefresh={() => void load()}>
      <main className="sales-workspace sales-detail">
        <style>{`.sales-detail-toolbar .sales-button{height:30px;min-height:30px;border-radius:2px}`}</style>
        <div className="sales-detail-toolbar">
          <Link to="/vendas/pedidos" className="sales-button sales-button--secondary"><ArrowLeft size={15} /> Pedidos de venda</Link>
          {order && ['rascunho', 'aberto'].some((status) => order.status.toLowerCase().includes(status)) && id && (
            <Link to={`/vendas/novo-pedido?pedido=${encodeURIComponent(id)}`} className="sales-button sales-button--primary erp-row-action"><Pencil size={15} /> Editar rascunho</Link>
          )}
        </div>
        {error && <div className="mb-2 rounded-[2px] border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>}
        {order && (
          <>
            <section className="rounded-[2px] border border-slate-300 bg-white p-2 shadow-sm">
              <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-9">
                <Info label="Pedido" value={`PV-${String(order.numero).padStart(6, '0')}`} />
                <div><Info label="Cliente" value={order.cliente?.nome || '—'} /><p className="text-[11px] text-slate-500">{order.cliente?.documento || '—'}</p></div>
                <Info label="Data entrada" value={order.data_entrada || '—'} />
                <Info label="Pedido cliente" value={order.pedido_cliente || '—'} />
                <Info label="Entrega" value={order.data_entrega_prometida || '—'} />
                <Info label="Status" value={order.status} />
                <Info label="Pagamento" value={order.condicao_pagamento || '—'} />
                <Info label="Vendedor" value={order.vendedor_nome || '—'} />
                <div><Info label="Frete" value={order.modalidade_frete || '—'} /><p className="text-[11px] text-slate-500">{order.transportadora || ''}</p></div>
              </div>
            </section>

            <section className="mt-2 rounded-[2px] border border-slate-300 bg-white p-2">
              <h2 className="font-medium text-[#123B50]">Itens do pedido</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[900px] text-xs">
                  <thead className="bg-slate-100 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600"><tr className="h-8"><th className="px-2 py-1">Descrição</th><th className="px-2 py-1">Cód. cliente</th><th className="px-2 py-1">Quantidade</th><th className="px-2 py-1">Valor unitário</th><th className="px-2 py-1">Desconto</th><th className="px-2 py-1">Total</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="h-8 border-t border-slate-200">
                        <td className="px-2 py-1">{item.descricao}</td><td className="px-2 py-1">{item.produto_cliente || '—'}</td><td className="px-2 py-1">{item.quantidade}</td>
                        <td className="px-2 py-1">{money(Number(item.valor_unitario))}</td><td className="px-2 py-1">{money(Number(item.desconto || 0))}</td><td className="px-2 py-1">{money(Number(item.total))}</td>
                      </tr>
                    ))}
                    {!items.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum item encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-2 rounded-[2px] border border-slate-300 bg-white p-2">
              <h2 className="font-medium text-[#123B50]">Condições comerciais</h2>
              <div className="mt-2 grid gap-2 text-xs md:grid-cols-5">
                <Info label="Subtotal" value={money(Number(order.subtotal || 0))} />
                <Info label="Desconto" value={money(Number(order.desconto_valor || 0))} />
                <Info label="Frete" value={money(Number(order.valor_frete || 0))} />
                <Info label="Outras despesas" value={money(Number(order.valor_outras_despesas || 0))} />
                <Info label="Total" value={money(Number(order.total || 0))} />
              </div>
              {order.observacoes && <div className="mt-2 rounded-[2px] border border-slate-300 bg-slate-50 p-2 text-xs whitespace-pre-wrap"><strong>Observações:</strong> {order.observacoes}</div>}
            </section>

            <section className="mt-2 grid gap-2 lg:grid-cols-3">
              <StatusBlock title="Produção" rows={production.map((row) => `OP ${row.numero_op} • ${row.status} • ${row.quantidade_produzida ?? 0}/${row.quantidade_planejada ?? row.quantidade}`)} empty="Nenhuma OP vinculada a este pedido." />
              <StatusBlock title="Expedição" rows={expedition.map((row) => `Expedição ${row.numero} • ${row.status}${row.transportadora ? ' • ' + row.transportadora : ''}`)} empty="Nenhuma expedição vinculada." />
              <StatusBlock title="NF / Saída" rows={fiscal.map((row) => `${row.tipo} • ${row.status} • pendente ${row.quantidade_pendente ?? 0}`)} empty="Nenhuma liberação fiscal vinculada." />
            </section>
          </>
        )}
      </main>
    </VendasLayout>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-0.5 text-xs font-medium text-slate-800">{value}</div></div>
}

function StatusBlock({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <div className="rounded-[2px] border border-slate-300 bg-white p-2 shadow-sm">
      <h2 className="text-xs font-semibold text-[#123B50]">{title}</h2>
      <div className="mt-2 space-y-1">
        {rows.length ? rows.map((row, index) => <div key={index} className="rounded-[2px] border border-slate-300 bg-slate-50 p-2 text-xs">{row}</div>) : <p className="text-xs text-slate-500">{empty}</p>}
      </div>
    </div>
  )
}
