/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-043
 * Alterações: Tipar explicitamente as props do componente para eliminar TS7031.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { ChangeEvent, DragEvent, useEffect, useState } from 'react'
import { Download, FileUp, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Attachment={id:string;nome_arquivo:string;storage_path:string|null;mime_type:string|null;tamanho_bytes:number|null;created_at:string}
type Props={documentoId:string;titulo?:string}
const MAX_BYTES=25*1024*1024
const ALLOWED=new Set(['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])

export default function DocumentoAnexoUpload({documentoId,titulo='Documentos em anexo'}:Props){
 const[items,setItems]=useState<Attachment[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[drag,setDrag]=useState(false)
 async function load(){const{data,error}=await supabase.from('erp_documentos_anexos').select('id,nome_arquivo,storage_path,mime_type,tamanho_bytes,created_at').eq('entidade_id',documentoId).eq('entidade_tipo','qualidade_documento').order('created_at',{ascending:false});if(!error)setItems((data??[]) as Attachment[]);else setMessage(error.message)}
 useEffect(()=>{void load()},[documentoId])
 async function uploadFile(file:File){setMessage('');if(file.size>MAX_BYTES){setMessage('Arquivo excede 25 MB.');return}if(!ALLOWED.has(file.type)){setMessage('Formato não permitido. Use PDF, imagem, TXT ou Excel.');return}setBusy(true);try{const{data:empresa,error:empresaError}=await supabase.rpc('erp_current_empresa_id');if(empresaError||!empresa)throw empresaError??new Error('Empresa não identificada.');const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');const storagePath=String(empresa)+'/documentos-qualidade/'+documentoId+'/'+crypto.randomUUID()+'-'+safe;const up=await supabase.storage.from('documentos-erp').upload(storagePath,file,{upsert:false});if(up.error)throw up.error;const row=await supabase.from('erp_documentos_anexos').insert({empresa_id:empresa,entidade_tipo:'qualidade_documento',entidade_id:documentoId,nome_arquivo:file.name,storage_path:storagePath,mime_type:file.type||null,tamanho_bytes:file.size});if(row.error){await supabase.storage.from('documentos-erp').remove([storagePath]);throw row.error}setMessage('Anexo salvo com sucesso.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar o anexo.')}finally{setBusy(false)}}
 function pick(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];e.target.value='';if(f)void uploadFile(f)}
 function drop(e:DragEvent<HTMLDivElement>){e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)void uploadFile(f)}
 async function download(item:Attachment){if(!item.storage_path)return;const{data,error}=await supabase.storage.from('documentos-erp').createSignedUrl(item.storage_path,300);if(error||!data?.signedUrl){setMessage(error?.message??'Não foi possível gerar o acesso.');return}window.open(data.signedUrl,'_blank','noopener,noreferrer')}
 async function remove(item:Attachment){if(!window.confirm('Excluir o anexo '+item.nome_arquivo+'?'))return;setBusy(true);try{if(item.storage_path){const x=await supabase.storage.from('documentos-erp').remove([item.storage_path]);if(x.error)throw x.error}const x=await supabase.from('erp_documentos_anexos').delete().eq('id',item.id);if(x.error)throw x.error;setItems(v=>v.filter(x=>x.id!==item.id));setMessage('Anexo excluído.')}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível excluir o anexo.')}finally{setBusy(false)}}
 return <section className="qms-attachment"><div className="qms-attachment-head"><div><strong>{titulo}</strong><small>Storage privado por empresa • PDF e anexos técnicos • máximo 25 MB</small></div><label className="qms-toolbar-button"><FileUp size={17}/> Anexar arquivo<input type="file" hidden disabled={busy} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.xls,.xlsx" onChange={pick}/></label></div><div className={drag?'qms-dropzone drag':'qms-dropzone'} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={drop}><UploadCloud size={30}/><strong>{busy?'Enviando…':'Arraste o arquivo aqui'}</strong><span>ou use o botão Anexar arquivo</span></div>{message&&<div className={message.includes('sucesso')||message==='Anexo excluído.'?'qms-notice':'qms-error'}>{message}</div>}<div className="qms-attachment-list">{items.map(item=><div key={item.id} className="qms-attachment-row"><div><strong>{item.nome_arquivo}</strong><small>{item.mime_type||'arquivo'} • {item.tamanho_bytes?Math.ceil(item.tamanho_bytes/1024)+' KB':'tamanho não informado'}</small></div><div className="qms-row-actions"><button type="button" className="qms-toolbar-button" onClick={()=>void download(item)}><Download size={16}/> Abrir</button><button type="button" className="qms-toolbar-button danger" disabled={busy} onClick={()=>void remove(item)}><Trash2 size={16}/> Excluir</button></div></div>)}{!items.length&&<span className="qms-muted">Nenhum anexo salvo neste documento.</span>}</div></section>
}