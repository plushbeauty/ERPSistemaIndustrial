import { useEffect, useState } from 'react'
import { Factory, X, Plus, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Machine = { id: string; codigo: string; nome: string; tipo: string | null; status: string | null }
type Schedule = { id: string; data_hora_inicio: string; data_hora_fim: string; status: string; ordem_producao_id: string; quantidade_programada: number }

export default function MachineAgenda() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [selected, setSelected] = useState<Machine | null>(null)
  const [rows, setRows] = useState<Schedule[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error) throw tenant.error
        if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
        const company = String(tenant.data)
        const { data, error } = await supabase
          .from('erp_maquinas')
          .select('id,codigo,nome,tipo,status')
          .eq('empresa_id', company)
          .eq('ativo', true)
          .order('codigo')
        if (error) throw error
        if (active) {
          setEmpresaId(company)
          setMachines(data ?? [])
        }
      } catch (cause) {
        if (active) setMsg(cause instanceof Error ? cause.message : 'Falha ao carregar máquinas.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  async function open(machine: Machine) {
    setSelected(machine)
    setMsg('')
    setRows([])
    if (!empresaId) {
      setMsg('Empresa da sessão não identificada.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pcp_agenda_maquinas')
        .select('id,data_hora_inicio,data_hora_fim,status,ordem_producao_id,quantidade_programada')
        .eq('empresa_id', empresaId)
        .eq('maquina_id', machine.id)
        .order('data_hora_inicio')
        .limit(100)
      if (error) throw error
      setRows(data ?? [])
    } catch (cause) {
      setMsg(cause instanceof Error ? cause.message : 'Falha ao carregar a agenda da máquina.')
    } finally {
      setLoading(false)
    }
  }

  return <div>
    <div className="page-title">
      <div><span className="eyebrow">PCP</span><h2>Agenda semanal de máquinas</h2><p>Veja as ordens programadas por máquina, com datas e quantidades registradas no PCP.</p></div>
      <button className="primary" type="button" onClick={() => navigate('/pcp/planejamento')}><Plus size={17}/> Programar OP</button>
    </div>
    {msg && <div className="notice" role="alert">{msg}</div>}
    <div className="machine-grid">
      {machines.map(machine => <button className="machine-card" type="button" key={machine.id} onClick={() => void open(machine)}>
        <div className="machine-icon"><Factory size={42}/></div>
        <strong>{machine.codigo} · {machine.nome}</strong>
        <small>{machine.tipo ?? '—'}</small>
        <span className="machine-status">{machine.status ?? '—'}</span>
        <div className="machine-week"><CalendarDays size={15}/> Abrir programação</div>
      </button>)}
      {!loading && machines.length === 0 && <div className="empty">Nenhuma máquina ativa cadastrada para esta empresa.</div>}
    </div>
    {selected && <div className="panel">
      <div className="panel-head"><div><span className="eyebrow">MÁQUINA</span><h3>{selected.codigo} · {selected.nome}</h3></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar agenda"><X/></button></div>
      {rows.length ? rows.map(row => <div className="schedule-row" key={row.id}>
        <b>{new Date(row.data_hora_inicio).toLocaleDateString('pt-BR')}</b>
        <span>{new Date(row.data_hora_inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} → {new Date(row.data_hora_fim).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
        <span>{row.status}</span>
        <span>OP {row.ordem_producao_id.slice(0, 8)} · {Number(row.quantidade_programada).toLocaleString('pt-BR')} un.</span>
      </div>) : <div className="empty">{loading ? 'Carregando programação…' : 'Nenhuma programação cadastrada para esta máquina.'}</div>}
    </div>}
  </div>
}
