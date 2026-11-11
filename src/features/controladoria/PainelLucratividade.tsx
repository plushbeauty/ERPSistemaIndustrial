/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-CONTROLADORIA-LUCRATIVIDADE-WIREFRAME-20261110-01
 * @STATUS_APROVACAO: WIREFRAME E AJUDA AUTORIZADOS PELO PROPRIETARIO EM 2026-11-10
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, Calculator, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Row = { id: string; numero: string; cliente: string; produtos: string; faturamento: number; custo: number; custoCompleto: boolean }
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'h-10 rounded-md border border-gray-200 bg-white px-3 text-[12px] text-gray-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500'
const action = 'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[12px] font-bold'

export default function PainelLucratividade() {
  const navigate = useNavigate()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [target, setTarget] = useState('25')
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) { setError('Informe a competência.'); return }
    const targetValue = Number(target.replace(',', '.'))
    if (!Number.isFinite(targetValue) || targetValue < 0 || targetValue > 100) { setError('A Margem Alvo deve estar entre 0 e 100%.'); return }
    setLoading(true)
    setError('')
    setLoaded(false)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa de trabalho não identificada.')
      const tenant = String(company.data)
      const [year, monthNumber] = month.split('-').map(Number)
      const start = `${month}-01`
      const endDate = new Date(year, monthNumber, 1)
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`
      const orders = await supabase.from('erp_pedidos_venda')
        .select('id,numero,cliente_id')
        .eq('empresa_id', tenant)
        .gte('data_entrada', start)
        .lt('data_entrada', end)
        .not('status', 'in', '("CANCELADO","CANCELADA","RASCUNHO")')
        .order('data_entrada', { ascending: false })
        .limit(1000)
      if (orders.error) throw orders.error
      const orderRows = orders.data ?? []
      const ids = orderRows.map(order => order.id)
      const clientIds = [...new Set(orderRows.map(order => order.cliente_id).filter((id): id is string => Boolean(id)))]
      const [items, clients] = await Promise.all([
        (async () => {
          const all: Array<{ id: string; pedido_id: string; descricao: string | null; quantidade: number; valor_unitario: number; total: number | null; preco_custo_industrial: number | null }> = []
          for (let offset = 0; ; offset += 1000) {
            const page = await supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,descricao,quantidade,valor_unitario,total,preco_custo_industrial').eq('empresa_id', tenant).in('pedido_id', ids).range(offset, offset + 999)
            if (page.error) return { data: null, error: page.error }
            all.push(...(page.data ?? []))
            if (!page.data || page.data.length < 1000) break
          }
          return { data: all, error: null }
        })(),
        clientIds.length ? supabase.from('erp_clientes').select('id,nome').eq('empresa_id', tenant).in('id', clientIds) : Promise.resolve({ data: [], error: null }),
      ])
      if (items.error) throw items.error
      if (clients.error) throw clients.error
      const clientMap = new Map((clients.data ?? []).map(client => [client.id, client.nome]))
      const orderMap = new Map(orderRows.map(order => [order.id, order]))
      const grouped = new Map<string, Row>()
      for (const order of orderRows) grouped.set(order.id, {
        id: order.id,
        numero: String(order.numero ?? order.id.slice(0, 8)),
        cliente: clientMap.get(order.cliente_id) ?? '—',
        produtos: '',
        faturamento: 0,
        custo: 0,
        custoCompleto: false,
      })
      const itemsSeen = new Set<string>()
      for (const item of items.data ?? []) {
        const order = orderMap.get(item.pedido_id)
        if (!order) continue
        const unitPrice = Number(item.valor_unitario ?? 0)
        const quantity = Number(item.quantidade ?? 0)
        const itemRevenue = Number(item.total ?? quantity * unitPrice)
        const hasCost = item.preco_custo_industrial !== null && item.preco_custo_industrial !== undefined
        const current = grouped.get(order.id) ?? {
          id: order.id,
          numero: String(order.numero ?? order.id.slice(0, 8)),
          cliente: clientMap.get(order.cliente_id) ?? '—',
          produtos: '',
          faturamento: 0,
          custo: 0,
          custoCompleto: true,
        }
        current.faturamento += itemRevenue
        current.custo += Number(item.preco_custo_industrial ?? 0) * quantity
        current.custoCompleto = itemsSeen.has(order.id) ? current.custoCompleto && hasCost : hasCost
        itemsSeen.add(order.id)
        const description = String(item.descricao ?? '').trim()
        if (description && !current.produtos.split(' · ').includes(description)) current.produtos = current.produtos ? current.produtos + ' · ' + description : description
        grouped.set(order.id, current)
      }
      setRows([...grouped.values()])
      setLoaded(true)
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Falha ao consultar os pedidos e custos.')
    } finally {
      setLoading(false)
    }
  }

  const totals = useMemo(() => rows.reduce((sum, row) => ({ revenue: sum.revenue + row.faturamento, cost: sum.cost + (row.custoCompleto ? row.custo : 0) }), { revenue: 0, cost: 0 }), [rows])
  const targetValue = Number(target.replace(',', '.'))

  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
    <div className="mx-auto max-w-[1600px] space-y-3">
      <header className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className={action + ' w-[110px] border border-[#D3E3EA] bg-white text-[#123B50]'}><ArrowLeft size={15}/>Voltar</button>
        <div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8]">CONTROLADORIA › LUCRATIVIDADE E MARGENS</div><h1 className="mt-1 text-[16px] font-bold">CONTROLADORIA DE CUSTOS, MARGENS INDUSTRIAIS E LUCRATIVIDADE</h1><p className="mt-1 text-[12px] text-slate-500">Análise comparativa entre faturamento bruto, custo industrial cadastrado e margem alvo por pedido.</p></div>
      </header>

      <section className="rounded-md border border-[#D3E3EA] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[200px_150px_160px]">
          <div><label className={label}>Mês / Competência *</label><input type="month" className={field + ' w-[200px] max-w-full'} value={month} onChange={e => setMonth(e.target.value)}/></div>
          <div><label className={label}>Margem Alvo % *</label><input type="number" min="0" max="100" step="0.01" className={field + ' w-[150px] max-w-full text-right'} value={target} onChange={e => setTarget(e.target.value)}/></div>
          <button type="button" onClick={() => void load()} disabled={loading} className={action + ' w-[160px] bg-[#2D8DB8] text-white hover:bg-[#236F91] disabled:opacity-60'}><Calculator size={15}/>{loading ? 'Consultando...' : 'Filtrar Custos'}</button>
        </div>
        <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-500"><Info size={14} className="mt-0.5 shrink-0"/>Análise limitada aos primeiros 1.000 pedidos da competência. Linhas sem custo industrial cadastrado não recebem margem calculada.</p>
      </section>

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-md border border-[#D3E3EA] bg-white shadow-sm">
        <div className="flex min-h-14 items-center justify-between border-b border-[#D3E3EA] px-4"><h2 className="text-[13px] font-bold">Apuração de Margem por Pedido</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{loaded ? rows.length : 0} pedido(s)</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-[11px]">
            <thead className="bg-[#123B50] text-white"><tr className="h-11"><th className="w-[110px] px-3 text-left font-semibold">Nº Pedido</th><th className="px-3 text-left font-semibold">Razão Social / Produtos</th><th className="w-[160px] px-3 text-right font-semibold">Faturamento Bruto</th><th className="w-[160px] px-3 text-right font-semibold">Custo Fabricação</th><th className="w-[150px] px-3 text-right font-semibold">Margem Bruta</th><th className="w-[190px] px-3 text-center font-semibold">Taxa de Margem</th></tr></thead>
            <tbody>{rows.map(row => {
              const margin = row.faturamento - row.custo
              const rate = row.faturamento > 0 ? margin / row.faturamento * 100 : 0
              const meetsTarget = row.custoCompleto && rate >= targetValue
              return <tr key={row.id} className="h-12 border-b border-slate-100 even:bg-[#F8FBFC]">
                <td className="px-3 font-semibold">{row.numero}</td><td className="px-3">{row.cliente} · {row.produtos || '—'}</td><td className="px-3 text-right tabular-nums">{money(row.faturamento)}</td><td className="px-3 text-right tabular-nums">{row.custoCompleto ? money(row.custo) : '—'}</td><td className="px-3 text-right tabular-nums">{row.custoCompleto ? money(margin) : '—'}</td>
                <td className="px-3 text-center">{row.custoCompleto ? <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (meetsTarget ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{rate.toFixed(2).replace('.', ',')}%</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">CUSTO PENDENTE</span>}</td>
              </tr>
            })}
            {loaded && rows.length === 0 && <tr><td colSpan={6} className="h-20 text-center text-[12px] text-slate-400">Nenhum pedido encontrado para a competência selecionada.</td></tr>}
            {!loaded && !loading && <tr><td colSpan={6} className="h-20 text-center text-[12px] text-slate-400">Selecione a competência e clique em Filtrar Custos.</td></tr>}
            {loading && <tr><td colSpan={6} className="h-20 text-center text-[12px] text-slate-400">Consultando pedidos reais da empresa...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {loaded && <footer className="flex flex-wrap justify-end gap-5 rounded-md border border-[#D3E3EA] bg-white px-4 py-3 text-[12px] font-bold"><span>Faturamento bruto: {money(totals.revenue)}</span><span>Custo apurado: {money(totals.cost)}</span></footer>}
    </div>
  </main>
}
