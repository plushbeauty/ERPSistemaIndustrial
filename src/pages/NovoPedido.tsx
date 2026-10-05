import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, MailCheck, Paperclip, Plus, Save, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Cliente={id:string;codigo:string|null;nome:string;documento:string|null}
type Produto={id:string;codigo:string;nome:string;unidade:string;unidade_venda:string;estoque_atual:number;preco_venda:number|null;codigo_barras:string|null;referencia_interna:string|null}
type Transportadora={id:string;codigo:string;razao_social:string}
type Item={produto_id:string;codigo:string;descricao:string;quantidade:number;unidade:string;valor_unitario:number;desconto:number;estoque:number;preco_custo_industrial:number;codigo_cliente?:string}

const inputStyle='h-7 w-full rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const labelStyle='mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500'
const brl=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number.isFinite(v)?v:0)
const n=(v:string|number)=>Number(v)||0
const digits=(v:string)=>v.replace(/\D/g,'')
const maskCnpj=(v:string)=>{const d=digits(v).slice(0,14);return d.length<=2?d:d.length<=5?`${d.slice(0,2)}.${d.slice(2)}`:d.length<=8?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`:d.length<=12?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`:`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`}
const unit=(v:string)=>{const u=v.toUpperCase();if(['MT','M'].includes(u))return 'MT';if(['PÇ','PC','PCS'].includes(u))return 'PÇ';if(['LT','L'].includes(u))return 'LT';if(u==='MM')return 'MM';return u||'UN'}

function Field({label,width,grow=false,children}:{label:string;width?:string;grow?:boolean;children:ReactNode}){return <div className={`${width?'shrink-0':'min-w-0'} ${grow?'flex-1':''}`} style={width?{width}:undefined}><label className={labelStyle}>{label}</label>{children}</div>}

export default function NovoPedido(){
 const navigate=useNavigate()
 const [searchParams]=useSearchParams()
 const editOrderId=searchParams.get('pedido')
 const [empresaId,setEmpresaId]=useState(''),[clientes,setClientes]=useState<Cliente[]>([]),[produtos,setProdutos]=useState<Produto[]>([]),[transportadoras,setTransportadoras]=useState<Transportadora[]>([])
 const [edPedido,setEdPedido]=useState(''),[edDataEntrada,setEdDataEntrada]=useState(new Date().toISOString().slice(0,10)),[edDataEntrega,setEdDataEntrega]=useState('')
 const [pedidoCliente,setPedidoCliente]=useState(''),[observacoes,setObservacoes]=useState(''),[vendedorNome,setVendedorNome]=useState(''),[descontoPedido,setDescontoPedido]=useState('0')
 const [clienteModo,setClienteModo]=useState<'Código'|'CNPJ'>('Código'),[edCodigoCliente,setEdCodigoCliente]=useState(''),[edNomeCliente,setEdNomeCliente]=useState(''),[cliente,setCliente]=useState<Cliente|null>(null)
 const [edCondicaoPagamento,setEdCondicaoPagamento]=useState('001 - À Vista'),[edFormaPagto,setEdFormaPagto]=useState('001 - PIX'),[edCfop,setEdCfop]=useState('5101'),[edFreteTipo,setEdFreteTipo]=useState(''),[edOrigem,setEdOrigem]=useState('Telefone'),[transportadora,setTransportadora]=useState('')
 const [edCodigoInterno,setEdCodigoInterno]=useState(''),[edDescricaoProduto,setEdDescricaoProduto]=useState(''),[edCodigoClienteProduto,setEdCodigoClienteProduto]=useState(''),[edQuantidade,setEdQuantidade]=useState('1'),[edUnidade,setEdUnidade]=useState('UN'),[edValorUnitario,setEdValorUnitario]=useState('0'),[edDescontoPercentual,setEdDescontoPercentual]=useState('0'),[edPrecoCustoIndustrial,setEdPrecoCustoIndustrial]=useState('0')
 const [gridItens,setGridItens]=useState<Item[]>([]),[pedidoId,setPedidoId]=useState<string|null>(null),[frete,setFrete]=useState('0'),[outras,setOutras]=useState('0')
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[consulta,setConsulta]=useState<'cliente'|'produto'|'transportadora'|null>(null),[busca,setBusca]=useState('')
 const clienteRef=useRef<HTMLInputElement>(null),produtoRef=useRef<HTMLInputElement>(null),fileRef=useRef<HTMLInputElement>(null)

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const e=await supabase.rpc('erp_current_empresa_id');if(e.error||!e.data)throw e.error??new Error('Empresa não identificada.')
   const id=String(e.data);setEmpresaId(id)
   const [loadedClients,loadedProducts,loadedCarriers]=await Promise.all([
    fetchAllPages<Cliente>((from,to)=>supabase.from('erp_clientes').select('id,codigo,nome,documento',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('nome').range(from,to)),
    fetchAllPages<Produto>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,unidade,unidade_venda,estoque_atual,preco_venda,codigo_barras,referencia_interna',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<Transportadora>((from,to)=>supabase.from('erp_transportadoras').select('id,codigo,razao_social',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(from,to))
   ])
   setClientes(loadedClients);setProdutos(loadedProducts);setTransportadoras(loadedCarriers)
   if(editOrderId){
   const order=await supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,data_entrada,data_entrega_prometida,pedido_cliente,observacoes,condicao_pagamento,vendedor_nome,modalidade_frete,id_transportadora,via_entrada,cfop,forma_pagamento,desconto_valor,valor_frete,valor_outras_despesas').eq('id',editOrderId).eq('empresa_id',id).maybeSingle()
   if(order.error)throw order.error
   const row=order.data
   if(!row)throw new Error('O pedido não existe ou não pertence à empresa atual.')
   if(!['rascunho','aberto'].some(status=>String(row.status).toLowerCase().includes(status)))throw new Error('Somente pedidos em rascunho podem ser editados por este fluxo.')
   const carrierCode=loadedCarriers.find(carrier=>carrier.id===row.id_transportadora)?.codigo
   if(row.id_transportadora&&!carrierCode)throw new Error('A transportadora deste rascunho está inativa ou indisponível; ela precisa ser reativada antes da edição.')
   const customer=loadedClients.find(item=>item.id===row.cliente_id)
   if(!customer)throw new Error('O cliente deste pedido não está ativo ou não foi localizado na empresa.')
   const lines=await fetchAllPages<{produto_id:string;descricao:string;quantidade:number;valor_unitario:number;desconto:number|null;preco_custo_industrial:number|null;produto_cliente:string|null}>((from,to)=>supabase.from('erp_pedidos_venda_itens').select('produto_id,descricao,quantidade,valor_unitario,desconto,preco_custo_industrial,produto_cliente',{count:'exact'}).eq('empresa_id',id).eq('pedido_id',editOrderId).order('id').range(from,to))
   if(!lines.length)throw new Error('O rascunho não possui itens válidos para edição.')
   const draftItems:Item[]=lines.map(item=>{
    const product=loadedProducts.find(candidate=>candidate.id===item.produto_id)
    const price=Number(item.valor_unitario??0)
    const quantity=Number(item.quantidade??0)
    const storedDiscount=Number(item.desconto??0)
    return {
     produto_id:item.produto_id,
     codigo:product?.codigo??'',
     descricao:item.descricao,
     quantidade:quantity,
     unidade:unit(product?.unidade_venda||product?.unidade||'UN'),
     valor_unitario:price,
     desconto:quantity*price>0?storedDiscount/(quantity*price)*100:0,
     estoque:Number(product?.estoque_atual??0),
     preco_custo_industrial:Number(item.preco_custo_industrial??0),
     codigo_cliente:item.produto_cliente??''
    }
   })
   if(draftItems.some(item=>!item.codigo))throw new Error('Um ou mais produtos deste rascunho estão inativos ou não podem ser alterados.')
   setPedidoId(String(row.id));setEdPedido(String(row.numero));setCliente(customer)
   setEdCodigoCliente(customer.codigo??customer.documento??'');setEdNomeCliente(customer.nome)
   setEdDataEntrada(String(row.data_entrada??new Date().toISOString().slice(0,10)).slice(0,10))
   setEdDataEntrega(String(row.data_entrega_prometida??'').slice(0,10))
   setPedidoCliente(row.pedido_cliente??'');setObservacoes(row.observacoes??'');setVendedorNome(row.vendedor_nome??'')
   setEdCondicaoPagamento(row.condicao_pagamento??'');setEdFreteTipo(row.modalidade_frete??'')
   setEdOrigem(row.via_entrada??'Telefone');setEdCfop(row.cfop??'');setEdFormaPagto(row.forma_pagamento??'')
   setTransportadora(carrierCode??'')
   setDescontoPedido(String(Number(row.desconto_valor??0)))
   setFrete(String(Number(row.valor_frete??0)));setOutras(String(Number(row.valor_outras_despesas??0)))
   setGridItens(draftItems)
    setMessage(`Rascunho PV-${String(row.numero).padStart(6,'0')} carregado para edição.`)
   }
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar Novo Pedido.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 const clienteBusca=async(v:string)=>{const raw=v.trim(),q=clienteModo==='CNPJ'?digits(raw):raw.toLowerCase();const found=clientes.find(c=>clienteModo==='CNPJ'?digits(c.documento??'')===q:(c.codigo??'').toLowerCase()===q);if(found){setCliente(found);setEdNomeCliente(found.nome);setEdCodigoCliente(clienteModo==='CNPJ'?maskCnpj(found.documento??q):(found.codigo??q));setError('');return}if(clienteModo!=='CNPJ'||q.length!==14){setError('Cliente não localizado no cadastro.');return}setLoading(true);try{const r=await supabase.functions.invoke('consultar-cnpj',{body:{cnpj:q}});if(r.error)throw r.error;const data=r.data as {razao_social?:string};const ins=await supabase.from('erp_clientes').insert({empresa_id:empresaId,nome:data.razao_social??'',documento:q,ativo:true}).select('id,codigo,nome,documento').single();if(ins.error)throw ins.error;const novo=ins.data as Cliente;setClientes(v=>[novo,...v]);setCliente(novo);setEdNomeCliente(novo.nome);setEdCodigoCliente(maskCnpj(q));setMessage('Cliente consultado na internet e incluído no cadastro.')}catch(e){setError(e instanceof Error?e.message:'Falha na consulta pública do CNPJ.')}finally{setLoading(false)}}
 const produtoBusca=async(v:string)=>{const q=v.trim().toLowerCase();const p=produtos.find(x=>[x.codigo,x.codigo_barras,x.referencia_interna].filter(Boolean).some(y=>String(y).toLowerCase()===q));if(!p){setEdDescricaoProduto('');setError('Produto/SKU não localizado.');return}setEdDescricaoProduto(p.nome);setEdCodigoInterno(p.codigo);setEdUnidade(unit(p.unidade_venda||p.unidade));setEdValorUnitario(String(p.preco_venda??0));const custo=await supabase.rpc('erp_obter_custo_industrial_produto',{p_produto_id:p.id});if(!custo.error)setEdPrecoCustoIndustrial(String(Number(custo.data??0)));setError('');if(cliente){const r=await supabase.rpc('erp_calcular_preco_sugerido_venda',{p_cliente_id:cliente.id,p_produto_id:p.id});const row=Array.isArray(r.data)?r.data[0]:r.data;if(!r.error&&row?.preco_sugerido!=null)setEdValorUnitario(String(row.preco_sugerido))}}

 const add=async()=>{
  const p=produtos.find(x=>x.codigo===edCodigoInterno)
  const quantity=Number(edQuantidade),price=Number(edValorUnitario),discount=Number(edDescontoPercentual)
  if(!p||!Number.isFinite(quantity)||quantity<=0){setError('Informe um produto válido e quantidade maior que zero.');return}
  if(!Number.isFinite(price)||price<0||!Number.isFinite(discount)||discount<0||discount>100){setError('Informe preço e desconto válidos (desconto entre 0% e 100%).');return}
  let cost=n(edPrecoCustoIndustrial)
  if(cost===0){const result=await supabase.rpc('erp_obter_custo_industrial_produto',{p_produto_id:p.id});if(!result.error)cost=Number(result.data??0)}
  setGridItens(v=>[...v,{produto_id:p.id,codigo:p.codigo,descricao:p.nome,quantidade:quantity,unidade:edUnidade,valor_unitario:price,desconto:discount,estoque:n(p.estoque_atual),preco_custo_industrial:cost,codigo_cliente:edCodigoClienteProduto.trim()}])
  setEdCodigoInterno('');setEdDescricaoProduto('');setEdCodigoClienteProduto('');setEdQuantidade('1');setEdUnidade('UN');setEdValorUnitario('0');setEdDescontoPercentual('0');setEdPrecoCustoIndustrial('0');produtoRef.current?.focus()
 }
 const subtotal=gridItens.reduce((s,i)=>s+Math.max(i.quantidade*i.valor_unitario*(1-i.desconto/100),0),0),total=Math.max(subtotal-n(descontoPedido)+n(frete)+n(outras),0)

 const save=async(finalize:boolean)=>{
  if(finalize&&pedidoId){
    setLoading(true);setError('')
    try{
      const result=await supabase.rpc('erp_finalizar_rascunho_pedido_venda',{p_pedido_id:pedidoId})
      if(result.error)throw result.error
      navigate(`/vendas/pedido/${String(result.data)}`)
      return
    }catch(e){setError(e instanceof Error?e.message:'Falha ao finalizar o rascunho.')}
    finally{setLoading(false)}
   }
  if(!cliente){setError('Informe o cliente.');return}
  if(!gridItens.length){setError('Inclua pelo menos um item.');return}
  if(n(descontoPedido)>subtotal){setError('O desconto do pedido não pode ser maior que o subtotal.');return}
  setLoading(true);setError('')
  try{
   const commonPayload={
    p_cliente_id:cliente.id,
    p_itens:gridItens.map(i=>({produto_id:i.produto_id,quantidade:i.quantidade,valor_unitario:i.valor_unitario,desconto:Number((i.quantidade*i.valor_unitario*i.desconto/100).toFixed(2)),codigo_cliente:i.codigo_cliente??null,preco_custo_industrial:i.preco_custo_industrial})),
    p_data_entrada:edDataEntrada,p_data_entrega:edDataEntrega||null,p_pedido_cliente:pedidoCliente||null,
    p_observacoes:observacoes||null,p_condicao_pagamento:edCondicaoPagamento||null,p_vendedor_nome:vendedorNome||null,
    p_modalidade_frete:edFreteTipo||null,p_transportadora_id:transportadora?(transportadoras.find(t=>t.codigo===transportadora)?.id??null):null,
    p_via_entrada:edOrigem,p_cfop:edCfop,p_forma_pagamento:edFormaPagto,p_desconto:n(descontoPedido),
    p_valor_frete:n(frete),p_valor_outras_despesas:n(outras)
   }
   const result=finalize
    ?await supabase.rpc('erp_finalizar_pedido_venda',commonPayload)
    :await supabase.rpc('erp_gravar_rascunho_pedido_venda',{...commonPayload,p_pedido_id:pedidoId})
   if(result.error)throw result.error
   const savedId=String(result.data);setPedidoId(savedId)
   if(finalize){navigate(`/vendas/pedido/${savedId}`);return}
   const saved=await supabase.from('erp_pedidos_venda').select('numero').eq('id',savedId).maybeSingle()
   if(saved.error){setEdPedido('Rascunho salvo');setError(`Rascunho salvo, mas não foi possível consultar o número: ${saved.error.message}`)}
   else{setEdPedido(String(saved.data?.numero??'Rascunho salvo'));setMessage('Rascunho gravado no PostgreSQL.')}
  }catch(e){setError(e instanceof Error?e.message:'Falha ao gravar pedido.')}
  finally{setLoading(false)}
 }
 const importar=async()=>{setLoading(true);setError('');try{const r=await supabase.functions.invoke('vendas-importar-email',{body:{action:'drafts'}});if(r.error)throw r.error;setEdOrigem('E-mail');setMessage('Importação executada. Consulte o pedido retornado no banco para conferência.')}catch(e){setError(e instanceof Error?e.message:'Falha na importação de e-mail.')}finally{setLoading(false)}}
 const anexar=async(f:File)=>{if(!pedidoId){setError('Grave o pedido antes de anexar a origem.');return}setLoading(true);try{const path=empresaId+'/'+pedidoId+'/'+crypto.randomUUID()+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');const u=await supabase.storage.from('pedidos-origem').upload(path,f,{contentType:f.type||'application/octet-stream'});if(u.error)throw u.error;const a=await supabase.from('erp_pedidos_anexos').insert({empresa_id:empresaId,pedido_id:pedidoId,url_arquivo:path,nome_arquivo:f.name});if(a.error)throw a.error;setMessage('Origem anexada e auditada.')}catch(e){setError(e instanceof Error?e.message:'Falha ao anexar origem.')}finally{setLoading(false)}}
 const clientesFiltro=clientes.filter(c=>!busca||c.nome.toLowerCase().includes(busca.toLowerCase())||(c.codigo??'').toLowerCase().includes(busca.toLowerCase())).slice(0,40)
 const transportadorasFiltro=transportadoras.filter(t=>!busca||t.codigo.toLowerCase().includes(busca.toLowerCase())||t.razao_social.toLowerCase().includes(busca.toLowerCase())).slice(0,40)
 const produtosFiltro=produtos.filter(p=>{const q=busca.toLowerCase();return !q||p.codigo.toLowerCase().includes(q)||p.nome.toLowerCase().includes(q)||(p.referencia_interna??'').toLowerCase().includes(q)||(p.codigo_barras??'').toLowerCase().includes(q)}).slice(0,40)

 return <VendasLayout title="Novo Pedido de Venda" subtitle="Entrada comercial → estoque → PCP" onRefresh={()=>void load()}>
  <div id="frmNovoPedido" className="sales-order-form w-full space-y-3 bg-slate-50 text-sm">
   {(error||message)&&<div className={`border px-2 py-1 text-[10px] ${error?'border-red-200 bg-red-50 text-red-800':'border-green-200 bg-green-50 text-green-800'}`}>{error||message}</div>}
   <section className="rounded-md border border-gray-200 bg-white p-2">
    <div className="mb-2 text-sm font-semibold text-slate-800">Identificação do pedido</div>
    <div className="mb-2 flex items-end gap-2"><Field label="Nº Pedido" width="95px"><input id="edPedido" value={edPedido} readOnly className={`${inputStyle} bg-gray-100 font-bold border-dashed text-gray-500 cursor-not-allowed`}/></Field><Field label="Data Entrada" width="125px"><input id="edDataEntrada" type="date" value={edDataEntrada} onChange={e=>setEdDataEntrada(e.target.value)} className={inputStyle}/></Field><Field label="Tipo" width="80px"><select value={clienteModo} onChange={e=>{const m=e.target.value as 'Código'|'CNPJ';setClienteModo(m);setEdCodigoCliente('')}} className={inputStyle}><option>Código</option><option>CNPJ</option></select></Field><Field label="Código / CNPJ" width="120px"><div className="flex gap-1"><input id="edCodigoCliente" ref={clienteRef} value={clienteModo==='CNPJ'?maskCnpj(edCodigoCliente):edCodigoCliente} onChange={e=>setEdCodigoCliente(clienteModo==='CNPJ'?digits(e.target.value):e.target.value)} onBlur={e=>void clienteBusca(e.target.value)} className={inputStyle}/><button type="button" onClick={()=>{setBusca('');setConsulta('cliente')}} className="h-7 w-7 shrink-0 rounded border border-gray-200 bg-gray-100"><Search size={12}/></button></div></Field><Field label="Razão Social" grow><input id="edNomeCliente" value={edNomeCliente} readOnly className={inputStyle}/></Field></div>
    <div className="flex items-end gap-2"><Field label="Data Entrega" width="125px"><input id="edDataEntrega" type="date" value={edDataEntrega} onChange={e=>setEdDataEntrega(e.target.value)} className={inputStyle}/></Field><Field label="Condição" width="140px"><input id="edCondicaoPagamento" value={edCondicaoPagamento} onChange={e=>setEdCondicaoPagamento(e.target.value)} className={inputStyle}/></Field><Field label="Forma Pgto" width="140px"><input id="edFormaPagto" value={edFormaPagto} onChange={e=>setEdFormaPagto(e.target.value)} className={inputStyle}/></Field><Field label="CFOP" width="70px"><input id="edCfop" maxLength={4} value={edCfop} onChange={e=>setEdCfop(e.target.value.replace(/\D/g,'').slice(0,4))} className={inputStyle}/></Field><Field label="Frete" width="80px"><select id="edFreteTipo" value={edFreteTipo} onChange={e=>setEdFreteTipo(e.target.value)} className={inputStyle}><option value="">—</option><option value="CIF">CIF</option><option value="FOB">FOB</option></select></Field><Field label="Origem" width="100px"><select id="edOrigem" value={edOrigem} onChange={e=>setEdOrigem(e.target.value)} className={inputStyle}><option>E-mail</option><option>WhatsApp</option><option>Telefone</option><option>Representante</option></select></Field><Field label="Transportadora" grow><div className="flex gap-1"><input id="edTransportadora" value={transportadora} onChange={e=>setTransportadora(e.target.value)} className={inputStyle}/><button type="button" onClick={()=>{setBusca(transportadora);setConsulta("transportadora")}} className="h-7 w-7 shrink-0 rounded border border-gray-200 bg-gray-100"><Search size={12}/></button></div></Field></div>
   </section>
   <section className="sales-order-extras">
    <Field label="Referência do pedido do cliente" grow><input value={pedidoCliente} onChange={e=>setPedidoCliente(e.target.value)} className={inputStyle} placeholder="Nº da OC / pedido do cliente"/></Field>
    <Field label="Vendedor" grow><input value={vendedorNome} onChange={e=>setVendedorNome(e.target.value)} className={inputStyle} placeholder="Responsável comercial"/></Field>
    <Field label="Desconto do pedido (R$)" width="190px"><input type="number" min="0" step="0.01" value={descontoPedido} onChange={e=>setDescontoPedido(e.target.value)} className={inputStyle}/></Field>
    <Field label="Observações" grow><textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} className={inputStyle} rows={2} placeholder="Instruções comerciais ou de produção"/></Field>
   </section>
   <section className="sales-order-product-entry"><Field label="Código do produto" width="150px"><div className="flex gap-1"><input id="edCodigoInterno" ref={produtoRef} autoFocus value={edCodigoInterno} onChange={e=>setEdCodigoInterno(e.target.value)} onBlur={e=>void produtoBusca(e.target.value)} className={inputStyle}/><button type="button" onClick={()=>{setBusca('');setConsulta('produto')}} className="h-7 w-9 shrink-0 rounded border border-gray-200 bg-white" aria-label="Consultar produtos"><Search size={15}/></button></div></Field><Field label="Descrição do produto" grow><input id="edDescricaoProduto" value={edDescricaoProduto} readOnly className={inputStyle}/></Field><Field label="Código do cliente" width="150px"><input value={edCodigoClienteProduto} onChange={e=>setEdCodigoClienteProduto(e.target.value)} className={inputStyle}/></Field><Field label="Quantidade" width="105px"><input id="edQuantidade" type="number" min="0.001" step="any" value={edQuantidade} onChange={e=>setEdQuantidade(e.target.value)} className={inputStyle}/></Field><Field label="Unidade" width="90px"><select id="edUnidade" value={edUnidade} onChange={e=>setEdUnidade(e.target.value)} className={inputStyle}><option>MT</option><option>PÇ</option><option>LT</option><option>MM</option><option>UN</option></select></Field><Field label="Preço unitário" width="145px"><input id="edValorUnitario" type="number" min="0" step="0.01" value={edValorUnitario} onChange={e=>setEdValorUnitario(e.target.value)} className={inputStyle}/></Field><Field label="Desconto (%)" width="125px"><input id="edDescontoPercentual" type="number" min="0" max="100" step="0.01" value={edDescontoPercentual} onChange={e=>setEdDescontoPercentual(e.target.value)} className={inputStyle}/></Field><button id="btnAdicionarItem" type="button" onClick={()=>void add()} className="sales-button sales-button--primary self-end"><Plus size={16}/>Adicionar item</button></section>
   <section id="gridItens" className="sales-order-items overflow-auto rounded-md border border-gray-200 bg-white"><table className="w-full min-w-[1050px] border-collapse text-sm"><thead className="sticky top-0 bg-slate-700 text-white"><tr className="h-11"><th className="px-3 text-left font-medium">Item</th><th className="px-3 text-left font-medium">SKU</th><th className="px-3 text-left font-medium">Cód. cliente</th><th className="px-3 text-left font-medium">Produto</th><th className="px-3 text-right font-medium">Qtd.</th><th className="px-3 text-left font-medium">Un.</th><th className="px-3 text-right font-medium">Preço</th><th className="px-3 text-right font-medium">Desc.%</th><th className="px-3 text-right font-medium">Total</th><th className="px-3 text-right font-medium">Margem</th><th className="px-3 text-center font-medium">Ações</th></tr></thead><tbody>{gridItens.map((i,k)=><tr key={i.produto_id+'-'+k} className="h-12 border-t border-gray-200 even:bg-slate-50"><td className="px-3">{k+1}</td><td className="px-3">{i.codigo}</td><td className="px-3">{i.codigo_cliente||'—'}</td><td className="px-3">{i.descricao}</td><td className="px-3 text-right">{i.quantidade}</td><td className="px-3">{i.unidade}</td><td className="px-3 text-right">{brl(i.valor_unitario)}</td><td className="px-3 text-right">{i.desconto.toFixed(2)}</td><td className="px-3 text-right font-semibold">{brl(i.quantidade*i.valor_unitario*(1-i.desconto/100))}</td><td className="px-3 text-right font-semibold text-gray-500">{(()=>{const sale=i.quantidade*i.valor_unitario*(1-i.desconto/100),cost=i.quantidade*i.preco_custo_industrial;return sale>0?((sale-cost)/sale*100).toFixed(1)+'%':'0.0%'})()}</td><td className="px-3 text-center"><button type="button" aria-label={`Remover ${i.descricao}`} onClick={()=>setGridItens(v=>v.filter((_,x)=>x!==k))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white"><Trash2 size={15}/></button></td></tr>)}{!gridItens.length&&<tr><td colSpan={11} className="h-20 text-center text-sm text-gray-400">Nenhum item lançado.</td></tr>}</tbody></table></section>
   <section className="sales-order-totals flex items-end justify-between gap-4 rounded-sm border border-gray-200 bg-white p-4"><div className="flex flex-wrap items-end gap-3"><Field label="Frete (R$)" width="140px"><input type="number" min="0" step="0.01" value={frete} onChange={e=>setFrete(e.target.value)} className={inputStyle}/></Field><Field label="Outras despesas (R$)" width="170px"><input type="number" min="0" step="0.01" value={outras} onChange={e=>setOutras(e.target.value)} className={inputStyle}/></Field></div><div className="sales-totals-summary"><span>Subtotal<b>{brl(subtotal)}</b></span><span>Desconto<b>{brl(n(descontoPedido))}</b></span><span>Total do pedido<strong>{brl(total)}</strong></span></div></section>
   {pedidoId&&<div className="sales-api-note" role="status">Este pedido está salvo como rascunho. O serviço atual permite editar e gravar o rascunho, mas sua API de finalização cria um novo pedido; por isso a finalização não é oferecida nesta edição.</div>}
   <div className="sales-order-actions"><input ref={fileRef} type="file" className="hidden" accept=".eml,.msg,.pdf,.png,.jpg,.jpeg,.webp" onChange={e=>{const f=e.target.files?.[0];if(f)void anexar(f);e.currentTarget.value=''}}/><button id="btnAnexar" type="button" onClick={()=>fileRef.current?.click()} className="sales-button sales-button--secondary"><Paperclip size={15}/>Anexar origem</button><button id="btnImportarEmail" type="button" disabled={loading} onClick={()=>void importar()} className="sales-button sales-button--secondary"><MailCheck size={15}/>Importar e-mail</button><button id="btnGravar" type="button" disabled={loading} onClick={()=>void save(false)} className="sales-button sales-button--secondary"><Save size={15}/>{pedidoId?'Salvar alterações':'Salvar rascunho'}</button>{!pedidoId&&<button id="btnFinalizar" type="button" disabled={loading} onClick={()=>void save(true)} className="sales-button sales-button--primary"><Check size={16}/>Finalizar pedido</button>}<button id="btnLimpar" type="button" onClick={()=>{setGridItens([]);setPedidoId(null);setEdPedido('');setEdCodigoCliente('');setEdNomeCliente('');setCliente(null);setPedidoCliente('');setObservacoes('');setVendedorNome('');setDescontoPedido('0');setError('');setMessage('')}} className="sales-button sales-button--ghost"><Trash2 size={15}/>Limpar</button></div>
   {consulta&&<div className="fixed inset-0 z-50 flex items-start justify-center bg-black/10 pt-24" onMouseDown={()=>setConsulta(null)}><div className="w-[min(760px,92vw)] rounded-sm border border-gray-300 bg-white shadow-xl" onMouseDown={e=>e.stopPropagation()}><div className="flex h-8 items-center justify-between border-b px-2 text-[11px] font-bold"><span>{consulta==='cliente'?'CONSULTA DE CLIENTES':consulta==='transportadora'?'CONSULTA DE TRANSPORTADORAS':'CONSULTA DE PRODUTOS'}</span><button type="button" onClick={()=>setConsulta(null)} className="h-7 w-7 rounded border border-gray-200">×</button></div><div className="p-2"><input autoFocus value={busca} onChange={e=>setBusca(e.target.value)} className={inputStyle}/><div className="mt-2 max-h-72 overflow-auto border">{consulta==='cliente'?clientesFiltro.map(c=><button type="button" key={c.id} onClick={()=>{setCliente(c);setEdCodigoCliente(c.codigo??c.documento??'');setEdNomeCliente(c.nome);setConsulta(null)}} className="grid w-full grid-cols-[110px_1fr_160px] border-b px-2 py-1 text-left text-[10px] hover:bg-slate-50"><span>{c.codigo??''}</span><span>{c.nome}</span><span>{c.documento??''}</span></button>):consulta==='transportadora'?transportadorasFiltro.map(t=><button type="button" key={t.id} onClick={()=>{setTransportadora(t.codigo);setConsulta(null)}} className="grid w-full grid-cols-[120px_1fr] border-b px-2 py-1 text-left text-[10px] hover:bg-slate-50"><span>{t.codigo}</span><span>{t.razao_social}</span></button>):produtosFiltro.map(p=><button type="button" key={p.id} onClick={()=>{void produtoBusca(p.codigo);setConsulta(null)}} className="grid w-full grid-cols-[110px_1fr_70px_90px] border-b px-2 py-1 text-left text-[10px] hover:bg-slate-50"><span>{p.codigo}</span><span>{p.nome}</span><span>{unit(p.unidade_venda||p.unidade)}</span><span>{n(p.estoque_atual)}</span></button>)}</div></div></div></div>}
  </div>
 </VendasLayout>
}
