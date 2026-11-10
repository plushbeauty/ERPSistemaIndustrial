/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-NOTAS-DEBITO-ROTINAS-FINANCEIRAS-20261110-01 — central de rotinas, filtros e cadastro conectado ao banco com isolamento por empresa.
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO SOLICITADA PELO PROPRIETÁRIO EM 2026-11-10
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileWarning, Landmark, Upload, RefreshCw, Plus, Search, FileText, Settings, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Dn={id:string;numero_dn:string;cliente_id:string;valor_nominal:number;data_emissao:string;status:string;descricao:string|null;pod_path:string|null;cliente?:{nome_fantasia?:string|null;razao_social?:string|null;nome?:string|null;documento?:string|null}|null}
type Client={id:string;nome:string;razao_social?:string|null;nome_fantasia?:string|null;documento?:string|null}
const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const field='h-10 w-full rounded-md border border-[#D3E3EA] bg-white px-3 text-xs text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label='mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#547080]'
const btn='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#D3E3EA] bg-white px-3 text-xs font-semibold text-[#123B50] hover:bg-[#F4FBFD] disabled:opacity-50'
const primary='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#123B50] px-4 text-xs font-bold text-white hover:bg-[#1B5874] disabled:opacity-50'
const card='rounded-lg border border-[#D3E3EA] bg-white p-5 shadow-sm'
export default function CustomerDnList(){
 const navigate=useNavigate()
 const [company,setCompany]=useState('')
 const [rows,setRows]=useState<Dn[]>([])
 const [clients,setClients]=useState<Client[]>([])
 const [search,setSearch]=useState('')
 const [status,setStatus]=useState('ALL')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [creating,setCreating]=useState(false)
 const [clientId,setClientId]=useState('')
 const [number,setNumber]=useState('')
 const [amount,setAmount]=useState('')
 const [issueDate,setIssueDate]=useState('')
 const [description,setDescription]=useState('')
 const [saving,setSaving]=useState(false)
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error)throw tenant.error
   if(typeof tenant.data!=='string'||!tenant.data)throw new Error('Empresa da sessão não identificada.')
   const tenantId=tenant.data;setCompany(tenantId)
   const [dn,cl]=await Promise.all([
    supabase.from('erp_notas_debito_clientes').select('id,numero_dn,cliente_id,valor_nominal,data_emissao,status,descricao,pod_path,cliente:erp_clientes(nome,razao_social,nome_fantasia,documento)').eq('empresa_id',tenantId).order('data_emissao',{ascending:false}).limit(500),
    supabase.from('erp_clientes').select('id,nome,razao_social,nome_fantasia,documento').eq('empresa_id',tenantId).eq('ativo',true).order('nome').limit(1000)
   ])
   if(dn.error)throw dn.error;if(cl.error)throw cl.error
   setRows((dn.data??[]) as unknown as Dn[]);setClients((cl.data??[]) as Client[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar notas de débito.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const filtered=useMemo(()=>rows.filter(r=>{
  const name=r.cliente?.razao_social||r.cliente?.nome_fantasia||r.cliente?.nome||''
  const term=search.trim().toLocaleLowerCase('pt-BR')
  return (!term||[r.numero_dn,name,r.descricao||''].some(v=>v.toLocaleLowerCase('pt-BR').includes(term)))&&(status==='ALL'||r.status===status)
 }),[rows,search,status])
 async function create(e:FormEvent){
  e.preventDefault();setSaving(true);setError('');setMessage('')
  try{
   if(!company)throw new Error('Empresa da sessão não identificada.')
   if(!clientId||!number.trim()||!amount||!issueDate)throw new Error('Preencha cliente, número, valor e data de emissão.')
   const user=await supabase.auth.getUser();if(user.error)throw user.error
   const result=await supabase.from('erp_notas_debito_clientes').insert({empresa_id:company,cliente_id:clientId,numero_dn:number.trim(),valor_nominal:Number(amount),data_emissao:issueDate,descricao:description.trim()||null,created_by:user.data.user?.id??null}).select('id').single()
   if(result.error)throw result.error
   setCreating(false);setClientId('');setNumber('');setAmount('');setIssueDate('');setDescription('')
   setMessage('Nota de débito registrada no banco de dados.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a nota.')}
  finally{setSaving(false)}
 }
 return <main className="min-h-full space-y-5 bg-[#F4FBFD] p-4 md:p-6">
  <header className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
   <div><div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#2D8DB8]"><Landmark size={13}/> Financeiro · Rotinas</div><h1 className="text-xl font-bold tracking-tight text-[#123B50]">Notas de Débito e Rotinas Financeiras</h1><p className="mt-1 text-xs text-[#547080]">Acompanhe notas de débito e acesse conciliação, importação de extratos e demais operações financeiras.</p></div>
   <button type="button" className={primary+' min-w-[190px]'} onClick={()=>setCreating(v=>!v)}><Plus size={15}/>Nova Nota de Débito</button>
  </header>
  <nav className="flex flex-wrap gap-3" aria-label="Acesso rápido às rotinas financeiras">
   <span className="inline-flex h-10 items-center gap-2 rounded-md bg-[#123B50] px-4 text-xs font-bold text-white"><FileWarning size={14}/>Notas de Débito</span>
   <button className={btn+' min-w-[180px]'} onClick={()=>navigate('/pageprincipal/financeiro/conciliacao-bancaria')}><Landmark size={14}/>Conciliação Bancária<ArrowUpRight size={12}/></button>
   <button className={btn+' min-w-[210px]'} onClick={()=>navigate('/pageprincipal/financeiro/importar-extratos')}><Upload size={14}/>Importar Extratos OFX/CNAB<ArrowUpRight size={12}/></button>
   <button className={btn+' min-w-[170px]'} onClick={()=>navigate('/pageprincipal/financeiro')}><Settings size={14}/>Demais Operações<ArrowUpRight size={12}/></button>
  </nav>
  {error&&<div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
  {message&&<div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</div>}
  <section className={card}>
   <div className="grid grid-cols-1 items-end gap-3 xl:grid-cols-[minmax(280px,380px)_160px_160px_110px]">
    <label><span className={label}>Busca rápida (nº nota, documento ou entidade)</span><input className={field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..."/></label>
    <label><span className={label}>Tipo operação</span><select className={field} disabled><option>Nota de débito cliente</option></select></label>
    <label><span className={label}>Status</span><select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Todos</option><option value="ABERTA">Aberta</option><option value="AGUARDANDO_POD">Aguardando POD</option><option value="LIBERADA">Liberada</option><option value="CANCELADA">Cancelada</option></select></label>
    <button className={primary} type="button" onClick={()=>void load()} disabled={loading}><Search size={14}/>Buscar</button>
   </div>
  </section>
  <section className="overflow-hidden rounded-lg border border-[#D3E3EA] bg-white shadow-sm">
   <div className="flex items-center justify-between border-b border-[#D3E3EA] px-4 py-3"><div><h2 className="text-xs font-bold text-[#123B50]">Listagem de Notas de Débito</h2><p className="mt-0.5 text-[10px] text-[#66808E]">{filtered.length} registro(s) encontrado(s) nesta empresa</p></div><button className={btn+' h-8'} onClick={()=>void load()} disabled={loading}><RefreshCw size={12}/>Atualizar</button></div>
   <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead className="bg-[#F1F7FA]"><tr className="h-10 text-[10px] uppercase tracking-wide text-[#547080]"><th className="px-3">Nº Nota</th><th className="px-3">Documento ref.</th><th className="px-3">Cliente / Fornecedor</th><th className="px-3">Emissão</th><th className="px-3">Vencimento</th><th className="px-3 text-right">Valor (R$)</th><th className="px-3">Status</th><th className="px-3">Ações</th></tr></thead><tbody>
   {filtered.map(r=><tr key={r.id} className="h-12 border-t border-[#E8F0F4] text-xs text-[#294B5B]"><td className="px-3 font-mono font-bold">{r.numero_dn}</td><td className="px-3">{r.descricao||'—'}</td><td className="px-3 font-semibold">{r.cliente?.razao_social||r.cliente?.nome_fantasia||r.cliente?.nome||'—'}</td><td className="px-3">{new Date(r.data_emissao+'T12:00:00').toLocaleDateString('pt-BR')}</td><td className="px-3 text-[#8A9CA5]">—</td><td className="px-3 text-right font-semibold tabular-nums">{money(r.valor_nominal)}</td><td className="px-3"><span className="rounded-full bg-[#EAF3F7] px-2 py-1 text-[10px] font-bold">{r.status}</span></td><td className="px-3"><button className="text-[11px] font-bold text-[#17658B] underline" onClick={()=>navigate('/pageprincipal/vendas/notas-debito/cliente/'+r.id)}>Abrir</button></td></tr>)}
   {!loading&&!filtered.length&&<tr><td colSpan={8} className="h-24 px-3 text-center text-xs text-[#78909C]">Nenhum registro encontrado.</td></tr>}
   {loading&&<tr><td colSpan={8} className="h-20 text-center text-xs text-[#78909C]">Consultando o banco de dados...</td></tr>}
   </tbody></table></div>
  </section>
  {creating&&<section className={card+' space-y-4'}>
   <div><h2 className="text-sm font-bold text-[#123B50]">Cadastro de Nota de Débito</h2><p className="mt-1 text-[11px] text-[#66808E]">Os campos abaixo correspondem ao cadastro que existe no banco atualmente. Não serão simulados vencimento, conta, categoria ou geração automática de título sem estrutura transacional implementada.</p></div>
   <form onSubmit={create} className="space-y-4">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
     <label><span className={label}>Nº Nota de Débito *</span><input className={field} required maxLength={40} value={number} onChange={e=>setNumber(e.target.value)}/></label>
     <label><span className={label}>Documento / Pedido origem</span><input className={field} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Referência ou descrição"/></label>
     <label><span className={label}>Data de emissão *</span><input type="date" className={field} required value={issueDate} onChange={e=>setIssueDate(e.target.value)}/></label>
     <label><span className={label}>Data de vencimento</span><input className={field+' bg-slate-50'} value="Não disponível no cadastro atual" disabled/></label>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(280px,440px)_minmax(220px,280px)]">
     <label><span className={label}>Cliente *</span><select className={field} required value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Selecionar registro...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.razao_social||c.nome_fantasia||c.nome} {c.documento?' · '+c.documento:''}</option>)}</select></label>
     <label><span className={label}>Tipo de lançamento</span><input className={field+' bg-slate-50'} value="A Receber · Nota de débito de cliente" disabled/></label>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
     <label><span className={label}>Valor principal (R$) *</span><input className={field} required min="0.01" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></label>
     <label><span className={label}>Acréscimos / taxas (R$)</span><input className={field+' bg-slate-50'} disabled placeholder="Não disponível no cadastro atual"/></label>
     <label><span className={label}>Descontos (R$)</span><input className={field+' bg-slate-50'} disabled placeholder="Não disponível no cadastro atual"/></label>
     <label><span className={label}>Valor total (R$)</span><input className={field+' bg-slate-50'} disabled value={amount?money(Number(amount)):''}/></label>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><label><span className={label}>Conta bancária / Caixa</span><input className={field+' bg-slate-50'} disabled value="Vínculo financeiro ainda não existe na tabela de notas"/></label><label><span className={label}>Centro de custo / Plano de contas</span><input className={field+' bg-slate-50'} disabled value="Classificação ainda não existe na tabela de notas"/></label></div>
    <label className="block"><span className={label}>Motivo / Discriminação do débito</span><textarea className={field+' min-h-[90px] py-2'} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva os itens, despesas reembolsáveis ou motivo do débito..."/></label>
    <div className="rounded-md border border-dashed border-[#B8CFDA] bg-[#F7FBFD] p-3 text-xs text-[#66808E]"><FileText className="mr-2 inline" size={14}/>Anexo e comprovante POD seguem o fluxo próprio de vínculo de comprovantes; use a ação Abrir no registro após salvar.</div>
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E8F0F4] pt-4"><button type="button" className={btn+' min-w-[140px]'} onClick={()=>setCreating(false)}>Limpar / Cancelar</button><button type="submit" className={primary+' min-w-[210px]'} disabled={saving}>{saving?'Salvando...':'Salvar Nota de Débito'}</button></div>
   </form>
  </section>}
  <section className={card+' space-y-2'}><h2 className="text-xs font-bold text-[#123B50]">Painel rápido de conciliação e extratos</h2><p className="text-[11px] text-[#66808E]">A importação e a conciliação usam os módulos bancários integrados e a conta bancária cadastrada para esta empresa.</p><div className="flex flex-wrap gap-2"><button className={btn} onClick={()=>navigate('/pageprincipal/financeiro/importar-extratos')}><Upload size={13}/>Selecionar extrato OFX/CNAB</button><button className={btn} onClick={()=>navigate('/pageprincipal/financeiro/conciliacao-bancaria')}><Landmark size={13}/>Abrir conciliação</button></div></section>
 </main>
}
