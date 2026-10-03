import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, MailCheck, Paperclip, Plus, Search, Save, Trash2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Cliente={id:string;codigo:string|null;nome:string;documento:string|null;fator_markup_comercial:number|null}
type Produto={id:string;codigo:string;nome:string;descricao:string|null;unidade:string;unidade_venda:string;estoque_atual:number;preco_venda:number|null;codigo_barras:string|null;referencia_interna:string|null}
type Transportadora={id:string;codigo:string;razao_social:string}
type Item={produto_id:string;codigo:string;descricao:string;quantidade:number;valor_unitario:number;desconto:number;estoque:number;unidade:string}
type PedidoItemDb={produto_id:string|null;descricao:string;quantidade:number;valor_unitario:number;desconto:number}
type SearchMode='cliente'|'produto'|null

const brl=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number.isFinite(v)?v:0)
const num=(v:string|number)=>Number(v)||0
const clean=(v:string)=>v.replace(/\D/g,'')
const cnpjValido=(v:string)=>{
 const d=clean(v); if(d.length!==14||/^([0-9])\\1+$/.test(d)) return false
 const calc=(base:string)=>{let sum=0,w=base.length-5;for(const x of base){sum+=Number(x)*w--;if(w===1)w=9}return sum%11<2?0:11-sum%11}
 return calc(d.slice(0,12))===Number(d[12])&&calc(d.slice(0,13))===Number(d[13])
}
const unidade=(v:string)=>{const u=v.toUpperCase();if(['MT','M','METRO','METROS'].includes(u))return 'MT';if(['PÇ','PC','PCS','PEÇA','UN'].includes(u))return u==='UN'?'UN':'PÇ';if(['LT','L','LITRO'].includes(u))return 'LT';if(['MM','MILÍMETRO','MILIMETRO'].includes(u))return 'MM';return u||'UN'}

export default function PedidoVendaCompleto(){
 const [empresaId,setEmpresaId]=useState('')
 const [clientes,setClientes]=useState<Cliente[]>([]),[produtos,setProdutos]=useState<Produto[]>([]),[transportadoras,setTransportadoras]=useState<Transportadora[]>([])
 const [numero,setNumero]=useState(''),[clienteBusca,setClienteBusca]=useState(''),[cliente,setCliente]=useState<Cliente|null>(null),[clienteNome,setClienteNome]=useState('')
 const [dataEntrada,setDataEntrada]=useState(new Date().toISOString().slice(0,10)),[dataEntrega,setDataEntrega]=useState('')
 const [condicao,setCondicao]=useState('001 - À Vista'),[formaPagamento,setFormaPagamento]=useState('001 - PIX'),[cfop,setCfop]=useState('5101')
 const [freteTipo,setFreteTipo]=useState<'CIF'|'FOB'|''>(''),[transportadoraBusca,setTransportadoraBusca]=useState(''),[transportadoraId,setTransportadoraId]=useState('')
 const [origem,setOrigem]=useState<'E-mail'|'WhatsApp'|'Telefone'|'Representante'>('Telefone')
 const [produtoBusca,setProdutoBusca]=useState(''),[produto,setProduto]=useState<Produto|null>(null),[quantidade,setQuantidade]=useState('1'),[preco,setPreco]=useState('0'),[desconto,setDesconto]=useState('0')
 const [items,setItems]=useState<Item[]>([]),[editIndex,setEditIndex]=useState<number|null>(null)
 const [searchMode,setSearchMode]=useState<SearchMode>(null),[searchTerm,setSearchTerm]=useState('')
 const [pedidoId,setPedidoId]=useState<string|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [frete,setFrete]=useState('0'),[outras,setOutras]=useState('0')
 const fileRef=useRef<HTMLInputElement>(null)
 const clienteRef=useRef<HTMLInputElement>(null),produtoRef=useRef<HTMLInputElement>(null)

 const load=async()=>{
  const e=await supabase.rpc('erp_current_empresa_id');if(e.error||!e.data)throw e.error??new Error('Empresa não identificada.')
  const id=String(e.data);setEmpresaId(id)
  const [c,p,t]=await Promise.all([
   supabase.from('erp_clientes').select('id,codigo,nome,documento,fator_markup_comercial').eq('empresa_id',id).eq('ativo',true).order('nome').limit(3000),
   supabase.from('erp_produtos').select('id,codigo,nome,descricao,unidade,unidade_venda,estoque_atual,preco_venda,codigo_barras,referencia_interna').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(5000),
   supabase.from('erp_transportadoras').select('id,codigo,razao_social').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(1000)
  ])
  if(c.error)throw c.error;if(p.error)throw p.error;if(t.error)throw t.error
  setClientes((c.data??[]) as Cliente[]);setProdutos((p.data??[]) as Produto[]);setTransportadoras((t.data??[]) as Transportadora[])
 }
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar vendas.'))},[])

 const resolveCliente=async(value:string)=>{
  const raw=value.trim();if(!raw)return
  const normalized=clean(raw)
  const found=clientes.find(c=>(c.codigo??'').toLowerCase()===raw.toLowerCase()||clean(c.documento??'')===normalized)
  if(found){setCliente(found);setClienteNome(found.nome);setClienteBusca(found.codigo??found.documento??raw);return}
  if(cnpjValido(raw)){
   try{
    const r=await supabase.functions.invoke('consultar-cnpj',{body:{cnpj:normalized}})
    if(!r.error&&r.data?.razao_social){
      const existing=await supabase.from('erp_clientes').select('id,codigo,nome,documento,fator_markup_comercial').eq('empresa_id',empresaId).eq('documento',normalized).eq('ativo',true).maybeSingle()
      if(existing.error)throw existing.error
      if(existing.data){setCliente(existing.data as Cliente);setClienteNome(existing.data.nome);setClienteBusca(normalized);return}
      const created=await supabase.from('erp_clientes').insert({empresa_id:empresaId,nome:String(r.data.razao_social),nome_fantasia:String(r.data.nome_fantasia||r.data.razao_social),documento:normalized,tipo_pessoa:'PJ',ativo:true}).select('id,codigo,nome,documento,fator_markup_comercial').single()
      if(created.error)throw created.error
      setCliente(created.data as Cliente);setClienteNome(created.data.nome);setClienteBusca(normalized);setMessage('Cliente criado a partir da consulta pública de CNPJ.')}
   }catch{setError('Cliente não localizado na base local e consulta externa indisponível.')}
  }else setError('Cliente não localizado.')
 }
 const resolveProduto=async(value:string)=>{
  const raw=value.trim().toLowerCase();if(!raw){setProduto(null);return}
  const found=produtos.find(p=>[p.codigo,p.codigo_barras,p.referencia_interna].filter(Boolean).some(v=>String(v).toLowerCase()===raw))
  if(!found){setProduto(null);setError('Produto/SKU não localizado no cadastro.');return}
  setProduto(found);setProdutoBusca(found.codigo);setPreco(String(found.preco_venda??0));setError('')
  if(cliente){
   const r=await supabase.rpc('erp_calcular_preco_sugerido_venda',{p_cliente_id:cliente.id,p_produto_id:found.id})
   if(!r.error){const row=Array.isArray(r.data)?r.data[0]:r.data;if(row?.preco_sugerido!=null)setPreco(String(row.preco_sugerido))}
  }
 }
 const searchClients=clientes.filter(c=>{const q=searchTerm.toLowerCase();return !q||c.nome.toLowerCase().includes(q)||(c.codigo??'').toLowerCase().includes(q)||clean(c.documento??'').includes(clean(q))}).slice(0,30)
 const searchProducts=produtos.filter(p=>{const q=searchTerm.toLowerCase();return !q||p.codigo.toLowerCase().includes(q)||p.nome.toLowerCase().includes(q)||(p.codigo_barras??'').includes(q)}).slice(0,30)

 const add=()=>{
  if(!produto||num(quantidade)<=0){setError('Informe um SKU válido e uma quantidade maior que zero.');return}
  const row:Item={produto_id:produto.id,codigo:produto.codigo,descricao:produto.nome,quantidade:num(quantidade),valor_unitario:num(preco),desconto:num(desconto),estoque:num(produto.estoque_atual),unidade:unidade(produto.unidade_venda||produto.unidade)}
  setItems(cur=>editIndex===null?[...cur,row]:cur.map((x,i)=>i===editIndex?row:x));setEditIndex(null);setProduto(null);setProdutoBusca('');setQuantidade('1');setPreco('0');setDesconto('0');produtoRef.current?.focus();setError('')
 }
 const editItem=(i:number)=>{const x=items[i];const p=produtos.find(v=>v.id===x.produto_id)||null;setProduto(p);setProdutoBusca(x.codigo);setQuantidade(String(x.quantidade));setPreco(String(x.valor_unitario));setDesconto(String(x.desconto));setEditIndex(i);produtoRef.current?.focus()}
 const subtotal=items.reduce((s,i)=>s+Math.max(i.quantidade*i.valor_unitario-i.desconto,0),0),total=Math.max(subtotal+num(frete)+num(outras),0)

 const payload=()=>items.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,valor_unitario:i.valor_unitario,desconto:i.desconto,codigo:i.codigo}))
 const save=async(finalize:boolean)=>{
  if(!cliente){setError('Informe o cliente pelo código ou CNPJ.');return}if(!items.length){setError('Inclua pelo menos um item.');return}
  setLoading(true);setError('');setMessage('')
  try{
   const r=await supabase.rpc(finalize?'erp_finalizar_pedido_venda':'erp_gravar_rascunho_pedido_venda',{
    p_pedido_id:pedidoId,p_cliente_id:cliente.id,p_itens:payload(),p_data_entrada:dataEntrada||null,p_data_entrega:dataEntrega||null,p_pedido_cliente:null,p_observacoes:null,p_condicao_pagamento:condicao||null,p_vendedor_nome:null,p_modalidade_frete:freteTipo||null,p_transportadora_id:transportadoraId||null,p_via_entrada:origem,p_cfop:cfop||null,p_forma_pagamento:formaPagamento||null,p_desconto:0,p_valor_frete:num(frete),p_valor_outras_despesas:num(outras)
   })
   if(r.error)throw r.error
   setPedidoId(String(r.data));setMessage(finalize?'Pedido finalizado e encaminhado ao fluxo industrial.':'Rascunho gravado no PostgreSQL.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao gravar pedido.')}finally{setLoading(false)}
 }
 const importEmail=async()=>{
  setLoading(true);setError('');setMessage('')
  try{
   const r=await supabase.functions.invoke('vendas-importar-email',{body:{action:'drafts'}});if(r.error)throw r.error
   const e=await supabase.rpc('erp_current_empresa_id');if(e.error||!e.data)throw e.error??new Error('Empresa não identificada.')
   const latest=await supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,data_entrada,data_entrega_prometida,via_entrada').eq('empresa_id',String(e.data)).eq('via_entrada','E-mail').order('created_at',{ascending:false}).limit(1).maybeSingle()
   if(latest.error)throw latest.error
   if(!latest.data){setMessage('Nenhum novo pedido de e-mail encontrado.');return}
   const cli=clientes.find(c=>c.id===latest.data.cliente_id)||null
   const its=await supabase.from('erp_pedidos_venda_itens').select('produto_id,descricao,quantidade,valor_unitario,desconto').eq('empresa_id',String(e.data)).eq('pedido_id',latest.data.id).order('id')
   if(its.error)throw its.error
   const mapped=(its.data??[]).map((x:PedidoItemDb)=>{const p=produtos.find(v=>v.id===x.produto_id);return {produto_id:x.produto_id??'',codigo:p?.codigo??'',descricao:x.descricao,quantidade:num(x.quantidade),valor_unitario:num(x.valor_unitario),desconto:num(x.desconto),estoque:num(p?.estoque_atual),unidade:unidade(p?.unidade_venda||p?.unidade||'UN')}}).filter(x=>x.produto_id)
   setPedidoId(latest.data.id);setNumero(String(latest.data.numero));setOrigem('E-mail');setDataEntrada(latest.data.data_entrada);setDataEntrega(latest.data.data_entrega_prometida??'');setItems(mapped);if(cli){setCliente(cli);setClienteNome(cli.nome);setClienteBusca(cli.codigo??cli.documento??'')}
   setMessage('Pedido de e-mail carregado para conferência.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao importar pedido de e-mail.')}finally{setLoading(false)}
 }
 const attach=async(file:File)=>{
  if(!pedidoId){setError('Grave o pedido antes de anexar a origem.');return}
  setLoading(true);setError('')
  try{
   const path=`${empresaId}/${pedidoId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
   const up=await supabase.storage.from('pedidos-origem').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(up.error)throw up.error
   const ins=await supabase.from('erp_pedidos_anexos').insert({empresa_id:empresaId,pedido_id:pedidoId,url_arquivo:path,nome_arquivo:file.name});if(ins.error)throw ins.error
   setMessage('Anexo de origem gravado para auditoria.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao anexar arquivo.')}finally{setLoading(false)}
 }
 const resolveTransportadora=()=>{const found=transportadoras.find(t=>t.codigo.toLowerCase()===transportadoraBusca.trim().toLowerCase());if(found){setTransportadoraId(found.id);setTransportadoraBusca(found.codigo)}}
 const clear=()=>{setItems([]);setPedidoId(null);setNumero('');setCliente(null);setClienteNome('');setClienteBusca('');setProduto(null);setProdutoBusca('');setOrigem('Telefone');setMessage('');setError('');setFrete('0');setOutras('0');setNumero('')}
 return <VendasLayout title="Novo Pedido de Venda" subtitle="Entrada comercial → estoque → PCP" onRefresh={()=>void load()}>
  <div className="mx-auto max-w-[1500px] space-y-1.5 text-[11px]">
   {(error||message)&&<div className={`border px-2 py-1 text-[10px] ${error?'border-red-200 bg-red-50 text-red-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error||message}</div>}
   <section className="border border-slate-300 bg-white p-2">
    <div className="mb-1 text-[10px] font-bold uppercase text-slate-600">IDENTIFICAÇÃO DO PEDIDO</div>
    <div className="grid grid-cols-[72px_100px_minmax(170px,1.4fr)_minmax(170px,1fr)_105px_125px_95px_125px_80px_85px_150px] gap-1.5 items-end">
     <Field label="Nº Pedido"><input value={numero} readOnly placeholder="auto"/></Field>
     <Field label="Data Entrada"><input type="date" value={dataEntrada} onChange={e=>setDataEntrada(e.target.value)}/></Field>
     <Field label="Cliente • Código/CNPJ"><div className="flex gap-1"><input className="h-7 w-full border border-slate-300 bg-white px-1.5 text-[11px]" ref={clienteRef} value={clienteBusca} onChange={e=>setClienteBusca(e.target.value)} onBlur={e=>void resolveCliente(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void resolveCliente(clienteBusca)}}/><button type="button" title="Pesquisar cliente" onClick={()=>{setSearchMode('cliente');setSearchTerm('');setSearchMode('cliente')}} className="h-7 w-7 shrink-0 border bg-white"><Search size={12}/></button></div></Field>
     <Field label="Razão Social"><input readOnly value={clienteNome}/></Field>
     <Field label="Entrega"><input type="date" value={dataEntrega} onChange={e=>setDataEntrega(e.target.value)}/></Field>
     <Field label="Condição"><input value={condicao} onChange={e=>setCondicao(e.target.value)}/></Field>
     <Field label="Forma Pgto."><input value={formaPagamento} onChange={e=>setFormaPagamento(e.target.value)}/></Field>
     <Field label="CFOP"><input maxLength={4} value={cfop} onChange={e=>setCfop(e.target.value.replace(/\D/g,'').slice(0,4))}/></Field>
     <Field label="Frete"><select value={freteTipo} onChange={e=>setFreteTipo(e.target.value as 'CIF'|'FOB'|'')}><option value="">—</option><option>CIF</option><option>FOB</option></select></Field>
     <Field label="Origem"><select value={origem} onChange={e=>setOrigem(e.target.value as typeof origem)}><option>E-mail</option><option>WhatsApp</option><option>Telefone</option><option>Representante</option></select></Field>
     <Field label="Transportadora"><input value={transportadoraBusca} onChange={e=>setTransportadoraBusca(e.target.value)} onBlur={resolveTransportadora} placeholder="código"/></Field>
    </div>
    {searchMode==='cliente'&&<SearchPanel title="CONSULTA DE CLIENTES" value={searchTerm} setValue={setSearchTerm} onClose={()=>setSearchMode(null)}><table className="w-full text-[10px]"><thead><tr className="bg-slate-100 text-left"><th className="p-1">Código</th><th>Razão Social</th><th>CNPJ</th></tr></thead><tbody>{searchClients.map(c=><tr key={c.id} onMouseDown={()=>{setCliente(c);setClienteBusca(c.codigo??c.documento??'');setClienteNome(c.nome);setSearchMode(null)}} className="cursor-pointer border-t hover:bg-slate-50"><td className="p-1">{c.codigo??''}</td><td>{c.nome}</td><td>{c.documento??''}</td></tr>)}</tbody></table></SearchPanel>}
   </section>

   <section className="border border-slate-300 bg-[#E9ECEF] p-2">
    <div className="grid grid-cols-[155px_minmax(240px,1fr)_70px_115px_70px_32px] gap-1.5 items-end">
     <Field label="Cód. Produto / SKU"><input ref={produtoRef} autoFocus value={produtoBusca} onChange={e=>setProdutoBusca(e.target.value)} onBlur={e=>void resolveProduto(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void resolveProduto(produtoBusca)}}/></Field>
     <Field label="Descrição do Produto"><input readOnly value={produto?.nome??''}/></Field>
     <Field label="Qtd"><input type="number" min="0.001" step="0.001" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></Field>
     <Field label="Preço Unitário"><input type="number" min="0" step="0.0001" value={preco} onChange={e=>setPreco(e.target.value)}/></Field>
     <Field label="Desconto %"><input type="number" min="0" step="0.01" value={desconto} onChange={e=>setDesconto(e.target.value)}/></Field>
     <button type="button" title={editIndex===null?'Adicionar':'Aplicar'} onClick={add} className="flex h-7 w-8 items-center justify-center border border-[#2D8DB8] bg-[#2D8DB8] text-white"><Plus size={12}/></button>
    </div>
    {produto&&<div className="mt-1 flex items-center gap-3 text-[9px] text-slate-600"><span>UN <b>{unidade(produto.unidade_venda||produto.unidade)}</b></span><span>Estoque <b>{num(produto.estoque_atual)}</b></span><span>{num(quantidade)>num(produto.estoque_atual)?'🔴 NECESSITA PCP':'🟢 DISPONÍVEL'}</span><button type="button" onClick={()=>{setSearchMode('produto');setSearchTerm('')}} className="border bg-white px-1.5 py-0.5">Consultar SKU</button></div>}
    {searchMode==='produto'&&<SearchPanel title="CONSULTA DE PRODUTOS / SKU" value={searchTerm} setValue={setSearchTerm} onClose={()=>setSearchMode(null)}><table className="w-full text-[10px]"><thead><tr className="bg-slate-100 text-left"><th className="p-1">SKU</th><th>Descrição</th><th>UN</th><th>Estoque</th></tr></thead><tbody>{searchProducts.map(p=><tr key={p.id} onMouseDown={()=>{void resolveProduto(p.codigo);setSearchMode(null)}} className="cursor-pointer border-t hover:bg-slate-50"><td className="p-1">{p.codigo}</td><td>{p.nome}</td><td>{unidade(p.unidade_venda||p.unidade)}</td><td>{num(p.estoque_atual)}</td></tr>)}</tbody></table></SearchPanel>}
   </section>

   <section className="overflow-x-auto border border-slate-300 bg-white">
    <table className="w-full min-w-[980px] border-collapse text-[10px]"><thead><tr className="bg-[#DEE2E6] text-left uppercase"><th className="p-1.5">SKU</th><th>Descrição</th><th>Qtd</th><th>UN</th><th>Preço</th><th className="tablet-hide-column">Desc.</th><th>Total</th><th>Estoque</th><th>Ações</th></tr></thead>
     <tbody>{items.map((i,idx)=><tr key={`${i.produto_id}-${idx}`} className="border-t"><td className="p-1.5 font-semibold">{i.codigo}</td><td>{i.descricao}</td><td>{i.quantidade}</td><td>{i.unidade}</td><td>{brl(i.valor_unitario)}</td><td className="tablet-hide-column">{brl(i.desconto)}</td><td>{brl(Math.max(i.quantidade*i.valor_unitario-i.desconto,0))}</td><td>{i.quantidade>i.estoque?<span className="font-bold text-red-600">PRODUZIR</span>:<span className="font-bold text-emerald-700">ESTOQUE</span>}</td><td><button type="button" onClick={()=>editItem(idx)} className="mr-1 h-6 w-6 border">✎</button><button type="button" onClick={()=>setItems(cur=>cur.filter((_,n)=>n!==idx))} className="h-6 w-6 border text-red-700"><Trash2 size={11}/></button></td></tr>)}</tbody>
    </table>{!items.length&&<div className="p-4 text-center text-[10px] text-slate-500">Nenhum item lançado.</div>}
   </section>

   <section className="flex items-end justify-between gap-2 border border-slate-300 bg-white p-2">
    <div className="flex items-end gap-2"><Field label="Frete R$"><input className="w-24" type="number" value={frete} onChange={e=>setFrete(e.target.value)}/></Field><Field label="Outras R$"><input className="w-24" type="number" value={outras} onChange={e=>setOutras(e.target.value)}/></Field><div className="px-2 text-[10px]">Subtotal<strong className="ml-2">{brl(subtotal)}</strong></div><div className="px-2 text-[10px]">Total<strong className="ml-2 text-[14px] text-[#17445A]">{brl(total)}</strong></div></div>
    <div className="flex items-center gap-1">
     <input ref={fileRef} type="file" className="hidden" accept=".eml,.pdf,.png,.jpg,.jpeg,.webp" onChange={e=>{const f=e.target.files?.[0];if(f)void attach(f);e.currentTarget.value=''}}/>
     <button type="button" disabled={loading} onClick={()=>fileRef.current?.click()} className="flex h-7 items-center gap-1 border px-2 text-[10px]"><Paperclip size={12}/>Anexar Origem</button>
     <button type="button" disabled={loading} onClick={()=>void importEmail()} className="flex h-7 items-center gap-1 border border-[#3A9D78] bg-[#3A9D78] px-2 text-[10px] text-white whitespace-nowrap"><MailCheck size={12} style={{marginRight:'4px'}}/>Importar E-mail</button>
     <button type="button" disabled={loading} onClick={()=>void save(false)} className="flex h-7 items-center gap-1 border px-2 text-[10px]"><Save size={12}/>Salvar rascunho</button>
     <button type="button" disabled={loading} onClick={()=>void save(true)} className="flex h-7 items-center gap-1 bg-[#3A9D78] px-2 text-[10px] font-semibold text-white"><CheckCircle2 size={12}/>Finalizar pedido</button>
     <button type="button" onClick={clear} className="flex h-7 items-center gap-1 border px-2 text-[10px]"><XCircle size={12}/>Limpar</button>
    </div>
   </section>
  </div>
 </VendasLayout>
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="min-w-0 text-[9px] font-semibold uppercase text-slate-500">{label}<span className="mt-0.5 block [&>input]:h-7 [&>input]:w-full [&>input]:border [&>input]:border-slate-300 [&>input]:bg-white [&>input]:px-1.5 [&>input]:text-[11px] [&>input]:font-normal [&>select]:h-7 [&>select]:w-full [&>select]:border [&>select]:border-slate-300 [&>select]:bg-white [&>select]:px-1.5 [&>select]:text-[11px] [&>select]:font-normal">{children}</span></label>}
function SearchPanel({title,value,setValue,onClose,children}:{title:string;value:string;setValue:(v:string)=>void;onClose:()=>void;children:ReactNode}){return <div className="mt-1 border border-slate-400 bg-white p-1.5 shadow-sm"><div className="mb-1 flex items-center gap-1"><b className="text-[9px]">{title}</b><input autoFocus value={value} onChange={e=>setValue(e.target.value)} className="ml-auto h-6 w-64 border px-1 text-[10px]"/><button type="button" onClick={onClose} className="h-6 w-6 border text-[10px]">×</button></div><div className="max-h-52 overflow-auto">{children}</div></div>}
