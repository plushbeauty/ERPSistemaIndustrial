import { useEffect,useState } from 'react'
import { Plus, Save, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { IFerramentalParametrosJSONB } from '../types/ferramental'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import IndustrialPageShell, { SectionCard, Field, ToolbarButton } from '../components/industrial/IndustrialPageShell'

type T={id:string;codigo:string;nome:string;numero_cavidades:number;vida_ciclos:number;ciclos_realizados:number;parametros:IFerramentalParametrosJSONB|null}
const items=['Limpeza e Polimento das Cavidades do Molde','Verificação do Desgaste dos Pinos de Guia e Buchas','Inspeção e Troca dos Retentores do Sistema de Refrigeração','Lubrificação com Graxa de Alta Temperatura nas Gavetas']

export default function FerramentariaPreventiva(){
 const [tools,setTools]=useState<T[]>([])
 const [selected,setSelected]=useState<T|null>(null)
 const [status,setStatus]=useState<'LIBERADO'|'RETIDO'>('LIBERADO')
 const [done,setDone]=useState<boolean[]>(items.map(()=>false))
 const [obs,setObs]=useState('')
 const [msg,setMsg]=useState('')

 async function load(){
   const {data}=await supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,numero_cavidades,vida_ciclos,ciclos_realizados,parametros').eq('ativo',true).order('codigo')
   setTools((data??[]) as T[])
 }
 useEffect(()=>{void load()},[])

 useEffect(()=>{
   if(!selected)return
   const raw=selected.parametros?.preventiva
   setDone(items.map(x=>Boolean(raw?.checklist?.[x])))
   setObs(raw?.observacoes??'')
   setStatus(raw?.status==='RETIDO'?'RETIDO':'LIBERADO')
 },[selected])

 const records:LookupRecord[]=tools.map(t=>({id:t.id,codigo:t.codigo,nome:t.nome}))
 async function save(){
   if(!selected){setMsg('Selecione um molde pelo código ou pela lupa.');return}
   const {data:e}=await supabase.rpc('erp_current_empresa_id')
   const next={...(selected.parametros??{}),preventiva:{ultima_execucao_em:new Date().toISOString(),status,checklist:Object.fromEntries(items.map((x,i)=>[x,done[i]])),observacoes:obs}}
   const {error}=await supabase.from('erp_ferramentas_industriais').update({parametros:next}).eq('id',selected.id).eq('empresa_id',String(e??''))
   setMsg(error?error.message:'Manutenção preventiva gravada no ferramental real.')
   if(!error)void load()
 }

 return <IndustrialPageShell
   module="Ferramentaria / Preventiva"
   title="Plano de Manutenção Preventiva do Molde"
   subtitle="Identificação por código e lupa centralizada; checklist persistido no JSONB do ferramental."
   actions={[
     {label:'NOVA ORDEM DE SERVIÇO',type:'primary',icon:<Plus size={18}/>,onClick:()=>{setSelected(null);setMsg('Selecione o molde para iniciar uma nova execução.')} },
     {label:'GRAVAR MANUTENÇÃO',type:'success',icon:<Save size={18}/>,onClick:()=>void save()},
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
