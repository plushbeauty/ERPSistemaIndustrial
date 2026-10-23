/**
 * SYSNQRA ERP — Centro de Comando Industrial
 * Revisão: 2026-10-23
 * Base visual autorizada pelo usuário (código Lovable recebido em 2026-10-23).
 * Correções: removidos dados demonstrativos; consultas sem empresa não são executadas;
 * indicadores derivados somente de registros retornados pelo Supabase/RLS.
 * BLOQUEIO DE APROVAÇÃO: não alterar este arquivo sem autorização expressa do usuário.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2, Factory,
  FileText, Maximize2, Minus, Package, Plus, RefreshCw, Search,
  ShieldCheck, Wrench, X
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { supabase } from '../lib/supabaseClient'

type Props = { onNavigate: (route: string) => void }
type Machine = { id: string; codigo: string; nome: string; status: string; tipo?: string | null }
type OP = { id: string; numero_op: string | number; produto_id: string | null; maquina_id: string | null; status: string; quantidade_planejada: number | null; quantidade: number | null; created_at: string | null; criado_em?: string | null }
type Pointing = { id: string; ordem_producao_id: string | null; maquina_id: string | null; quantidade_planejada: number | null; quantidade_boa: number | null; quantidade_refugada: number | null; created_at: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string }
type RPNC = { id: string; status: string | null }
type MachineView = Machine & { visualStatus: 'running' | 'maintenance' | 'stoppage'; opAtual?: string }

const number = (value: unknown) => {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}
const fmt = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
const localDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const statusKind = (value: string): MachineView['visualStatus'] => {
  const status = value.toLowerCase()
  if (status.includes('manu') || status.includes('preventiva') || status.includes('setup')) return 'maintenance'
  if (status.includes('par') || status.includes('interrup') || status.includes('defeito') || status.includes('inativ')) return 'stoppage'
  return 'running'
}
const statusLabel = (value: string) => {
  const status = value.toLowerCase()
  if (status.includes('conc') || status.includes('final')) return 'Concluída'
  if (status.includes('exec') || status.includes('prod') || status.includes('inic')) return 'Em execução'
  if (status.includes('cancel')) return 'Cancelada'
  if (status.includes('manu') || status.includes('prevent')) return 'Manutenção'
  if (status.includes('par') || status.includes('interrup') || status.includes('defeito')) return 'Parada'
  return value || 'Sem status'
}
const isDone = (status: string) => /conc|finaliz|encerrad/i.test(status)
const isRunning = (status: string) => /exec|produ|inici|andamento/i.test(status)

export default function IndustrialCommandDashboard({ onNavigate }: Props) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [pointings, setPointings] = useState<Pointing[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [rpncs, setRpncs] = useState<RPNC[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [clock, setClock] = useState(new Date())
  const [zoom, setZoom] = useState(100)
  const [selectedMachine, setSelectedMachine] = useState<MachineView | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authData.user) throw new Error('Sessão não autenticada. Entre novamente no ERP.')

        const { data: profile, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('empresa_id,is_master,nivel_admin,perfil')
          .eq('auth_user_id', authData.user.id)
          .eq('ativo', true)
          .maybeSingle()
        if (profileError) throw profileError

        const isMaster = profile?.is_master === true &&
          Number(profile?.nivel_admin ?? 0) === 100 &&
          String(profile?.perfil ?? '').toUpperCase() === 'MASTER' &&
          profile?.empresa_id === null

        // Master sem empresa selecionada não pode consultar dados de todas as empresas.
        if (isMaster || !profile?.empresa_id) {
          if (alive) {
            setMachines([])
            setOps([])
            setPointings([])
            setPrograms([])
            setRpncs([])
            setError(isMaster
              ? 'Selecione uma empresa no contexto administrativo para visualizar indicadores operacionais.'
              : 'O perfil ativo não possui empresa vinculada. Verifique o cadastro e as permissões.')
          }
          return
        }

        const empresaId = profile.empresa_id
        const [machineRes, opRes, pointingRes, programRes, rpncRes] = await Promise.all([
          supabase.from('erp_maquinas').select('id,codigo,nome,status,tipo').eq('empresa_id', empresaId).eq('ativo', true).order('codigo').limit(500),
          supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,quantidade_planejada,quantidade,created_at').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(500),
          supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_planejada,quantidade_boa,quantidade_refugada,created_at').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(1000),
          supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status').eq('empresa_id', empresaId).neq('status', 'cancelada').limit(1000),
          supabase.from('erp_rpnc').select('id,status').eq('empresa_id', empresaId).limit(1000)
        ])
        const firstError = [machineRes, opRes, pointingRes, programRes, rpncRes].find(result => result.error)?.error
        if (firstError) throw firstError
        if (!alive) return
        setMachines((machineRes.data ?? []) as Machine[])
        setOps((opRes.data ?? []) as OP[])
        setPointings((pointingRes.data ?? []) as Pointing[])
        setPrograms((programRes.data ?? []) as Program[])
        setRpncs((rpncRes.data ?? []) as RPNC[])
      } catch (cause) {
        console.error('[IndustrialCommandDashboard] Falha ao carregar dados reais:', cause)
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados do ERP.')
      } finally {
        if (alive) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const today = localDateKey(clock)
  const todayPointings = useMemo(
    () => pointings.filter(item => localDateKey(new Date(item.created_at ?? '')) === today && item.created_at),
    [pointings, today]
  )
  const producedToday = useMemo(
    () => todayPointings.reduce((total, item) => total + number(item.quantidade_boa), 0),
    [todayPointings]
  )
  const plannedToday = useMemo(
    () => programs.filter(item => item.inicio_planejado && localDateKey(new Date(item.inicio_planejado)) === today)
      .reduce((total, item) => total + number(item.quantidade_planejada), 0),
    [programs, today]
  )
  const productionPercent = plannedToday > 0 ? Math.min(100, Math.round(producedToday / plannedToday * 100)) : 0
  const opCounts = useMemo(() => ({
    waiting: ops.filter(item => !isDone(item.status) && !isRunning(item.status) && !/cancel/i.test(item.status)).length,
    running: ops.filter(item => isRunning(item.status) && !isDone(item.status)).length,
    doneToday: ops.filter(item => isDone(item.status) && localDateKey(new Date(item.created_at ?? '')) === today && item.created_at).length
  }), [ops, today])
  const qualityData = useMemo(() => {
    const good = todayPointings.reduce((total, item) => total + number(item.quantidade_boa), 0)
    const scrap = todayPointings.reduce((total, item) => total + number(item.quantidade_refugada), 0)
    const total = good + scrap
    return [
      { name: 'Boas', quantidade: good },
      { name: 'Refugadas', quantidade: scrap }
    ].filter(item => item.quantidade > 0).map(item => ({
      ...item,
      taxa: total > 0 ? Math.round(item.quantidade / total * 1000) / 10 : 0
    }))
  }, [todayPointings])
  const qualityScrapRate = useMemo(() => {
    const good = todayPointings.reduce((total, item) => total + number(item.quantidade_boa), 0)
    const scrap = todayPointings.reduce((total, item) => total + number(item.quantidade_refugada), 0)
    return good + scrap > 0 ? scrap / (good + scrap) * 100 : 0
  }, [todayPointings])
  const factoryMachines = useMemo<MachineView[]>(() => machines.map(machine => ({
    ...machine,
    visualStatus: statusKind(machine.status),
    opAtual: ops.find(op => op.maquina_id === machine.id && isRunning(op.status))?.numero_op.toString()
  })), [machines, ops])
  const activeRpncs = rpncs.filter(item => !/conc|encerr|fechad|cancel/i.test(item.status ?? ''))
  const programActive = programs.filter(item => !/conc|final|cancel/i.test(item.status)).length
  const refresh = () => {
    setRefreshing(true)
    setError('Para atualizar os dados, recarregue a página.')
    window.location.reload()
  }

  const card = 'bg-white border border-slate-200 rounded-[2px] shadow-sm'
  const heading = 'text-xs font-bold text-[#123B50] uppercase tracking-wide'
  const smallButton = 'h-[28px] px-2 border border-slate-300 rounded-[2px] text-[10px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1'

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-800">
      <header className={`${card} mb-3 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-7 bg-[#123B50] rounded-[1px]" />
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-[#123B50] tracking-wider uppercase">Uma fábrica inteira. Um único controle</h1>
            <p className="text-[10px] text-slate-500 font-medium">SYSNQRA ERP Industrial • Centro de Comando Operacional</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-rose-500' : loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {error ? 'Atenção' : loading ? 'Sincronizando' : 'Dados sincronizados'}
          </span>
          <button className={smallButton} onClick={refresh} disabled={refreshing} title="Atualizar dados">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </header>

      {error && <div role="alert" className="mb-3 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 rounded-[2px]">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
        <div className={`${card} md:col-span-4 p-3.5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={heading}>Produção de hoje</span>
            <span className="text-[10px] bg-sky-50 text-[#2D8DB8] font-bold px-1.5 py-0.5 border border-sky-200 rounded-[2px]">Apontamentos reais</span>
          </div>
          <div className="flex items-center gap-4 my-2">
            <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
              <svg className="-rotate-90 w-full h-full" viewBox="0 0 36 36" aria-label={`${productionPercent}% do planejado`}>
                <path stroke="#e2e8f0" strokeWidth="3.6" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path stroke="#2D8DB8" strokeDasharray={`${productionPercent}, 100`} strokeWidth="3.6" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute text-sm font-extrabold text-[#123B50]">{plannedToday > 0 ? `${productionPercent}%` : '—'}</span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">{fmt(producedToday)}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{plannedToday > 0 ? `Planejado: ${fmt(plannedToday)} un.` : 'Sem planejamento para hoje'}</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-[1px] overflow-hidden"><div className="bg-gradient-to-r from-[#2D8DB8] to-[#48B7C7] h-full" style={{ width: `${productionPercent}%` }} /></div>
        </div>

        <div className={`${card} md:col-span-4 p-3.5 flex flex-col`}>
          <div className="flex items-center justify-between mb-2"><span className={heading}>Qualidade • SGQ</span><span className="text-[10px] text-slate-500">Apontamentos de hoje</span></div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [fmt(value), 'Quantidade']} contentStyle={{ fontSize: 11, borderRadius: 2 }} />
                <Bar dataKey="quantidade" fill="#48B7C7" radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-auto border-t border-slate-100 pt-2 text-[11px] text-slate-600">
            Refugo: <strong className={qualityScrapRate > 2 ? 'text-rose-700' : 'text-emerald-700'}>{qualityData.length ? `${qualityScrapRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : 'Sem dados'}</strong>
          </p>
        </div>

        <div className={`${card} md:col-span-4 p-3.5`}>
          <div className="flex items-center justify-between mb-2"><span className={heading}>Ordens de produção • PCP</span><button onClick={() => onNavigate('/pcp/programacao')} className="text-[10px] text-[#2D8DB8] font-semibold hover:underline">Ver programação →</button></div>
          <div className="space-y-2">
            {[
              { label: 'Em espera', value: opCounts.waiting, style: 'bg-amber-100 text-amber-800' },
              { label: 'Em execução', value: opCounts.running, style: 'bg-emerald-100 text-emerald-800' },
              { label: 'Concluídas hoje', value: opCounts.doneToday, style: 'bg-sky-100 text-[#123B50]' }
            ].map(item => <div key={item.label} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 border border-slate-200/80 rounded-[2px]"><span className="text-xs text-slate-700">{item.label}</span><span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-[2px] ${item.style}`}>{item.value}</span></div>)}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">{ops.length} OP(s) carregada(s) • {programActive} programação(ões) ativa(s)</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
        <div className={`${card} md:col-span-8 flex flex-col`}>
          <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Factory size={15} className="text-[#123B50]" /><h2 className={heading}>Planta industrial • máquinas cadastradas</h2></div>
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-[2px] px-1 py-0.5">
              <button onClick={() => setZoom(value => Math.max(70, value - 10))} className="p-1 hover:bg-slate-100 rounded-[2px]" title="Diminuir zoom"><Minus size={12} /></button>
              <span className="text-[10px] font-mono font-bold px-1.5 min-w-[38px] text-center">{zoom}%</span>
              <button onClick={() => setZoom(value => Math.min(150, value + 10))} className="p-1 hover:bg-slate-100 rounded-[2px]" title="Aumentar zoom"><Plus size={12} /></button>
              <button onClick={() => setZoom(100)} className="p-1 ml-1 border-l border-slate-200 hover:bg-slate-100" title="Ajustar à tela"><Maximize2 size={12} /></button>
            </div>
          </div>
          <div className="relative h-[320px] bg-gradient-to-br from-[#f8fafc] via-[#e2e8f0]/40 to-[#f1f5f9] overflow-auto">
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '30px 30px', transform: `scale(${zoom / 100})`, transformOrigin: 'center', transition: 'transform .2s ease-out' }} />
            {factoryMachines.length ? <div className="relative min-w-[520px] h-full p-4" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center', transition: 'transform .2s ease-out' }}>
              {factoryMachines.map((machine, index) => {
                const left = 8 + (index % 4) * 27
                const top = 22 + Math.floor(index / 4) * 48
                const color = machine.visualStatus === 'running' ? 'bg-emerald-500 border-emerald-600' : machine.visualStatus === 'maintenance' ? 'bg-amber-500 border-amber-600' : 'bg-rose-500 border-rose-600'
                return <button key={machine.id} onClick={() => setSelectedMachine(machine)} className="absolute -translate-x-1/2 -translate-y-1/2 text-left" style={{ left: `${left}%`, top: `${top}%` }} aria-label={`Detalhes da máquina ${machine.codigo}`}>
                  <span className={`px-2 py-0.5 border rounded-[2px] text-[10px] font-mono font-bold text-white shadow-md inline-flex items-center gap-1.5 ${color}`}>{machine.codigo || 'S/C'}<span className="w-1.5 h-1.5 rounded-full bg-white" /></span>
                  <span className="w-20 min-h-10 mt-1 bg-gradient-to-b from-slate-200 to-slate-400/80 rounded-[3px] border border-slate-400 shadow-md flex flex-col items-center justify-center text-[9px] text-slate-700 text-center px-1">{machine.nome}<span className="font-mono text-[8px]">{machine.opAtual ? `OP ${machine.opAtual}` : statusLabel(machine.status)}</span></span>
                </button>
              })}
            </div> : <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-500 p-4"><Factory size={28} className="mb-2 text-slate-400" /><p className="text-xs font-semibold">{loading ? 'Carregando máquinas…' : 'Nenhuma máquina ativa encontrada'}</p><p className="text-[10px] mt-1">A planta exibe apenas equipamentos cadastrados para a empresa autenticada.</p></div>}
            <div className="absolute bottom-2 right-2 bg-white/95 border border-slate-300 rounded-[2px] p-2 text-[10px] font-medium space-y-1">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />Operação</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500" />Manutenção/setup</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500" />Parada/defeito</div>
            </div>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{machines.length} máquina(s) ativa(s) cadastrada(s)</span><button onClick={() => onNavigate('/pcp/agenda-maquinas')} className="text-[#2D8DB8] font-semibold hover:underline">Agenda de máquinas →</button></div>
        </div>

        <div className={`${card} md:col-span-4 flex flex-col`}>
          <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between"><div className="flex items-center gap-2"><AlertTriangle size={15} className="text-[#D65B61]" /><h2 className={heading}>Pendências e alertas SGQ</h2></div><span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-rose-100 text-rose-800">{activeRpncs.length} ativa(s)</span></div>
          <div className="p-3 flex-1 space-y-2">
            {activeRpncs.slice(0, 5).map((item, index) => <div key={item.id} className="p-2.5 bg-amber-50/70 border-l-4 border-amber-500 border-y border-r border-amber-200/60 rounded-[2px]"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-amber-900">RPNC pendente #{index + 1}</span><span className="text-[9px] font-semibold text-amber-700">{statusLabel(item.status ?? '')}</span></div><p className="text-[10px] text-amber-800 mt-1">Registro real de não conformidade requer acompanhamento.</p></div>)}
            {!activeRpncs.length && <div className="h-full min-h-32 flex flex-col items-center justify-center text-center text-slate-500"><CheckCircle2 size={25} className="text-emerald-600 mb-2" /><p className="text-xs font-semibold">{loading ? 'Consultando registros…' : 'Nenhuma RPNC aberta encontrada'}</p><p className="text-[10px] mt-1">Resultado da consulta à empresa autenticada.</p></div>}
          </div>
          <div className="p-3 border-t border-slate-100 flex gap-2"><button onClick={() => onNavigate('/rpnc')} className={smallButton}><ShieldCheck size={12} /> Abrir RPNC</button><button onClick={() => onNavigate('/manutencao')} className={smallButton}><Wrench size={12} /> Manutenção</button></div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className={`${card} md:col-span-4 p-3 flex flex-col`}>
          <div className="flex items-center justify-between mb-3"><span className={heading}>Programação PCP</span><Activity size={15} className="text-[#2D8DB8]" /></div>
          <div className="text-2xl font-extrabold text-[#123B50] font-mono">{programActive}</div><p className="text-[11px] text-slate-500 mt-1">Programações não canceladas ou concluídas</p>
          <button onClick={() => onNavigate('/pcp/programacao')} className="mt-auto pt-3 text-left text-[11px] font-semibold text-[#2D8DB8] hover:underline">Abrir programação →</button>
        </div>
        <div className={`${card} md:col-span-4 p-3 flex flex-col`}>
          <div className="flex items-center justify-between mb-3"><span className={heading}>Ordens de produção</span><Package size={15} className="text-[#2D8DB8]" /></div>
          <div className="text-2xl font-extrabold text-[#123B50] font-mono">{ops.length}</div><p className="text-[11px] text-slate-500 mt-1">Ordens retornadas pelo banco para a empresa</p>
          <button onClick={() => onNavigate('/pcp/ordens')} className="mt-auto pt-3 text-left text-[11px] font-semibold text-[#2D8DB8] hover:underline">Consultar OPs →</button>
        </div>
        <div className={`${card} md:col-span-4 p-3 flex flex-col`}>
          <div className="flex items-center justify-between mb-3"><span className={heading}>Acessos rápidos</span><span className="text-[10px] text-slate-400 font-mono">ERP</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onNavigate('/pcp/programacao')} className="p-2 bg-slate-50 hover:bg-[#F4FBFD] border border-slate-200 hover:border-[#2D8DB8] rounded-[2px] flex flex-col items-center text-center"><FileText size={17} className="text-[#2D8DB8] mb-1" /><span className="text-[10px] font-bold">Programação PCP</span></button>
            <button onClick={() => onNavigate('/produtos')} className="p-2 bg-slate-50 hover:bg-[#F4FBFD] border border-slate-200 hover:border-[#2D8DB8] rounded-[2px] flex flex-col items-center text-center"><Search size={17} className="text-[#123B50] mb-1" /><span className="text-[10px] font-bold">Consultar produtos</span></button>
            <button onClick={() => onNavigate('/rpnc')} className="p-2 bg-slate-50 hover:bg-[#F4FBFD] border border-slate-200 hover:border-[#2D8DB8] rounded-[2px] flex flex-col items-center text-center"><ShieldCheck size={17} className="text-[#3A9D78] mb-1" /><span className="text-[10px] font-bold">Não conformidades</span></button>
            <button onClick={() => onNavigate('/estoque')} className="p-2 bg-slate-50 hover:bg-[#F4FBFD] border border-slate-200 hover:border-[#2D8DB8] rounded-[2px] flex flex-col items-center text-center"><Package size={17} className="text-[#E6A34A] mb-1" /><span className="text-[10px] font-bold">Estoque</span></button>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">SYSNQRA ERP • Indicadores vinculados ao banco</div>
        </div>
      </section>

      {selectedMachine && <div role="dialog" aria-modal="true" aria-label={`Detalhes da máquina ${selectedMachine.codigo}`} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white border border-slate-300 rounded-[2px] shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-[#123B50] text-white px-4 py-2.5 flex items-center justify-between"><h3 className="text-xs font-bold font-mono uppercase">{selectedMachine.codigo} — {selectedMachine.nome}</h3><button onClick={() => setSelectedMachine(null)} aria-label="Fechar detalhes"><X size={16} /></button></div>
          <div className="p-4 space-y-3 text-xs"><div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 border border-slate-200 rounded-[2px]"><div><span className="text-[10px] text-slate-500 uppercase block">Status</span><strong>{statusLabel(selectedMachine.status)}</strong></div><div><span className="text-[10px] text-slate-500 uppercase block">Tipo</span><strong>{selectedMachine.tipo || 'Não informado'}</strong></div><div><span className="text-[10px] text-slate-500 uppercase block">OP atual</span><strong>{selectedMachine.opAtual || 'Nenhuma identificada'}</strong></div><div><span className="text-[10px] text-slate-500 uppercase block">Código</span><strong>{selectedMachine.codigo}</strong></div></div><div className="flex justify-end gap-2"><button onClick={() => setSelectedMachine(null)} className={smallButton}>Fechar</button><button onClick={() => { setSelectedMachine(null); onNavigate('/pcp/agenda-maquinas') }} className="h-[28px] px-2 bg-[#2D8DB8] text-white rounded-[2px] text-[10px] font-semibold">Ver agenda</button></div></div>
        </div>
      </div>}
    </main>
  )
}
