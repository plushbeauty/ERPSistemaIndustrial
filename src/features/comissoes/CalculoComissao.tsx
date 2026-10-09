import { useEffect, useMemo, useState } from 'react'
import { Calculator, FileSpreadsheet, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'
import VendasLayout from '../../pages/VendasLayout'

type Seller={id:string;nome:string;email:string}
type Line={id:string;pedido_id:string;item_id:string;produto_id:string;quantidade:number;valor_total:number;percentual:number;comissao_liquida:number;pedido?:{numero:number;cliente_id:string|null};produto?:{codigo:string;nome:string};usuario_id:string|null}
type Client={id:string;nome:string}
const input='h-7 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-800 outline-none focus:border-blue-500'
const label='mb-0.5 block text-[10px] font-bold uppercase text-gray-500'
const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const crc32=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function zipStored(files:Array<{name:string;data:Uint8Array}>){
 const encoder=new TextEncoder()
 const localParts:Uint8Array[]=[]
 const centralParts:Uint8Array[]=[]
 let localOffset=0
 for(const file of files){
  const name=encoder.encode(file.name)
  const checksum=crc32(file.data)
  const local=new Uint8Array(30+name.length+file.data.length)
  const localView=new DataView(local.buffer)
  localView.setUint32(0,0x04034b50,true)
  localView.setUint16(4,20,true)
  localView.setUint32(14,checksum,true)
  localView.setUint32(18,file.data.length,true)
  localView.setUint32(22,file.data.length,true)
  localView.setUint16(26,name.length,true)
  local.set(name,30)
  local.set(file.data,30+name.length)
  localParts.push(local)

  const central=new Uint8Array(46+name.length)
  const centralView=new DataView(central.buffer)
  centralView.setUint32(0,0x02014b50,true)
  centralView.setUint16(4,20,true)
  centralView.setUint16(6,20,true)
  centralView.setUint32(16,checksum,true)
  centralView.setUint32(20,file.data.length,true)
  centralView.setUint32(24,file.data.length,true)
  centralView.setUint16(28,name.length,true)
  centralView.setUint32(42,localOffset,true)
  central.set(name,46)
  centralParts.push(central)
  localOffset+=local.length
 }
 const centralSize=centralParts.reduce((total,part)=>total+part.length,0)
 const end=new Uint8Array(22)
 const endView=new DataView(end.buffer)
 endView.setUint32(0,0x06054b50,true)
 endView.setUint16(8,files.length,true)
 endView.setUint16(10,files.length,true)
 endView.setUint32(12,centralSize,true)
 endView.setUint32(16,localOffset,true)
 const asArrayBuffer=(bytes:Uint8Array):ArrayBuffer=>{
  const buffer=new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
 }
 const parts=[...localParts,...centralParts,end].map(asArrayBuffer)
 return new Blob(parts,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
}
function sheetXml(lines:Line[],clients:Client[]){const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');const clientMap=new Map(clients.map(c=>[c.id,c.nome]));const rows=[['Pedido','Cliente','SKU','Qtd Faturada','Valor Total Nota','% Comissão da Regra','Comissão Líquida R$'],...lines.map(l=>[String(l.pedido?.numero??''),clientMap.get(l.pedido?.cliente_id??'')??'',l.produto?.codigo??'',String(l.quantidade),String(l.valor_total),String(l.percentual),String(l.comissao_liquida)])];return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map(r=>'<row>'+r.map(v=>'<c t="inlineStr"><is><t>'+esc(v)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>'}
async function exportXlsx(lines:Line[],clients:Client[]){const enc=new TextEncoder();const contentTypes='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';const wb='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Comissoes" sheetId="1" r:id="rId1"/></sheets></workbook>';const wbr='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';const blob=zipStored([{name:'[Content_Types].xml',data:enc.encode(contentTypes)},{name:'_rels/.rels',data:enc.encode(rels)},{name:'xl/workbook.xml',data:enc.encode(wb)},{name:'xl/_rels/workbook.xml.rels',data:enc.encode(wbr)},{name:'xl/worksheets/sheet1.xml',data:enc.encode(sheetXml(lines,clients))}]);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='comissoes-'+new Date().toISOString().slice(0,7)+'.xlsx';a.click();URL.revokeObjectURL(a.href)}
export default function CalculoComissao(){
 const [competencia,setCompetencia]=useState(new Date().toISOString().slice(0,7)),[sellerId,setSellerId]=useState(''),[meta,setMeta]=useState(''),[calcId,setCalcId]=useState(''),[lines,setLines]=useState<Line[]>([]),[clients,setClients]=useState<Client[]>([]),[sellers,setSellers]=useState<Seller[]>([]),[error,setError]=useState(''),[financeMessage,setFinanceMessage]=useState(''),[savingPayable,setSavingPayable]=useState(false),[dueDate,setDueDate]=useState(()=>{const d=new Date();d.setMonth(d.getMonth()+1);d.setDate(5);return d.toISOString().slice(0,10)})
 const load=async()=>{const [s,c]=await Promise.all([supabase.from('erp_usuarios').select('id,nome,email').eq('ativo',true).is('deleted_at',null).order('nome'),supabase.from('erp_clientes').select('id,nome').eq('ativo',true).order('nome').limit(5000)]);if(s.error)throw s.error;if(c.error)throw c.error;setSellers((s.data??[]) as Seller[]);setClients((c.data??[]) as Client[])}
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar vendedores.'))},[])
 const run=async()=>{setError('');const r=await supabase.rpc('erp_comissao_calcular',{p_competencia:competencia+'-01',p_usuario_id:sellerId||null,p_meta_faturamento:Number(meta)||0});if(r.error){setError(r.error.message);return}setCalcId(String((r.data as {calculo_id:string}).calculo_id));const q=await supabase.from('erp_comissao_linhas').select('id,pedido_id,item_id,produto_id,usuario_id,quantidade,valor_total,percentual,comissao_liquida,pedido:erp_pedidos_venda(numero,cliente_id),produto:erp_produtos(codigo,nome)').eq('calculo_id',String((r.data as {calculo_id:string}).calculo_id)).order('created_at');if(q.error)setError(q.error.message);else setLines((q.data??[]) as unknown as Line[])}
 const createPayable=async()=>{
  setError('');setFinanceMessage('')
  if(!calcId||!sellerId){setError('Selecione um vendedor e calcule a comissão antes de gerar o título.');return}
  if(!lines.length||commission<=0){setError('Não há comissão positiva calculada para gerar um título financeiro.');return}
  if(!dueDate){setError('Informe o vencimento do título.');return}
  const seller=sellers.find(item=>item.id===sellerId)
  if(!seller){setError('Vendedor não localizado na sessão atual.');return}
  setSavingPayable(true)
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error||new Error('Empresa não identificada.')
   const document='COMISSAO-'+competencia+'-'+sellerId
   const existing=await supabase.from('erp_contas_pagar').select('id').eq('empresa_id',String(company.data)).eq('documento',document).maybeSingle()
   if(existing.error)throw existing.error
   if(existing.data){setFinanceMessage('Já existe um título de comissão para este vendedor e competência. Consulte Contas a Pagar para acompanhar o pagamento.');return}
   const payable=await supabase.from('erp_contas_pagar').insert({empresa_id:String(company.data),descricao:'Comissão do vendedor '+seller.nome+' - competência '+competencia,documento:document,valor:commission,vencimento:dueDate,status:'aberta'})
   if(payable.error)throw payable.error
   setFinanceMessage('Título de comissão criado em Contas a Pagar. A quitação deve ser registrada pelo Financeiro.')
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível criar o título financeiro.')}
  finally{setSavingPayable(false)}
 }
 const options:LinkOption[]=useMemo(()=>sellers.map(s=>({value:s.id,label:s.nome,description:s.email})),[sellers])
 const total=lines.reduce((s,l)=>s+Number(l.valor_total),0),commission=lines.reduce((s,l)=>s+Number(l.comissao_liquida),0),goal=Number(meta)||0
 return <VendasLayout title="Cálculo de comissões" subtitle="Competência • faturamento • comissão líquida" onRefresh={() => void load()}><main className="min-h-screen bg-slate-50 p-3"><section className="border border-gray-200 bg-white p-2 shadow-sm"><div className="mb-2 flex flex-wrap items-end gap-2"><div><label className={label}>Competência</label><input className={input+' h-[30px] w-[110px] rounded-[2px]'} type="month" value={competencia} onChange={e=>setCompetencia(e.target.value)}/></div><div className="w-[180px]"><label className={label}>Vendedor / Agente</label><LinkFieldCombobox value={sellerId} options={options} onChange={setSellerId}/></div><div><label className={label}>Meta Faturamento</label><input className={input+' h-[30px] w-[110px] rounded-[2px] text-right'} inputMode="decimal" value={meta} onChange={e=>setMeta(e.target.value)}/></div><div><label className={label}>Vencimento da comissão</label><input className={input+' h-[30px] w-[130px] rounded-[2px]'} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div><button type="button" className="flex h-[30px] items-center justify-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white" onClick={()=>void run()}><Calculator size={12}/>Calcular</button></div>{error&&<div role="alert" className="mb-2 border border-red-200 bg-red-50 p-2 text-[10px] text-red-700">{error}</div>}{financeMessage&&<div role="status" className="mb-2 border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{financeMessage}</div>}
 <div className="scroll-fade-x max-h-[250px] overflow-auto border border-gray-200"><table className="w-full border-collapse text-[10px]"><thead className="sticky top-0 bg-slate-700 text-white"><tr className="h-7"><th className="px-2 text-left font-normal">Pedido</th><th className="min-w-[220px] px-2 text-left font-normal">Cliente</th><th className="px-2 text-left font-normal">SKU</th><th className="px-2 text-right font-normal">Qtd Faturada</th><th className="px-2 text-right font-normal">Valor Total Nota</th><th className="px-2 text-right font-normal">% Comissão da Regra</th><th className="px-2 text-right font-normal">Comissão Líquida R$</th></tr></thead><tbody>{lines.map((l,i)=><tr key={l.id} className={i%2?'bg-slate-50':'bg-white'} style={{height:26}}><td className="px-2">{l.pedido?.numero??'—'}</td><td className="px-2">{clients.find(c=>c.id===l.pedido?.cliente_id)?.nome??'—'}</td><td className="px-2">{l.produto?.codigo??'—'}</td><td className="px-2 text-right">{Number(l.quantidade).toLocaleString('pt-BR')}</td><td className="px-2 text-right">{money(Number(l.valor_total))}</td><td className="px-2 text-right">{Number(l.percentual).toFixed(2)}%</td><td className="px-2 text-right font-semibold">{money(Number(l.comissao_liquida))}</td></tr>)}</tbody></table></div>
 <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-2 text-[10px]"><div className="flex flex-wrap items-center gap-3"><span>Total vendas faturadas: <b>{money(total)}</b></span><span>Meta: {goal>0&&total>=goal?<b className="text-emerald-700">ATINGIDA</b>:<span className="text-gray-500">NÃO ATINGIDA</span>}</span><span>Total comissão: <b>{money(commission)}</b></span></div><div className="flex flex-wrap gap-1"><button type="button" disabled={!calcId||!lines.length} className="flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] disabled:opacity-40" onClick={()=>void exportXlsx(lines,clients)}><FileSpreadsheet size={12}/>Exportar XLSX</button><button type="button" disabled={!calcId||!sellerId||!lines.length||commission<=0||savingPayable} className="flex h-[30px] items-center justify-center gap-1 rounded-[2px] bg-[#3A9D78] px-2 text-[10px] font-semibold text-white disabled:opacity-40" onClick={()=>void createPayable()}><Wallet size={12}/>{savingPayable?'Gerando…':'Gerar título no Financeiro'}</button></div></div>
 </section></main></VendasLayout>
}