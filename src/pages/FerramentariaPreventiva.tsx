import { useCallback, useEffect, useState } from 'react'
import { Plus, Save, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import type { IFerramentalParametrosJSONB } from '../types/ferramental'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import IndustrialPageShell, { SectionCard, Field, ToolbarButton } from '../components/industrial/IndustrialPageShell'

type T={id:string;codigo:string;nome:string;numero_cavidades:number;vida_ciclos:number;ciclos_realizados:number;status:string|null;parametros:IFerramentalParametrosJSONB|null}
const items=['Limpeza e Polimento das Cavidades do Molde','Verificação do Desgaste dos Pinos de Guia e Buchas','Inspeção e Troca dos Retentores do Sistema de Refrigeração','Lubrificação com Graxa de Alta Temperatura nas Gavetas']

export default function FerramentariaPreventiva(){
 const [tools,setTools]=useState<T[]>([])
 const [companyId,setCompanyId]=useState('')
 const [saving,setSaving]=useState(false)
 const [selected,setSelected]=useState<T|null>(null)
 const [status,setStatus]=useState<'LIBERADO'|'RETIDO'>('LIBERADO')
 const [done,setDone]=useState<boolean[]>(items.map(()=>false))
 const [obs,setObs]=useState('')
 const [msg,setMsg]=useState('')

 const load=useCallback(async()=>{
   try{
     const tenant=await supabase.rpc('erp_current_empresa_id')
     if(tenant.error||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
     const empresaId=String(tenant.data)
     const rows=await fetchAllPages<T>((from,to)=>supabase.from('erp_ferramentas_industriais')
       .select('id,codigo,nome,numero_cavidades,vida_ciclos,ciclos_realizados,status,parametros',{count:'exact'})
       .eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to))
     setCompanyId(empresaId)
     setTools(rows)
     setSelected(current=>current?rows.find(row=>row.id===current.id)??null:null)
   }catch(cause){
     setTools([])
     setSelected(null)
     setMsg(cause instanceof Error?cause.message:'Falha ao carregar ferramentais da empresa.')
   }
 },[])
 useEffect(()=>{void load()},[load])

 useEffect(()=>{
   if(!selected)return
   const raw=selected.parametros?.preventiva
   setDone(items.map(x=>Boolean(raw?.checklist?.[x])))
   setObs(raw?.observacoes??'')
   setStatus(raw?.status==='RETIDO'?'RETIDO':'LIBERADO')
 },[selected])

 const records:LookupRecord[]=tools.map(t=>({id:t.id,codigo:t.codigo,nome:t.nome}))
 async function save(){
   if(!selected||!companyId){setMsg('Selecione um molde da empresa atual.');return}
   if(status==='LIBERADO'&&done.some(value=>!value)){setMsg('Para liberar o molde, conclua todos os itens do checklist.');return}
   setSaving(true)
   try{
     const parameters:Partial<IFerramentalParametrosJSONB>=selected.parametros??{}
     const setupRetido=parameters.setup_aprovacao?.status==='RETIDO'
     const priorStatus=typeof parameters.status_operacional_anterior==='string'
       ? parameters.status_operacional_anterior
       : selected.status&&selected.status!=='RETIDO'?selected.status:'ATIVA'
     const anyRetained=status==='RETIDO'||setupRetido
     const operationalStatus=anyRetained?'RETIDO':selected.status==='RETIDO'?priorStatus:selected.status??'ATIVA'
     const next={
       ...parameters,
       status_operacional_anterior:anyRetained?priorStatus:null,
       preventiva:{
         ...(parameters.preventiva??{}),
         ultima_execucao_em:new Date().toISOString(),
         status,
         status_anterior:status==='RETIDO'?priorStatus:null,
         checklist:Object.fromEntries(items.map((x,i)=>[x,done[i]])),
         observacoes:obs
       }
     }
     const result=await supabase.from('erp_ferramentas_industriais').update({status:operationalStatus,parametros:next})
       .eq('id',selected.id).eq('empresa_id',companyId).select('id').maybeSingle()
     if(result.error)throw result.error
     if(!result.data)throw new Error('Nenhum registro foi alterado. Confira a empresa e as permissões.')
     setMsg(status==='LIBERADO'?'Checklist completo e manutenção preventiva gravados.':'Manutenção registrada como retida; valide o bloqueio operacional conforme o procedimento da fábrica.')
     await load()
   }catch(cause){
     setMsg(cause instanceof Error?cause.message:'Não foi possível salvar a manutenção preventiva.')
   }finally{setSaving(false)}
 }

 return <IndustrialPageShell
   module="Ferramentaria / Preventiva"
   title="Plano de Manutenção Preventiva do Molde"
   subtitle="Identificação por código e lupa centralizada; checklist persistido no JSONB do ferramental."
   actions={[
     {label:'NOVA ORDEM DE SERVIÇO',type:'primary',icon:<Plus size={18}/>,onClick:()=>{setSelected(null);setMsg('Selecione o molde para iniciar uma nova execução.')} },
     {label:'GRAVAR MANUTENÇÃO',type:'success',icon:<Save size={18}/>,onClick:()=>void save(),disabled:saving},
     {label:'IMPRIMIR LAUDO',type:'neutral',icon:<Printer size={18}/>,onClick:()=>window.print()},
   ]}
 >
   <SectionCard title="1. Identificação do ferramental">
     <div className="ips-grid-2">
       <EntityCodeLookup label="Código do Molde" value={selected?.codigo??''} records={records} onChange={()=>{}} onSelect={r=>setSelected(tools.find(t=>t.id===r.id)??null)} required helper="Digite o código exato ou abra a lupa. Não use combobox." />
       <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
         <div className="text-base font-bold text-slate-900">Contador atual de ciclos</div>
         <div className="mt-2 text-3xl font-extrabold text-slate-950">{selected?Number(selected.ciclos_realizados).toLocaleString('pt-BR'):'—'} ciclos</div>
         <div className="mt-1 text-sm font-semibold text-slate-600">Vida útil: {selected?Number(selected.vida_ciclos).toLocaleString('pt-BR'):'—'} • Cavidades: {selected?.numero_cavidades??'—'}</div>
       </div>
     </div>
   </SectionCard>

   <SectionCard title="2. Check-list de engenharia">
     <div className="grid gap-0">{items.map((x,i)=><label key={x} className="min-h-[54px] border-b border-slate-200 flex items-center gap-4 text-base font-semibold text-slate-900"><input type="checkbox" className="h-6 w-6" checked={done[i]} onChange={e=>setDone(v=>v.map((a,j)=>j===i?e.target.checked:a))}/>{x}</label>)}</div>
   </SectionCard>

   <SectionCard title="3. Laudo final">
     <div className="grid gap-4">
       <Field label="Status final">
         <select value={status} onChange={e=>setStatus(e.target.value as 'LIBERADO'|'RETIDO')}><option value="LIBERADO">LIBERADO PARA PRODUÇÃO</option><option value="RETIDO">RETIDO NA FERRAMENTARIA</option></select>
       </Field>
       <Field label="Observações técnicas"><textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Descreva desgaste, intervenção e condição encontrada."/></Field>
       <div className="ips-bottom-actions"><ToolbarButton tone="success" onClick={()=>void save()}><Save size={18}/> GRAVAR LAUDO</ToolbarButton></div>
       {msg&&<p className="font-semibold text-slate-900">{msg}</p>}
     </div>
   </SectionCard>
 </IndustrialPageShell>
}
