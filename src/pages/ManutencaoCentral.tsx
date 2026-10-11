import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, CalendarDays, ClipboardList, Gauge, RefreshCw, Settings2, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Machine = { id: string; codigo: string; nome: string; status: string }
type WorkOrder = { id: string; ativo_id: string; tipo: string; status: string; prioridade: string; data_prevista: string | null }

const modules = [
  { title: 'Ordens de serviço', description: 'Abrir, acompanhar e concluir O.S. com laudo, causa raiz e solução.', href: '/manutencao/ordens', Icon: ClipboardList },
  { title: 'Cronograma preventivo', description: 'Consultar as preventivas programadas por data, máquina e situação.', href: '/manutencao/cronograma', Icon: CalendarDays },
  { title: 'Indicadores de confiabilidade', description: 'Acompanhar paradas, MTTR e MTBF a partir dos registros reais.', href: '/manutencao/indicadores', Icon: Gauge },
  { title: 'Máquinas e capacidade', description: 'Acessar a programação industrial e a disponibilidade de máquinas.', href: '/pcp', Icon: Settings2 },
  { title: 'Paradas de produção', description: 'Consultar ocorrências e paradas registradas no fluxo de produção.', href: '/pcp/paradas', Icon: Activity },
  { title: 'Estoque de componentes', description: 'Consultar peças e componentes usados na execução das O.S.', href: '/estoque', Icon: Wrench },
]

export default function ManutencaoCentral() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [orders, setOrders] = useState<WorkOrder[]>([])
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
          .select('id,codigo,nome,status', { count: 'exact' })
          .eq('empresa_id', empresaId).order('codigo').range(from, to)),
        fetchAllPages<WorkOrder>((from, to) => supabase.from('erp_manutencao_ordens')
          .select('id,ativo_id,tipo,status,prioridade,data_prevista', { count: 'exact' })
          .eq('empresa_id', empresaId).order('data_prevista', { ascending: true }).range(from, to)),
      ])
      setMachines(machineRows)
      setOrders(orderRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a central de manutenção.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      machines: machines.length,
      open: orders.filter(row => !['CONCLUIDA', 'CANCELADA'].includes(row.status.toUpperCase())).length,
      overdue: orders.filter(row => row.data_prevista && row.data_prevista < today && !['CONCLUIDA', 'CANCELADA'].includes(row.status.toUpperCase())).length,
      preventive: orders.filter(row => row.tipo.toUpperCase() === 'PREVENTIVA' && !['CONCLUIDA', 'CANCELADA'].includes(row.status.toUpperCase())).length,
    }
  }, [machines, orders])

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <header className="border-b border-[#D8E8EE] bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-[#E7F4F8] text-[#2D8DB8]"><Wrench size={22} /></div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2D8DB8]">ERP INDUSTRIAL / TPM</p>
            <h1 className="text-[18px] font-semibold leading-6">Central de Manutenção</h1>
            <p className="text-[11px] text-slate-500">Planejamento preventivo, ordens de serviço e confiabilidade dos equipamentos.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className="ml-auto inline-flex h-[30px] items-center gap-2 rounded-[2px] border border-[#B8D5E0] bg-white px-3 text-[10px] font-bold text-[#17445A] disabled:opacity-50"><RefreshCw size={13} className={busy ? 'animate-spin' : ''}/> ATUALIZAR</button>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] space-y-4 px-5 py-5">
        {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">{error}</div>}
        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <Kpi label="Máquinas cadastradas" value={stats.machines} />
          <Kpi label="Ordens em aberto" value={stats.open} />
          <Kpi label="Preventivas pendentes" value={stats.preventive} />
          <Kpi label="Ordens atrasadas" value={stats.overdue} alert={stats.overdue > 0} />
        </section>
        <section className="border border-[#D8E8EE] bg-white">
          <div className="flex items-center justify-between border-b border-[#D8E8EE] px-4 py-3">
            <div><h2 className="text-[12px] font-semibold">Áreas da manutenção</h2><p className="mt-0.5 text-[10px] text-slate-500">Acessos do módulo — sem atalhos para módulos alheios.</p></div>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[#2D8DB8]">TPM / O.S.</span>
          </div>
          <div className="grid grid-cols-1 gap-px bg-[#D8E8EE] sm:grid-cols-2 xl:grid-cols-3">
            {modules.map(({ title, description, href, Icon }) => (
              <Link key={href} to={href} className="group flex min-h-[100px] items-start gap-3 bg-white p-4 outline-none transition-colors hover:bg-[#F4FBFD] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2D8DB8]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#CDE4EC] bg-[#EAF6FA] text-[#2D8DB8]"><Icon size={17}/></span>
                <span className="min-w-0 flex-1"><strong className="block text-[11px] font-semibold text-[#123B50]">{title}</strong><span className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</span></span>
                <ArrowRight size={14} className="mt-1 shrink-0 text-[#2D8DB8] transition-transform group-hover:translate-x-0.5"/>
              </Link>
            ))}
          </div>
        </section>
        <section className="border border-[#D8E8EE] bg-white">
          <div className="flex items-center justify-between border-b border-[#D8E8EE] px-4 py-3"><h2 className="text-[12px] font-semibold">Próximas ordens programadas</h2><Link to="/manutencao/cronograma" className="text-[10px] font-bold text-[#2D8DB8] hover:underline">ABRIR CRONOGRAMA</Link></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-[#EAF4F7] text-[9px] uppercase tracking-wide text-[#17445A]"><tr><th className="px-3 py-2">Data prevista</th><th className="px-3 py-2">Máquina</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Prioridade</th><th className="px-3 py-2">Situação</th></tr></thead><tbody className="text-[10px]">{orders.filter(row => row.data_prevista && !['CONCLUIDA','CANCELADA'].includes(row.status.toUpperCase())).slice(0, 8).map(row => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2 tabular-nums">{row.data_prevista}</td><td className="px-3 py-2">{machines.find(machine => machine.id === row.ativo_id)?.codigo ?? 'Máquina não identificada'}</td><td className="px-3 py-2">{row.tipo}</td><td className="px-3 py-2">{row.prioridade}</td><td className="px-3 py-2">{row.status}</td></tr>)}{orders.filter(row => row.data_prevista && !['CONCLUIDA','CANCELADA'].includes(row.status.toUpperCase())).length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Nenhuma ordem programada encontrada para esta empresa.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </main>
  )
}

function Kpi({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <article className={'border bg-white px-4 py-3 ' + (alert ? 'border-amber-300' : 'border-[#D8E8EE]')}><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className={'mt-1 block text-[23px] font-semibold tabular-nums ' + (alert ? 'text-amber-700' : 'text-[#17445A]')}>{value}</strong></article>
}
