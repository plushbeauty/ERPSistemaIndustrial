import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Plus, X, Trash2, RefreshCw, Printer, Filter } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Client={id:string;codigo:string|null;nome:string;documento:string|null;email:string|null;telefone:string|null;tipo_cliente:string|null;tabela_preco_id:string|null;desconto_padrao_percentual:number;ativo:boolean}
type PriceTable={id:string;codigo:string;nome:string;ativo:boolean}
type Form={codigo:string;nome:string;documento:string;email:string;telefone:string;tipo_cliente:string;tabela_preco_id:string;desconto_padrao_percentual:string;ativo:boolean}
const empty:Form={codigo:'',nome:'',documento:'',email:'',telefone:'',tipo_cliente:'PADRAO',tabela_preco_id:'',desconto_padrao_percentual:'0',ativo:true}
const input:React.CSSProperties={width:'100%',height:28,border:'1px solid #b9c9d4',borderRadius:2,padding:'0 6px',boxSizing:'border-box',background:'#fff',color:'#111827',fontSize:9,minWidth:0}
const label:React.CSSProperties={display:'grid',gap:1,fontSize:8,fontWeight:500,textTransform:'uppercase',color:'#344054',minWidth:0}
const panel:React.CSSProperties={background:'#fff',border:'1px solid #d5dde7',borderRadius:2}
const button=(kind:'primary'|'normal'|'danger'|'disabled'):React.CSSProperties=>({height:30,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5,border:'1px solid '+(kind==='primary'?'#2D8DB8':kind==='danger'?'#d65b61':'#b9c9d4'),borderRadius:2,padding:'0 8px',fontSize:9,fontWeight:600,cursor:kind==='disabled'?'not-allowed':'pointer',background:kind==='primary'?'#2D8DB8':kind==='danger'?'#fff5f5':'#fff',color:kind==='primary'?'#fff':kind==='danger'?'#b42318':'#123B50',opacity:kind==='disabled'?0.5:1})
export default function ClientesIndustrial(){
 const [empresaId,setEmpresaId]=useState(''),[rows,setRows]=useState<Client[]>([]),[tables,setTables]=useState<PriceTable[]>([]),[query,setQuery]=useState(''),[filterOpen,setFilterOpen]=useState(false),[statusFilter,setStatusFilter]=useState(''),[editing,setEditing]=useState<string|null>(null),[selected,setSelected]=useState<Client|null>(null),[form,setForm]=useState<Form>(empty),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setError('');try{const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa da sessão não identificada.');const id=String(empresa);setEmpresaId(id);const [c,t]=await Promise.all([supabase.from('erp_clientes').select('id,codigo,nome,documento,email,telefone,tipo_cliente,tabela_preco_id,desconto_padrao_percentual,ativo').eq('empresa_id',id).order('nome').limit(1000),supabase.from('erp_tabelas_preco').select('id,codigo,nome,ativo').eq('empresa_id',id).eq('ativo',true).order('nome')]);if(c.error)throw c.error;if(t.error)throw t.error;setRows((c.data??[]) as Client[]);setTables((t.data??[]) as PriceTable[])}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar clientes.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const filtered=useMemo(()=>rows.filter(r=>{const q=query.trim().toLowerCase();const text=`${r.codigo??''} ${r.nome} ${r.documento??''} ${r.email??''} ${r.telefone??''}`.toLowerCase();return (!q||text.includes(q))&&(!statusFilter||(statusFilter==='ATIVO'?r.ativo:!r.ativo))}),[rows,query,statusFilter])
 const openNew=()=>{setSelected(null);setEditing(null);setForm(empty);setMessage('');setError('')}
 const openEdit=()=>{if(!selected)return;setEditing(selected.id);setForm({codigo:selected.codigo??'',nome:selected.nome,documento:selected.documento??'',email:selected.email??'',telefone:selected.telefone??'',tipo_cliente:selected.tipo_cliente??'PADRAO',tabela_preco_id:selected.tabela_preco_id??'',desconto_padrao_percentual:String(selected.desconto_padrao_percentual??0),ativo:selected.ativo});setMessage('');setError('')}
 const save=async(e:FormEvent)=>{e.preventDefault();if(!empresaId){setError('Empresa da sessão não identificada. Atualize a tela e tente novamente.');return}setBusy(true);setError('');setMessage('');try{if(!form.nome.trim())throw new Error('Informe o nome/razão social.');const desconto=Number(form.desconto_padrao_percentual)||0;if(desconto<0||desconto>100)throw new Error('O desconto deve estar entre 0 e 100%.');const payload={empresa_id:empresaId,codigo:form.codigo.trim()||null,nome:form.nome.trim(),documento:form.documento.trim()||null,email:form.email.trim()||null,telefone:form.telefone.trim()||null,tipo_cliente:form.tipo_cliente.trim()||'PADRAO',tabela_preco_id:form.tabela_preco_id||null,desconto_padrao_percentual:desconto,ativo:form.ativo};const r=editing?await supabase.from('erp_clientes').update(payload).eq('id',editing).eq('empresa_id',empresaId):await supabase.from('erp_clientes').insert(payload);if(r.error)throw r.error;setMessage(editing?'Cliente atualizado com política comercial.':'Cliente cadastrado com política comercial.');setEditing(null);setForm(empty);await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o cliente.')}finally{setBusy(false)}}
 const remove=async()=>{if(!selected)return;if(!window.confirm(`Excluir o cliente ${selected.nome}?`))return;setBusy(true);setError('');setMessage('');try{const r=await supabase.from('erp_clientes').delete().eq('id',selected.id).eq('empresa_id',empresaId);if(r.error)throw r.error;setSelected(null);setMessage('Cliente excluído.');await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível excluir o cliente.')}finally{setBusy(false)}}
 const print=()=>window.print()
 return <VendasLayout title="" onRefresh={()=>void load()}>
  <main style={{minHeight:'100vh',background:'#F4FBFD',color:'#111827',padding:10,boxSizing:'border-box'}}>
   <section style={{...panel,padding:0,marginBottom:7,overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap',padding:9,background:'linear-gradient(115deg,#123B50 0%,#1C6387 45%,#2D8DB8 78%,#48B7C7 100%)',color:'#fff',boxShadow:'inset 0 1px 0 rgba(255,255,255,.22)'}}>
     <div><div style={{fontSize:9,color:'#c9f2ff',fontWeight:800,letterSpacing:'.08em'}}>COMERCIAL • CADASTRO MESTRE</div><h1 style={{margin:'2px 0',fontSize:16,color:'#fff',fontWeight:700}}>Clientes</h1><div style={{fontSize:9,color:'#e4f7ff'}}>Cadastro de clientes, contatos e política comercial.</div></div>
     <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      <button type="button" style={button('primary')} onClick={openNew}><Plus size={12}/>NOVO</button>
      <button type="button" style={button(selected?'normal':'disabled')} disabled={!selected} onClick={openEdit}><Pencil size={12}/>EDITAR</button>
      <button type="button" style={button(selected?'danger':'disabled')} disabled={!selected||busy} onClick={()=>void remove()}><Trash2 size={12}/>EXCLUIR</button>
      <button type="button" style={button('normal')} onClick={()=>setFilterOpen(v=>!v)}><Filter size={12}/>FILTRO</button>
      <button type="button" style={button('normal')} onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/>ATUALIZAR</button>
      <button type="button" style={button('normal')} onClick={print}><Printer size={12}/>IMPRIMIR</button>
     </div>
    </div>
    {(message||error)&&<div role="status" style={{padding:'6px 9px',fontSize:9,background:error?'#fff1f2':'#ecfdf5',color:error?'#b42318':'#047857',borderBottom:'1px solid #d5dde7'}}>{error||message}</div>}
   </section>
   {filterOpen&&<section style={{...panel,padding:8,marginBottom:7,display:'grid',gridTemplateColumns:'minmax(260px,1fr) 150px auto',gap:7,alignItems:'end'}}>
    <label style={label}>PESQUISAR CLIENTE / DOCUMENTO / CÓDIGO<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite para localizar" style={input}/></label>
    <label style={label}>SITUAÇÃO<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={input}><option value="">Todos</option><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></select></label>
    <button type="button" style={button('normal')} onClick={()=>{setQuery('');setStatusFilter('')}}><X size={12}/>LIMPAR FILTRO</button>
   </section>}
   <form onSubmit={save} style={{...panel,padding:9,marginBottom:7}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:7,flexWrap:'wrap'}}><div><div style={{fontSize:9,color:'#2D8DB8',fontWeight:700}}>CADASTRO DE CLIENTE</div><div style={{fontSize:13,color:'#123B50',fontWeight:600}}>{editing?'Editar cliente':'Novo cliente'}</div></div><div style={{fontSize:9,color:'#667085'}}>Estrutura alinhada ao cadastro de Fornecedores.</div></div>
    <div style={{display:'grid',gridTemplateColumns:'90px minmax(180px,1.5fr) minmax(150px,1fr) minmax(130px,1fr) minmax(150px,1fr) 120px',gap:7}}>
     <label style={label}>CÓDIGO<input style={input} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
     <label style={label}>NOME / RAZÃO SOCIAL *<input required style={input} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label>
     <label style={label}>CPF / CNPJ<input style={input} value={form.documento} onChange={e=>setForm({...form,documento:e.target.value})}/></label>
     <label style={label}>E-MAIL<input type="email" style={input} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
     <label style={label}>TELEFONE<input style={input} value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></label>
     <label style={label}>TIPO CLIENTE<input style={input} value={form.tipo_cliente} onChange={e=>setForm({...form,tipo_cliente:e.target.value})}/></label>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(180px,1fr) minmax(220px,1.5fr) 140px 130px',gap:7,marginTop:7}}>
     <label style={label}>TABELA DE PREÇO<select style={input} value={form.tabela_preco_id} onChange={e=>setForm({...form,tabela_preco_id:e.target.value})}><option value="">Preço base</option>{tables.map(t=><option key={t.id} value={t.id}>{t.codigo} • {t.nome}</option>)}</select></label>
     <div style={{display:'grid',gridTemplateColumns:'minmax(100px,1fr) minmax(100px,1fr)',gap:7}}>
      <label style={label}>DESCONTO PADRÃO %<input type="number" min="0" max="100" step="0.01" style={input} value={form.desconto_padrao_percentual} onChange={e=>setForm({...form,desconto_padrao_percentual:e.target.value})}/></label>
      <label style={label}>SITUAÇÃO<select style={input} value={form.ativo?'SIM':'NÃO'} onChange={e=>setForm({...form,ativo:e.target.value==='SIM'})}><option value="SIM">ATIVO</option><option value="NÃO">INATIVO</option></select></label>
     </div>
     <div style={{fontSize:9,color:'#667085',alignSelf:'end',paddingBottom:7}}>O desconto deve ficar entre 0 e 100%.</div>
     <div style={{display:'flex',justifyContent:'flex-end',gap:5,alignSelf:'end'}}>
      <button type="button" style={button('normal')} onClick={()=>{setForm(empty);setEditing(null);setError('');setMessage('')}}>LIMPAR</button>
      <button type="submit" style={button('primary')} disabled={busy}><Check size={12}/>SALVAR CLIENTE</button>
     </div>
    </div>
   </form>
   <section style={{...panel,overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 8px',borderBottom:'1px solid #d5dde7'}}><div style={{fontSize:9,fontWeight:600,color:'#123B50'}}>DBGRID • CLIENTES</div><span style={{fontSize:9,color:'#667085'}}>{filtered.length} registro(s)</span></div>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:9,minWidth:900}}><thead><tr style={{background:'#123B50',color:'#fff'}}>{['Código','Cliente','Documento','Tipo','Tabela de preço','Desconto','Situação'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:'left',fontSize:9,fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.id} onClick={()=>setSelected(r)} onDoubleClick={()=>{setSelected(r);setEditing(r.id);setForm({codigo:r.codigo??'',nome:r.nome,documento:r.documento??'',email:r.email??'',telefone:r.telefone??'',tipo_cliente:r.tipo_cliente??'PADRAO',tabela_preco_id:r.tabela_preco_id??'',desconto_padrao_percentual:String(r.desconto_padrao_percentual??0),ativo:r.ativo})}} style={{cursor:'pointer',background:selected?.id===r.id?'#e7eefb':'#fff',borderBottom:'1px solid #edf1f5'}}><td style={{padding:'5px 6px'}}>{r.codigo||'—'}</td><td style={{padding:'5px 6px',fontWeight:600}}>{r.nome}<div style={{fontSize:8,color:'#667085'}}>{r.email||r.telefone||'—'}</div></td><td style={{padding:'5px 6px'}}>{r.documento||'—'}</td><td style={{padding:'5px 6px'}}>{r.tipo_cliente||'PADRAO'}</td><td style={{padding:'5px 6px'}}>{tables.find(t=>t.id===r.tabela_preco_id)?.nome||'Preço base'}</td><td style={{padding:'5px 6px'}}>{Number(r.desconto_padrao_percentual||0).toFixed(2)}%</td><td style={{padding:'5px 6px',fontWeight:600,color:r.ativo?'#16794a':'#b42318'}}>{r.ativo?'ATIVO':'INATIVO'}</td></tr>)}{!filtered.length&&<tr><td colSpan={7} style={{padding:20,textAlign:'center',color:'#667085'}}>Nenhum cliente encontrado.</td></tr>}</tbody></table></div>
   </section>
  </main>
  <style>{'@media print{button{display:none!important}main{background:#fff!important;padding:0!important}}'}</style>
 </VendasLayout>
}
