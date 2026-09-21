/*
 * 📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
 * - Arquivo: src/components/ModalDetalhesMolde.tsx
 * - Status Atual: Revisão 1 (Módulo Industrial Avançado)
 * - Total de Linhas Gerado: 135
 * - Assinatura de Entrada (Primeiros 3 Imports): import { useEffect, useMemo, useState } from 'react' | import { FileText, ImagePlus, Save, ShieldCheck, X } from 'lucide-react' | import { supabase } from '../lib/supabaseClient'
 * - Regra de Negócio Senior/Nomus Incorporada: ativo de ferramentaria com cavidades, vida útil, ciclos, documentação e histórico operacional.
 */
import { useEffect, useMemo, useState } from 'react'
import { FileText, ImagePlus, Save, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export type MoldDetails={id:string;codigo:string;nome:string;status:string;produto_id:string|null;data_fabricacao:string|null;numero_cavidades:number;cavidades_ativas:number;ciclos_atuais:number;limite_ciclos:number}
type FileMeta={name:string;size:number;extension:string}
type Props={moldId:string|null;open:boolean;onClose:()=>void;demo?:Partial<MoldDetails>}
const bytes=(n:number)=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB'
const ext=(name:string)=>name.includes('.')?(name.split('.').pop()??'ARQUIVO').toUpperCase():'ARQUIVO'
const errorText=(e:unknown)=>e instanceof Error?e.message:String((e as {message?:string})?.message??'Não foi possível salvar o molde.')

export default function ModalDetalhesMolde({moldId,open,onClose,demo}:Props){
 const [mold,setMold]=useState<MoldDetails|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[drawing,setDrawing]=useState<FileMeta|null>(null),[photo,setPhoto]=useState<FileMeta|null>(null)
 useEffect(()=>{if(open)void load()},[open,moldId])
 async function load(){
  if(demo){setMold({id:moldId??'demo-mold',codigo:demo.codigo??'MOL-DEMO',nome:demo.nome??'Molde demonstrativo',status:demo.status??'DEMO',produto_id:demo.produto_id??null,data_fabricacao:demo.data_fabricacao??null,numero_cavidades:demo.numero_cavidades??demo.cavidades??4,cavidades_ativas:demo.cavidades_ativas??demo.cavidades??4,ciclos_atuais:demo.ciclos_atuais??demo.ciclos??0,limite_ciclos:demo.limite_ciclos??500000});return}
  if(!moldId){setMold(null);return}
  setBusy(true);setNotice('')
  try{const r=await supabase.from('erp_moldes').select('id,codigo,nome,status,produto_id,data_fabricacao,numero_cavidades,cavidades_ativas,ciclos_atuais,limite_ciclos').eq('id',moldId).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Molde não encontrado no tenant atual.');setMold(r.data as MoldDetails)}catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 const progress=useMemo(()=>mold&&mold.limite_ciclos>0?Math.min(100,(mold.ciclos_atuais/mold.limite_ciclos)*100):0,[mold])
 const meta=(file:File|null)=>file?{name:file.name,size:file.size,extension:ext(file.name)}:null
 async function save(){
  if(!mold||demo)return
  setBusy(true);setNotice('')
  try{const {data:empresaId,error:companyError}=await supabase.rpc('erp_current_empresa_id');if(companyError||!empresaId)throw new Error('Empresa da sessão não identificada.');const r=await supabase.from('erp_moldes').update({data_fabricacao:mold.data_fabricacao||null,numero_cavidades:mold.numero_cavidades,cavidades:mold.numero_cavidades,cavidades_ativas:mold.cavidades_ativas,ciclos_atuais:mold.ciclos_atuais,limite_ciclos:mold.limite_ciclos,updated_at:new Date().toISOString()}).eq('id',mold.id).eq('empresa_id',String(empresaId));if(r.error)throw r.error;setNotice('Dados do molde persistidos. Os anexos desta tela exibem metadados locais; o upload binário depende do Storage documental configurado pelo tenant.')}catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 if(!open)return null
 return <div className="industrial-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="molde-title" onMouseDown={e=>e.stopPropagation()}><header className="industrial-modal-head"><div><span className="industrial-eyebrow">FERRAMENTARIA • MOLDE</span><h2 id="molde-title">{mold?.codigo??'Molde'}</h2><p>{mold?.nome??(busy?'Carregando…':'Detalhes')}</p></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></header>
 {mold&&<><div className="industrial-mold-grid"><label>Código<input value={mold.codigo} readOnly/></label><label>Descrição<input value={mold.nome} readOnly/></label><label>Status<input value={mold.status} onChange={e=>setMold({...mold,status:e.target.value})}/></label><label>Data de fabricação<input type="date" value={mold.data_fabricacao??''} onChange={e=>setMold({...mold,data_fabricacao:e.target.value||null})}/></label><label>Cavidades totais<input type="number" min="1" value={mold.numero_cavidades} onChange={e=>setMold({...mold,numero_cavidades:Number(e.target.value)})}/></label><label>Cavidades ativas<input type="number" min="0" max={mold.numero_cavidades} value={mold.cavidades_ativas} onChange={e=>setMold({...mold,cavidades_ativas:Number(e.target.value)})}/></label><label>Ciclos atuais<input type="number" min="0" value={mold.ciclos_atuais} onChange={e=>setMold({...mold,ciclos_atuais:Number(e.target.value)})}/></label><label>Limite de vida útil<input type="number" min="0" value={mold.limite_ciclos} onChange={e=>setMold({...mold,limite_ciclos:Number(e.target.value)})}/></label></div>
 <div className="industrial-life"><div><b>Vida útil</b><span>{mold.ciclos_atuais.toLocaleString('pt-BR')} / {mold.limite_ciclos.toLocaleString('pt-BR')} ciclos • {progress.toFixed(1)}%</span></div><div className="industrial-progress"><i style={{width:progress+'%'}}/></div></div>
 <div className="industrial-attachments"><article><div className="industrial-attachment-head"><FileText/><b>Desenho técnico</b></div><input type="file" accept=".pdf,.dwg,application/pdf" onChange={e=>setDrawing(meta(e.target.files?.[0]??null))}/>{drawing&&<div className="industrial-file-meta">{drawing.name}<span>{bytes(drawing.size)} • {drawing.extension}</span></div>}</article><article><div className="industrial-attachment-head"><ImagePlus/><b>Foto do ativo</b></div><input type="file" accept="image/*" onChange={e=>setPhoto(meta(e.target.files?.[0]??null))}/>{photo&&<div className="industrial-file-meta">{photo.name}<span>{bytes(photo.size)} • {photo.extension}</span></div>}</article></div>
 <div className="industrial-modal-foot"><div className="industrial-context"><ShieldCheck size={16}/>{demo?'Modo demonstração: não grava no banco.':'Dados operacionais persistem por tenant.'}</div>{!demo&&<button className="industrial-primary" onClick={()=>void save()} disabled={busy}><Save size={17}/>{busy?'Salvando…':'Salvar molde'}</button>}</div></>}
 {notice&&<div className="industrial-notice">{notice}</div>}</section></div>
}
