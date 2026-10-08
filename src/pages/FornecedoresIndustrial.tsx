/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-054
 * Alterações: Restaurar imports dos ícones usados no cabeçalho e ações.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Check, Plus, Printer, RefreshCw, Star, Trash2, X, Filter, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Supplier={id:string;codigo:string|null;razao_social:string;nome_fantasia:string|null;documento:string|null;email:string|null;telefone:string|null;endereco:string|null;cidade:string|null;estado:string|null;contato:string|null;ativo:boolean;iso_9001_certificado:boolean;iso_certificado_nome:string|null;iso_certificado_path:string|null;iso_certificado_validade:string|null;iso_certificado_numero:string|null;observacoes:string|null}
type Purchase={fornecedor_id:string;status:string|null;data_prevista:string|null}
type Form={codigo:string;razao_social:string;nome_fantasia:string;documento:string;email:string;telefone:string;endereco:string;cidade:string;estado:string;contato:string;iso_9001_certificado:boolean;iso_certificado_validade:string;iso_certificado_numero:string;observacoes:string}
const empty:Form={codigo:'',razao_social:'',nome_fantasia:'',documento:'',email:'',telefone:'',endereco:'',cidade:'',estado:'',contato:'',iso_9001_certificado:false,iso_certificado_validade:'',iso_certificado_numero:'',observacoes:''}
const input:React.CSSProperties={width:'100%',height:30,border:'1px solid #b9c9d4',borderRadius:2,padding:'0 7px',boxSizing:'border-box',background:'#fff',color:'#111827',fontSize:10}
const label:React.CSSProperties={display:'grid',gap:2,fontSize:9,fontWeight:500,textTransform:'uppercase',color:'#344054'}
const panel:React.CSSProperties={background:'#fff',border:'1px solid #d5dde7',borderRadius:2}
const button=(kind:'primary'|'normal'|'danger'|'disabled'):React.CSSProperties=>({height:30,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5,border:'1px solid '+(kind==='primary'?'#2D8DB8':kind==='danger'?'#d65b61':'#b9c9d4'),borderRadius:2,padding:'0 9px',fontSize:9,fontWeight:600,cursor:kind==='disabled'?'not-allowed':'pointer',background:kind==='primary'?'#2D8DB8':kind==='danger'?'#fff5f5':'#fff',color:kind==='primary'?'#fff':kind==='danger'?'#b42318':'#123B50',opacity:kind==='disabled'?0.5:1})
const today=()=>new Date().toISOString().slice(0,10)
const digits=(value:string)=>value.replace(/\D/g,'')
const formatCnpj=(value:string)=>{const d=digits(value).slice(0,14);if(d.length<=2)return d;if(d.length<=5)return `${d.slice(0,2)}.${d.slice(2)}`;if(d.length<=8)return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;if(d.length<=12)return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`}
function isoValido(s:Supplier){return s.iso_9001_certificado&&(!s.iso_certificado_validade||s.iso_certificado_validade>=today())}
function purchaseStatus(rows:Purchase[],supplierId:string){const open=rows.filter(x=>x.fornecedor_id===supplierId&&!['recebido','recebida','concluido','concluida','cancelado','cancelada','encerrado','encerrada'].includes(String(x.status||'').toLowerCase()));if(open.some(x=>x.data_prevista&&x.data_prevista<today()))return 'ATRASADO';if(open.length)return 'EM DIA';return 'SEM PEDIDOS'}
export default function FornecedoresIndustrial(){
 const [empresaId,setEmpresaId]=useState(''),[rows,setRows]=useState<Supplier[]>([]),[purchases,setPurchases]=useState<Purchase[]>([]),[query,setQuery]=useState(''),[filterOpen,setFilterOpen]=useState(false),[statusFilter,setStatusFilter]=useState(''),[editing,setEditing]=useState<string|null>(null),[formOpen,setFormOpen]=useState(false),[selected,setSelected]=useState<Supplier|null>(null),[form,setForm]=useState<Form>(empty),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setError('');try{const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa da sessão não identificada.');const id=String(empresa);setEmpresaId(id);const [suppliers,orders]=await Promise.all([fetchAllPages<Supplier>((from:number,to:number)=>supabase.from('erp_fornecedores').select('*',{count:'exact'}).eq('empresa_id',id).order('razao_social').range(from,to)),fetchAllPages<Purchase>((from:number,to:number)=>supabase.from('erp_pedidos_compra').select('fornecedor_id,status,data_prevista',{count:'exact'}).eq('empresa_id',id).range(from,to))]);setRows(suppliers);setPurchases(orders)}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar fornecedores.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const statusOf=(r:Supplier)=>purchaseStatus(purchases,r.id)
 const filtered=useMemo(()=>rows.filter(r=>{const q=query.trim().toLowerCase();const text=`${r.razao_social} ${r.nome_fantasia??''} ${r.documento??''} ${r.codigo??''}`.toLowerCase();return (!q||text.includes(q))&&(!statusFilter||statusOf(r)===statusFilter)}),[rows,purchases,query,statusFilter])
 const selectRow=(r:Supplier)=>{setSelected(r)}
 const loadForm=(r:Supplier)=>{setSelected(r);setEditing(r.id);setForm({codigo:r.codigo??'',razao_social:r.razao_social,nome_fantasia:r.nome_fantasia??'',documento:r.documento??'',email:r.email??'',telefone:r.telefone??'',endereco:r.endereco??'',cidade:r.cidade??'',estado:r.estado??'',contato:r.contato??'',iso_9001_certificado:r.iso_9001_certificado,iso_certificado_validade:r.iso_certificado_validade??'',iso_certificado_numero:r.iso_certificado_numero??'',observacoes:r.observacoes??''});setFile(null);setFormOpen(true);setMessage('');setError('')}
 const openNew=()=>{setSelected(null);setEditing(null);setForm(empty);setFile(null);setFormOpen(true);setMessage('');setError('')}
 const openEdit=()=>{if(!selected)return;loadForm(selected)}
 const clearForm=()=>{setEditing(null);setForm(empty);setFile(null);setFormOpen(true)}
 const cancelForm=()=>{setFormOpen(false);setEditing(null);setFile(null)}
 const save=async(e:FormEvent)=>{e.preventDefault();if(!empresaId)return;setBusy(true);setError('');setMessage('');try{if(!form.razao_social.trim())throw new Error('Informe a razão social.');const cnpj=digits(form.documento);if(cnpj&&cnpj.length!==14)throw new Error('CNPJ deve conter 14 dígitos.');if(form.iso_9001_certificado&&!file&&!editing&&!selected)throw new Error('Anexe o certificado ISO 9001.');let id=editing;const payload={empresa_id:empresaId,codigo:form.codigo.trim()||null,razao_social:form.razao_social.trim(),nome_fantasia:form.nome_fantasia.trim()||null,documento:cnpj||null,email:form.email.trim()||null,telefone:form.telefone.trim()||null,endereco:form.endereco.trim()||null,cidade:form.cidade.trim()||null,estado:form.estado.trim().toUpperCase()||null,contato:form.contato.trim()||null,iso_9001_certificado:form.iso_9001_certificado,iso_certificado_validade:form.iso_certificado_validade||null,iso_certificado_numero:form.iso_certificado_numero.trim()||null,observacoes:form.observacoes.trim()||null,updated_at:new Date().toISOString()};if(id){const {error:e}=await supabase.from('erp_fornecedores').update(payload).eq('id',id).eq('empresa_id',empresaId);if(e)throw e}else{const {data,error:e}=await supabase.from('erp_fornecedores').insert(payload).select('id').single();if(e||!data)throw e??new Error('Fornecedor não retornado pelo banco.');id=data.id}if(file&&id){const safe=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${empresaId}/${id}/iso-9001-${Date.now()}-${safe}`;const upload=await supabase.storage.from('erp-fornecedor-certificados').upload(path,file,{upsert:true,contentType:file.type||'application/octet-stream'});if(upload.error)throw upload.error;const {error:e}=await supabase.from('erp_fornecedores').update({iso_certificado_nome:file.name,iso_certificado_path:path,iso_9001_certificado:true,updated_at:new Date().toISOString()}).eq('id',id).eq('empresa_id',empresaId);if(e)throw e}setFormOpen(false);setMessage(editing?'Fornecedor atualizado.':'Fornecedor cadastrado.');await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o fornecedor.')}finally{setBusy(false)}}
 const remove=async()=>{if(!selected)return;if(!window.confirm(`Excluir o fornecedor ${selected.razao_social}?`))return;setBusy(true);try{const {error:e}=await supabase.from('erp_fornecedores').delete().eq('id',selected.id).eq('empresa_id',empresaId);if(e)throw e;setSelected(null);setMessage('Fornecedor excluído.');await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível excluir o fornecedor.')}finally{setBusy(false)}}
 const download=async(path:string|null)=>{if(!path)return;const {data,error:e}=await supabase.storage.from('erp-fornecedor-certificados').createSignedUrl(path,300);if(e)throw e;window.open(data.signedUrl,'_blank','noopener,noreferrer')}
 const print=()=>window.print()
 return <VendasLayout title="Fornecedores" subtitle="Cadastro, qualificação e acompanhamento de entrega" onRefresh={()=>void load()}>
  <main style={{minHeight:'100vh',background:'#F4FBFD',color:'#111827',padding:10,boxSizing:'border-box'}}>
   <section style={{...panel,padding:9,marginBottom:7}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
      <div><div style={{fontSize:9,color:'#2D8DB8',fontWeight:700}}>COMPRAS • CADASTRO MESTRE</div><h1 style={{margin:'2px 0',fontSize:16,color:'#123B50',fontWeight:600}}>Fornecedores</h1><div style={{fontSize:9,color:'#667085'}}>Cadastro, qualificação, documentos e desempenho de entrega.</div></div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
       <button type="button" style={button('primary')} onClick={openNew}><Plus size={12}/>NOVO</button>
       <button type="button" style={button(selected?'normal':'disabled')} disabled={!selected} onClick={openEdit}><Pencil size={12}/>EDITAR</button>
       <button type="button" style={button(selected?'danger':'disabled')} disabled={!selected} onClick={()=>void remove()}><Trash2 size={12}/>EXCLUIR</button>
       <button type="button" style={button('normal')} onClick={()=>setFilterOpen(v=>!v)}><Filter size={12}/>FILTRO</button>
       <button type="button" style={button('normal')} onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/>ATUALIZAR</button>
       <button type="button" style={button('normal')} onClick={print}><Printer size={12}/>IMPRIMIR</button>
      </div>
    </div>
   </section>
   {filterOpen&&<section style={{...panel,padding:8,marginBottom:7,display:'grid',gridTemplateColumns:'minmax(260px,1fr) 150px auto',gap:7,alignItems:'end'}}>
    <label style={label}>PESQUISAR FORNECEDOR / CNPJ / CÓDIGO<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite para localizar" style={input}/></label>
    <label style={label}>STATUS DE ENTREGA<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={input}><option value="">Todos</option><option value="EM DIA">Em dia</option><option value="ATRASADO">Atrasado</option><option value="SEM PEDIDOS">Sem pedidos</option></select></label>
    <button type="button" style={button('normal')} onClick={()=>{setQuery('');setStatusFilter('')}}>LIMPAR FILTRO</button>
   </section>}
   {formOpen&&<form onSubmit={save} style={{...panel,padding:9,marginBottom:7}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}><div><div style={{fontSize:9,color:'#2D8DB8',fontWeight:700}}>CADASTRO DE FORNECEDOR</div><div style={{fontSize:13,color:'#123B50',fontWeight:600}}>{editing?'Editar fornecedor':'Novo fornecedor'}</div></div><button type="button" style={button('normal')} onClick={cancelForm}><X size={12}/>CANCELAR</button></div>
    <div style={{display:'grid',gridTemplateColumns:'90px minmax(180px,1.5fr) minmax(150px,1fr) 150px 190px 125px',gap:7}}>
      <label style={label}>CÓDIGO<input style={{...input,background:'#eaf3f8',color:'#17445A',fontWeight:700}} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
      <label style={label}>RAZÃO SOCIAL *<input required style={input} value={form.razao_social} onChange={e=>setForm({...form,razao_social:e.target.value})}/></label>
      <label style={label}>NOME FANTASIA<input style={input} value={form.nome_fantasia} onChange={e=>setForm({...form,nome_fantasia:e.target.value})}/></label>
      <label style={label}>CNPJ *<input style={input} inputMode="numeric" maxLength={18} value={formatCnpj(form.documento)} onChange={e=>setForm({...form,documento:digits(e.target.value).slice(0,14)})}/></label>
      <label style={label}>E-MAIL<input type="email" style={input} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label style={label}>TELEFONE<input style={input} value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></label>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(260px,2fr) 170px 55px 130px 120px 1fr',gap:7,marginTop:7}}>
      <label style={label}>ENDEREÇO<input style={input} value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})}/></label>
      <label style={label}>CONTATO RESPONSÁVEL<input style={input} value={form.contato} onChange={e=>setForm({...form,contato:e.target.value})}/></label>
      <label style={label}>UF<input style={input} maxLength={2} value={form.estado} onChange={e=>setForm({...form,estado:e.target.value.toUpperCase().slice(0,2)})}/></label>
      <label style={label}>CIDADE<input style={input} value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})}/></label>
      <label style={label}>Nº CERTIFICADO<input style={input} value={form.iso_certificado_numero} onChange={e=>setForm({...form,iso_certificado_numero:e.target.value})}/></label>
      <label style={label}>VALIDADE ISO<input type="date" style={input} value={form.iso_certificado_validade} onChange={e=>setForm({...form,iso_certificado_validade:e.target.value})}/></label>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'170px 170px 1fr',gap:7,marginTop:7,alignItems:'end'}}>
      <label style={{...label,display:'flex',alignItems:'center',height:30,border:'1px solid #b9c9d4',padding:'0 7px',background:'#fff'}}>ISO 9001 <input type="checkbox" checked={form.iso_9001_certificado} onChange={e=>setForm({...form,iso_9001_certificado:e.target.checked})}/></label>
      <label style={{...label,display:'flex',alignItems:'center',height:30,border:'1px solid #b9c9d4',padding:'0 7px',background:'#fff'}}>CERTIFICADO <input type="file" accept=".pdf,image/*" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)} style={{fontSize:8,maxWidth:115}}/></label>
      <label style={label}>OBSERVAÇÕES<input style={input} value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label>
    </div>
    <div style={{display:'flex',gap:5,justifyContent:'flex-end',marginTop:8}}><button type="button" style={button('normal')} onClick={()=>{setForm(empty);setFile(null)}}>LIMPAR</button><button type="submit" style={button('primary')} disabled={busy}><Check size={12}/>SALVAR FORNECEDOR</button></div>
   </form>}
   <section style={{...panel,overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 8px',borderBottom:'1px solid #d5dde7'}}><div style={{fontSize:9,fontWeight:600,color:'#123B50'}}>DBGRID • FORNECEDORES</div><span style={{fontSize:9,color:'#667085'}}>{filtered.length} registro(s)</span></div>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9,minWidth:900}}><thead><tr style={{background:'#123B50',color:'#fff'}}>{['Código','Fornecedor','CNPJ','Contato','Qualificação','Entrega','Situação'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:'left',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{filtered.map(r=>{const st=statusOf(r);return <tr key={r.id} onClick={()=>selectRow(r)} onDoubleClick={()=>loadForm(r)} style={{cursor:'pointer',background:selected?.id===r.id?'#e7eefb':'#fff',borderBottom:'1px solid #edf1f5'}}><td style={{padding:'5px 6px'}}>{r.codigo||'—'}</td><td style={{padding:'5px 6px',fontWeight:600}}>{r.razao_social}<div style={{fontSize:8,color:'#667085'}}>{r.nome_fantasia||'—'}</div></td><td style={{padding:'5px 6px'}}>{r.documento?formatCnpj(r.documento):'—'}</td><td style={{padding:'5px 6px'}}>{r.contato||r.email||r.telefone||'—'}</td><td style={{padding:'5px 6px'}}>{isoValido(r)?<span style={{display:'inline-flex',alignItems:'center',gap:3,color:'#9a6700'}}><Star size={10} fill="currentColor"/>ISO 9001</span>:'Sem ISO'}</td><td style={{padding:'5px 6px',fontWeight:600,color:st==='ATRASADO'?'#b42318':st==='EM DIA'?'#16794a':'#667085'}}>{st}</td><td style={{padding:'5px 6px',color:r.ativo?'#16794a':'#b42318'}}>{r.ativo?'ATIVO':'INATIVO'}</td></tr>})}{!filtered.length&&<tr><td colSpan={7} style={{padding:20,textAlign:'center',color:'#667085'}}>Nenhum fornecedor encontrado.</td></tr>}</tbody></table></div>
   </section>
  </main>
  <style>{`.supplier-page button:focus-visible,.supplier-page input:focus-visible,.supplier-page select:focus-visible{outline:2px solid #48B7C7;outline-offset:1px}@media(max-width:1000px){.supplier-page-form{grid-template-columns:1fr 1fr}}`}</style>
 </VendasLayout>
}
