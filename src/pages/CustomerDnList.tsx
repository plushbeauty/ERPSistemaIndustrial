/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, RefreshCw, Plus, Search, Link2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Dn = { id:string; numero_dn:string; cliente_id:string; valor_nominal:number; data_emissao:string; status:string; pod_path:string|null; cliente?:{nome_fantasia?:string|null;razao_social?:string|null;nome?:string|null}|null }
type Client = {id:string;razao_social?:string|null;nome_fantasia?:string|null;nome?:string|null}
const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const input='erp-input'
const button='erp-btn'
const primary='erp-btn-primary'

export default function CustomerDnList(){
 const navigate=useNavigate()
 const [rows,setRows]=useState<Dn[]>([])
 const [clients,setClients]=useState<Client[]>([])
 const [search,setSearch]=useState('')
 const [podFilter,setPodFilter]=useState('ALL')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [creating,setCreating]=useState(false)
 const [clientId,setClientId]=useState('')
 const [number,setNumber]=useState('')
 const [amount,setAmount]=useState('')
 const [issueDate,setIssueDate]=useState(new Date().toISOString().slice(0,10))
 const [description,setDescription]=useState('')
 const [saving,setSaving]=useState(false)
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const [dn,cl]=await Promise.all([
    supabase.from('erp_notas_debito_clientes').select('id,numero_dn,cliente_id,valor_nominal,data_emissao,status,pod_path,cliente:erp_clientes(razao_social,nome_fantasia,nome)').order('data_emissao',{ascending:false}).limit(300),
    supabase.from('erp_clientes').select('id,razao_social,nome_fantasia,nome').eq('ativo',true).order('razao_social').limit(1000)
   ])
   if(dn.error)throw dn.error;if(cl.error)throw cl.error
   setRows((dn.data??[]) as unknown as Dn[]);setClients((cl.data??[]) as Client[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar notas de débito.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const filtered=rows.filter(r=>{
  const name=r.cliente?.razao_social||r.cliente?.nome_fantasia||r.cliente?.nome||''
  const term=search.trim().toLocaleLowerCase('pt-BR')
  const matches=!term||r.numero_dn.toLocaleLowerCase('pt-BR').includes(term)||name.toLocaleLowerCase('pt-BR').includes(term)
  return matches&&(podFilter==='ALL'||(podFilter==='WITH_POD'?Boolean(r.pod_path):!r.pod_path))
 })
 async function create(event:FormEvent){event.preventDefault();setSaving(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id');if(tenant.error)throw tenant.error
   if(typeof tenant.data!=='string'||!tenant.data)throw new Error('Empresa da sessão não identificada.')
   const user=await supabase.auth.getUser();if(user.error)throw user.error
   const result=await supabase.from('erp_notas_debito_clientes').insert({empresa_id:tenant.data,cliente_id:clientId,numero_dn:number.trim(),valor_nominal:Number(amount),data_emissao:issueDate,descricao:description.trim()||null,created_by:user.data.user?.id??null}).select('id').single()
   if(result.error)throw result.error
   setCreating(false);setClientId('');setNumber('');setAmount('');setDescription('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a nota.')}
  finally{setSaving(false)}
 }
 return <main className="space-y-6 p-6">
  <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-xl font-bold tracking-tight text-foreground">Gerenciamento de Notas de Débito de Clientes</h1><p className="text-xs text-muted-foreground">Acompanhe a emissão, conciliação e vínculos de comprovantes das DNs.</p></div><div className="flex gap-2"><button type="button" className={button} onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Atualizar</button><button type="button" className={primary} onClick={()=>setCreating(v=>!v)}><Plus size={14}/>Nova Nota de Débito</button></div></header>
  {error&&<div role="alert" className="erp-card border-red-300 p-3 text-xs text-red-700">{error}</div>}
  {creating&&<form onSubmit={create} className="erp-card grid gap-3 p-4 sm:grid-cols-2"><label className="space-y-1"><span className="erp-label">Cliente</span><select required className={input} value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Selecione...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.razao_social||c.nome_fantasia||c.nome||c.id}</option>)}</select></label><label className="space-y-1"><span className="erp-label">Número DN</span><input required className={input} value={number} onChange={e=>setNumber(e.target.value)} maxLength={40}/></label><label className="space-y-1"><span className="erp-label">Valor nominal (R$)</span><input required min="0" step="0.01" type="number" className={input} value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="space-y-1"><span className="erp-label">Data de emissão</span><input required type="date" className={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)}/></label><label className="space-y-1 sm:col-span-2"><span className="erp-label">Descrição</span><input className={input} value={description} onChange={e=>setDescription(e.target.value)}/></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={button} onClick={()=>setCreating(false)}>Cancelar</button><button className={primary} disabled={saving}>{saving?'Salvando...':'Salvar Nota'}</button></div></form>}
  <section className="erp-card p-4"><div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1"><span className="erp-label">Termo de Busca</span><input className={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número da DN ou Cliente..."/></label><label className="space-y-1"><span className="erp-label">Filtrar por Status do POD</span><select className={input} value={podFilter} onChange={e=>setPodFilter(e.target.value)}><option value="ALL">Todos os Registros</option><option value="WITH_POD">Com Comprovante Vinculado</option><option value="WITHOUT_POD">Pendente de Comprovante</option></select></label><div className="flex items-end gap-2"><button type="button" className={primary+' flex-1'}><Search size={13}/>Pesquisar</button><button type="button" className={button} onClick={()=>{setSearch('');setPodFilter('ALL')}}>Limpar</button></div></div></section>
  <section className="erp-card overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className="erp-th w-32">Nº Nota (DN)</th><th className="erp-th">Cliente Solicitante</th><th className="erp-th w-36 text-right">Valor Nominal</th><th className="erp-th w-32">Data de Emissão</th><th className="erp-th w-36">Vínculo de POD</th><th className="erp-th w-28 text-center">Operações</th></tr></thead><tbody>{filtered.map(d=><tr key={d.id} className="erp-tr"><td className="erp-td font-mono font-bold text-primary">{d.numero_dn}</td><td className="erp-td font-semibold text-foreground">{d.cliente?.razao_social||d.cliente?.nome_fantasia||d.cliente?.nome||'—'}</td><td className="erp-td text-right font-semibold">{money(d.valor_nominal)}</td><td className="erp-td text-muted-foreground">{new Date(d.data_emissao+'T12:00:00').toLocaleDateString('pt-BR')}</td><td className="erp-td"><span className={d.pod_path?'text-success':'text-warning'}>{d.pod_path?'Vinculado':'Pendente'}</span></td><td className="erp-td"><div className="flex items-center justify-center gap-1"><button type="button" className={button+' p-1'} title="Ver detalhes" onClick={()=>navigate('/pageprincipal/vendas/notas-debito/cliente/'+d.id)}><Eye size={13}/></button><button type="button" className={button+' p-1'} title="Vincular canhoto" onClick={()=>navigate('/pageprincipal/vendas/notas-debito/pod/'+d.id)}><Link2 size={13}/></button></div></td></tr>)}{!loading&&!filtered.length&&<tr><td colSpan={6} className="erp-td py-8 text-center text-muted-foreground">Nenhuma Nota de Débito carregada do banco de dados.</td></tr>}{loading&&<tr><td colSpan={6} className="erp-td py-8 text-center">Carregando...</td></tr>}</tbody></table></section>
 </main>
}
