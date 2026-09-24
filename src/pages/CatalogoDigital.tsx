import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Product = {
  id: string
  codigo: string
  nome: string
  grupo: string | null
  subgrupo: string | null
  unidade: string
  peso_liquido: number
  peso_bruto: number
  estoque_atual: number
  foto_url: string | null
  observacoes: string | null
  preco_venda: number
}
type Client = { id: string; codigo: string | null; nome: string; email: string | null; tabela_preco_id: string | null }
type PriceTable = { id: string; codigo: string; nome: string }
type Price = { produto_id: string; preco: number }
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
const inputStyle:React.CSSProperties={height:34,border:'1px solid #BFD0D7',borderRadius:5,padding:'0 9px',background:'#fff',color:'#123B50',fontSize:12,outline:'none',boxSizing:'border-box',width:'100%'}
export default function CatalogoDigital(){
 const [products,setProducts]=useState<Product[]>([])
 const [clients,setClients]=useState<Client[]>([])
 const [tables,setTables]=useState<PriceTable[]>([])
 const [prices,setPrices]=useState<Price[]>([])
 const [clientId,setClientId]=useState('')
 const [tableId,setTableId]=useState('')
 const [query,setQuery]=useState('')
 const [group,setGroup]=useState('')
 const [subgroup,setSubgroup]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const [shareLink,setShareLink]=useState('')
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const empresa=await supabase.rpc('erp_current_empresa_id')
   if(empresa.error||!empresa.data)throw empresa.error??new Error('Empresa não identificada.')
   const id=String(empresa.data)
   const [p,c,t]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,grupo,subgrupo,unidade,peso_liquido,peso_bruto,estoque_atual,foto_url,observacoes,preco_venda').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_clientes').select('id,codigo,nome,email,tabela_preco_id').eq('empresa_id',id).eq('ativo',true).order('nome').limit(2000),
    supabase.from('erp_tabelas_preco').select('id,codigo,nome').eq('empresa_id',id).eq('ativo',true).order('nome').limit(500)
   ])
   if(p.error)throw p.error;if(c.error)throw c.error;if(t.error)throw t.error
   setProducts((p.data??[]) as Product[]);setClients((c.data??[]) as Client[]);setTables((t.data??[]) as PriceTable[])
   if(c.data?.[0]){setClientId(c.data[0].id);if(c.data[0].tabela_preco_id)setTableId(c.data[0].tabela_preco_id)}
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar catálogo.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 useEffect(()=>{
  if(!tableId){setPrices([]);return}
  void supabase.from('erp_tabelas_preco_itens').select('produto_id,preco').eq('tabela_preco_id',tableId).then(r=>{if(r.error)setError(r.error.message);else setPrices((r.data??[]) as Price[])})
 },[tableId])
 const selectedClient=clients.find(c=>c.id===clientId)
 const filtered=useMemo(()=>products.filter(p=>{
  const q=query.trim().toLowerCase()
  return (!q||`${p.codigo} ${p.nome} ${p.observacoes??''}`.toLowerCase().includes(q))&&(!group||p.grupo===group)&&(!subgroup||p.subgrupo===subgroup)
 }),[products,query,group,subgroup])
 const groups=useMemo(()=>Array.from(new Set(products.map(p=>p.grupo).filter((x):x is string=>Boolean(x)))).sort(),[products])
 const subgroups=useMemo(()=>Array.from(new Set(products.filter(p=>!group||p.grupo===group).map(p=>p.subgrupo).filter((x):x is string=>Boolean(x)))).sort(),[products,group])
 const priceFor=(p:Product)=>prices.find(x=>x.produto_id===p.id)?.preco??p.preco_venda??0
 const stockLabel=(qty:number)=>qty>0?'DISPONÍVEL':qty===0?'SEM ESTOQUE':'ESTOQUE NEGATIVO'
 const generateLink=async()=>{
  setError('');setMessage('')
  if(!clientId){setError('Selecione o cliente antes de gerar o link.');return}
  if(!tableId){setError('Selecione a tabela de preços do cliente antes de gerar o link.');return}
  setBusy(true)
  try{
   const r=await supabase.rpc('erp_catalogo_link_create',{p_cliente_id:clientId,p_tabela_preco_id:tableId,p_expira_em:null})
   if(r.error)throw r.error
   const token=String(r.data)
   const link=`${window.location.origin}/catalogo/publico?token=${encodeURIComponent(token)}`
   setShareLink(link);setMessage('Link comercial único gerado com a tabela de preços vinculada ao cliente.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar o link comercial.')}finally{setBusy(false)}
 }
 const whatsapp=()=>{if(!shareLink){setError('Gere o link do catálogo primeiro.');return}const text=`Olá, ${selectedClient?.nome??'cliente'}. Segue o catálogo digital industrial personalizado, com a tabela comercial vinculada: ${shareLink}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer')}
 const email=()=>{if(!shareLink){setError('Gere o link do catálogo primeiro.');return}const subject=encodeURIComponent('Catálogo Digital Industrial');const body=encodeURIComponent(`Olá, ${selectedClient?.nome??'cliente'}.\n\nSegue o nosso catálogo digital industrial personalizado:\n${shareLink}\n\nAtenciosamente,\nSGQ ERP Industrial`);window.location.href=`mailto:${selectedClient?.email??''}?subject=${subject}&body=${body}`}
 return <main style={{minHeight:'100vh',background:'#F4FBFD',color:'#123B50',fontFamily:'Inter,Roboto,Arial,sans-serif',padding:18}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:16,marginBottom:12}}>
   <div><div style={{fontSize:11,fontWeight:900,letterSpacing:'.08em',color:'#2D8DB8'}}>COMERCIAL / CATÁLOGO DIGITAL</div><h1 style={{margin:'3px 0',fontSize:22}}>Catálogo Digital Industrial</h1><p style={{margin:0,fontSize:12,color:'#607983'}}>Mostruário B2B conectado ao cadastro de produtos, estoque e tabela de preços.</p></div>
   <button type='button' disabled={busy} onClick={()=>void load()} style={{height:34,padding:'0 12px',border:'1px solid #BFD0D7',borderRadius:5,background:'#fff',fontWeight:800,color:'#123B50'}}>Atualizar</button>
  </header>
  {(error||message)&&<div style={{padding:'9px 12px',marginBottom:10,borderRadius:5,border:`1px solid ${error?'#F2B8B5':'#A7D8C1'}`,background:error?'#FFF7F6':'#F1FBF5',color:error?'#A32D25':'#176B45',fontSize:12,fontWeight:800}}>{error||message}</div>}
  <section style={{background:'#fff',border:'1px solid #D6E5EA',borderRadius:7,padding:12,marginBottom:12}}>
   <div style={{display:'grid',gridTemplateColumns:'minmax(230px,1.6fr) 160px 160px minmax(220px,1.4fr) 112px 112px',gap:8,alignItems:'end'}}>
    <label style={{display:'grid',gap:4,fontSize:11,fontWeight:800}}>Cliente<select style={inputStyle} value={clientId} onChange={e=>{const c=clients.find(x=>x.id===e.target.value);setClientId(e.target.value);if(c?.tabela_preco_id)setTableId(c.tabela_preco_id)}}><option value=''>Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.codigo??'—'} • {c.nome}</option>)}</select></label>
    <label style={{display:'grid',gap:4,fontSize:11,fontWeight:800}}>Grupo<select style={inputStyle} value={group} onChange={e=>{setGroup(e.target.value);setSubgroup('')}}><option value=''>Todos</option>{groups.map(x=><option key={x}>{x}</option>)}</select></label>
    <label style={{display:'grid',gap:4,fontSize:11,fontWeight:800}}>Categoria<select style={inputStyle} value={subgroup} onChange={e=>setSubgroup(e.target.value)}><option value=''>Todas</option>{subgroups.map(x=><option key={x}>{x}</option>)}</select></label>
    <label style={{display:'grid',gap:4,fontSize:11,fontWeight:800}}>Pesquisar código / descrição<input style={inputStyle} value={query} onChange={e=>setQuery(e.target.value)} placeholder='Digite para localizar rapidamente'/></label>
    <label style={{display:'grid',gap:4,fontSize:11,fontWeight:800}}>Tabela de preços<select style={inputStyle} value={tableId} onChange={e=>setTableId(e.target.value)}><option value=''>Selecione</option>{tables.map(t=><option key={t.id} value={t.id}>{t.codigo} • {t.nome}</option>)}</select></label>
    <button type='button' disabled={busy} onClick={()=>void generateLink()} style={{height:34,border:0,borderRadius:5,background:'#2D8DB8',color:'#fff',fontWeight:900,cursor:'pointer'}}>{busy?'Gerando…':'Gerar Link'}</button>
   </div>
   {shareLink&&<div style={{marginTop:9,display:'grid',gridTemplateColumns:'1fr 105px 105px',gap:7}}><input readOnly value={shareLink} style={inputStyle}/><button type='button' onClick={whatsapp} style={{...inputStyle,cursor:'pointer',fontWeight:900}}>WhatsApp</button><button type='button' onClick={email} style={{...inputStyle,cursor:'pointer',fontWeight:900}}>E-mail</button></div>}
  </section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
   {filtered.map(p=><article key={p.id} style={{background:'#fff',border:'1px solid #D6E5EA',borderRadius:7,overflow:'hidden',minWidth:0}}>
    <div style={{height:150,background:'#EDF5F7',display:'grid',placeItems:'center',overflow:'hidden'}}>{p.foto_url?<img src={p.foto_url} alt={p.nome} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:11,fontWeight:800,color:'#78919B'}}>SEM FOTO CADASTRADA</span>}</div>
    <div style={{padding:11}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'start'}}><strong style={{fontSize:13}}>{p.codigo}</strong><span style={{fontSize:10,fontWeight:900,padding:'3px 6px',borderRadius:4,background:p.estoque_atual>0?'#E8F7EF':'#FFF1F0',color:p.estoque_atual>0?'#176B45':'#A32D25'}}>{stockLabel(Number(p.estoque_atual||0))}</span></div>
     <h2 style={{margin:'5px 0 7px',fontSize:14,lineHeight:1.25}}>{p.nome}</h2>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:10,color:'#5D7680'}}><span>Grupo<br/><b style={{color:'#123B50'}}>{p.grupo||'—'}</b></span><span>Categoria<br/><b style={{color:'#123B50'}}>{p.subgrupo||'—'}</b></span><span>Peso líquido<br/><b style={{color:'#123B50'}}>{Number(p.peso_liquido||0).toLocaleString('pt-BR')} kg</b></span><span>Estoque<br/><b style={{color:'#123B50'}}>{Number(p.estoque_atual||0).toLocaleString('pt-BR')} {p.unidade}</b></span></div>
     <p style={{margin:'8px 0',fontSize:11,color:'#607983',minHeight:30}}>{p.observacoes||'Aplicação industrial não cadastrada.'}</p>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #E5EEF1',paddingTop:8}}><span style={{fontSize:10,color:'#6B838D'}}>Preço da tabela</span><strong style={{fontSize:16,color:'#2D8DB8'}}>{money(priceFor(p))}</strong></div>
    </div>
   </article>)}
  </section>
  {!filtered.length&&<div style={{padding:30,textAlign:'center',color:'#607983',background:'#fff',border:'1px solid #D6E5EA',borderRadius:7}}>Nenhum produto encontrado para os filtros atuais.</div>}
 </main>
}
