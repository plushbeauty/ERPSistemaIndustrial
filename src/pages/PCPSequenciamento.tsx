import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Machine = { id: string; codigo: string; nome: string }
type Order = { id: string; numero_op: number; produto_id: string | null; maquina_id: string | null; status: string; ordem_sequencia: number | null }
type Product = { id: string; codigo: string }

export default function PCPSequenciamento() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [productCodes, setProductCodes] = useState<Record<string, string>>({})
  const [empresaId, setEmpresaId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada na sessão atual.')
    const companyId = String(company.data)
    const [machineRows, orderRows] = await Promise.all([
      fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
      fetchAllPages<Order>((from, to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,ordem_sequencia', { count: 'exact' }).eq('empresa_id', companyId).not('maquina_id', 'is', null).order('ordem_sequencia', { ascending: true, nullsFirst: false }).range(from, to))
    ])
    const productIds = [...new Set(orderRows.map(row => row.produto_id).filter((id): id is string => Boolean(id)))]
    const products = productIds.length ? await fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo', { count: 'exact' }).eq('empresa_id', companyId).in('id', productIds).range(from, to)) : []
    setEmpresaId(companyId)
    setMachines(machineRows)
    setOrders(orderRows)
    setProductCodes(Object.fromEntries(products.map(product => [product.id, product.codigo])))
  }

  useEffect(() => { void load().catch(cause => setError(cause instanceof Error ? cause.message : 'Falha ao carregar o sequenciamento.')) }, [])

  const columns = useMemo(() => machines.map(machine => ({ machine, ops: orders.filter(order => order.maquina_id === machine.id).sort((a, b) => (a.ordem_sequencia ?? 999999) - (b.ordem_sequencia ?? 999999)) })), [machines, orders])

  const move = async (op: Order, delta: number) => {
    const column = columns.find(item => item.machine.id === op.maquina_id)
    if (!column || !empresaId || busyId) return
    const currentIndex = column.ops.findIndex(item => item.id === op.id)
    const nextIndex = currentIndex + delta
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= column.ops.length) return
    const current = column.ops[currentIndex]
    const next = column.ops[nextIndex]
    let currentUpdated = false
    let nextUpdated = false
    setBusyId(op.id)
    setError('')
    try {
      const first = await supabase.from('erp_ordens_producao').update({ ordem_sequencia: nextIndex + 1 }).eq('id', current.id).eq('empresa_id', empresaId).eq('maquina_id', column.machine.id)
      if (first.error) throw first.error
      currentUpdated = true
      const second = await supabase.from('erp_ordens_producao').update({ ordem_sequencia: currentIndex + 1 }).eq('id', next.id).eq('empresa_id', empresaId).eq('maquina_id', column.machine.id)
      if (second.error) throw second.error
      nextUpdated = true
      await load()
    } catch (cause) {
      if (currentUpdated && !nextUpdated) {
        const rollback = await supabase.from('erp_ordens_producao').update({ ordem_sequencia: currentIndex + 1 }).eq('id', current.id).eq('empresa_id', empresaId).eq('maquina_id', column.machine.id)
        setError(rollback.error ? 'Falha parcial no sequenciamento e a reversão também falhou. Atualize a fila e confira as posições antes de repetir.' : 'A segunda atualização falhou; a posição anterior foi restaurada. Atualize a fila antes de tentar novamente.')
      } else {
        setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a sequência. Atualize e confira a fila antes de repetir.')
      }
    } finally {
      setBusyId(null)
    }
  }

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900">
    <div className="mx-auto max-w-[1700px]">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <div><p className="text-[10px] font-semibold text-sky-700">PCP › OPERAÇÕES › SEQUENCIAMENTO LINEAR</p><h1 className="text-lg font-semibold">Sequenciamento por Work Center</h1></div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => void load().catch(cause => setError(cause instanceof Error ? cause.message : 'Falha ao atualizar.'))} className="h-[30px] rounded-[2px] border bg-white px-3 text-[10px]"><RefreshCw className="mr-1 inline" size={13} /> Recompor sequência</button>
          <button type="button" onClick={() => window.print()} className="h-[30px] rounded-[2px] bg-slate-800 px-3 text-[10px] text-white"><Download className="mr-1 inline" size={13} /> Exportar / imprimir</button>
        </div>
      </header>
      {error && <div role="alert" className="my-3 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</div>}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {columns.map(column => <section key={column.machine.id} className="rounded-[2px] border border-slate-200 bg-white">
          <div className="border-b bg-slate-100 p-3"><h2 className="text-[11px] font-semibold">WORK CENTER • {column.machine.codigo}</h2><p className="text-[10px] text-slate-600">{column.machine.nome}</p></div>
          {column.ops.length ? column.ops.map((order, index) => <div key={order.id} className="flex min-h-[42px] items-center gap-2 border-b px-2 py-1">
            <div className="min-w-0 flex-1"><b className="text-[10px]">Posição {index + 1}: OP-{order.numero_op}</b><span className="ml-2 text-[10px] text-slate-600">{productCodes[order.produto_id ?? ''] ?? 'Produto'}</span><div className="text-[9px] text-slate-500">{order.status}</div></div>
            <button type="button" disabled={index === 0 || busyId !== null} onClick={() => void move(order, -1)} className="rounded-[2px] border px-2 py-1 text-[10px] disabled:opacity-30" aria-label={'Mover OP ' + order.numero_op + ' para cima'}>↑</button>
            <button type="button" disabled={index === column.ops.length - 1 || busyId !== null} onClick={() => void move(order, 1)} className="rounded-[2px] border px-2 py-1 text-[10px] disabled:opacity-30" aria-label={'Mover OP ' + order.numero_op + ' para baixo'}>↓</button>
          </div>) : <div className="p-5 text-center text-[10px] text-slate-500">Nenhuma OP em fila.</div>}
        </section>)}
      </div>
    </div>
  </main>
}