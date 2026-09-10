import {useEffect,useState} from 'react'
import {Factory,X,Plus,CalendarDays} from 'lucide-react'
import {supabase} from '../lib/supabaseClient'

type Machine={id:string;codigo:string;nome:string;tipo:string|null;status:string|null;imagem_url:string|null}
type Schedule={id:string;data_inicio:string;data_fim:string;status:string|null;ordem_id:string|null}

export default function MachineAgenda(){
 const[machines,setMachines]=useState<Machine[]>([]);const[selected,setSelected]=useState<Machine|null>(null);const[rows,setRows]=useState<Schedule[]>([]);const[msg,setMsg]=useState('');
 useEffect(()=>{void loadMachines()},[])
 async function loadMachines(){const{data,error}=await supabase.from('maquinas').select('id,codigo,nome,tipo,status,imagem_url').eq('ativo',true).order('codigo');if(error){setMsg(error.message);return}setMachines((data??[]) as Machine[])}
 async function open(m:Machine){setSelected(m);setMsg('');const{data,error}=await supabase.from('programacoes_maquinas').select('id,data_inicio,data_fim,status,ordem_id').eq('maquina_id',m.id).order('data_inicio').limit(100);if(error){setMsg(error.message);setRows([]);return}setRows((data??[]) as Schedule[])}
 return <div><div className="page-title"><div><span className="eyebrow">PCP</span><h2>Agenda semanal de máquinas</h2><p>Veja o que cada máquina tem programado e clique para abrir a programação completa.</p></div><button className="primary" type="button"><Plus size={17}/> Programar OP</button></div><div className="machine-grid">{machines.map(m=><button className="machine-card" type="button" key={m.id} onClick={()=>void open(m)}><div className="machine-icon">{m.imagem_url?<img src={m.imagem_url} alt=""/>:<Factory size={42}/>}</div><strong>{m.codigo} · {m.nome}</strong><small>{m.tipo??'—'}</small><span className="machine-status">{m.status??'—'}</span><div className="machine-week"><CalendarDays size={15}/> Seg · Ter · Qua · Qui · Sex</div></button>)}</div>{msg&&<div className="notice">{msg}</div>}{selected&&<div className="panel"><div className="panel-head"><div><span className="eyebrow">MÁQUINA</span><h3>{selected.codigo} · {selected.nome}</h3></div><button type="button" onClick={()=>setSelected(null)}><X/></button></div>{rows.length?rows.map(r=><div className="schedule-row" key={r.id}><b>{new Date(r.data_inicio).toLocaleDateString('pt-BR')}</b><span>{new Date(r.data_inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} → {new Date(r.data_fim).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span><span>{r.status??'—'}</span><span>{r.ordem_id??'Sem OP'}</span></div>):<div className="empty">Nenhuma programação cadastrada para esta máquina.</div>}</div>}</div>
}
