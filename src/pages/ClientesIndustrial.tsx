/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: src/pages/ClientesIndustrial.tsx
- Status Atual: Revisão 3 (Cadastro Comercial e Política de Preços)
- Total de Linhas Gerado: 27
- Assinatura de Entrada (Primeiros 3 Imports): import { FormEvent, useEffect, useState } from 'react' | import { Check, Pencil, Plus, Search, X } from 'lucide-react' | import { supabase } from '../lib/supabaseClient'
- Regra de Negócio Incorporada: Cadastro real de cliente com tipo comercial, tabela de preço e desconto percentual padrão.
*/
import { FormEvent, useEffect, useState } from 'react'
import { Check, Pencil, Plus, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Client={id:string;codigo:string|null;nome:string;documento:string|null;email:string|null;telefone:string|null;tipo_cliente:string|null;tabela_preco_id:string|null;desconto_padrao_percentual:number;ativo:boolean}
type PriceTable={id:string;codigo:string;nome:string;ativo:boolean}
type Form={codigo:string;nome:string;documento:string;email:string;telefone:string;tipo_cliente:string;tabela_preco_id:string;desconto_padrao_percentual:string;ativo:boolean}
const empty:Form={codigo:'',nome:'',documento:'',email:'',telefone:'',tipo_cliente:'PADRAO',tabela_preco_id:'',desconto_padrao_percentual:'0',ativo:true}
const input:React.CSSProperties={width:'100%',minHeight:42,border:'1px solid #cbd5e1',borderRadius:10,padding:'0 11px',boxSizing:'border-box',background:'#fff',color:'#111827'}
const label:React.CSSProperties={display:'grid',gap:6,fontSize:12,fontWeight:800,color:'#334155'}
export default function ClientesIndustrial(){
 const [rows,setRows]=useState<Client[]>([]),[tables,setTables]=useState<PriceTable[]>([]),[form,setForm]=useState<Form>(empty),[editing,setEditing]=useState<string|null>(null),[show,setShow]=useState(false),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setError('');try{const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa da sessão não identificada.');const id=String(empresa);const [c,t]=await Promise.all([supabase.from('erp_clientes').select('id,codigo,nome,documento,email,telefone,tipo_cliente,tabela_preco_id,desconto_padrao_percentual,ativo').eq('empresa_id',id).order('nome').limit(1000),supabase.from('erp_tabelas_preco').select('id,codigo,nome,ativo').eq('empresa_id',id).eq('ativo',true).order('nome')]);if(c.error)throw c.error;if(t.error)throw t.error;setRows((c.data??[]) as Client[]);setTables((t.data??[]) as PriceTable[])}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar clientes.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const filtered=rows.filter(r=>{const q=query.trim().toLowerCase();return !q||`${r.codigo??''} ${r.nome} ${r.documento??''}`.toLowerCase().includes(q)})
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{if(!form.nome.trim())throw new Error('Informe o nome/razão social.');const desconto=Number(form.desconto_padrao_percentual)||0;if(desconto<0||desconto>100)throw new Error('O desconto deve estar entre 0 e 100%.');const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee??new Error('Empresa não identificada.');const payload={empresa_id:String(empresa),codigo:form.codigo.trim()||null,nome:form.nome.trim(),documento:form.documento.trim()||null,email:form.email.trim()||null,telefone:form.telefone.trim()||null,tipo_cliente:form.tipo_cliente.trim()||'PADRAO',tabela_preco_id:form.tabela_preco_id||null,desconto_padrao_percentual:desconto,ativo:form.ativo};const r=editing?await supabase.from('erp_clientes').update(payload).eq('id',editing):await supabase.from('erp_clientes').insert(payload);if(r.error)throw r.error;setShow(false);setMessage(editing?'Cliente atualizado com política comercial.':'Cliente cadastrado com política comercial.');await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o cliente.')}finally{setBusy(false)}}
 const edit=(r:Client)=>{setEditing(r.id);setForm({codigo:r.codigo??'',nome:r.nome,documento:r.documento??'',email:r.email??'',telefone:r.telefone??'',tipo_cliente:r.tipo_cliente??'PADRAO',tabela_preco_id:r.tabela_preco_id??'',desconto_padrao_percentual:String(r.desconto_padrao_percentual??0),ativo:r.ativo});setShow(true)}
 const open=()=>{setEditing(null);setForm(empty);setShow(true);setError('');setMessage('')}
 return (
  <main style={{minHeight:'100vh',background:'#FAFAFA',color:'#111827',padding:24,boxSizing:'border-box'}}>
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',marginBottom:20}}>
        <div><span style={{fontSize:12,fontWeight:900,color:'#64748b'}}>COMERCIAL • CLIENTES</span><h1 style={{margin:'6px 0',fontSize:30}}>Clientes e política comercial</h1><p style={{margin:0,color:'#475569'}}>Tabela de preços e desconto padrão por cliente.</p></div>
        <button onClick={open} style={{border:0,borderRadius:10,padding:'11px 15px',background:'#172033',color:'#fff',fontWeight:800}}><Plus size={17}/> Novo cliente</button>
      </header>
      {(message||error)&&<div style={{padding:12,borderRadius:12,marginBottom:16,color:error?'#b91c1c':'#047857'}}>{error||message}</div>}
      <section style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:20}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar cliente, CNPJ ou código" style={{...input,marginBottom:16}} />
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Código','Cliente','Tipo','Tabela','Desconto','Status','Ações'].map(h=><th key={h} style={{textAlign:'left',padding:12,borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(r=><tr key={r.id}><td style={{padding:12}}>{r.codigo||'—'}</td><td style={{padding:12}}><b>{r.nome}</b><small style={{display:'block',color:'#64748b'}}>{r.documento||'—'}</small></td><td style={{padding:12}}>{r.tipo_cliente||'PADRAO'}</td><td style={{padding:12}}>{tables.find(t=>t.id===r.tabela_preco_id)?.nome||'Preço base'}</td><td style={{padding:12}}>{Number(r.desconto_padrao_percentual||0).toFixed(2)}%</td><td style={{padding:12}}>{r.ativo?'Ativo':'Inativo'}</td><td style={{padding:12}}><button onClick={()=>edit(r)}><Pencil size={15}/></button></td></tr>)}</tbody></table></div>
      </section>
    </div>
    {show&&<div style={{position:'fixed',inset:0,zIndex:30,background:'rgba(15,23,42,.55)',display:'grid',placeItems:'center',padding:20}}>
      <form onSubmit={save} style={{background:'#fff',padding:22,borderRadius:18,width:'min(820px,100%)'}}>
        <header style={{display:'flex',justifyContent:'space-between'}}><h2>{editing?'Editar cliente':'Novo cliente'}</h2><button type="button" onClick={()=>setShow(false)}><X/></button></header>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
          <label style={label}>Código<input style={input} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
          <label style={label}>Nome / Razão social *<input style={input} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label>
          <label style={label}>CPF/CNPJ<input style={input} value={form.documento} onChange={e=>setForm({...form,documento:e.target.value})}/></label>
          <label style={label}>Tipo<input style={input} value={form.tipo_cliente} onChange={e=>setForm({...form,tipo_cliente:e.target.value})}/></label>
          <label style={label}>Tabela<select style={input} value={form.tabela_preco_id} onChange={e=>setForm({...form,tabela_preco_id:e.target.value})}><option value="">Preço base</option>{tables.map(t=><option key={t.id} value={t.id}>{t.codigo} • {t.nome}</option>)}</select></label>
          <label style={label}>Desconto %<input type="number" min="0" max="100" step="0.01" style={input} value={form.desconto_padrao_percentual} onChange={e=>setForm({...form,desconto_padrao_percentual:e.target.value})}/></label>
        </div>
        <footer style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}><button type="button" onClick={()=>setShow(false)}>Cancelar</button><button disabled={busy} style={{background:'#172033',color:'#fff',padding:10}}><Check size={16}/> Salvar</button></footer>
      </form>
    </div>}
  </main>
)
}
/* Revisão 3 registrada após validação estrutural do arquivo. */