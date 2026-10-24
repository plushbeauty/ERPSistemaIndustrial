import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Row = Record<string, unknown>
type Product = { id: string; codigo: string; nome: string; unidade: string | null; unidade_compra: string | null }
type Supplier = { id: string; razao_social: string; documento: string | null; email: string | null }

const columns: Record<string, Array<[string, string]>> = {
  Requisições: [['Código','codigo'],['Status','status'],['Urgência','nivel_urgencia'],['Centro de custo','centro_custo'],['OP','ordem_producao_id'],['Criada em','created_at']],
  'Alertas MRP': [['Código','codigo'],['Material','nome'],['Nível','nivel'],['Estoque','estoque_atual'],['Reservado PCP','reservado'],['Disponível','quantidade_disponivel'],['Necessidade líquida','necessidade_liquida'],['Sugestão','sugestao']],
  Cotações: [['Nº','numero'],['Status','status'],['Data emissão','data_emissao'],['Prazo resposta','prazo_resposta'],['Fornecedor escolhido','fornecedor_escolhido_id'],['Menor preço','menor_preco_ofertado'],['Criada em','created_at']],
  Pedidos: [['Pedido','numero'],['Fornecedor','fornecedor_id'],['Comprador','comprador_nome'],['Pagamento','condicao_pagamento'],['Prazo','prazo_entrega'],['Status','status'],['Total','total']],
  Fornecedores: [['Código','codigo'],['Razão social','razao_social'],['Nome fantasia','nome_fantasia'],['Documento','documento'],['E-mail','email'],['Telefone','telefone'],['Cidade','cidade'],['UF','estado'],['ISO 9001','iso_9001_certificado']],
  'Pedido do PCP': [['Nº','numero'],['Descrição','descricao'],['Prioridade','prioridade'],['Status','status'],['Criada em','created_at']],
}
const money = (v: number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

export default function ComprasAbaNativa({ tab, onRefresh }: { tab: string; onRefresh: () => void }) {
  const [empresaId,setEmpresaId] = useState('')
  const [profileId,setProfileId] = useState('')
  const [canApprove,setCanApprove] = useState(false)
  const [rows,setRows] = useState<Row[]>([])
  const [products,setProducts] = useState<Product[]>([])
  const [suppliers,setSuppliers] = useState<Supplier[]>([])
  const [sector,setSector] = useState('PCP')
  const [requester,setRequester] = useState('')
  const [costCenter,setCostCenter] = useState('')
  const [productionOrder,setProductionOrder] = useState('')
  const [justification,setJustification] = useState('')
  const [priority,setPriority] = useState('normal')
  const [supplierId,setSupplierId] = useState('')
  const [email,setEmail] = useState('')
  const [notes,setNotes] = useState('')
  const [items,setItems] = useState<Array<{productId:string;quantity:string;price:string}>>([{productId:'',quantity:'1',price:'0'}])
  const [query,setQuery] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [rfqBuyer,setRfqBuyer] = useState('')
  const [rfqApproval,setRfqApproval] = useState('EM_ANALISE')
  const [rfqDeadline,setRfqDeadline] = useState('')
  const [rfqDelivery,setRfqDelivery] = useState('')
  const [rfqResponseDate,setRfqResponseDate] = useState('')
  const [rfqPayment,setRfqPayment] = useState('')
  const [rfqJustification,setRfqJustification] = useState('')
  const [rfqNotes,setRfqNotes] = useState('')
  const [selectedSuppliers,setSelectedSuppliers] = useState<string[]>([])
  const [supplierQuotes,setSupplierQuotes] = useState<Record<string,{cost:string;days:string;payment:string}>>({})
  const [winnerSupplier,setWinnerSupplier] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const tenant = String(company.data); setEmpresaId(tenant)
      if (tab === 'Requisições' || tab === 'Cotações') {
        const auth = await supabase.auth.getUser()
        if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão não autenticada.')
        const profile = await supabase.from('erp_usuarios').select('id').eq('auth_user_id',auth.data.user.id).eq('empresa_id',tenant).eq('ativo',true).is('deleted_at',null).maybeSingle()
        if (profile.error) throw profile.error
        setProfileId(profile.data?.id ?? '')
        const permission = await supabase.rpc('erp_has_permission',{p_modulo:'compras',p_acao:'editar'})
        if (permission.error) throw permission.error
        setCanApprove(Boolean(permission.data) && Boolean(profile.data?.id))
      }
      if (tab === 'Pedido do PCP' || tab === 'Fornecedores' || tab === 'Pedidos' || tab === 'Cotações') {
        const [p,s] = await Promise.all([
          supabase.from('erp_produtos').select('id,codigo,nome,unidade,unidade_compra').eq('empresa_id',tenant).eq('ativo',true).order('codigo').limit(2000),
          supabase.from('erp_fornecedores').select('id,razao_social,documento,email').eq('empresa_id',tenant).eq('ativo',true).order('razao_social').limit(2000),
        ])
        if(p.error) throw p.error; if(s.error) throw s.error
        setProducts((p.data ?? []) as Product[]); setSuppliers((s.data ?? []) as Supplier[])
      }
      let data: Row[] = []
      if (tab === 'Requisições') {
        const r = await supabase.from('erp_requisicoes_compra').select('id,codigo,status,centro_custo,nivel_urgencia,ordem_producao_id,created_at').eq('empresa_id',tenant).order('created_at',{ascending:false}).limit(500)
        if(r.error) throw r.error; data=(r.data ?? []) as Row[]
      } else if (tab === 'Alertas MRP') {
        const run = await supabase.from('erp_mrp_runs').select('id').eq('empresa_id',tenant).order('created_at',{ascending:false}).limit(1).maybeSingle()
        if(run.error) throw run.error
        if(run.data?.id) {
          const n = await supabase.from('erp_mrp_necessidades').select('id,componente_id,nivel,quantidade_bruta,estoque_atual,reservado,quantidade_disponivel,necessidade_liquida,sugestao').eq('empresa_id',tenant).eq('run_id',run.data.id).gt('necessidade_liquida',0).order('nivel').limit(1000)
          if(n.error) throw n.error
          const ids=[...new Set((n.data ?? []).map(row=>String(row.componente_id)))]
          const p=ids.length ? await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id',tenant).in('id',ids) : {data:[],error:null}
          if(p.error) throw p.error
          const map=new Map((p.data ?? []).map(row=>[String(row.id),row]))
          data=(n.data ?? []).map(row=>({...row,codigo:map.get(String(row.componente_id))?.codigo ?? '—',nome:map.get(String(row.componente_id))?.nome ?? 'Material sem nome'})) as Row[]
        }
      } else if (tab === 'Cotações') {
        const r=await supabase.from('erp_rfq').select('id,numero,status,data_emissao,prazo_resposta,fornecedor_escolhido_id,justificativa_escolha,status_aprovacao,menor_preco_ofertado').eq('empresa_id',tenant).order('created_at',{ascending:false}).limit(500)
        if(r.error) throw r.error; data=(r.data ?? []) as Row[]
      } else if (tab === 'Pedidos') {
        const r=await supabase.from('erp_pedidos_compra').select('id,numero,fornecedor_id,comprador_nome,condicao_pagamento,prazo_entrega,status,data_pedido,total').eq('empresa_id',tenant).order('created_at',{ascending:false}).limit(500)
        if(r.error) throw r.error; data=(r.data ?? []) as Row[]
      } else if (tab === 'Fornecedores') {
        const r=await supabase.from('erp_fornecedores').select('id,codigo,razao_social,nome_fantasia,documento,email,telefone,cidade,estado,ativo,iso_9001_certificado').eq('empresa_id',tenant).order('razao_social').limit(2000)
        if(r.error) throw r.error; data=(r.data ?? []) as Row[]
      } else if (tab === 'Pedido do PCP') {
        const r=await supabase.from('erp_solicitacoes_compra').select('id,numero,descricao,prioridade,status,created_at,fornecedor_id').eq('empresa_id',tenant).order('created_at',{ascending:false}).limit(100)
        if(r.error) throw r.error; data=(r.data ?? []) as Row[]
      }
      setRows(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados desta aba.') }
    finally { setBusy(false) }
  },[tab])

  useEffect(()=>{void load()},[load])
  const visibleRows=useMemo(()=>rows.filter(row=>Object.values(row).some(value=>String(value ?? '').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))),[rows,query])
  const fmt=(key:string,value:unknown)=>key==='total'&&typeof value==='number'?money(value):key==='created_at'&&value?new Date(String(value)).toLocaleString('pt-BR'):key==='iso_9001_certificado'?(value?'Sim':'Não'):String(value ?? '—')

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      if(!empresaId) throw new Error('Empresa da sessão não identificada.')
      if(!sector.trim() || !requester.trim() || !justification.trim()) throw new Error('Informe setor, solicitante e justificativa da solicitação.')
      const valid=items.filter(item=>item.productId)
      if(!valid.length) throw new Error('Adicione pelo menos um material.')
      if(valid.some(item=>!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0||!Number.isFinite(Number(item.price))||Number(item.price)<0)) throw new Error('Confira quantidade e valor estimado dos itens.')
      const result=await supabase.rpc('erp_compras_criar_solicitacao',{
        p_descricao:[sector.trim(),requester.trim(),costCenter.trim() ? 'Centro de custo: '+costCenter.trim() : '',productionOrder.trim() ? 'OP: '+productionOrder.trim() : ''].filter(Boolean).join(' • '),p_prioridade:priority,p_email_destino:email.trim()||null,p_observacoes:[justification.trim(),notes.trim()].filter(Boolean).join('\n\n')||null,p_fornecedor_id:supplierId||null,
        p_itens:valid.map(item=>{const p=products.find(product=>product.id===item.productId);if(!p)throw new Error('Material selecionado não disponível.');return {produto_id:p.id,descricao:p.nome,unidade:p.unidade_compra||p.unidade||'UN',quantidade:Number(item.quantity),valor_estimado:Number(item.price)}}),
      })
      if(result.error) throw result.error
      setMessage('Solicitação gravada e enviada ao fluxo de autorização do ERP.')
      setSector('PCP');setRequester('');setCostCenter('');setProductionOrder('');setJustification('');setPriority('normal');setSupplierId('');setEmail('');setNotes('');setItems([{productId:'',quantity:'1',price:'0'}])
      await load();onRefresh()
    } catch(cause) { setError(cause instanceof Error?cause.message:'Não foi possível registrar a solicitação.') }
    finally { setBusy(false) }
  }

  async function saveRfq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    let rfqId = ''
    try {
      if (!empresaId || !profileId) throw new Error('Perfil ERP ativo não identificado para registrar a cotação.')
      if (!selectedSuppliers.length || !items.some(item=>item.productId)) throw new Error('Selecione ao menos um fornecedor e um material.')
      if (!winnerSupplier || !selectedSuppliers.includes(winnerSupplier)) throw new Error('Selecione o fornecedor escolhido entre os cotados.')
      if (selectedSuppliers.some(id => !supplierQuotes[id] || !Number.isFinite(Number(supplierQuotes[id].cost)) || Number(supplierQuotes[id].cost)<0 || !Number.isFinite(Number(supplierQuotes[id].days)) || Number(supplierQuotes[id].days)<0)) throw new Error('Informe custo e prazo válidos para todos os fornecedores selecionados.')
      const chosenCost = Number(supplierQuotes[winnerSupplier].cost)
      const lowestCost = Math.min(...selectedSuppliers.map(id=>Number(supplierQuotes[id].cost)))
      if (chosenCost > lowestCost && !rfqJustification.trim()) throw new Error('Justifique a escolha quando não for o menor custo.')
      const header = await supabase.from('erp_rfq').insert({
        empresa_id:empresaId,status:'ABERTA',comprador_responsavel:rfqBuyer.trim()||null,
        status_aprovacao:rfqApproval,data_limite:rfqDeadline||null,previsao_entrega:rfqDelivery||null,
        data_conclusao:['APROVADO','REPROVADO'].includes(rfqApproval)?new Date().toISOString().slice(0,10):null,
        justificativa_escolha:rfqJustification.trim()||null,menor_custo_liquido_atendido:chosenCost===lowestCost,
        data_necessidade:rfqDeadline||null,prazo_resposta:rfqResponseDate||null,
        condicao_pagamento:rfqPayment.trim()||null,observacoes:rfqNotes.trim()||null,created_by:profileId
      }).select('id,numero').single()
      if (header.error || !header.data) throw header.error ?? new Error('O banco não retornou a cotação.')
      rfqId=String(header.data.id)
      const suppliersResult=await supabase.from('erp_rfq_fornecedores').insert(selectedSuppliers.map(id=>{
        const quote=supplierQuotes[id]; const cost=Number(quote.cost)
        return {empresa_id:empresaId,rfq_id:rfqId,fornecedor_id:id,valor_total:cost,valor_frete:0,valor_desconto:0,prazo_entrega_dias:Number(quote.days),condicao_pagamento:quote.payment.trim()||rfqPayment.trim()||null,custo_liquido_total:cost,selecionado_para_pedido:id===winnerSupplier,status:id===winnerSupplier?'SELECIONADO':'COTADO'}
      }))
      if(suppliersResult.error) throw suppliersResult.error
      const valid=items.filter(item=>item.productId)
      const itemResult=await supabase.from('erp_rfq_itens').insert(valid.map(item=>{
        const product=products.find(p=>p.id===item.productId)
        if(!product) throw new Error('Um material selecionado não está mais disponível.')
        return {empresa_id:empresaId,rfq_id:rfqId,produto_id:product.id,descricao:product.nome,codigo:product.codigo,quantidade:Number(item.quantity),unidade:product.unidade_compra||product.unidade||'UN',data_necessidade:rfqDeadline||null,observacoes:null}
      }))
      if(itemResult.error) throw itemResult.error
      setMessage('Cotação #'+header.data.numero+' criada com '+selectedSuppliers.length+' fornecedor(es).')
      setItems([{productId:'',quantity:'1',price:'0'}]);setSelectedSuppliers([]);setSupplierQuotes({});setWinnerSupplier('');setRfqJustification('');setRfqNotes('')
      await load();onRefresh()
    } catch(cause) {
      if(rfqId&&empresaId){const rollback=await supabase.from('erp_rfq').delete().eq('id',rfqId).eq('empresa_id',empresaId);setError((cause instanceof Error?cause.message:'Falha ao criar cotação.')+(rollback.error?' A reversão falhou: '+rollback.error.message:''))}
      else setError(cause instanceof Error?cause.message:'Falha ao criar cotação.')
    } finally {setBusy(false)}
  }

  async function approve(id: string) {
    setBusy(true); setError(''); setMessage('')
    try {
      if (!canApprove) throw new Error('Seu perfil não possui permissão para autorizar compras.')
      if (!empresaId || !profileId) throw new Error('Perfil da empresa não identificado.')
      const result = await supabase.from('erp_solicitacoes_compra').update({status:'autorizada',autorizado_por:profileId,autorizado_em:new Date().toISOString()}).eq('id',id).eq('empresa_id',empresaId).eq('status','aguardando_autorizacao').select('id').single()
      if (result.error) throw result.error
      setMessage('Solicitação autorizada e encaminhada para Compras.')
      await load(); onRefresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível autorizar a solicitação.') }
    finally { setBusy(false) }
  }

  const cols=columns[tab] ?? []
  return <section className="sq-purchase-mrp" aria-label={tab}>
    <div className="sq-purchase-mrp-head"><div><h2>{tab==='Pedido do PCP'?'Pedido do PCP para Compras':tab}</h2><p>{tab==='Pedido do PCP'?'Informe referência da OP, materiais e justificativa. A gravação utiliza a operação existente do ERP.':'Registros reais do Supabase, filtrados pela empresa ativa.'}</p></div><button type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Atualizar</button></div>
    {error&&<p role="alert" className="sq-purchase-kpi-error">{error}</p>}
    {message&&<p role="status" style={{margin:'10px 16px',padding:10,background:'#ecfdf5',color:'#166534',fontSize:12}}>{message}</p>}
    {tab==='Cotações'&&<form onSubmit={event=>void saveRfq(event)} style={{padding:16,borderBottom:'1px solid #e8edf4'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(12,minmax(0,1fr))',gap:10}}>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Comprador<input maxLength={100} value={rfqBuyer} onChange={e=>setRfqBuyer(e.target.value)} /></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Status inicial<select value={rfqApproval} onChange={e=>setRfqApproval(e.target.value)}><option value="EM_ANALISE">Em análise</option><option value="PENDENTE_APROVACAO">Pendente de aprovação</option></select></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Data limite<input type="date" value={rfqDeadline} onChange={e=>setRfqDeadline(e.target.value)} /></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Prazo de resposta<input type="date" value={rfqResponseDate} onChange={e=>setRfqResponseDate(e.target.value)} /></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Previsão de entrega<input type="date" value={rfqDelivery} onChange={e=>setRfqDelivery(e.target.value)} /></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Condição de pagamento<input value={rfqPayment} onChange={e=>setRfqPayment(e.target.value)} placeholder="Ex.: 28 dias" /></label>
        <label style={{gridColumn:'span 6',display:'grid',gap:4,fontSize:11}}>Justificativa da escolha<textarea rows={1} value={rfqJustification} onChange={e=>setRfqJustification(e.target.value)} placeholder="Obrigatória se não escolher o menor custo" /></label>
        <label style={{gridColumn:'span 12',display:'grid',gap:4,fontSize:11}}>Observações<textarea rows={2} value={rfqNotes} onChange={e=>setRfqNotes(e.target.value)} /></label>
      </div>
      <div style={{marginTop:12,display:'grid',gap:8}}><strong style={{fontSize:12}}>Fornecedores para cotar</strong>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
          {suppliers.map(s=><label key={s.id} style={{display:'flex',gap:8,alignItems:'center',border:'1px solid #e2e8f0',padding:8,fontSize:11,borderRadius:4}}><input type="checkbox" checked={selectedSuppliers.includes(s.id)} onChange={e=>{setSelectedSuppliers(current=>e.target.checked?[...current,s.id]:current.filter(id=>id!==s.id));if(!e.target.checked&&winnerSupplier===s.id)setWinnerSupplier('')}}/><span>{s.razao_social}</span></label>)}
        </div>
        {selectedSuppliers.map(id=>{const supplier=suppliers.find(s=>s.id===id);const q=supplierQuotes[id]??{cost:'0',days:'0',payment:''};return <div key={id} style={{display:'grid',gridTemplateColumns:'minmax(160px,2fr) repeat(3,minmax(100px,1fr))',gap:8,alignItems:'end',borderBottom:'1px solid #e2e8f0',paddingBottom:8}}>
          <strong style={{fontSize:11}}>{supplier?.razao_social??'Fornecedor'}</strong>
          <label style={{display:'grid',gap:4,fontSize:10}}>Custo líquido<input required type="number" min="0" step="0.01" value={q.cost} onChange={e=>setSupplierQuotes(current=>({...current,[id]:{...q,cost:e.target.value}}))}/></label>
          <label style={{display:'grid',gap:4,fontSize:10}}>Prazo (dias)<input required type="number" min="0" step="1" value={q.days} onChange={e=>setSupplierQuotes(current=>({...current,[id]:{...q,days:e.target.value}}))}/></label>
          <label style={{display:'grid',gap:4,fontSize:10}}>Pagamento<input value={q.payment} onChange={e=>setSupplierQuotes(current=>({...current,[id]:{...q,payment:e.target.value}}))}/></label>
        </div>})}
        <label style={{display:'grid',gap:4,fontSize:11}}>Fornecedor escolhido<select required value={winnerSupplier} onChange={e=>setWinnerSupplier(e.target.value)}><option value="">Selecione</option>{selectedSuppliers.map(id=><option key={id} value={id}>{suppliers.find(s=>s.id===id)?.razao_social??id}</option>)}</select></label>
      </div>
      <div style={{display:'grid',gap:8,marginTop:14}}><strong style={{fontSize:12}}>Materiais da cotação</strong>
      {items.map((item,index)=><div key={index} style={{display:'grid',gridTemplateColumns:'minmax(220px,5fr) minmax(90px,1fr) minmax(110px,1fr) 34px',gap:8,alignItems:'end'}}>
        <label style={{display:'grid',gap:4,fontSize:10}}>Material<select required value={item.productId} onChange={e=>setItems(current=>current.map((row,i)=>i===index?{...row,productId:e.target.value}:row))}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
        <label style={{display:'grid',gap:4,fontSize:10}}>Quantidade<input required type="number" min="0.001" step="0.001" value={item.quantity} onChange={e=>setItems(current=>current.map((row,i)=>i===index?{...row,quantity:e.target.value}:row))}/></label>
        <label style={{display:'grid',gap:4,fontSize:10}}>Referência unitária<input type="number" min="0" step="0.01" value={item.price} onChange={e=>setItems(current=>current.map((row,i)=>i===index?{...row,price:e.target.value}:row))}/></label>
        <button type="button" aria-label="Remover material" disabled={items.length===1} onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))}>×</button>
      </div>)}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>setItems(current=>[...current,{productId:'',quantity:'1',price:'0'}])}>+ Adicionar material</button><strong style={{fontSize:12}}>Total de referência: {money(items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(item.price||0),0))}</strong></div>
      </div><div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><button type="submit" disabled={busy} style={{background:'#0b2545',color:'#fff',padding:'9px 16px',borderRadius:8,fontWeight:750}}>{busy?'Salvando…':'Criar cotação'}</button></div>
    </form>}
    {tab==='Pedido do PCP'&&<form onSubmit={event=>void submit(event)} style={{padding:16,borderBottom:'1px solid #e8edf4'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(12,minmax(0,1fr))',gap:10}}>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Setor<input required value={sector} onChange={e=>setSector(e.target.value)} placeholder="PCP"/></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Solicitante<input required value={requester} onChange={e=>setRequester(e.target.value)} placeholder="Nome do solicitante"/></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Centro de custo<input value={costCenter} onChange={e=>setCostCenter(e.target.value)} placeholder="Centro de custo"/></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Ordem de produção<input value={productionOrder} onChange={e=>setProductionOrder(e.target.value)} placeholder="OP-0000"/></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Prioridade<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="normal">Normal</option><option value="baixa">Baixa</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Fornecedor sugerido<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">A definir por Compras</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.razao_social}</option>)}</select></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>E-mail de retorno<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Opcional"/></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Observações<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observações adicionais"/></label>
        <label style={{gridColumn:'span 12',display:'grid',gap:4,fontSize:11}}>Justificativa<textarea required value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Explique a necessidade de compra" rows={2}/></label>
      </div>
      <div style={{display:'grid',gap:8,marginTop:14}}><strong style={{fontSize:12}}>Itens solicitados</strong>
      {items.map((item,index)=><div key={index} style={{display:'grid',gridTemplateColumns:'minmax(220px,5fr) minmax(90px,1fr) minmax(110px,1fr) 34px',gap:8,alignItems:'end'}}>
        <label style={{display:'grid',gap:4,fontSize:10}}>Material<select required value={item.productId} onChange={e=>setItems(current=>current.map((row,i)=>i===index?{...row,productId:e.target.value}:row))}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
        <label style={{display:'grid',gap:4,fontSize:10}}>Quantidade<input required type="number" min="0.001" step="0.001" value={item.quantity} onChange={e=>setItems(current=>current.map((row,i)=>i===index?{...row,quantity:e.target.value}:row))}/></label>
        <label style={{display:'grid',gap:4,fontSize:10}}>Valor unitário<input required type="number" min="0" step="0.01" value={item.price} onChange={e=>setItems(current=>current.map((row,i)=>i===index?{...row,price:e.target.value}:row))}/></label>
        <button type="button" aria-label="Remover item" disabled={items.length===1} onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))}>×</button>
      </div>)}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>setItems(current=>[...current,{productId:'',quantity:'1',price:'0'}])}>+ Adicionar item</button><strong style={{fontSize:12}}>Total estimado: {money(items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(item.price||0),0))}</strong></div>
      </div><div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><button type="submit" disabled={busy} style={{background:'#0b2545',color:'#fff',padding:'9px 16px',borderRadius:8,fontWeight:750}}>{busy?'Enviando…':'Enviar para autorização'}</button></div>
    </form>}
    {tab!=='Pedido do PCP'&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'10px 16px',flexWrap:'wrap'}}><input aria-label={'Pesquisar '+tab} value={query} onChange={e=>setQuery(e.target.value)} placeholder={'Pesquisar '+tab.toLocaleLowerCase('pt-BR')} style={{maxWidth:340}}/><span style={{fontSize:11,color:'#64748b'}}>{visibleRows.length} registros</span></div>}
    <div className="sq-purchase-mrp-scroll"><table><thead><tr>{cols.map(([label])=><th key={label}>{label}</th>)}{tab==='Requisições'&&<th>Ações</th>}</tr></thead><tbody>{visibleRows.map((row,index)=><tr key={String(row.id??index)}>{cols.map(([label,key])=><td key={key}>{key==='fornecedor_id'&&tab==='Pedidos'?suppliers.find(s=>s.id===String(row[key]??''))?.razao_social??'—':fmt(key,row[key])}</td>)}{tab==='Requisições'&&<td>{row.status==='aguardando_autorizacao'&&<button type="button" disabled={busy||!canApprove} title={!canApprove?'Sem permissão para autorizar':'Autorizar solicitação'} onClick={()=>void approve(String(row.id))} style={{display:'inline-flex',alignItems:'center',gap:5,color:'#166534',border:'1px solid #bbf7d0',padding:'5px 8px',borderRadius:4}}><CheckCircle2 size={13}/> Autorizar</button>}</td>}</tr>)}{!visibleRows.length&&<tr><td colSpan={Math.max(1,cols.length)} className="sq-purchase-empty">{busy?'Carregando…':'Nenhum registro encontrado para esta empresa.'}</td></tr>}</tbody></table></div>
  </section>
}
