import { useEffect, useRef, useState } from 'react'
import { DownloadCloud, Upload, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'
import BankAccountManager from './BankAccountManager'

type Account = { id:string; codigo:string; nome:string; banco:string }
type Log = { id:string; nome_arquivo:string; url_arquivo:string; status_processamento:string; numero_transacoes:number; saldo_fechamento:number; criado_em:string }
type ParsedTransaction = { data_movimento:string; data_valor:string|null; descricao:string; referencia:string|null; tipo:'CREDITO'|'DEBITO'; valor:number; saldo:number|null }
type ExistingTransaction = { data_movimento:string; descricao:string; referencia:string|null; tipo:string; valor:number|string; saldo:number|string|null }
type ImportLog = { id:string }

const allowed=['.csv']
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
function parseCsv(text:string):string[][] {
 const first=text.split(/\r?\n/,1)[0]??''
 const count=(delimiter:string)=>{let quoted=false,total=0;for(let i=0;i<first.length;i++){if(first[i]==='"'){if(quoted&&first[i+1]==='"'){i++;continue}quoted=!quoted}else if(!quoted&&first[i]===delimiter)total++}return total}
 const delimiter=count(';')>count(',')?';':','
 const rows:string[][]=[]
 let row:string[]=[];let cell='';let quoted=false
 for(let i=0;i<text.length;i++){
  const char=text[i]
  if(char==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted
  }else if(char===delimiter&&!quoted){row.push(cell.trim());cell=''}
  else if((char==='\n'||char==='\r')&&!quoted){
   if(char==='\r'&&text[i+1]==='\n')i++
   row.push(cell.trim());cell=''
   if(row.some(value=>value!==''))rows.push(row)
   row=[]
  }else cell+=char
 }
 row.push(cell.trim());if(row.some(value=>value!==''))rows.push(row)
 return rows
}
function parseDate(value:string):string|null {
 const clean=value.trim()
 if(/^\d{4}-\d{2}-\d{2}$/.test(clean))return clean
 const match=clean.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/)
 if(match){const day=match[1].padStart(2,'0'),month=match[2].padStart(2,'0');return `${match[3]}-${month}-${day}`}
 const parsed=new Date(clean)
 return Number.isNaN(parsed.getTime())?null:parsed.toISOString().slice(0,10)
}
function parseAmount(value:string):number|null {
 let clean=value.replace(/[^0-9,.-]/g,'').trim()
 if(!clean)return null
 if(clean.includes(',')&&clean.includes('.')){
  if(clean.lastIndexOf(',')>clean.lastIndexOf('.'))clean=clean.replace(/\./g,'').replace(',','.')
  else clean=clean.replace(/,/g,'')
 }else if(clean.includes(','))clean=clean.replace(',','.')
 const parsed=Number(clean)
 return Number.isFinite(parsed)?parsed:null
}
function parseTransactions(text:string):ParsedTransaction[] {
 const rows=parseCsv(text)
 if(rows.length<2)throw new Error('O CSV não possui linhas de transação.')
 const headers=rows[0].map(normalize)
 const find=(names:string[])=>headers.findIndex(header=>names.includes(header))
 const dateIndex=find(['data','datamovimento','datatransacao','dataoperacao','dtmovimento','lancamento'])
 const descriptionIndex=find(['descricao','historico','memo','detalhe','lancamento'])
 const amountIndex=find(['valor','valortransacao','montante','amount'])
 const debitIndex=find(['debito','valor debito','saida','debit'])
 const creditIndex=find(['credito','valor credito','entrada','credit'])
 const typeIndex=find(['tipo','natureza','dc','operacao'])
 const referenceIndex=find(['referencia','documento','numerodocumento','doc','idtransacao'])
 const balanceIndex=find(['saldo','saldoapos','saldoatual','balance'])
 const valueDateIndex=find(['datavalor','datavalute','datacompensacao'])
 if(dateIndex<0||descriptionIndex<0||(amountIndex<0&&debitIndex<0&&creditIndex<0))throw new Error('Cabeçalho inválido. Informe Data, Descrição e Valor (ou colunas Débito/Crédito).')
 const result:ParsedTransaction[]=[]
 for(const row of rows.slice(1)){
  const date=parseDate(row[dateIndex]??'')
  const description=(row[descriptionIndex]??'').trim()
  const debit=debitIndex>=0?parseAmount(row[debitIndex]??''):null
  const credit=creditIndex>=0?parseAmount(row[creditIndex]??''):null
  const raw=amountIndex>=0?parseAmount(row[amountIndex]??''):null
  const amount=credit&&credit!==0?Math.abs(credit):debit&&debit!==0?Math.abs(debit):raw===null?null:Math.abs(raw)
  if(!date||!description||amount===null||amount===0)continue
  const typeText=typeIndex>=0?normalize(row[typeIndex]??''):''
  const type: 'CREDITO'|'DEBITO'=typeText.includes('deb')||typeText.includes('saida')||typeText.includes('pag')||(debit!==null&&debit!==0)||(raw!==null&&raw<0)?'DEBITO':'CREDITO'
  result.push({data_movimento:date,data_valor:valueDateIndex>=0?parseDate(row[valueDateIndex]??''):null,descricao:description,referencia:referenceIndex>=0?(row[referenceIndex]?.trim()||null):null,tipo:type,valor:amount,saldo:balanceIndex>=0?parseAmount(row[balanceIndex]??''):null})
 }
 if(!result.length)throw new Error('Nenhuma linha válida foi encontrada. Confira as colunas, datas e valores do CSV.')
 return result
}
function fingerprint(row:ParsedTransaction|ExistingTransaction){
 return [row.data_movimento,row.tipo,Number(row.valor).toFixed(2),normalize(row.descricao),row.referencia?.trim()??'',row.saldo===null?'':Number(row.saldo).toFixed(2)].join('|')
}

export default function BankStatementImporter(){
 const [accounts,setAccounts]=useState<Account[]>([])
 const [accountId,setAccountId]=useState('')
 const [file,setFile]=useState<File|null>(null)
 const [logs,setLogs]=useState<Log[]>([])
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const fileRef=useRef<HTMLInputElement>(null)

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const accountsResult=await supabase.from('erp_contas_bancarias').select('id,codigo,nome,banco').eq('empresa_id',company.data).eq('ativo',true).order('nome')
   if(accountsResult.error)throw accountsResult.error
   const data=(accountsResult.data??[]) as Account[]
   setAccounts(data)
   if(!accountId&&data[0])setAccountId(data[0].id)
   const logsResult=await supabase.from('erp_importacoes_log').select('id,nome_arquivo,url_arquivo,status_processamento,numero_transacoes,saldo_fechamento,criado_em').eq('empresa_id',company.data).order('criado_em',{ascending:false}).limit(20)
   if(logsResult.error)throw logsResult.error
   setLogs((logsResult.data??[]) as Log[])
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar contas e histórico.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 const options:LinkOption[]=accounts.map(account=>({value:account.id,label:account.codigo+' · '+account.nome,description:account.banco}))
 const choose=(next:File|null)=>{
  if(!next)return
  const extension=next.name.slice(next.name.lastIndexOf('.')).toLowerCase()
  if(!allowed.includes(extension)){setError('Nesta versão, somente CSV é processado. XLSX e PDF permanecem bloqueados até integração de parser validado; o arquivo não será marcado como importado.');return}
  setFile(next);setError('');setMessage('')
 }

 const upload=async()=>{
  if(!file||!accountId){setError('Selecione a conta bancária e um arquivo CSV.');return}
  setBusy(true);setError('');setMessage('')
  let logId:string|null=null
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const tenant=String(company.data)
   const parsed=parseTransactions(await file.text())
   const minDate=parsed.reduce((min,row)=>row.data_movimento<min?row.data_movimento:min,parsed[0].data_movimento)
   const maxDate=parsed.reduce((max,row)=>row.data_movimento>max?row.data_movimento:max,parsed[0].data_movimento)
   const existing=await fetchAllPages<ExistingTransaction>((from,to)=>supabase.from('erp_transacoes_bancarias').select('data_movimento,descricao,referencia,tipo,valor,saldo',{count:'exact'}).eq('empresa_id',tenant).eq('conta_bancaria_id',accountId).gte('data_movimento',minDate).lte('data_movimento',maxDate).range(from,to),500)
   const seen=new Set(existing.map(fingerprint))
   const unique=parsed.filter(row=>{const key=fingerprint(row);if(seen.has(key))return false;seen.add(key);return true})
   const path=tenant+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
   const stored=await supabase.storage.from('banking-extratos').upload(path,file,{upsert:false})
   if(stored.error)throw stored.error
   const log=await supabase.from('erp_importacoes_log').insert({empresa_id:tenant,nome_arquivo:file.name,url_arquivo:path,status_processamento:'Processando',numero_transacoes:0,saldo_fechamento:0}).select('id').single()
   if(log.error){await supabase.storage.from('banking-extratos').remove([path]);throw log.error}
   logId=(log.data as ImportLog).id
   if(unique.length){
    const payload=unique.map(row=>({...row,empresa_id:tenant,conta_bancaria_id:accountId,importacao_id:logId,status:'PENDENTE'}))
    const inserted=await supabase.from('erp_transacoes_bancarias').insert(payload)
    if(inserted.error)throw inserted.error
   }
   const closing=[...parsed].reverse().find(row=>row.saldo!==null)?.saldo??0
   const update=await supabase.from('erp_importacoes_log').update({status_processamento:unique.length?'Concluído':'Concluído · sem novos lançamentos',numero_transacoes:unique.length,saldo_fechamento:closing}).eq('id',logId).eq('empresa_id',tenant)
   if(update.error)throw update.error
   setMessage(`${unique.length} transação(ões) importada(s); ${parsed.length-unique.length} duplicada(s) ignorada(s).`)
   setFile(null);if(fileRef.current)fileRef.current.value=''
   await load()
  }catch(cause){
   if(logId){const company=await supabase.rpc('erp_current_empresa_id');if(company.data)await supabase.from('erp_importacoes_log').update({status_processamento:'Falhou'}).eq('id',logId).eq('empresa_id',String(company.data))}
   setError(cause instanceof Error?cause.message:'Falha ao processar extrato. Nenhuma transação foi marcada como conciliada.')
  }finally{setBusy(false)}
 }

 return <div className="erp-global-density min-h-screen bg-[#F4FBFD] p-3 text-[#123B50]">
  <div className="mb-3 flex items-center gap-2 text-[10px] text-[#66808D]"><DownloadCloud size={14}/><span>Financeiro</span><span>›</span><strong className="text-[#123B50]">Importador de Extratos</strong></div>
  <div className="grid min-h-[calc(100vh-76px)] grid-cols-1 gap-3 xl:grid-cols-[minmax(380px,42%)_minmax(0,58%)]">
   <section className="rounded-xl border border-[#D3E3EA] bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#2D8DB8]"/><h1 className="text-sm font-bold">Importar extrato bancário</h1></div>
    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#547080]">Banco / Conta</label>
    <LinkFieldCombobox value={accountId} options={options} onChange={setAccountId} placeholder="Banco/Conta"/>
    <div className="mt-2"><BankAccountManager onCreated={()=>void load()}/></div>
    <div className="my-3 rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 py-2 text-[10px] text-[#547080]">Importação transacional por CSV. XLSX e PDF são recusados até que o parser de cada formato esteja integrado e validado.</div>
    <input ref={fileRef} className="hidden" type="file" accept=".csv,text/csv" onChange={event=>choose(event.target.files?.[0]??null)}/>
    <button type="button" onClick={()=>fileRef.current?.click()} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();choose(event.dataTransfer.files?.[0]??null)}} className="flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#8EAFBE] bg-white px-4 text-center text-xs text-[#547080] hover:bg-[#F8FBFC]"><Upload size={24} className="text-[#2D8DB8]"/><strong>Arraste o CSV aqui ou clique para selecionar</strong><span className="text-[10px]">Delimitador ; ou , · Datas DD/MM/AAAA ou AAAA-MM-DD</span></button>
    {file&&<div className="mt-2 rounded-md border border-[#D3E3EA] bg-[#F8FBFC] px-3 py-2 text-[11px]">{file.name} · {(file.size/1024).toFixed(1)} KB</div>}
    {error&&<div role="alert" className="mt-3 rounded-md border border-[#D65B61]/30 bg-[#FFF4F4] px-3 py-2 text-[11px] text-[#A63C3C]">{error}</div>}
    {message&&<div role="status" className="mt-3 rounded-md border border-[#3A9D78]/30 bg-[#F0FAF5] px-3 py-2 text-[11px] text-[#246B50]">{message}</div>}
    <div className="mt-3 flex justify-end"><button type="button" disabled={busy||loading||!file||!accountId} onClick={()=>void upload()} className="flex h-10 items-center gap-2 rounded-full bg-[#176487] px-5 text-xs font-bold text-white disabled:opacity-50">{busy?<RefreshCw size={14} className="animate-spin"/>:<Upload size={14}/ >}{busy?'Processando…':'Importar transações'}</button></div>
   </section>
   <section className="rounded-xl border border-[#D3E3EA] bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">Últimas 20 importações</h2><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D3E3EA] px-3 text-[10px] font-bold text-[#315466]"><RefreshCw size={12} className={loading?'animate-spin':''}/>Atualizar</button></div>
    <div className="overflow-auto"><table className="w-full min-w-[650px] border-collapse text-[10px]"><thead><tr className="h-9 bg-[#123B50] text-white"><th className="px-2 text-left">Importado em</th><th className="px-2 text-left">Status</th><th className="px-2 text-right">Transações</th><th className="px-2 text-right">Saldo fechamento</th><th className="px-2 text-left">Arquivo</th></tr></thead><tbody>{logs.map(log=><tr key={log.id} className="h-10 border-b border-[#E6EEF2] even:bg-[#F8FBFC]"><td className="px-2">{new Date(log.criado_em).toLocaleString('pt-BR')}</td><td className="px-2"><span className={log.status_processamento.toLowerCase().includes('conclu')?'rounded-full bg-[#EFF9F3] px-2 py-1 font-bold text-[#287B59]':'rounded-full bg-[#FFF8EA] px-2 py-1 font-bold text-[#94611B]'}>{log.status_processamento}</span></td><td className="px-2 text-right tabular-nums">{log.numero_transacoes}</td><td className="px-2 text-right tabular-nums">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(log.saldo_fechamento)}</td><td className="px-2"><button type="button" className="text-[#176487] underline" onClick={async()=>{const signed=await supabase.storage.from('banking-extratos').createSignedUrl(log.url_arquivo,300);if(!signed.error)window.open(signed.data.signedUrl,'_blank','noopener,noreferrer')}}>{log.nome_arquivo}</button></td></tr>)}{!logs.length&&<tr><td colSpan={5} className="h-14 text-center text-[#66808D]">Nenhuma importação registrada.</td></tr>}</tbody></table></div>
   </section>
  </div>
 </div>
}
