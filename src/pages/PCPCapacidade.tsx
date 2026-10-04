import { useEffect, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import IndustrialPageShell, { SectionCard, Table } from '../components/industrial/IndustrialPageShell'

type Machine = { id:string; codigo:string; nome:string; status:string|null }
type Op = { maquina_id:string|null; status:string|null }

export default function PCPCapacidade(){
  const [machines,setMachines]=useState<Machine[]>([])
  const [ops,setOps]=useState<Op[]>([])
  const [loading,setLoading]=useState(true)

  async function load(){
    setLoading(true)
    const [m,o]=await Promise.all([
      supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('ativo',true).order('codigo'),
      supabase.from('erp_ordens_producao').select('maquina_id,status').limit(2000),
    ])
    setMachines((m.data??[]) as Machine[])
    setOps((o.data??[]) as Op[])
    setLoading(false)
  }

  useEffect(()=>{ void load() },[])

  const rows=machines.map(machine=>{
    const assigned=ops.filter(op=>op.maquina_id===machine.id)
    const active=assigned.filter(op=>!['CONCLUIDA','CONCLUIDO','CANCELADA','CANCELADO'].includes(String(op.status??'').toUpperCase())).length
    return { ...machine, assigned:assigned.length, active }
  })

  const exportAudit=()=>{
    const csv='Codigo,Maquina,Status,OPs vinculadas,OPs ativas\\n'+rows.map(r=>[r.codigo,r.nome,r.status??'',r.assigned,r.active].join(',')).join('\\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    a.download='pcp-carga-maquinas.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return <IndustrialPageShell
    module="PCP / Capacidade"
    title="Carga de Máquina e Capacidade"
    subtitle="Somente indicadores calculados a partir das OPs e do cadastro real de máquinas."
    actions={[
      {label:'ATUALIZAR DADOS',type:'primary',icon:<RefreshCw size={18}/>,onClick:()=>void load()},
      {label:'EXPORTAR AUDITORIA',type:'success',icon:<Download size={18}/>,onClick:exportAudit},
    ]}
  >
    <SectionCard title="1. Capacidade cadastrada">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-base font-semibold text-amber-900">
        O cadastro atual de máquinas não possui um campo de horas de capacidade diária/semanal. Portanto, esta tela não inventa percentuais de ocupação. A carga abaixo é baseada nas OPs realmente vinculadas.
      </div>
    </SectionCard>
    <SectionCard title="2. Carga real por máquina">
      <Table>
        <thead><tr><th>Máquina</th><th>Status</th><th>OPs vinculadas</th><th>OPs ativas</th><th>Indicador</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5}>Consultando dados reais...</td></tr> :
           rows.length===0 ? <tr><td colSpan={5}>Nenhuma máquina ativa cadastrada.</td></tr> :
           rows.map(r=><tr key={r.id}>
             <td><strong>{r.codigo}</strong> — {r.nome}</td>
             <td>{r.status??'—'}</td>
             <td>{r.assigned}</td>
             <td>{r.active}</td>
             <td className={r.active>0?'ips-status-amber':'ips-status-green'}>{r.active>0?'COM OPs NA FILA':'SEM OP ATIVA'}</td>
           </tr>)}
        </tbody>
      </Table>
    </SectionCard>
  </IndustrialPageShell>
}
