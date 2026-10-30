import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, RefreshCw, Shuffle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Machine = { id: string; codigo: string; nome: string }
type Order = { id: string; numero_op: string | null; produto_id: string | null; status: string }
type Slot = { id: string; maquina_id: string; ordem_producao_id: string; molde_id: string | null; quantidade_programada: number; lote_producao: string | null; data_hora_inicio: string; data_hora_fim: string; status: string }
type Product = { id: string; codigo: string; nome: string }

const mondayOf = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
const dayMs = 24 * 60 * 60 * 1000
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function PCPSequenciamento() {
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [machineFilter, setMachineFilter] = useState('TODAS')
  const endWeek = useMemo(() => new Date(week.getTime() + 7 * dayMs), [week])

  const load = useCallback(async () => {
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const [machineResult, orderResult, productResult, slotResult] = await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', empresaId).eq('ativo', true).order('codigo'),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status').eq('empresa_id', empresaId).order('numero_op', { ascending: false }),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', empresaId).order('codigo'),
        supabase.from('pcp_agenda_maquinas').select('id,maquina_id,ordem_producao_id,molde_id,quantidade_programada,lote_producao,data_hora_inicio,data_hora_fim,status').eq('empresa_id', empresaId).gte('data_hora_inicio', week.toISOString()).lt('data_hora_inicio', endWeek.toISOString()).neq('status', 'cancelada').order('maquina_id').order('data_hora_inicio'),
      ])
      const failure = machineResult.error ?? orderResult.error ?? productResult.error ?? slotResult.error
      if (failure) throw failure
      setMachines((machineResult.data ?? []) as Machine[])
      setOrders((orderResult.data ?? []) as Order[])
      setProducts((productResult.data ?? []) as Product[])
      setSlots((slotResult.data ?? []) as Slot[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o sequenciamento real.')
      setMachines([])
      setOrders([])
      setProducts([])
      setSlots([])
    }
  }, [week, endWeek])

  useEffect(() => { void load() }, [load])

  const machineMap = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines])
  const orderMap = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders])
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const visibleSlots = slots.filter((slot) => machineFilter === 'TODAS' || slot.maquina_id === machineFilter)

  const reorder = async (slot: Slot, other: Slot | undefined) => {
    if (!other) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.rpc('erp_pcp_reordenar_agenda_maquinas', { p_agenda_id: slot.id, p_vizinha_id: other.id })
      if (result.error) throw result.error
      setNotice('Sequenciamento atualizado pelo procedimento transacional do banco.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível reordenar a programação.')
    } finally {
      setBusy(false)
    }
  }

  const rowsByMachine = useMemo(() => {
    const result = new Map<string, Slot[]>()
    for (const slot of visibleSlots) {
      const rows = result.get(slot.maquina_id) ?? []
      rows.push(slot)
      result.set(slot.maquina_id, rows)
    }
    for (const rows of result.values()) rows.sort((a, b) => a.data_hora_inicio.localeCompare(b.data_hora_inicio))
    return result
  }, [visibleSlots])

  return (
    <section className="space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b50] text-white"><Shuffle size={16} /></span>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#2d8db8]">Manufatura / PCP</p><h2 className="text-sm font-extrabold">Sequenciamento de produção</h2><p className="text-[11px] text-slate-500">Fila real por máquina · reordenação transacional no banco.</p></div>
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold" onClick={() => setWeek((current) => new Date(current.getTime() - 7 * dayMs))}>← Semana</button>
          <button type="button" className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold" onClick={() => setWeek(mondayOf(new Date()))}>Semana atual</button>
          <button type="button" className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold" onClick={() => setWeek((current) => new Date(current.getTime() + 7 * dayMs))}>Semana →</button>
          <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#123b50] px-3 text-xs font-bold text-white disabled:opacity-50" onClick={() => void load()} disabled={busy}><RefreshCw size={12} /> Atualizar</button>
        </div>
      </header>
      <label className="flex max-w-sm items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Máquina
        <select className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal normal-case text-slate-800" value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)}><option value="TODAS">Todas as máquinas</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.codigo} · {machine.nome}</option>)}</select>
      </label>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[900px] border-collapse text-xs">
          <thead className="bg-slate-800 text-white"><tr><th className="p-2 text-left">Máquina</th><th className="p-2 text-left">OP</th><th className="p-2 text-left">Produto</th><th className="p-2 text-left">Início / fim</th><th className="p-2 text-right">Quantidade</th><th className="p-2 text-left">Status</th><th className="p-2 text-center">Ordem</th></tr></thead>
          <tbody>{visibleSlots.map((slot) => {
            const sameMachine = rowsByMachine.get(slot.maquina_id) ?? []
            const index = sameMachine.findIndex((row) => row.id === slot.id)
            const order = orderMap.get(slot.ordem_producao_id)
            const productId = order?.produto_id
            const product = productId ? productMap.get(productId) : undefined
            return <tr key={slot.id} className="border-t border-slate-100 even:bg-slate-50">
              <td className="p-2 font-bold">{machineMap.get(slot.maquina_id)?.codigo ?? '—'}<span className="block font-normal text-slate-500">{machineMap.get(slot.maquina_id)?.nome ?? 'Máquina'}</span></td>
              <td className="p-2 font-bold">{order?.numero_op ?? slot.ordem_producao_id.slice(0, 8)}</td>
              <td className="p-2">{product ? product.codigo + ' · ' + product.nome : 'Produto não vinculado'}</td>
              <td className="p-2">{dateTime(slot.data_hora_inicio)}<span className="block text-slate-500">{dateTime(slot.data_hora_fim)}</span></td>
              <td className="p-2 text-right tabular-nums">{Number(slot.quantidade_programada).toLocaleString('pt-BR')}</td>
              <td className="p-2">{slot.status}</td>
              <td className="p-2"><div className="flex justify-center gap-1"><button type="button" title="Mover para cima" aria-label="Mover programação para cima" disabled={busy || index <= 0} onClick={() => void reorder(slot, sameMachine[index - 1])} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 disabled:opacity-30"><ArrowUp size={13} /></button><button type="button" title="Mover para baixo" aria-label="Mover programação para baixo" disabled={busy || index < 0 || index >= sameMachine.length - 1} onClick={() => void reorder(slot, sameMachine[index + 1])} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 disabled:opacity-30"><ArrowDown size={13} /></button></div></td>
            </tr>
          })}{!visibleSlots.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma programação encontrada nesta semana para a empresa da sessão.</td></tr>}</tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500">A reordenação usa RPC existente e depende das validações de capacidade/RLS do banco. Não são criadas programações fictícias.</p>
    </section>
  )
}
