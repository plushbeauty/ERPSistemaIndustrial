/**
 * SYSNQRA ERP INDUSTRIAL — Padronização visual incremental de Vendas
 * Revisão: REV-VENDAS-UI-003 | Data: 2026-10-23
 * Escopo: controles e tabela; RPCs, cálculo de preço, operações e upload preservados.
 */
import { useEffect, useMemo, useState } from 'react'
import { Paperclip, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Produto={id:string;codigo:string;nome:string;preco_venda:number|null}
type Maquina={id:string;codigo:string;nome:string;valor_hora_custo:number}
type Operacao={id:string;sequencial_operacao:number;descricao_operacao:string;posto_trabalho_id:string;tempo_minutos:number;maquina?:Maquina}
type Custo={custo_tecnico:number;operacoes:number}
const brl=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number.isFinite(v)?v:0)

export default function VendasAnaliseCustos(){
 const [empresaId,setEmpresaId]=useState(''),[produtos,setProdutos]=useState<Produto[]>([]),[maquinas,setMaquinas]=useState<Maquina[]>([])
 const [itemBusca,setItemBusca]=useState(''),[produto,setProduto]=useState<Produto|null>(null),[custo,setCusto]=useState<Custo>({custo_tecnico:0,operacoes:0})
 const [impostos,setImpostos]=useState('0'),[comissao,setComissao]=useState('0'),[margem,setMargem]=useState('20')
 const [operacoes,setOperacoes]=useState<Operacao[]>([]),[posto,setPosto]=useState(''),[tempo,setTempo]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('')

 const load=async()=>{
  const e=await supabase.rpc('erp_current_empresa_id');if(e.error||!e.data)throw e.error??new Error('Empresa não identificada.')
  const id=String(e.data);setEmpresaId(id)
  const [p,m]=await Promise.all([
   supabase.from('erp_produtos').select('id,codigo,nome,preco_venda').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(5000),
   supabase.from('erp_maquinas').select('id,codigo,nome,valor_hora_custo').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(1000)
  ])
  if(p.error)throw p.error;if(m.error)throw m.error;setProdutos((p.data??[]) as Produto[]);setMaquinas((m.data??[]) as Maquina[])
 }
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar análise.'))},[])
 const resolve=async()=>{
  const raw=itemBusca.trim().toLowerCase();const p=produtos.find(x=>x.codigo.toLowerCase()===raw||x.nome.toLowerCase()===raw)
  if(!p){setProduto(null);setError('Código de projeto/item não localizado no cadastro.');return}
  setProduto(p);setError('');await loadOps(p.id)
 }
 const loadOps=async(productId:string)=>{
  const r=await supabase.rpc('erp_listar_operacoes_orcamento',{p_produto_id:productId});if(r.error){setError(r.error.message);return}
  const rows=(r.data??[]) as Operacao[];setOperacoes(rows);await recalc(productId)
 }
 const recalc=async(productId=produto?.id)=>{
  if(!productId)return
  const r=await supabase.rpc('erp_calcular_custo_tecnico',{p_produto_id:productId});if(r.error){setError(r.error.message);return}
  const row=Array.isArray(r.data)?r.data[0]:r.data;setCusto({custo_tecnico:Number(row?.custo_tecnico??0),operacoes:Number(row?.operacoes??0)})
 }
 const addOperation=async()=>{
  if(!produto||!posto||Number(tempo)<=0){setError('Informe o item, posto de trabalho e tempo.');return}
  setError('')
  const r=await supabase.rpc('erp_adicionar_operacao_orcamento',{p_produto_id:produto.id,p_posto_trabalho_id:posto,p_tempo_minutos:Number(tempo)})
  if(r.error){setError(r.error.message);return}
  setTempo('');await loadOps(produto.id);setMessage('Operação adicionada e custo recalculado.')
 }
 const removeOperation=async(id:string)=>{
  const r=await supabase.rpc('erp_remover_operacao_orcamento',{p_operacao_id:id});if(r.error){setError(r.error.message);return}
  if(produto)await loadOps(produto.id);setMessage('Operação removida e custo recalculado.')
 }
 const preco=useMemo(()=>{
  const base=Number(custo.custo_tecnico)||0
  const burden=Math.max(0,Number(impostos)||0)+Math.max(0,Number(comissao)||0)+Math.max(0,Number(margem)||0)
  return burden>=100?0:base/(1-burden/100)
 },[custo,impostos,comissao,margem])
 const upload=(input:HTMLInputElement|null)=>{const f=input?.files?.[0];if(!f||!produto)return;if(!empresaId){setError('Empresa não identificada.');return}void (async()=>{setError('');const path=`${empresaId}/${produto.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const u=await supabase.storage.from('engenharia-projetos').upload(path,f,{contentType:f.type||'application/octet-stream'});if(u.error){setError(u.error.message);return}setMessage('Desenho técnico armazenado no Storage.');input.value=''})()}
 return <VendasLayout title="Orçamentos e Custos" subtitle="Engenharia industrial, composição do custo e formação do preço de venda" onRefresh={()=>void load()} showStatusCards={false}>
  <div className="space-y-1.5 text-[11px]">
   {(error||message)&&<div className={`border px-2 py-1 text-[10px] ${error?'border-red-200 bg-red-50 text-red-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error||message}</div>}
   <section className="min-w-0 rounded-[2px] border border-slate-300 bg-white p-2"><div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,180px)_minmax(0,1fr)]">
    <label className="min-w-0 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Cód. Projeto / Item<input value={itemBusca} onChange={e=>setItemBusca(e.target.value)} onBlur={()=>void resolve()} onKeyDown={e=>{if(e.key==='Enter')void resolve()}} className="mt-0.5 h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-xs"/></label>
    
    <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-x-2 border bg-slate-50 px-2 py-1 text-[10px]">Custo Técnico<strong className="text-xs">{brl(custo.custo_tecnico)}</strong></div>
    <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-x-2 border bg-slate-50 px-2 py-1 text-[10px]">Preço Sugerido<strong className="text-sm text-[#17445A]">{brl(preco)}</strong></div>
    <div className="min-w-0 text-left text-[10px] text-slate-500 xl:text-right">{produto?produto.codigo+' • '+produto.nome:'Digite o código do item e pressione Enter.'}</div>
   </div></section>
   <div className="grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-2">
    <section className="min-w-0 rounded-[2px] border border-slate-300 bg-white p-2"><div className="mb-2 font-bold text-xs">Negociação comercial</div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
     <label className="min-w-0 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Impostos (%)<input type="number" step="0.01" value={impostos} onChange={e=>setImpostos(e.target.value)} className="mt-0.5 h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-xs"/></label>
     <label className="min-w-0 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Comissão Representante (%)<input type="number" step="0.01" value={comissao} onChange={e=>setComissao(e.target.value)} className="mt-0.5 h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-xs"/></label>
     <label className="min-w-0 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Margem de Lucro Desejada (%)<input type="number" step="0.01" value={margem} onChange={e=>setMargem(e.target.value)} className="mt-0.5 h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-xs"/></label>
    </div><div className="mt-2 grid grid-cols-3 gap-1 text-[10px]"><div>Custo {brl(custo.custo_tecnico)}</div><div>Operações {custo.operacoes}</div><div>Preço <b>{brl(preco)}</b></div></div></section>
    <section className="min-w-0 overflow-x-auto border border-slate-300 bg-white p-2"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><b className="text-xs">Ficha de processo / engenharia</b><label className="flex h-[30px] cursor-pointer items-center gap-1 rounded-[2px] border border-slate-300 px-2 text-xs whitespace-nowrap"><Paperclip size={14}/>Anexar desenho<input type="file" className="hidden" accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg" onChange={e=>upload(e.currentTarget)}/></label></div>
     <table className="w-full min-w-[520px] border-collapse text-xs"><thead><tr className="bg-slate-100 text-left"><th className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Seq.</th><th className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Posto / Máquina</th><th className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Tempo min</th><th className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Custo</th><th className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600"></th></tr></thead><tbody>
      {operacoes.map((o,i)=><tr key={o.id} className="h-8 border-t border-slate-200"><td className="px-2 py-1 text-[10px]">{o.sequencial_operacao||((i+1)*10)}</td><td className="px-2 py-1 text-[10px]">{o.maquina?.codigo??''} • {o.maquina?.nome??o.descricao_operacao}</td><td className="px-2 py-1 text-[10px]">{Number(o.tempo_minutos).toFixed(2)}</td><td className="px-2 py-1 text-[10px]">{brl((Number(o.tempo_minutos)/60)*Number(o.maquina?.valor_hora_custo??0))}</td><td className="px-2 py-1"><button type="button" aria-label={`Remover operação ${o.sequencial_operacao}`} onClick={()=>void removeOperation(o.id)} className="text-red-700"><Trash2 size={11}/></button></td></tr>)}
      <tr className="border-t bg-slate-50"><td className="px-2 py-1 text-[10px]">+</td><td><select value={posto} onChange={e=>setPosto(e.target.value)} className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-1 text-xs"><option value="">Posto de trabalho</option>{maquinas.map(m=><option key={m.id} value={m.id}>{m.codigo} • {m.nome}</option>)}</select></td><td><input type="number" min="0.01" step="0.01" value={tempo} onChange={e=>setTempo(e.target.value)} className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-1 text-xs"/></td><td></td><td><button type="button" onClick={()=>void addOperation()} className="flex h-[30px] w-[30px] items-center justify-center rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#237497]"><Plus size={11}/></button></td></tr>
     </tbody></table>
    </section>
   </div>
  </div>
 </VendasLayout>
}
