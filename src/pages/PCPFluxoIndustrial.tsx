import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, CalendarClock, Factory, PackageCheck, RefreshCw, ScanLine } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Order = {
  id: string
  numero_op: string | number
  produto_id: string
  quantidade: number
  quantidade_planejada?: number | null
  quantidade_produzida?: number | null
  status: string
  created_at: string
  data_prevista: string | null
  pedido_venda_id: string | null
}
type Product = { id: string; codigo: string; nome: string }
type Program = { id: string; ordem_producao_id: string | null; quantidade_planejada: number; quantidade_produzida: number; quantidade_refugada: number; status: string; inicio_planejado: string; fim_planejado: string }
type Finish = { id: string; ordem_producao_id: string; quantidade_recebida: number; quantidade_acabada: number; quantidade_refugo: number; status: string; created_at: string }

const number = (value: number) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const date = (value: string | null) => value ? new Date(value + (value.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR') : '—'
const statusTone = (status: string) => {
  const value = status.toLocaleUpperCase('pt-BR')
  if (value.includes('CONCLU') || value.includes('FINAL')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (value.includes('PROCESS') || value.includes('ANDAMENTO')) return 'bg-sky-50 text-sky-700 border-sky-200'
  if (value.includes('ATRAS') || value.includes('BLOQUE')) return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export default function PCPFluxoIndustrial() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [finishes, setFinishes] = useState<Finish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = tenant.data
      const [opResult, programResult, finishResult] = await Promise.all([
        supabase.from('erp_ordens_producao')
          .select('id,numero_op,produto_id,quantidade,quantidade_planejada,quantidade_produzida,status,created_at,data_prevista,pedido_venda_id')
          .eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(500),
        supabase.from('erp_pcp_programacoes')
          .select('id,ordem_producao_id,quantidade_planejada,quantidade_produzida,quantidade_refugada,status,inicio_planejado,fim_planejado')
          .eq('empresa_id', empresaId).limit(3000),
        supabase.from('erp_acabamentos')
          .select('id,ordem_producao_id,quantidade_recebida,quantidade_acabada,quantidade_refugo,status,created_at')
          .eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(3000)
      ])
      if (opResult.error) throw opResult.error
      if (programResult.error) throw programResult.error
      // A tabela de acabamento existe no contrato atual. Se estiver indisponível no PostgREST,
      // mostramos o erro em vez de inventar quantidades ou concluir a etapa.
      if (finishResult.error) throw finishResult.error
      const rows = (opResult.data ?? []) as Order[]
      const productIds = [...new Set(rows.map(row => row.produto_id).filter(Boolean))]
      const productResult = productIds.length
        ? await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', empresaId).in('id', productIds)
        : { data: [], error: null }
      if (productResult.error) throw productResult.error
      setOrders(rows)
      setProducts((productResult.data ?? []) as Product[])
      setPrograms((programResult.data ?? []) as Program[])
      setFinishes((finishResult.data ?? []) as Finish[])
      setUpdatedAt(new Date())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o fluxo industrial.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const programMap = useMemo(() => {
    const map = new Map<string, Program[]>()
    for (const item of programs) {
      if (!item.ordem_producao_id) continue
      map.set(item.ordem_producao_id, [...(map.get(item.ordem_producao_id) ?? []), item])
    }
    return map
  }, [programs])
  const finishMap = useMemo(() => {
    const map = new Map<string, Finish[]>()
    for (const item of finishes) map.set(item.ordem_producao_id, [...(map.get(item.ordem_producao_id) ?? []), item])
    return map
  }, [finishes])

  const totals = useMemo(() => ({
    orders: orders.length,
    planned: orders.reduce((sum, row) => sum + Number(row.quantidade_planejada ?? row.quantidade ?? 0), 0),
    produced: orders.reduce((sum, row) => sum + Number(row.quantidade_produzida ?? 0), 0),
    finishing: finishes.reduce((sum, row) => sum + Number(row.quantidade_acabada ?? 0), 0),
    inProgress: orders.filter(row => /PROCESS|ANDAMENTO/i.test(row.status)).length
  }), [orders, finishes])

  return (
    <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center gap-3 rounded-xl border border-[#D8E7ED] bg-white p-3 shadow-sm">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#123B50] text-white"><Factory size={20}/></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#2D8DB8]">SYSNQRA · PCP industrial</p>
            <h1 className="text-lg font-black">Central de Fluxo da Fábrica</h1>
            <p className="text-xs text-slate-500">Visão consolidada das ordens, produção e acabamento com dados reais do ERP.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Atualizar</button>
          {updatedAt && <span className="text-[10px] text-slate-400">Atualizado às {updatedAt.toLocaleTimeString('pt-BR')}</span>}
        </header>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"><AlertCircle size={16}/><span>{error}</span></div>}

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {[
            { label: 'Ordens abertas no painel', value: number(totals.orders), icon: ClipboardList },
            { label: 'Quantidade planejada', value: number(totals.planned), icon: PackageCheck },
            { label: 'Produção apontada na OP', value: number(totals.produced), icon: Activity },
            { label: 'Peças acabadas registradas', value: number(totals.finishing), icon: ScanLine },
            { label: 'Ordens em andamento', value: number(totals.inProgress), icon: CalendarClock }
          ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-[#D8E7ED] bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase text-slate-500">{label}</span><Icon size={16} className="text-[#2D8DB8]"/></div><strong className="mt-2 block text-xl font-black tabular-nums">{value}</strong></article>)}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#D8E7ED] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3"><div><h2 className="text-sm font-black">Acompanhamento por ordem de produção</h2><p className="text-[10px] text-slate-500">Cada linha mantém a origem na OP; os totais são agregados dos registros encontrados.</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold">{orders.length} OPs</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-xs">
              <thead className="bg-[#123B50] text-white"><tr className="h-10 text-left text-[10px] uppercase"><th className="px-3">OP</th><th className="px-3">Produto</th><th className="px-3 text-right">Planejado</th><th className="px-3 text-right">Produzido</th><th className="px-3">Produção</th><th className="px-3">Acabamento</th><th className="px-3">Montagem</th><th className="px-3">Previsão OP</th></tr></thead>
              <tbody>
                {orders.map(order => {
                  const product = productMap.get(order.produto_id)
                  const orderPrograms = programMap.get(order.id) ?? []
                  const orderFinishes = finishMap.get(order.id) ?? []
                  const planned = Number(order.quantidade_planejada ?? order.quantidade ?? 0)
                  const produced = Number(order.quantidade_produzida ?? orderPrograms.reduce((sum, item) => sum + Number(item.quantidade_produzida || 0), 0))
                  const finished = orderFinishes.reduce((sum, item) => sum + Number(item.quantidade_acabada || 0), 0)
                  const finishStatus = orderFinishes.length ? (orderFinishes.every(item => item.status === 'CONCLUIDO') ? 'Registrado · concluído' : 'Em processamento') : 'Sem apontamento'
                  return <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-3 py-3 font-black">#{order.numero_op}</td>
                    <td className="px-3 py-3"><strong className="block">{product?.codigo ?? 'Produto'}</strong><span className="text-[10px] text-slate-500">{product?.nome ?? order.produto_id}</span></td>
                    <td className="px-3 py-3 text-right tabular-nums">{number(planned)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{number(produced)}</td>
                    <td className="px-3 py-3"><span className={'rounded-md border px-2 py-1 text-[10px] font-bold ' + statusTone(order.status)}>{order.status}</span><span className="mt-1 block text-[10px] text-slate-500">{orderPrograms.length} programação(ões)</span></td>
                    <td className="px-3 py-3"><strong>{number(finished)} un.</strong><span className="mt-1 block text-[10px] text-slate-500">{finishStatus}</span></td>
                    <td className="px-3 py-3"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">Roteiro não integrado</span><span className="mt-1 block text-[10px] text-slate-400">Aguardando estrutura rastreável</span></td>
                    <td className="px-3 py-3 tabular-nums">{date(order.data_prevista)}</td>
                  </tr>
                })}
                {!loading && !orders.length && <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400">Nenhuma ordem encontrada para a empresa da sessão.</td></tr>}
                {loading && <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400">Carregando dados reais do PCP…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <p className="text-[10px] text-slate-500">Importante: a tela é somente de consulta nesta etapa. Transferências parciais, recebimento de lotes, baixa de refugos e liberação da Qualidade serão habilitados após a implantação das tabelas e RPCs transacionais, sem simular movimentos de estoque.</p>
      </div>
    </main>
  )
}
