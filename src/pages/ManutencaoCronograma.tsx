import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Machine = { id: string; codigo: string; nome: string }
type WorkOrder = { id: string; numero_os: string | null; ativo_id: string; tipo: string; descricao: string; prioridade: string; status: string; data_prevista: string | null }

const PAGE_SIZE = 25
const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#B9E1ED]'

export default function ManutencaoCronograma() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('TODOS')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(company.data)
      const [machineRows, orderRows] = await Promise.all([
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas')
          .select('id,codigo,nome', { count: 'exact' }).eq('empresa_id', empresaId).order('codigo').range(from, to)),
        fetchAllPages<WorkOrder>((from, to) => supabase.from('erp_manutencao_ordens')
          .select('id,numero_os,ativo_id,tipo,descricao,prioridade,status,data_prevista', { count: 'exact' })
          .eq('empresa_id', empresaId).order('data_prevista', { ascending: true }).range(from, to)),
      ])
      setMachines(machineRows)
      setOrders(orderRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o cronograma de manutenção.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return orders.filter(row => {
      const machine = machines.find(item => item.id === row.ativo_id)
      const matchesMonth = !month || (row.data_prevista ?? '').startsWith(month)
      const matchesStatus = status === 'TODOS' || row.status.toUpperCase() === status
      const text = [row.numero_os ?? '', row.tipo, row.descricao, row.prioridade, row.status, machine?.codigo ?? '', machine?.nome ?? ''].join(' ').toLocaleLowerCase('pt-BR')
      return matchesMonth && matchesStatus && (!term || text.includes(term))
    })
  }, [orders, machines, month, search, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)) }, [pageCount])

  const monthOrders = filtered.filter(row => row.tipo.toUpperCase() === 'PREVENTIVA')
  const overdue = filtered.filter(row => row.data_prevista && row.data_prevista < new Date().toISOString().slice(0, 10) && !['CONCLUIDA', 'CANCELADA'].includes(row.status.toUpperCase()))

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <header className="border-b border-[#D8E8EE] bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-5 py-3">
          <Link to="/manutencao" aria-label="Voltar à central de manutenção" className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-3 text-[10px] font-semibold hover:bg-slate-50"><ArrowLeft size={13}/> CENTRAL</Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[#E7F4F8] text-[#2D8DB8]"><CalendarDays size={18}/></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2D8DB8]">MANUTENÇÃO / PLANEJAMENTO</p><h1 className="text-[15px] font-semibold">Cronograma de manutenção</h1></div>
          <div className="ml-auto flex gap-2"><Link to="/manutencao/ordens" className="flex h-[30px] items-center rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white">ORDENS DE SERVIÇO</Link><button type="button" onClick={() => void load()} disabled={busy} className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 px-3 text-[10px] font-semibold disabled:opacity-50"><RefreshCw size={13} className={busy ? 'animate-spin' : ''}/> ATUALIZAR</button></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] space-y-3 px-5 py-4">
        {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-[10px] text-rose-800">{error}</div>}
        <section className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          <Kpi label="Ordens no filtro" value={filtered.length}/>
          <Kpi label="Preventivas no filtro" value={monthOrders.length}/>
          <Kpi label="Atrasadas no filtro" value={overdue.length} alert={overdue.length > 0}/>
        </section>
        <section className="border border-[#D8E8EE] bg-white">
          <div className="grid grid-cols-1 gap-3 border-b border-[#D8E8EE] p-3 sm:grid-cols-3">
            <label className="grid gap-1 text-[9px] font-semibold uppercase text-slate-600">Mês previsto<input aria-label="Filtrar por mês" className={input} type="month" value={month} onChange={event => { setMonth(event.target.value); setPage(0) }}/></label>
            <label className="grid gap-1 text-[9px] font-semibold uppercase text-slate-600">Situação<select className={input} value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}><option value="TODOS">Todas as situações</option><option value="ABERTA">Aberta</option><option value="EM_EXECUCAO">Em execução</option><option value="CONCLUIDA">Concluída</option><option value="CANCELADA">Cancelada</option></select></label>
            <label className="grid gap-1 text-[9px] font-semibold uppercase text-slate-600">Pesquisar máquina / ordem<input className={input} value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} placeholder="Código, descrição, tipo, prioridade…"/></label>
          </div>
          <div className="flex items-center gap-2 border-b border-[#D8E8EE] bg-[#F8FCFD] px-3 py-2 text-[10px] text-slate-600"><Search size={13}/><span>Exibindo ordens reais registradas no ERP. O cronograma não cria máquinas ou periodicidades fictícias.</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-[#EAF4F7] text-[9px] uppercase tracking-wide text-[#17445A]"><tr><th className="px-3 py-2">Data prevista</th><th className="px-3 py-2">O.S.</th><th className="px-3 py-2">Máquina</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Descrição / atividade</th><th className="px-3 py-2">Prioridade</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="text-[10px]">{visible.map(row => <tr key={row.id} className="border-t border-slate-100 hover:bg-[#F4FBFD]"><td className="whitespace-nowrap px-3 py-2 tabular-nums">{row.data_prevista ?? '—'}</td><td className="whitespace-nowrap px-3 py-2 font-semibold">{row.numero_os ?? row.id.slice(0, 8)}</td><td className="px-3 py-2">{machines.find(item => item.id === row.ativo_id)?.codigo ?? '—'}<span className="ml-1 text-slate-500">{machines.find(item => item.id === row.ativo_id)?.nome ?? ''}</span></td><td className="px-3 py-2">{row.tipo}</td><td className="max-w-[340px] px-3 py-2">{row.descricao}</td><td className="px-3 py-2">{row.prioridade}</td><td className="px-3 py-2">{row.status}</td></tr>)}{visible.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhuma ordem encontrada para os filtros selecionados.</td></tr>}</tbody></table></div>
          <nav aria-label="Paginação do cronograma" className="flex items-center justify-between gap-3 border-t border-[#D8E8EE] px-3 py-2 text-[10px]"><span>{filtered.length} registro(s) · página {page + 1} de {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))} className="h-[30px] rounded-[2px] border border-slate-300 px-3 disabled:opacity-40">ANTERIOR</button><button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} className="h-[30px] rounded-[2px] border border-slate-300 px-3 disabled:opacity-40">PRÓXIMA</button></div></nav>
        </section>
      </div>
    </main>
  )
}

function Kpi({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <article className={'border bg-white px-4 py-3 ' + (alert ? 'border-amber-300' : 'border-[#D8E8EE]')}><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className={'mt-1 block text-[22px] font-semibold tabular-nums ' + (alert ? 'text-amber-700' : 'text-[#17445A]')}>{value}</strong></article>
}
