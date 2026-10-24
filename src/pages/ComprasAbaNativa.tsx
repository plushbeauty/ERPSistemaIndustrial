import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { RefreshCw } from 'lucide-react'
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
  const [rows,setRows] = useState<Row[]>([])
  const [products,setProducts] = useState<Product[]>([])
  const [suppliers,setSuppliers] = useState<Supplier[]>([])
  const [description,setDescription] = useState('')
  const [priority,setPriority] = useState('normal')
  const [supplierId,setSupplierId] = useState('')
  const [email,setEmail] = useState('')
  const [notes,setNotes] = useState('')
  const [items,setItems] = useState<Array<{productId:string;quantity:string;price:string}>>([{productId:'',quantity:'1',price:'0'}])
  const [query,setQuery] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const tenant = String(company.data); setEmpresaId(tenant)
      if (tab === 'Pedido do PCP' || tab === 'Fornecedores') {
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
      if(!description.trim()) throw new Error('Informe setor, OP e justificativa da solicitação.')
      const valid=items.filter(item=>item.productId)
      if(!valid.length) throw new Error('Adicione pelo menos um material.')
      if(valid.some(item=>!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0||!Number.isFinite(Number(item.price))||Number(item.price)<0)) throw new Error('Confira quantidade e valor estimado dos itens.')
      const result=await supabase.rpc('erp_compras_criar_solicitacao',{
        p_descricao:description.trim(),p_prioridade:priority,p_email_destino:email.trim()||null,p_observacoes:notes.trim()||null,p_fornecedor_id:supplierId||null,
        p_itens:valid.map(item=>{const p=products.find(product=>product.id===item.productId);if(!p)throw new Error('Material selecionado não disponível.');return {produto_id:p.id,descricao:p.nome,unidade:p.unidade_compra||p.unidade||'UN',quantidade:Number(item.quantity),valor_estimado:Number(item.price)}}),
      })
      if(result.error) throw result.error
      setMessage('Solicitação gravada e enviada ao fluxo de autorização do ERP.')
      setDescription('');setPriority('normal');setSupplierId('');setEmail('');setNotes('');setItems([{productId:'',quantity:'1',price:'0'}])
      await load();onRefresh()
    } catch(cause) { setError(cause instanceof Error?cause.message:'Não foi possível registrar a solicitação.') }
    finally { setBusy(false) }
  }

  const cols=columns[tab] ?? []
  return <section className="sq-purchase-mrp" aria-label={tab}>
    <div className="sq-purchase-mrp-head"><div><h2>{tab==='Pedido do PCP'?'Pedido do PCP para Compras':tab}</h2><p>{tab==='Pedido do PCP'?'Informe referência da OP, materiais e justificativa. A gravação utiliza a operação existente do ERP.':'Registros reais do Supabase, filtrados pela empresa ativa.'}</p></div><button type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Atualizar</button></div>
    {error&&<p role="alert" className="sq-purchase-kpi-error">{error}</p>}
    {message&&<p role="status" style={{margin:'10px 16px',padding:10,background:'#ecfdf5',color:'#166534',fontSize:12}}>{message}</p>}
    {tab==='Pedido do PCP'&&<form onSubmit={event=>void submit(event)} style={{padding:16,borderBottom:'1px solid #e8edf4'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(12,minmax(0,1fr))',gap:10}}>
        <label style={{gridColumn:'span 6',display:'grid',gap:4,fontSize:11}}>Setor / OP / motivo<input required value={description} onChange={e=>setDescription(e.target.value)} placeholder="PCP • OP-8812 • necessidade de material"/></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Prioridade<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="normal">Normal</option><option value="baixa">Baixa</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
        <label style={{gridColumn:'span 3',display:'grid',gap:4,fontSize:11}}>Fornecedor sugerido<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">A definir por Compras</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.razao_social}</option>)}</select></label>
        <label style={{gridColumn:'span 6',display:'grid',gap:4,fontSize:11}}>Solicitante / e-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail de retorno (opcional)"/></label>
        <label style={{gridColumn:'span 6',display:'grid',gap:4,fontSize:11}}>Centro de custo / justificativa<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Centro de custo, OP e justificativa"/></label>
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
    <div className="sq-purchase-mrp-scroll"><table><thead><tr>{cols.map(([label])=><th key={label}>{label}</th>)}</tr></thead><tbody>{visibleRows.map((row,index)=><tr key={String(row.id??index)}>{cols.map(([label,key])=><td key={key}>{key==='fornecedor_id'&&tab==='Pedidos'?suppliers.find(s=>s.id===String(row[key]??''))?.razao_social??'—':fmt(key,row[key])}</td>)}</tr>)}{!visibleRows.length&&<tr><td colSpan={Math.max(1,cols.length)} className="sq-purchase-empty">{busy?'Carregando…':'Nenhum registro encontrado para esta empresa.'}</td></tr>}</tbody></table></div>
  </section>
}
