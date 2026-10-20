/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: src/pages/ClientesIndustrial.tsx
- Status Atual: Revisão 4 (Controles h-9 e persistência preservada) — 20/10/2026
- Total de Linhas Gerado: 27 Desenvolverdor FernandoSch.
- Assinatura de Entrada (Primeiros 3 Imports): import { FormEvent, useEffect, useState } from 'react' | import { Check, Pencil, Plus, Search, X, Trash2, RefreshCw, Printer, Filter } from 'lucide-react' | import { supabase } from '../lib/supabaseClient'
- Regra de Negócio Incorporada: Cadastro real de cliente com tipo comercial, tabela de preço e desconto percentual padrão.
*/
import { FormEvent, useEffect, useState } from 'react'
import { Check, Pencil, Plus, X, Trash2, RefreshCw, Printer, Filter } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Client={id:string;codigo:string|null;nome:string;documento:string|null;email:string|null;telefone:string|null;tipo_cliente:string|null;tabela_preco_id:string|null;desconto_padrao_percentual:number;ativo:boolean}
type PriceTable={id:string;codigo:string;nome:string;ativo:boolean}
type Form={codigo:string;nome:string;documento:string;email:string;telefone:string;tipo_cliente:string;tabela_preco_id:string;desconto_padrao_percentual:string;ativo:boolean}
const empty:Form={codigo:'',nome:'',documento:'',email:'',telefone:'',tipo_cliente:'PADRAO',tabela_preco_id:'',desconto_padrao_percentual:'0',ativo:true}
const input:React.CSSProperties={width:'100%',height:36,border:'1px solid #b9c9d4',borderRadius:2,padding:'0 6px',boxSizing:'border-box',background:'#fff',color:'#111827',fontSize:10,minWidth:0}
const label:React.CSSProperties={display:'grid',gap:2,fontSize:9,fontWeight:700,textTransform:'uppercase',color:'#344054',minWidth:0}
const panel:React.CSSProperties={background:'#fff',border:'1px solid #c7dce8',borderRadius:2,boxShadow:'0 2px 7px rgba(18,59,80,.08)'}
const action=(primary=false,danger=false):React.CSSProperties=>({height:30,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:4,border:'1px solid '+(primary?'#2D8DB8':danger?'#d65b61':'#b9c9d4'),borderRadius:2,padding:'0 8px',fontSize:9,fontWeight:700,cursor:'pointer',background:primary?'#2D8DB8':danger?'#fff5f5':'#fff',color:primary?'#fff':danger?'#b42318':'#123B50',whiteSpace:'nowrap'})
export default function ClientesIndustrial(){
 const [rows,setRows]=useState<Client[]>([]),[tables,setTables]=useState<PriceTable[]>([]),[form,setForm]=useState<Form>(empty),[editing,setEditing]=useState<string|null>(null),[selected,setSelected]=useState<Client|null>(null),[show,setShow]=useState(false),[filterOpen,setFilterOpen]=useState(true),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setError('');try{const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa da sessão não identificada.');const id=String(empresa);const [c,t]=await Promise.all([supabase.from('erp_clientes').select('id,codigo,nome,documento,email,telefone,tipo_cliente,tabela_preco_id,desconto_padrao_percentual,ativo').eq('empresa_id',id).order('nome').limit(1000),supabase.from('erp_tabelas_preco').select('id,codigo,nome,ativo').eq('empresa_id',id).eq('ativo',true).order('nome')]);if(c.error)throw c.error;if(t.error)throw t.error;setRows((c.data??[]) as Client[]);setTables((t.data??[]) as PriceTable[])}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar clientes.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const filtered=rows.filter(r=>{const q=query.trim().toLowerCase();return !q||`${r.codigo??''} ${r.nome} ${r.documento??''}`.toLowerCase().includes(q)})
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{if(!form.nome.trim())throw new Error('Informe o nome/razão social.');const desconto=Number(form.desconto_padrao_percentual)||0;if(desconto<0||desconto>100)throw new Error('O desconto deve estar entre 0 e 100%.');const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa não identificada.');const payload={empresa_id:String(empresa),codigo:form.codigo.trim()||null,nome:form.nome.trim(),documento:form.documento.trim()||null,email:form.email.trim()||null,telefone:form.telefone.trim()||null,tipo_cliente:form.tipo_cliente.trim()||'PADRAO',tabela_preco_id:form.tabela_preco_id||null,desconto_padrao_percentual:desconto,ativo:form.ativo};const r=editing?await supabase.from('erp_clientes').update(payload).eq('id',editing):await supabase.from('erp_clientes').insert(payload);if(r.error)throw r.error;setShow(false);setMessage(editing?'Cliente atualizado com política comercial.':'Cliente cadastrado com política comercial.');await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o cliente.')}finally{setBusy(false)}}
 const edit=(r:Client)=>{setEditing(r.id);setForm({codigo:r.codigo??'',nome:r.nome,documento:r.documento??'',email:r.email??'',telefone:r.telefone??'',tipo_cliente:r.tipo_cliente??'PADRAO',tabela_preco_id:r.tabela_preco_id??'',desconto_padrao_percentual:String(r.desconto_padrao_percentual??0),ativo:r.ativo});setShow(true)}
 const open=()=>{setEditing(null);setForm(empty);setShow(true);setError('');setMessage('')}
 const openEdit=()=>{if(selected)edit(selected)}
 const remove=async()=>{if(!selected)return;if(!window.confirm(`Excluir o cliente ${selected.nome}?`))return;setBusy(true);setError('');setMessage('');try{const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa não identificada.');const r=await supabase.from('erp_clientes').delete().eq('id',selected.id).eq('empresa_id',String(empresa));if(r.error)throw r.error;setSelected(null);setMessage('Cliente excluído.');await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível excluir o cliente.')}finally{setBusy(false)}}
 const print=()=>window.print()
 return (
  <main style={{minHeight:'100vh',background:'#F4FBFD',color:'#123B50',padding:10,boxSizing:'border-box'}}>
    <div style={{maxWidth:1600,margin:'0 auto'}}>
      <section style={{...panel,overflow:'hidden',marginBottom:7}}>
        <div style={{padding:'9px 11px',background:'linear-gradient(115deg,#123B50 0%,#1C6387 45%,#2D8DB8 78%,#48B7C7 100%)',color:'#fff',boxShadow:'inset 0 1px 0 rgba(255,255,255,.22)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <div><div style={{fontSize:9,fontWeight:800,letterSpacing:'.08em',color:'#c9f2ff'}}>COMERCIAL • CADASTRO MESTRE</div><h1 style={{margin:'2px 0',fontSize:17,fontWeight:700}}>Clientes</h1><p style={{margin:0,fontSize:10,color:'#e4f7ff'}}>Cadastro de clientes, contatos e política comercial.</p></div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <button type="button" onClick={open} style={action(true)}><Plus size={12}/> NOVO CLIENTE</button>
              <button type="button" className="erp-edit-button" onClick={openEdit} disabled={!selected} style={{...action(),opacity:selected?1:.5,cursor:selected?'pointer':'not-allowed'}}><Pencil size={12}/> EDITAR</button>
              <button type="button" onClick={()=>void remove()} disabled={!selected||busy} style={{...action(false,true),opacity:selected?1:.5,cursor:selected?'pointer':'not-allowed'}}><Trash2 size={12}/> EXCLUIR</button>
              <button type="button" onClick={()=>setFilterOpen(v=>!v)} style={action()}><Filter size={12}/> FILTRO</button>
              <button type="button" onClick={()=>void load()} disabled={busy} style={{...action(),opacity:busy ? .5 : 1}}><RefreshCw size={12}/> ATUALIZAR</button>
              <button type="button" onClick={print} style={action()}><Printer size={12}/> IMPRIMIR</button>
            </div>
          </div>
        </div>
        {(message||error)&&<div style={{padding:'6px 10px',fontSize:10,background:error?'#fff1f2':'#ecfdf5',color:error?'#b42318':'#047857',borderBottom:'1px solid #d5e4ec'}}>{error||message}</div>}
      </section>
      <section style={{...panel,overflow:'hidden',marginBottom:7}}>
        <div style={{padding:'7px 9px',background:'linear-gradient(90deg,#e2f3fa,#f4fbfd)',borderBottom:'1px solid #c7dce8',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <strong style={{fontSize:10,color:'#123B50'}}>CONSULTA DE CLIENTES</strong><span style={{fontSize:9,color:'#466779'}}>{filtered.length} registro(s)</span>
        </div>
        {filterOpen&&<div style={{display:'grid',gridTemplateColumns:'minmax(240px,1fr) auto',gap:7,alignItems:'end',padding:8,background:'#f8fcfe',borderBottom:'1px solid #dce8ef'}}>
          <label style={label}>PESQUISAR CLIENTE / DOCUMENTO / CÓDIGO<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite para localizar" style={input}/></label>
          <button type="button" onClick={()=>setQuery('')} style={action()}><X size={12}/> LIMPAR</button>
        </div>}
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:780}}><thead><tr style={{background:'#123B50',color:'#fff'}}>{['Código','Cliente','Tipo','Tabela','Desconto','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:9,fontWeight:700}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(r=><tr key={r.id} onClick={()=>setSelected(r)} onDoubleClick={()=>edit(r)} style={{cursor:'pointer',background:selected?.id===r.id?'#d9eff9':'#fff',borderBottom:'1px solid #e3edf2'}}>
          <td style={{padding:'6px 8px'}}>{r.codigo||'—'}</td><td style={{padding:'6px 8px'}}><b style={{fontWeight:700}}>{r.nome}</b><small style={{display:'block',color:'#607987',fontSize:9}}>{r.documento||'—'}</small></td><td style={{padding:'6px 8px'}}>{r.tipo_cliente||'PADRAO'}</td><td style={{padding:'6px 8px'}}>{tables.find(t=>t.id===r.tabela_preco_id)?.nome||'Preço base'}</td><td style={{padding:'6px 8px'}}>{Number(r.desconto_padrao_percentual||0).toFixed(2)}%</td><td style={{padding:'6px 8px',color:r.ativo?'#16794a':'#b42318',fontWeight:700}}>{r.ativo?'ATIVO':'INATIVO'}</td>
        </tr>)}</tbody></table>{!filtered.length&&<div style={{padding:22,textAlign:'center',fontSize:10,color:'#607987'}}>Nenhum cliente encontrado.</div>}</div>
      </section>
    </div>
    {show&&<div style={{position:'fixed',inset:0,zIndex:30,background:'rgba(15,23,42,.58)',display:'grid',placeItems:'center',padding:12}}>
      <form onSubmit={save} style={{...panel,background:'#fafdff',padding:10,width:'min(760px,100%)',maxHeight:'92vh',overflowY:'auto'}}>
        <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'8px 10px',marginBottom:9,borderRadius:2,background:'linear-gradient(110deg,#123B50,#2D8DB8 70%,#48B7C7)',color:'#fff'}}><div><div style={{fontSize:9,fontWeight:700,color:'#d7f5ff'}}>COMERCIAL • CADASTRO MESTRE</div><h2 style={{margin:'2px 0',fontSize:15,fontWeight:700}}>{editing?'Editar cliente':'Novo cliente'}</h2></div><button type="button" onClick={()=>setShow(false)} style={{...action(),width:28,padding:0}}><X size={14}/></button></header>
        <div style={{display:'grid',gridTemplateColumns:'90px minmax(220px,2fr) minmax(120px,1fr)',gap:8}}>
          <label style={label}>CÓDIGO<input style={input} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
          <label style={label}>NOME / RAZÃO SOCIAL *<input required style={input} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label>
          <label style={label}>CPF / CNPJ<input style={input} value={form.documento} onChange={e=>setForm({...form,documento:e.target.value})}/></label>
          <label style={label}>E-MAIL<input type="email" style={input} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
          <label style={label}>TELEFONE<input style={input} value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></label>
          <label style={label}>TIPO DE CLIENTE<input style={input} value={form.tipo_cliente} onChange={e=>setForm({...form,tipo_cliente:e.target.value})}/></label>
          <label style={label}>TABELA DE PREÇO<select style={input} value={form.tabela_preco_id} onChange={e=>setForm({...form,tabela_preco_id:e.target.value})}><option value="">Preço base</option>{tables.map(t=><option key={t.id} value={t.id}>{t.codigo} • {t.nome}</option>)}</select></label>
          <label style={label}>DESCONTO %<input type="number" min="0" max="100" step="0.01" style={input} value={form.desconto_padrao_percentual} onChange={e=>setForm({...form,desconto_padrao_percentual:e.target.value})}/></label>
          <label style={label}>SITUAÇÃO<select style={input} value={form.ativo?'SIM':'NÃO'} onChange={e=>setForm({...form,ativo:e.target.value==='SIM'})}><option value="SIM">ATIVO</option><option value="NÃO">INATIVO</option></select></label>
        </div>
        <footer style={{display:'flex',justifyContent:'flex-end',gap:5,marginTop:10,paddingTop:8,borderTop:'1px solid #dce8ef'}}><button type="button" onClick={()=>setShow(false)} style={action()}><X size={12}/> CANCELAR</button><button disabled={busy} style={{...action(true),opacity:busy ? .5 : 1}}><Check size={12}/> SALVAR CLIENTE</button></footer>
      </form>
    </div>}
    <style>{`@media print{button{display:none!important}main{background:#fff!important;padding:0!important}}`}</style>
  </main>
)}
/* Revisão 3 registrada após validação estrutural do arquivo. */
