import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Search, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import VendasLayout from '../VendasLayout'

type Balance = { id:string; empresa_id:string; produto_id:string; lote_id:string; localizacao_id:string; quantidade:number; quantidade_reservada:number; unidade:string; status_estoque:'LIBERADO'|'QUARENTENA'|'BLOQUEADO'|'RESERVADO'|'ESGOTADO'; atualizado_em:string }
type Product = { id:string; codigo:string; nome:string }
type Lot = { id:string; lote_interno:string|null; lote_fornecedor:string|null; status_inspecao:string|null }
type Location = { id:string; codigo:string; nome:string; rua:string|null; prateleira:string|null; nivel:string|null }
const field='h-[30px] rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-[#2D8DB8]'
const label='mb-[2px] block text-[9px] font-medium uppercase tracking-[.04em] text-slate-600'
const fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4})
const badges:Record<Balance['status_estoque'],string>={LIBERADO:'bg-emerald-50 text-emerald-700',QUARENTENA:'bg-amber-50 text-amber-800',BLOQUEADO:'bg-rose-50 text-rose-700',RESERVADO:'bg-sky-50 text-sky-700',ESGOTADO:'bg-slate-100 text-slate-600'}

export default function EstoqueSaldosLote(){
 const [empresa,setEmpresa]=useState(''); const [balances,setBalances]=useState<Balance[]>([]); const [products,setProducts]=useState<Product[]>([]); const [lots,setLots]=useState<Lot[]>([]); const [locations,setLocations]=useState<Location[]>([])
 const [query,setQuery]=useState(''); const [status,setStatus]=useState('TODOS'); const [loading,setLoading]=useState(false); const [error,setError]=useState('')
 const load=useCallback(async()=>{setLoading(true);setError('');try{
  const tenant=await supabase.rpc('erp_current_empresa_id');if(tenant.error)throw tenant.error
  if(typeof tenant.data!=='string'||!tenant.data)throw new Error('Empresa da sessão não identificada.')
  setEmpresa(tenant.data)
  const [b,p,l,a]=await Promise.all([
   supabase.from('almoxarifado_estoque').select('id,empresa_id,produto_id,lote_id,localizacao_id,quantidade,quantidade_reservada,unidade,status_estoque,atualizado_em').eq('empresa_id',tenant.data).order('atualizado_em',{ascending:false}).limit(5000),
   supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id',tenant.data).limit(5000),
   supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor,status_inspecao').eq('empresa_id',tenant.data).limit(5000),
   supabase.from('erp_estoque_localizacoes').select('id,codigo,nome,rua,prateleira,nivel').eq('empresa_id',tenant.data).eq('ativo',true).limit(5000)
  ])
  if(b.error)throw b.error;if(p.error)throw p.error;if(l.error)throw l.error;if(a.error)throw a.error
  setBalances((b.data??[]) as Balance[]);setProducts((p.data??[]) as Product[]);setLots((l.data??[]) as Lot[]);setLocations((a.data??[]) as Location[])
 }catch(e){setError(e instanceof Error?e.message:'Falha ao consultar saldos por lote.')}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 const pm=useMemo(()=>new Map(products.map(x=>[x.id,x])),[products]);const lm=useMemo(()=>new Map(lots.map(x=>[x.id,x])),[lots]);const am=useMemo(()=>new Map(locations.map(x=>[x.id,x])),[locations])
 const visible=useMemo(()=>balances.filter(x=>{if(status!=='TODOS'&&x.status_estoque!==status)return false;const p=pm.get(x.produto_id),l=lm.get(x.lote_id),a=am.get(x.localizacao_id);const q=query.trim().toLocaleLowerCase('pt-BR');return !q||[p?.codigo,p?.nome,l?.lote_interno,l?.lote_fornecedor,a?.codigo,a?.nome,a?.rua,a?.prateleira,a?.nivel].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(q))}),[balances,pm,lm,am,status,query])
 const totals=useMemo(()=>visible.reduce((r,x)=>({saldo:r.saldo+Number(x.quantidade),reservado:r.reservado+Number(x.quantidade_reservada),bloqueado:r.bloqueado+(['QUARENTENA','BLOQUEADO'].includes(x.status_estoque)?Number(x.quantidade):0)}),{saldo:0,reservado:0,bloqueado:0}),[visible])
 return <VendasLayout title="Saldos por lote e endereço" subtitle="Rastreabilidade física por empresa, produto, lote e localização" onRefresh={()=>void load()} showStatusCards={false} titleActions={<Link to="/estoque" className="inline-flex h-[30px] items-center rounded-[2px] border border-slate-300 px-2 text-[10px]">Voltar ao estoque</Link>}>
  <section className="erp-global-surface erp-compact mt-3 space-y-3">
   <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 bg-white p-3 md:grid-cols-4">
    <div><span className={label}>Empresa da sessão</span><p className="truncate text-[10px]">{empresa||'Validando sessão...'}</p></div>
    <div><span className={label}>Saldo físico filtrado</span><p className="text-[14px] font-semibold tabular-nums">{fmt.format(totals.saldo)}</p></div>
    <div><span className={label}>Quantidade reservada</span><p className="text-[14px] font-semibold tabular-nums">{fmt.format(totals.reservado)}</p></div>
    <div><span className={label}>Quarentena / bloqueado</span><p className="text-[14px] font-semibold tabular-nums text-rose-700">{fmt.format(totals.bloqueado)}</p></div>
   </div>
   <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(220px,1fr)_180px_auto] md:items-end">
    <div><label className={label} htmlFor="wms-query">Pesquisar item, lote ou endereço</label><div className="relative"><Search size={13} className="absolute left-2 top-[9px] text-slate-400"/><input id="wms-query" className={field+' w-full pl-7'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, descrição, lote, rua, prateleira..."/></div></div>
    <div><label className={label} htmlFor="wms-status">Status do saldo</label><select id="wms-status" className={field+' w-full'} value={status} onChange={e=>setStatus(e.target.value)}><option value="TODOS">Todos os status</option><option value="LIBERADO">Liberado</option><option value="QUARENTENA">Quarentena</option><option value="BLOQUEADO">Bloqueado</option><option value="RESERVADO">Reservado</option><option value="ESGOTADO">Esgotado</option></select></div>
    <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] text-white disabled:opacity-50"><RefreshCw size={12} className={loading?'animate-spin':''}/>{loading?'Consultando...':'Atualizar'}</button>
   </div>
   {error&&<div role="alert" className="flex gap-2 rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800"><AlertTriangle size={14}/>{error}</div>}
   <div className="overflow-x-auto rounded border border-slate-200 bg-white"><table className="industrial-table w-full min-w-[1000px] text-[10px]"><thead className="bg-slate-100 text-left text-slate-600"><tr>{['Código / descrição','Lote interno / fornecedor','Endereço físico','Saldo','Reservado','Disponível','Status','Atualizado em'].map(h=><th key={h} className="h-[32px] px-2 text-[9px] font-medium uppercase">{h}</th>)}</tr></thead><tbody>
   {loading&&balances.length===0&&<tr><td colSpan={8} className="h-[32px] text-center">Carregando dados reais do Supabase...</td></tr>}
   {!loading&&visible.length===0&&<tr><td colSpan={8} className="h-[32px] text-center text-slate-500">Nenhum saldo por lote encontrado para os filtros aplicados.</td></tr>}
   {visible.map(x=>{const p=pm.get(x.produto_id),l=lm.get(x.lote_id),a=am.get(x.localizacao_id);const addr=a?[a.codigo,[a.rua,a.prateleira,a.nivel].filter(Boolean).join(' / ')].filter(Boolean).join(' · '):'Endereço não encontrado';return <tr key={x.id} className="border-t border-slate-100 hover:bg-neutral-50/80">
    <td className="h-[32px] px-2"><div className="font-medium">{p?.codigo??'Produto indisponível'}</div><div className="max-w-[260px] truncate text-[10px] text-slate-500">{p?.nome??x.produto_id}</div></td>
    <td className="h-[32px] px-2"><div>{l?.lote_interno??'—'}</div><div className="text-[10px] text-slate-500">{l?.lote_fornecedor??'Lote fornecedor não informado'}</div></td>
    <td className="h-[32px] px-2"><span className="inline-flex items-center gap-1"><Warehouse size={12} className="text-slate-400"/>{addr}</span></td>
    <td className="h-[32px] px-2 text-right tabular-nums">{fmt.format(Number(x.quantidade))} {x.unidade}</td><td className="h-[32px] px-2 text-right tabular-nums">{fmt.format(Number(x.quantidade_reservada))}</td><td className="h-[32px] px-2 text-right tabular-nums">{fmt.format(Number(x.quantidade)-Number(x.quantidade_reservada))}</td>
    <td className="h-[32px] px-2"><span className={'rounded-[2px] px-1.5 py-0.5 text-[9px] '+badges[x.status_estoque]}>{x.status_estoque}</span></td><td className="h-[32px] px-2 text-right tabular-nums">{new Date(x.atualizado_em).toLocaleString('pt-BR')}</td>
   </tr>})}
   </tbody></table></div>
   <p className="text-[9px] text-slate-500">Consulta isolada por empresa. Esta tela não cria saldo fictício nem converte lote bloqueado em liberado.</p>
  </section>
 </VendasLayout>
}
