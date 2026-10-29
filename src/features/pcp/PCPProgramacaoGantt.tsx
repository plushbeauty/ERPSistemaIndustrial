import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Machine = { id: string; codigo: string; nome: string; status: string | null }
type Program = {
  id: string
  ordem_producao_id: string | null
  maquina_id: string | null
  produto_id: string | null
  inicio_planejado: string
  fim_planejado: string
  quantidade_planejada: number
  quantidade_produzida: number | null
  status: string
}
type Order = { id: string; numero_op: string; produto_id: string | null }
type Product = { id: string; codigo: string; nome: string }

const dayMs = 24 * 60 * 60 * 1000
const mondayOf = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
const formatDate = (value: Date) => value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const formatTime = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const statusTone = (status: string) => {
  const value = status.toLocaleLowerCase('pt-BR')
  if (value.includes('conclu')) return 'border-emerald-300 bg-emerald-100 text-emerald-900'
  if (value.includes('exec')) return 'border-sky-300 bg-sky-100 text-sky-900'
  if (value.includes('cancel')) return 'border-slate-300 bg-slate-100 text-slate-500'
  return 'border-amber-300 bg-amber-100 text-amber-900'
}

export default function PCPProgramacaoGantt() {
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const [machines, setMachines] = useState<Machine[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const start = week
  const end = new Date(week.getTime() + 7 * dayMs)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const [machineResult, programResult, orderResult, productResult] = await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('empresa_id', empresaId).order('codigo'),
        supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,status').eq('empresa_id', empresaId).lt('inicio_planejado', end.toISOString()).gt('fim_planejado', start.toISOString()).neq('status', 'cancelada').order('inicio_planejado'),
        supabase.from('erp_ordens_producao').select('id,numero_op,produto_id').eq('empresa_id', empresaId),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', empresaId),
      ])
      const failed = machineResult.error ?? programResult.error ?? orderResult.error ?? productResult.error
      if (failed) throw failed
      setMachines((machineResult.data ?? []) as Machine[])
      setPrograms((programResult.data ?? []) as Program[])
      setOrders((orderResult.data ?? []) as Order[])
      setProducts((productResult.data ?? []) as Product[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a programação real do PCP.')
      setMachines([])
      setPrograms([])
      setOrders([])
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => { void load() }, [load])

  const orderMap = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders])
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const programsByMachine = useMemo(() => {
    const result = new Map<string, Program[]>()
    for (const program of programs) {
      if (!program.maquina_id) continue
      const list = result.get(program.maquina_id) ?? []
      list.push(program)
      result.set(program.maquina_id, list)
    }
    return result
  }, [programs])
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * dayMs))

  return (
    <section className="space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b50] text-white"><CalendarDays size={16} /></span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2d8db8]">Manufatura / PCP</p>
          <h2 className="text-sm font-extrabold">Programação de máquinas · Gantt semanal</h2>
          <p className="text-[11px] text-slate-500">Programações reais por máquina, OP e janela planejada.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button type="button" className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold" onClick={() => setWeek((current) => new Date(current.getTime() - 7 * dayMs))}>← Semana</button>
          <button type="button" className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold" onClick={() => setWeek(mondayOf(new Date()))}>Semana atual</button>
          <button type="button" className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold" onClick={() => setWeek((current) => new Date(current.getTime() + 7 * dayMs))}>Semana →</button>
          <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#123b50] px-3 text-xs font-bold text-white disabled:opacity-50" onClick={() => void load()} disabled={loading}><RefreshCw size={12} /> Atualizar</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
      <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-slate-600" aria-label="Legenda de status">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Planejada / confirmada</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" />Em execução</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Concluída</span>
      </div>

      {loading ? <p role="status" className="p-8 text-center text-xs text-slate-500">Carregando programação do Supabase…</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[1050px]">
            <div className="grid grid-cols-[190px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
              <div className="p-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Máquina / recurso</div>
              {days.map((day) => <div key={day.toISOString()} className="border-l border-slate-200 p-2 text-center"><div className="text-[10px] font-bold text-slate-700">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div><div className="text-[10px] text-slate-500">{formatDate(day)}</div></div>)}
            </div>
            {machines.map((machine) => {
              const rows = programsByMachine.get(machine.id) ?? []
              return <div key={machine.id} className="grid min-h-[76px] grid-cols-[190px_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0">
                <div className="flex flex-col justify-center border-r border-slate-200 bg-white px-3 py-2"><span className="text-xs font-extrabold">{machine.codigo}</span><span className="text-[10px] text-slate-500">{machine.nome}</span><span className="text-[9px] uppercase text-slate-400">{machine.status ?? 'Status não informado'}</span></div>
                <div className="relative col-span-7 grid grid-cols-7">
                  {days.map((day) => <div key={day.toISOString()} className="border-r border-slate-100 last:border-r-0" />)}
                  {rows.map((program) => {
                    const from = new Date(program.inicio_planejado).getTime()
                    const to = new Date(program.fim_planejado).getTime()
                    const left = Math.max(0, (from - start.getTime()) / (7 * dayMs)) * 100
                    const right = Math.min(1, (to - start.getTime()) / (7 * dayMs)) * 100
                    const width = Math.max(1.8, right - left)
                    const order = program.ordem_producao_id ? orderMap.get(program.ordem_producao_id) : undefined
                    const product = program.produto_id ? productMap.get(program.produto_id) : order?.produto_id ? productMap.get(order.produto_id) : undefined
                    return <div key={program.id} title={`OP ${order?.numero_op ?? 'não vinculada'} · ${formatTime(program.inicio_planejado)} – ${formatTime(program.fim_planejado)} · Qtd. ${program.quantidade_planejada}`} className={`absolute top-2 flex min-h-8 flex-col justify-center overflow-hidden rounded-md border px-1.5 py-1 text-[9px] leading-tight ${statusTone(program.status)}`} style={{ left: `${left}%`, width: `${width}%` }}>
                      <span className="truncate font-extrabold">{order?.numero_op ? `OP ${order.numero_op}` : 'Programação'}</span>
                      <span className="truncate">{product ? `${product.codigo} · ${product.nome}` : 'Produto não vinculado'} · {Number(program.quantidade_planejada).toLocaleString('pt-BR')}</span>
                    </div>
                  })}
                </div>
              </div>
            })}
            {!machines.length && <p className="p-8 text-center text-xs text-slate-500">Nenhuma máquina cadastrada para a empresa da sessão.</p>}
            {!!machines.length && !programs.length && <p className="border-t border-slate-100 p-6 text-center text-xs text-slate-500">Nenhuma programação encontrada para esta semana.</p>}
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-500">Consulta somente leitura. Para gravar ou reordenar horários, utilize a rotina transacional de agenda/sequenciamento já cadastrada.</p>
    </section>
  )
}
