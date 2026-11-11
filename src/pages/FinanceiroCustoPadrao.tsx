/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-FIN-CUSTO-PADRAO-ENGENHARIA-20261110-01 — custo absorvido com MRP real, ciclo de máquina, preço sugerido e histórico persistido.
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-10; manifesto e gates oficiais preservados.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calculator, FileSpreadsheet, Save, RefreshCw, Factory, PackageCheck, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Product = { id:string; codigo:string; nome:string; descricao:string|null; custo_ultimo:number; custo_fabricacao:number; preco_venda:number; margem_percentual:number }
type Machine = { id:string; codigo:string; nome:string; custo_hora:number }
type Need = { id:string; componente_id:string; quantidade_bruta:number; necessidade_liquida:number }
type Saved = { id:string; created_at:string; quantidade_base:number; custo_total:number; preco_venda:number; margem_percentual:number; produto_codigo:string; produto_nome:string }
const brl=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const qtyFmt=(v:number)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:4})
const control='h-10 w-full rounded-md border border-[#CBD9E0] bg-white px-3 text-sm text-[#183B4D] outline-none transition focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label='mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#526C79]'
const btn='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#CBD9E0] bg-white px-4 text-xs font-semibold text-[#23495B] transition hover:bg-[#F1F7F9] disabled:cursor-not-allowed disabled:opacity-50'
const primary='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176B91] px-4 text-xs font-semibold text-white transition hover:bg-[#125A7B] disabled:cursor-not-allowed disabled:opacity-50'
export default function FinanceiroCustoPadrao(){
 const navigate=useNavigate()
 const [empresa,setEmpresa]=useState(''),[products,setProducts]=useState<Product[]>([]),[machines,setMachines]=useState<Machine[]>([])
 const [productId,setProductId]=useState(''),[machineId,setMachineId]=useState(''),[qty,setQty]=useState('1'),[cycle,setCycle]=useState(''),[margin,setMargin]=useState('50')
 const [needs,setNeeds]=useState<Need[]>([]),[runId,setRunId]=useState(''),[saved,setSaved]=useState<Saved[]>([])
 const [loading,setLoading]=useState(true),[calculating,setCalculating]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id');if(tenant.error||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
   const company=String(tenant.data);setEmpresa(company)
   const [p,m,h]=await Promise.all([
    fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,descricao,custo_ultimo,custo_fabricacao,preco_venda,margem_percentual',{count:'exact'}).eq('empresa_id',company).eq('ativo',true).order('codigo').order('id').range(from,to)),
    supabase.from('erp_maquinas').select('id,codigo,nome,custo_hora').eq('empresa_id',company).eq('ativo',true).order('codigo'),
    supabase.from('erp_financeiro_custo_padrao').select('id,created_at,quantidade_base,custo_total,preco_venda,margem_percentual,produto_codigo,produto_nome').eq('empresa_id',company).order('created_at',{ascending:false}).limit(12)
   ])
   if(m.error)throw m.error;if(h.error)throw h.error
   setProducts(p);setMachines((m.data??[]) as Machine[]);setSaved((h.data??[]) as Saved[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar cadastros financeiros e industriais.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const product=products.find(p=>p.id===productId),machine=machines.find(m=>m.id===machineId)
 const materialProjection=useMemo(()=>needs.reduce((sum,n)=>sum+Number(n.quantidade_bruta||0)*Number(products.find(p=>p.id===n.componente_id)?.custo_ultimo||0),0),[needs,products])
 const projectionQty=Math.max(0.000001,Number(qty)||1)
 const materialUnit=materialProjection/projectionQty
 const machineUnit=machine&&Number(cycle)>0?Number(machine.custo_hora||0)*Number(cycle)/3600:0
 const fabricationUnit=Number(product?.custo_fabricacao||0)
 const factoryUnit=materialUnit+fabricationUnit+machineUnit
 const marginValue=Math.min(99.9,Math.max(0,Number(margin)||0))
 const suggested=factoryUnit/(1-marginValue/100)
 const bomActive=Boolean(runId&&needs.length)
 const calculate=useCallback(async(id:string,amount:string)=>{
  if(!id){setNeeds([]);setRunId('');return}
  setCalculating(true);setError('');setNotice('')
  try{
   const r=await supabase.rpc('erp_mrp_explodir',{p_produto_id:id,p_quantidade:Math.max(0.000001,Number(amount)||1),p_demanda_ref:'CUSTO_PADRAO'})
   if(r.error)throw r.error
   const list=await fetchAllPages<Need>((from,to)=>supabase.from('erp_mrp_necessidades').select('id,componente_id,quantidade_bruta,necessidade_liquida',{count:'exact'}).eq('run_id',String(r.data)).order('nivel').order('id').range(from,to))
   setRunId(String(r.data));setNeeds(list)
   if(!list.length)setNotice('O MRP não retornou componentes para esta projeção. Confira se existe BOM vigente e liberada para o produto.')
  }catch(e){setNeeds([]);setRunId('');setError(e instanceof Error?e.message:'Não foi possível explodir a estrutura MRP real.')}
  finally{setCalculating(false)}
 },[])
 useEffect(()=>{if(productId)void calculate(productId,qty);else{setNeeds([]);setRunId('')}},[productId,qty,calculate])
 const save=async()=>{
  if(!product){setError('Selecione o produto alvo.');return}
  if(!machine){setError('Selecione a máquina ou centro de custo cadastrado.');return}
  if(!Number.isFinite(suggested)||suggested<=0){setError('O preço sugerido não é válido. Confira os custos reais e a margem.');return}
  if(needs.length===0){setError('Não é possível salvar sem uma BOM/MRP real carregada.');return}
  if(needs.some(n=>!products.some(p=>p.id===n.componente_id))){setError('Há componente da BOM sem cadastro/custo carregado. O preço não será salvo com custo incompleto.');return}
  setSaving(true);setError('');setNotice('')
  try{
   const user=await supabase.auth.getUser();if(user.error)throw user.error
   const payload={empresa_id:empresa,produto_id:product.id,produto_codigo:product.codigo,produto_nome:product.nome,mrp_run_id:runId,maquina_id:machine?.id??null,maquina_codigo:machine?.codigo??null,quantidade_base:projectionQty,ciclo_segundos:Number(cycle)||0,margem_percentual:marginValue,custo_materiais:materialUnit,custo_fabricacao:fabricationUnit,custo_maquina:machineUnit,custo_total:factoryUnit,preco_venda:suggested,componentes:needs.map(n=>({componente_id:n.componente_id,quantidade:Number(n.quantidade_bruta||0),custo_unitario:Number(products.find(p=>p.id===n.componente_id)?.custo_ultimo||0),subtotal:Number(n.quantidade_bruta||0)*Number(products.find(p=>p.id===n.componente_id)?.custo_ultimo||0)})),criado_por:user.data.user?.id??null}
   const inserted=await supabase.from('erp_financeiro_custo_padrao').insert(payload).select('id').single()
   if(inserted.error)throw inserted.error
   const update=await supabase.from('erp_produtos').update({preco_venda:suggested,margem_percentual:marginValue}).eq('id',product.id).eq('empresa_id',empresa).select('id')
   if(update.error)throw new Error('Simulação salva no histórico, mas o cadastro do produto não foi atualizado: '+update.error.message)
   if(!update.data?.length)throw new Error('Simulação salva no histórico, mas a política de acesso não autorizou atualizar o cadastro do produto.')
   setNotice('Preço padrão salvo no histórico e atualizado no cadastro do produto.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar custo padrão.')}
  finally{setSaving(false)}
 }
 const exportSheet=()=>{
  const lines=[['Componente / Insumo','Qtd. MRP','Custo Unitário','Total'],...needs.map(n=>{const p=products.find(x=>x.id===n.componente_id);return [p?p.codigo+' - '+p.nome:n.componente_id,String(n.quantidade_bruta),String(p?.custo_ultimo??0),String(Number(n.quantidade_bruta||0)*Number(p?.custo_ultimo||0))]}),[],['Produto',product?.codigo??''],['Máquina',machine?machine.codigo+' - '+machine.nome:''],['Quantidade projetada',String(projectionQty)],['Custo matéria-prima unitário',String(materialUnit)],['Custo fabricação cadastrado',String(fabricationUnit)],['Custo máquina unitário',String(machineUnit)],['Custo fábrica total unitário',String(factoryUnit)],['Margem (%)',String(marginValue)],['Preço sugerido',String(suggested)]]
  const csv='\ufeff'+lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='engenharia-custo-padrao.csv';a.click();URL.revokeObjectURL(url)
 }
 return <main className="min-h-full space-y-4 bg-[#F4FBFD] p-4 text-[#183B4D] sm:p-5 print:bg-white print:p-0" data-synqra-density="40px">
  <div className="hidden border-b-2 border-[#123B50] pb-3 print:block"><strong className="text-[19px] tracking-[.16em]">PLASTIBOR</strong><p className="text-[10px]">Controladoria industrial · Engenharia de custo padrão</p><p className="text-[10px]">Emitido em {new Date().toLocaleString('pt-BR')}</p></div>
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3E3EA] pb-3 print:hidden">
   <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={()=>navigate(-1)} className="inline-flex h-[38px] w-[115px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#334155] shadow-sm transition hover:bg-slate-50"><ArrowLeft size={14}/>Voltar</button><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.13em] text-[#2D8DB8]">FINANCEIRO › ENGENHARIA DE CUSTO PADRÃO</p><h1 className="text-xl font-bold tracking-tight">Formação de Preço por Custo Absorvido</h1><p className="mt-1 text-xs text-[#607987]">Materiais calculados pela estrutura MRP real e custo/hora da máquina selecionada.</p></div></div>
   <div className="flex gap-2"><button className={btn} type="button" onClick={()=>window.print()} disabled={!product}><Printer size={15}/>Imprimir / PDF</button><button className={btn} type="button" onClick={exportSheet} disabled={!product}><FileSpreadsheet size={15}/>Emitir Planilha</button><button className={primary} type="button" onClick={()=>void save()} disabled={!product||!bomActive||saving}><Save size={15}/>{saving?'Salvando...':'Salvar Preço'}</button></div>
  </header>
  {error&&<div role="alert" className="rounded-md border border-[#D65B61]/40 bg-[#FFF4F3] px-3 py-2 text-xs text-[#A53D45]">{error}</div>}
  {notice&&<div role="status" className="rounded-md border border-[#3A9D78]/30 bg-[#EFF9F4] px-3 py-2 text-xs text-[#267653]">{notice}</div>}
  <section className="rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm sm:p-5">
   <div className="mb-3 flex items-center gap-2"><Calculator size={16} className="text-[#2D8DB8]"/><h2 className="text-xs font-bold uppercase tracking-wide">Parâmetros de simulação e absorção</h2></div>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.8fr)_minmax(220px,1.8fr)_110px_140px_120px]">
    <label><span className={label}>Produto alvo *</span><select className={control} value={productId} onChange={e=>setProductId(e.target.value)} disabled={loading}><option value="">Digite ou selecione o código</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select><span className="mt-1 block truncate text-[10px] text-[#6B818C]">{product?.descricao||product?.nome||'Descrição do produto carregada do cadastro.'}</span></label>
    <label><span className={label}>Máquina / centro de custo *</span><select className={control} value={machineId} onChange={e=>setMachineId(e.target.value)}><option value="">Selecione a máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select><span className="mt-1 block text-[10px] text-[#6B818C]">{machine?'Custo/hora cadastrado: '+brl(Number(machine.custo_hora||0)):'Taxa hora carregada do cadastro da máquina.'}</span></label>
    <label><span className={label}>Qtd. projeção *</span><input className={control} type="number" min="0.0001" step="any" value={qty} onChange={e=>setQty(e.target.value)}/></label>
    <label><span className={label}>Tempo ciclo/un (seg)</span><input className={control} type="number" min="0" step="0.01" value={cycle} onChange={e=>setCycle(e.target.value)} placeholder="0,00"/></label>
    <label><span className={label}>Margem desejada % *</span><input className={control} type="number" min="0" max="99.9" step="0.1" value={margin} onChange={e=>setMargin(e.target.value)}/></label>
   </div>
  </section>
  <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
   <article className="min-w-0 rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><PackageCheck size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold">Custo BOM teórico</h2></div><span className={'rounded-full px-2.5 py-1 text-[10px] font-semibold '+(bomActive?'bg-[#EAF7F0] text-[#287B58]':'bg-[#F0F4F6] text-[#637985]')}>{calculating?'MRP calculando...':bomActive?'Ficha técnica / BOM ativa':'Aguardando BOM ativa'}</span></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-xs"><thead><tr className="h-9 border-b border-[#D3E3EA] bg-[#F4F8FA] text-left text-[10px] uppercase tracking-wide text-[#526C79]"><th className="px-3">Componente / Insumo</th><th className="px-3 text-right">Qtd. MRP</th><th className="px-3 text-right">Custo Unit. (R$)</th><th className="px-3 text-right">Total (R$)</th></tr></thead><tbody>
     {calculating?<tr><td colSpan={4} className="h-20 text-center text-[#607987]">Explodindo estrutura MRP real...</td></tr>:needs.length?needs.map(n=>{const p=products.find(x=>x.id===n.componente_id);const unit=Number(p?.custo_ultimo||0);return <tr key={n.id} className="h-11 border-b border-[#E8EFF2]"><td className="px-3 font-medium">{p?p.codigo+' · '+p.nome:'Componente '+n.componente_id.slice(0,8)}</td><td className="px-3 text-right tabular-nums">{qtyFmt(n.quantidade_bruta)}</td><td className="px-3 text-right tabular-nums">{brl(unit)}</td><td className="px-3 text-right font-semibold tabular-nums">{brl(Number(n.quantidade_bruta||0)*unit)}</td></tr>}):<tr><td colSpan={4} className="h-24 px-3 text-center text-xs text-[#718792]">Selecione um produto com ficha técnica/BOM ativa.</td></tr>}
    </tbody></table></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#D3E3EA] pt-3 text-xs"><span className="text-[#607987]">Total matéria-prima da projeção: <strong className="text-[#183B4D]">{brl(materialProjection)}</strong></span><span className="font-semibold text-[#183B4D]">Custo unitário: {brl(materialUnit)}</span></div>
   </article>
   <article className="rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-center gap-2"><Factory size={16} className="text-[#2D8DB8]"/><h2 className="text-sm font-bold">Engenharia do preço de venda</h2></div>
    <div className="space-y-0 text-xs">
     <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#E8EFF2] py-2"><span>(+) Custo matéria-prima BOM</span><strong className="tabular-nums">{brl(materialUnit)}</strong></div>
     <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#E8EFF2] py-2"><span>(+) Custo fabricação cadastrado</span><strong className="tabular-nums">{brl(fabricationUnit)}</strong></div>
     <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#E8EFF2] py-2"><span>(+) Custo hora/máquina aplicado</span><strong className="tabular-nums">{brl(machineUnit)}</strong></div>
     <div className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-[#F0F6F8] px-3 py-2"><strong>(=) CUSTO FÁBRICA TOTAL / UN</strong><strong className="text-sm tabular-nums">{brl(factoryUnit)}</strong></div>
     <div className="flex min-h-10 items-center justify-between gap-3 py-2"><span>Margem de contribuição aplicada</span><strong>{marginValue.toFixed(2).replace('.',',')}%</strong></div>
    </div>
    <div className="mt-3 rounded-md border border-[#C7E2EA] bg-[#EFF8FB] p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-[#416D80]">(=) Preço sugerido por unidade</span><strong className="mt-1 block text-2xl font-bold tracking-tight text-[#176B91]">{brl(suggested)}</strong></div>
    <p className="mt-3 text-[10px] leading-relaxed text-[#637985]">Sem ciclo informado, o custo de máquina permanece R$ 0,00. São usados somente valores reais cadastrados; sem custo de componente, o valor aparece como zero e deve ser conferido antes de salvar.</p>
   </article>
  </section>
  <section className="rounded-lg border border-[#D3E3EA] bg-white p-4 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xs font-bold uppercase tracking-wide">Últimos preços padrão gravados</h2><p className="mt-1 text-[10px] text-[#718792]">Histórico real de simulações e preços aprovados desta empresa.</p></div><button type="button" className={btn} onClick={()=>void load()} disabled={loading}><RefreshCw size={13}/>Atualizar</button></div>
   <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-xs"><thead><tr className="h-9 border-b border-[#D3E3EA] text-left text-[10px] uppercase text-[#607987]"><th className="px-2">Data</th><th className="px-2">Produto</th><th className="px-2 text-right">Qtd.</th><th className="px-2 text-right">Custo total/un</th><th className="px-2 text-right">Margem</th><th className="px-2 text-right">Preço gravado</th></tr></thead><tbody>{saved.map(row=><tr key={row.id} className="h-10 border-b border-[#E8EFF2]"><td className="px-2">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="px-2">{row.produto_codigo} · {row.produto_nome}</td><td className="px-2 text-right">{qtyFmt(row.quantidade_base)}</td><td className="px-2 text-right">{brl(row.custo_total)}</td><td className="px-2 text-right">{Number(row.margem_percentual).toFixed(2).replace('.',',')}%</td><td className="px-2 text-right font-semibold">{brl(row.preco_venda)}</td></tr>)}{!saved.length&&<tr><td colSpan={6} className="h-14 text-center text-[#718792]">Nenhum preço padrão gravado.</td></tr>}</tbody></table></div>
  </section>
  <div className="hidden print:block"><p className="border-t border-[#D3E3EA] pt-2 text-[9px] text-[#607987]">Plastibor · Documento gerado a partir dos cadastros e da explosão MRP reais da empresa autenticada.</p></div>
  <style>{'@media print { @page { size: portrait; margin: 12mm; } body { background: #fff !important; } main { background: #fff !important; padding: 0 !important; } }'}</style>
 </main>
}
