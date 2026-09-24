import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  unidade: string | null
  estoque_atual: number | null
  peso_liquido: number | null
  peso_bruto: number | null
  preco_venda: number | null
  foto_url: string | null
  categoria: string | null
  ncm: string | null
}

const money=(v:number|null)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v??0))
const Icon=({kind}:{kind:'wa'|'mail'|'search'})=>{
 if(kind==='search')return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
 if(kind==='mail')return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></svg>
 return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11.2a8.2 8.2 0 0 1-12.8 6.7L4 19l1.1-3.1A8.2 8.2 0 1 1 20 11.2Z"/><path d="M8.5 8.2c.3 1.9 1.4 3.4 3.1 4.5 1 .6 1.8.8 2.4.8.3 0 .7-.2 1-.5l.8-.9c.2-.2.2-.5-.1-.7l-1.5-.9c-.2-.1-.5-.1-.7.1l-.5.6c-.1.1-.3.1-.5 0-.8-.4-1.5-1.1-1.9-1.9-.1-.2-.1-.4 0-.5l.5-.5c.2-.2.2-.5.1-.7l-.9-1.5c-.1-.2-.4-.3-.7-.1l-.9.8c-.3.2-.4.6-.3 1.3Z"/></svg>
}

export default function CatalogoDigital(){
 const [products,setProducts]=useState<Product[]>([]),[query,setQuery]=useState(''),[category,setCategory]=useState('Todas'),[busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{const load=async()=>{setBusy(true);const {data,error:e}=await supabase.from('erp_produtos').select('id,codigo,nome,descricao,unidade,estoque_atual,peso_liquido,peso_bruto,preco_venda,foto_url,categoria,ncm').eq('ativo',true).order('codigo').limit(2000);if(e)throw e;setProducts((data??[]) as Product[]);setBusy(false)};void load().catch((e:unknown)=>{setBusy(false);setError(e instanceof Error?e.message:'Falha ao carregar o catálogo.')})},[])
 const categories=useMemo(()=>['Todas',...Array.from(new Set(products.map(p=>p.categoria).filter((v):v is string=>Boolean(v?.trim())))).sort()],[products])
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return products.filter(p=>(!q||[p.codigo,p.nome,p.descricao,p.ncm].join(' ').toLowerCase().includes(q))&&(category==='Todas'||p.categoria===category))},[products,query,category])
 const url=(p?:Product)=>{const base=window.location.origin+'/comercial/catalogo';return p?base+'?produto='+encodeURIComponent(p.codigo):base}
 const whatsapp=(p?:Product)=>{const text='Olá! Segue '+(p?p.codigo+' · '+p.nome:'o Catálogo Digital B2B')+': '+url(p);window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');setNotice('WhatsApp preparado com o link do catálogo.')}
 const email=(p?:Product)=>{const subject=encodeURIComponent(p?p.codigo+' · '+p.nome:'Catálogo Digital B2B');const body=encodeURIComponent('Olá,\n\nSegue o link para consulta comercial: '+url(p)+'\n\nAtenciosamente,');window.location.href='mailto:?subject='+subject+'&body='+body;setNotice('Cliente de e-mail preparado.')}
 const th={padding:'8px 7px',textAlign:'left' as const,borderBottom:'1px solid #dce7eb',fontSize:10}
 return <main style={{minHeight:'100%',background:'#F4FBFD',color:'#123B50',padding:14,fontFamily:'Inter,Roboto,Arial,sans-serif'}}>
  <header style={{background:'#123B50',color:'#fff',borderRadius:7,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
   <div><div style={{fontSize:9,opacity:.75,fontWeight:800,letterSpacing:'.08em'}}>COMERCIAL · B2B</div><h1 style={{margin:'2px 0',fontSize:20}}>Catálogo Digital</h1><p style={{margin:0,fontSize:11,opacity:.85}}>Produtos ativos do cadastro industrial, com estoque e dados comerciais reais.</p></div>
   <div style={{display:'flex',gap:6}}><button type="button" onClick={()=>whatsapp()} style={{display:'inline-flex',gap:6,alignItems:'center',border:0,borderRadius:5,padding:'8px 10px',background:'#3A9D78',color:'#fff',fontWeight:900,cursor:'pointer'}}><Icon kind="wa"/>WhatsApp</button><button type="button" onClick={()=>email()} style={{display:'inline-flex',gap:6,alignItems:'center',border:0,borderRadius:5,padding:'8px 10px',background:'#2D8DB8',color:'#fff',fontWeight:900,cursor:'pointer'}}><Icon kind="mail"/>E-mail</button></div>
  </header>
  <section style={{background:'#fff',border:'1px solid #dce7eb',borderRadius:7,padding:9,marginTop:8,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
   <div style={{position:'relative',flex:'1 1 320px'}}><span style={{position:'absolute',left:9,top:9,color:'#64748b'}}><Icon kind="search"/></span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar código, descrição ou NCM" style={{height:34,width:'100%',border:'1px solid #cbd5e1',borderRadius:5,padding:'0 9px 0 34px',boxSizing:'border-box',fontSize:12}}/></div>
   <select value={category} onChange={e=>setCategory(e.target.value)} style={{height:34,width:180,border:'1px solid #cbd5e1',borderRadius:5,padding:'0 8px',fontSize:12}}>{categories.map(c=><option key={c}>{c}</option>)}</select><span style={{fontSize:11,color:'#64748b',fontWeight:800}}>{visible.length} produto(s)</span>
  </section>
  {(error||notice)&&<div style={{marginTop:8,padding:8,borderRadius:5,background:error?'#fff5f5':'#f0fbf6',border:'1px solid '+(error?'#efb5b8':'#b7dfcf'),color:error?'#9d3037':'#24684f',fontSize:11,fontWeight:700}}>{error||notice}</div>}
  <section style={{marginTop:8,background:'#fff',border:'1px solid #dce7eb',borderRadius:7,overflow:'hidden'}}><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:980,fontSize:11}}>
   <thead><tr style={{background:'#eef7f9'}}>{['Produto','Descrição','UM','Peso líq.','Peso bruto','Estoque atual','Preço','Ações'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
   <tbody>{visible.map(p=><tr key={p.id} style={{borderBottom:'1px solid #edf2f4'}}>
    <td style={{padding:7,whiteSpace:'nowrap'}}><strong>{p.codigo}</strong><br/><span style={{color:'#64748b',fontSize:10}}>{p.ncm??'NCM não cadastrado'}</span></td>
    <td style={{padding:7,minWidth:280}}><strong>{p.nome}</strong>{p.descricao&&<div style={{color:'#64748b',marginTop:2}}>{p.descricao}</div>}</td><td style={{padding:7}}>{p.unidade??'—'}</td>
    <td style={{padding:7}}>{Number(p.peso_liquido??0).toLocaleString('pt-BR')} kg</td><td style={{padding:7}}>{Number(p.peso_bruto??0).toLocaleString('pt-BR')} kg</td>
    <td style={{padding:7,fontWeight:900,color:Number(p.estoque_atual??0)>0?'#3A9D78':'#D65B61'}}>{Number(p.estoque_atual??0).toLocaleString('pt-BR')}</td><td style={{padding:7,fontWeight:800,whiteSpace:'nowrap'}}>{money(p.preco_venda)}</td>
    <td style={{padding:7,whiteSpace:'nowrap'}}><button type="button" onClick={()=>whatsapp(p)} title="WhatsApp" style={{border:0,borderRadius:4,padding:6,marginRight:4,background:'#eaf7f1',color:'#2d805f',cursor:'pointer'}}><Icon kind="wa"/></button><button type="button" onClick={()=>email(p)} title="E-mail" style={{border:0,borderRadius:4,padding:6,background:'#eaf4f8',color:'#2D8DB8',cursor:'pointer'}}><Icon kind="mail"/></button></td>
   </tr>)}</tbody>
  </table></div>{busy&&<div style={{padding:18,textAlign:'center',fontSize:11,color:'#64748b'}}>Carregando produtos reais do Supabase...</div>}{!busy&&!visible.length&&<div style={{padding:30,textAlign:'center',fontSize:12,color:'#64748b'}}>Nenhum produto ativo corresponde à pesquisa.</div>}</section>
  <footer style={{padding:'8px 2px',color:'#64748b',fontSize:10}}>Catálogo baseado exclusivamente em registros ativos de <strong>erp_produtos</strong>. Nenhum produto ou estoque é fabricado pela interface.</footer>
 </main>
}
