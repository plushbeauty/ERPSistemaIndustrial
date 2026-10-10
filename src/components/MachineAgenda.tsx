import {useEffect,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {fetchAllPages} from '../lib/supabasePagination'
import {Factory,X,Plus,CalendarDays} from 'lucide-react'
import {supabase} from '../lib/supabaseClient'

type Machine={id:string;codigo:string;nome:string;tipo:string|null;status:string|null}
type Schedule={id:string;data_hora_inicio:string;data_hora_fim:string;status:string;ordem_producao_id:string|null}

export default function MachineAgenda(){
 const navigate=useNavigate();const[empresaId,setEmpresaId]=useState('');const[machines,setMachines]=useState<Machine[]>([]);const[selected,setSelected]=useState<Machine|null>(null);const[rows,setRows]=useState<Schedule[]>([]);const[msg,setMsg]=useState('');
 useEffect(()=>{void loadMachines()},[])
 async function loadMachines(){const t=await supabase.rpc('erp_current_empresa_id');if(t.error||typeof t.data!=='string'||!t.data){setMsg(t.error?.message??'Empresa da sessão não identificada.');return}const id=t.data;setEmpresaId(id);const data=await fetchAllPages<Machine>((from,to)=>supabase.from('erp_maquinas').select('id,codigo,nome,tipo,status').eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to));setMachines(data)}
 async function open(m:Machine){setSelected(m);setMsg('');if(!empresaId){setMsg('Empresa da sessão não identificada.');setRows([]);return}const data=await fetchAllPages<Schedule>((from,to)=>supabase.from('pcp_agenda_maquinas').select('id,data_hora_inicio,data_hora_fim,status,ordem_producao_id').eq('empresa_id',empresaId).eq('maquina_id',m.id).order('data_hora_inicio').range(from,to));setRows(data)}
 return <div><div className="page-title"><div><span className="eyebrow">PCP</span><h2>Agenda semanal de máquinas</h2><p>Veja o que cada máquina tem programado e clique para abrir a programação completa.</p></div><button className="primary" type="button" onClick={()=>navigate('/pcp/programacao')}><Plus size={17}/> Programar OP</button></div><div className="machine-grid">{machines.map(m=><button className="machine-card" type="button" key={m.id} onClick={()=>void open(m)}><div className="machine-icon"><Factory size={42}/></div><strong>{m.codigo} · {m.nome}</strong><small>{m.tipo??'—'}</small><span className="machine-status">{m.status??'—'}</span><div className="machine-week"><CalendarDays size={15}/> Seg · Ter · Qua · Qui · Sex</div></button>)}</div>{msg&&<div className="notice">{msg}</div>}{selected&&<div className="panel"><div className="panel-head"><div><span className="eyebrow">MÁQUINA</span><h3>{selected.codigo} · {selected.nome}</h3></div><button type="button" onClick={()=>setSelected(null)}><X/></button></div>{rows.length?rows.map(r=><div className="schedule-row" key={r.id}><b>{new Date(r.data_hora_inicio).toLocaleDateString('pt-BR')}</b><span>{new Date(r.data_inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} → {new Date(r.data_hora_fim).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span><span>{r.status??'—'}</span><span>{r.ordem_producao_id??'Sem OP'}</span></div>):<div className="empty">Nenhuma programação cadastrada para esta máquina.</div>}</div>}</div>
}
