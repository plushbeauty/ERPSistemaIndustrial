/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-24
 * @REVISAO: VENDAS-DETALHE-COMMAND-20261124
 * @STATUS_APROVACAO: REVISÃO AUTORIZADA PELO PROPRIETÁRIO; validação funcional pendente
 * @REGRA: somente apresentação; consultas multiempresa, itens, valores e etapas permanecem preservados.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CheckCircle2, CircleAlert, FileText, PackageCheck, Pencil, Truck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Item = {
  id: string; produto_id: string; descricao: string; quantidade: number
  valor_unitario: number; desconto: number; total: number; produto_cliente: string | null
}
type Order = {
  numero: number; status: string; pedido_cliente: string | null; total: number; subtotal: number
  desconto_valor: number; valor_frete: number; valor_outras_despesas: number; data_entrada: string | null
  data_entrega_prometida: string | null; condicao_pagamento: string | null; vendedor_nome: string | null
  modalidade_frete: string | null; transportadora: string | null; observacoes: string | null
  cliente: { nome: string; documento: string | null } | null
}
type Production = { numero_op: string; status: string; quantidade: number; quantidade_planejada: number; quantidade_produzida: number; data_prevista: string | null }
type Expedition = { numero: number; status: string; transportadora: string | null; rastreio: string | null; data_expedicao: string | null }
type Fiscal = { tipo: string; status: string; quantidade_solicitada: number; quantidade_liberada: number; quantidade_pendente: number }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const date = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value.slice(0, 10) + 'T00:00:00')) : '—'

export default function VendasPedidoStatus() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [production, setProduction] = useState<Production[]>([])
  const [expedition, setExpedition] = useState<Expedition[]>([])
  const [fiscal, setFiscal] = useState<Fiscal[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const companyId = String(tenant.data)
      const [orderResult, itemsResult, productionResult, expeditionResult, fiscalResult] = await Promise.all([
        supabase.from('erp_pedidos_venda')
          .select('numero,status,pedido_cliente,total,subtotal,desconto_valor,valor_frete,valor_outras_despesas,data_entrada,data_entrega_prometida,condicao_pagamento,vendedor_nome,modalidade_frete,transportadora,observacoes,cliente:erp_clientes(nome,documento)')
          .eq('empresa_id', companyId).eq('id', id).maybeSingle(),
        supabase.from('erp_pedidos_venda_itens')
          .select('id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente')
          .eq('empresa_id', companyId).eq('pedido_id', id).order('id'),
        supabase.from('erp_ordens_producao')
          .select('numero_op,status,quantidade,quantidade_planejada,quantidade_produzida,data_prevista')
          .eq('empresa_id', companyId).eq('pedido_venda_id', id),
        supabase.from('erp_expedicoes')
          .select('numero,status,transportadora,rastreio,data_expedicao')
          .eq('empresa_id', companyId).eq('pedido_venda_id', id),
        supabase.from('erp_liberacoes_fiscais')
          .select('tipo,status,quantidade_solicitada,quantidade_liberada,quantidade_pendente')
          .eq('empresa_id', companyId).eq('pedido_venda_id', id),
      ])
      const errors = [orderResult.error, itemsResult.error, productionResult.error, expeditionResult.error, fiscalResult.error].filter(Boolean)
      if (errors.length) setError(errors.map(item => item?.message).join(' • '))
      setOrder((orderResult.data ?? null) as unknown as Order | null)
      setItems((itemsResult.data ?? []) as Item[])
      setProduction((productionResult.data ?? []) as Production[])
      setExpedition((expeditionResult.data ?? []) as Expedition[])
      setFiscal((fiscalResult.data ?? []) as Fiscal[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o pedido.')
      setOrder(null); setItems([]); setProduction([]); setExpedition([]); setFiscal([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [id])
  if (!id) return <div className="p-8">Pedido não informado.</div>
  const draft = order ? ['rascunho', 'aberto'].some(status => order.status.toLowerCase().includes(status)) : false
  const orderCode = order ? 'PV-' + String(order.numero).padStart(6, '0') : 'Pedido'

  return (
    <VendasLayout title="Acompanhamento do pedido" subtitle={orderCode} onRefresh={() => void load()}>
      <main className="space-y-4 rounded-lg bg-[#E9EFF3] p-3 text-[12px] text-slate-700 md:p-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#123B50] px-4 py-3 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10"><FileText size={18}/></span>
            <div><div className="text-[10px] uppercase tracking-widest text-white/60">Vendas / Pedidos / Detalhes</div>
              <h2 className="text-[16px] font-bold">{orderCode} {loading && <span className="text-[11px] font-normal text-white/60">Carregando…</span>}</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/vendas/status" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/25 bg-white/5 px-3 text-[11px] font-semibold text-white hover:bg-white/15"><ArrowLeft size={13}/>Pedidos</Link>
            {draft && <Link to={'/vendas/novo-pedido?pedido=' + encodeURIComponent(id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#237497] bg-[#2D8DB8] px-3 text-[11px] font-semibold text-white hover:bg-[#237497]"><Pencil size={13}/>Editar rascunho</Link>}
          </div>
        </header>

        {error && <div role="alert" className="flex items-center gap-2 rounded-md border border-[#D65B61]/30 bg-[#D65B61]/10 px-3 py-2 font-medium text-[#b8454b]"><CircleAlert size={14}/>{error}</div>}
        {!loading && !order && <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">Pedido não encontrado para a empresa ativa.</section>}

        {order && <>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3">
              <div><div className="text-[10px] uppercase tracking-widest text-slate-400">Resumo comercial</div><h3 className="text-[14px] font-bold text-[#123B50]">{order.cliente?.nome || 'Cliente não identificado'}</h3></div>
              <span className="rounded-full bg-[#48B7C7]/15 px-3 py-1 text-[10px] font-bold text-[#237497]">{order.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-5">
              <Info label="Pedido" value={orderCode}/>
              <Info label="Documento" value={order.cliente?.documento || '—'}/>
              <Info label="Entrada" value={date(order.data_entrada)}/>
              <Info label="Pedido cliente" value={order.pedido_cliente || '—'}/>
              <Info label="Entrega prometida" value={date(order.data_entrega_prometida)}/>
              <Info label="Pagamento" value={order.condicao_pagamento || '—'}/>
              <Info label="Vendedor" value={order.vendedor_nome || '—'}/>
              <Info label="Modalidade de frete" value={order.modalidade_frete || '—'}/>
              <Info label="Transportadora" value={order.transportadora || '—'}/>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold text-[#123B50]">Itens do pedido</h3><p className="text-[10px] text-slate-500">{items.length} item(ns) vinculados</p></div>
            <div className="overflow-auto"><table className="w-full min-w-[850px] border-collapse">
              <thead className="bg-[#123B50] text-white"><tr><th className="px-3 py-2 text-left text-[10px] uppercase">Descrição</th><th className="px-3 py-2 text-left text-[10px] uppercase">Cód. cliente</th><th className="px-3 py-2 text-right text-[10px] uppercase">Quantidade</th><th className="px-3 py-2 text-right text-[10px] uppercase">Valor unitário</th><th className="px-3 py-2 text-right text-[10px] uppercase">Desconto</th><th className="px-3 py-2 text-right text-[10px] uppercase">Total</th></tr></thead>
              <tbody>{items.map(item => <tr key={item.id} className="border-b border-slate-100 hover:bg-[#48B7C7]/8">
                <td className="px-3 py-2.5 font-medium">{item.descricao}</td><td className="px-3 py-2.5">{item.produto_cliente || '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{Number(item.quantidade).toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{money(Number(item.valor_unitario))}</td><td className="px-3 py-2.5 text-right tabular-nums">{money(Number(item.desconto || 0))}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[#123B50]">{money(Number(item.total))}</td>
              </tr>)}
              {!items.length && <tr><td colSpan={6} className="py-10 text-center text-slate-500">Nenhum item encontrado.</td></tr>}</tbody>
            </table></div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold text-[#123B50]">Condições comerciais</h3></div>
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-5">
              <Info label="Subtotal" value={money(Number(order.subtotal || 0))}/>
              <Info label="Desconto" value={money(Number(order.desconto_valor || 0))}/>
              <Info label="Frete" value={money(Number(order.valor_frete || 0))}/>
              <Info label="Outras despesas" value={money(Number(order.valor_outras_despesas || 0))}/>
              <Info label="Total" value={money(Number(order.total || 0))} emphasize/>
            </div>
            {order.observacoes && <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 whitespace-pre-wrap text-[11px]"><strong>Observações:</strong> {order.observacoes}</div>}
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <StatusBlock title="Produção" icon={<PackageCheck size={15}/>} rows={production.map(row => 'OP ' + row.numero_op + ' • ' + row.status + ' • ' + Number(row.quantidade_produzida || 0) + '/' + Number(row.quantidade_planejada || row.quantidade) + (row.data_prevista ? ' • Prev.: ' + date(row.data_prevista) : ''))} empty="Nenhuma OP vinculada a este pedido."/>
            <StatusBlock title="Expedição" icon={<Truck size={15}/>} rows={expedition.map(row => 'Expedição ' + row.numero + ' • ' + row.status + (row.transportadora ? ' • ' + row.transportadora : '') + (row.data_expedicao ? ' • ' + date(row.data_expedicao) : '') + (row.rastreio ? ' • Rastreio: ' + row.rastreio : ''))} empty="Nenhuma expedição vinculada."/>
            <StatusBlock title="NF / Saída" icon={<CheckCircle2 size={15}/>} rows={fiscal.map(row => row.tipo + ' • ' + row.status + ' • liberada ' + Number(row.quantidade_liberada || 0) + ' • pendente ' + Number(row.quantidade_pendente || 0))} empty="Nenhuma liberação fiscal vinculada."/>
          </section>
        </>}
      </main>
    </VendasLayout>
  )
}

function Info({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return <div className="bg-white px-3 py-3"><div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className={'mt-1 text-[12px] ' + (emphasize ? 'font-extrabold text-[#123B50]' : 'font-semibold text-slate-700')}>{value}</div></div>
}
function StatusBlock({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: string[]; empty: string }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="flex items-center gap-2 font-bold text-[#123B50]">{icon}{title}</h3>
    <div className="mt-3 space-y-2">{rows.length ? rows.map((row,index) => <div key={index} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">{row}</div>) : <p className="text-[11px] text-slate-500">{empty}</p>}</div>
  </section>
}
