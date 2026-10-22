/**
 * SYSNQRA — Engenharia de Manufatura | Ficha Mestre BOM
 * Revisão ENG-BOM-001 — 2026-10-21
 * Dados reais da empresa autenticada; gravação via RPC transacional.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Coins, GitBranch, Layers, Plus, RefreshCw, Save, Trash2, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { useSearchParams } from 'react-router-dom'

type Product = { id: string; codigo: string; nome: string; custo_medio: number | null }
type Tool = { id: string; codigo: string; nome: string }
type Line = { key: string; componente_id: string; quantidade_gasto: string; perda_pct: string }
type Header = { id: string; produto_pai_id: string; versao: number; status: string; created_at: string }
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#3b5e7c] bg-[#091522] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none focus:border-[#48B7C7] disabled:opacity-50'
const label = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-[#A8BBC8]'
const btn = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] px-3 text-[10px] font-black uppercase disabled:opacity-50'
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 })

export default function EngenhariaBOM() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [headers, setHeaders] = useState<Header[]>([])
  const [companyId, setCompanyId] = useState('')
  const [parentId, setParentId] = useState(() => searchParams.get('produto') ?? '')
  const [toolId, setToolId] = useState('')
  const [version, setVersion] = useState('1')
  const [notes, setNotes] = useState('')
  const [componentId, setComponentId] = useState('')
  const [qty, setQty] = useState('')
  const [loss, setLoss] = useState('0')
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (!data) throw new Error('Empresa da sessão autenticada não identificada.')
      const tenant = String(data); setCompanyId(tenant)
      const [ps, ts, hs] = await Promise.all([
        fetchAllPages<Product>((from,to) => supabase.from('erp_produtos').select('id,codigo,nome,custo_medio').eq('empresa_id',tenant).eq('ativo',true).order('codigo').range(from,to)),
        fetchAllPages<Tool>((from,to) => supabase.from('erp_ferramentas_industriais').select('id,codigo,nome').eq('empresa_id',tenant).eq('ativo',true).order('codigo').range(from,to)),
        supabase.from('erp_engenharia_bom').select('id,produto_pai_id,versao,status,created_at').eq('empresa_id',tenant).order('created_at',{ascending:false}).limit(100)
      ])
      setProducts(ps); setTools(ts)
      if (hs.error && !['42P01','PGRST205'].includes(hs.error.code ?? '')) throw hs.error
      setHeaders((hs.data ?? []) as Header[])
    } catch(e) { setError(e instanceof Error ? e.message : 'Falha ao carregar dados da engenharia.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const productMap = useMemo(() => new Map(products.map(p => [p.id,p])), [products])
  const parent = productMap.get(parentId)
  const cost = useMemo(() => lines.reduce((sum,l) => sum + Number(l.quantidade_gasto) * Number(productMap.get(l.componente_id)?.custo_medio ?? 0) * (1 + Number(l.perda_pct)/100),0), [lines,productMap])

  function addLine() {
    const q=Number(qty), p=Number(loss); setError(''); setMessage('')
    if (!componentId || !Number.isFinite(q) || q<=0 || !Number.isFinite(p) || p<0 || p>100) { setError('Informe componente, consumo maior que zero e perda entre 0% e 100%.'); return }
    if (componentId===parentId) { setError('O produto mestre não pode ser componente dele mesmo.'); return }
    if (lines.some(l=>l.componente_id===componentId)) { setError('Componente já incluído nesta estrutura.'); return }
    setLines(prev=>[...prev,{key:crypto.randomUUID(),componente_id:componentId,quantidade_gasto:String(q),perda_pct:String(p)}])
    setComponentId(''); setQty(''); setLoss('0')
  }
  async function save() {
    setError(''); setMessage('')
    const v=Number(version)
    if (!companyId || !parentId || !lines.length || !Number.isInteger(v) || v<1) { setError('Selecione produto mestre, versão inteira positiva e ao menos um componente.'); return }
    setSaving(true)
    try {
      const {data,error:rpcError}=await supabase.rpc('erp_salvar_bom_mestre',{
        p_produto_pai_id:parentId,p_ferramenta_id:toolId||null,p_versao:v,p_observacoes:notes.trim()||null,
        p_componentes_json:lines.map(l=>({componente_id:l.componente_id,quantidade_gasto:Number(l.quantidade_gasto),perda_pct:Number(l.perda_pct)}))
      })
      if(rpcError) throw rpcError
      setMessage('Ficha BOM gravada pelo banco. Referência: '+(typeof data==='string'?data:(data?.id??'confirmação recebida')))
      setLines([]); setNotes(''); await load()
    } catch(e) { setError(e instanceof Error?e.message:'Falha ao gravar ficha BOM.') }
    finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-[#0A111A] p-3 font-mono text-[#F4FBFD] md:p-5"><div className="mx-auto max-w-[1700px] space-y-4">
    <header className="flex flex-wrap items-center gap-3 rounded-[3px] border border-[#2E4A62] border-l-4 border-l-[#48B7C7] bg-[#0E1E2F] p-4 shadow-xl"><span className="flex h-11 w-11 items-center justify-center border border-[#48B7C7]/30 bg-[#123B50] text-[#48B7C7]"><GitBranch size={22}/></span><div className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#48B7C7]">SYSNQRA • ENGENHARIA DE PRODUTO / BOM</span><h1 className="mt-1 text-lg font-black md:text-xl">Ficha de Engenharia Mestre</h1><p className="mt-1 text-[10px] text-slate-400">Estrutura de materiais, ferramental e custo estimado por unidade.</p></div><button onClick={()=>void load()} disabled={loading} className={btn+' border border-[#3b5e7c]'}><RefreshCw size={13}/> Atualizar</button></header>
    {(error||message)&&<div role="status" className={'flex items-start justify-between gap-3 border px-3 py-2 text-[11px] '+(error?'border-rose-500 bg-rose-950/40 text-rose-200':'border-emerald-500 bg-emerald-950/40 text-emerald-200')}><span>{error||message}</span><button onClick={()=>{setError('');setMessage('')}} aria-label="Fechar"><X size={14}/></button></div>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><article className="border border-[#1b3a57] border-l-4 border-l-[#2D8DB8] bg-gradient-to-br from-[#0f253d] to-[#091726] p-3"><span className="text-[9px] font-black uppercase text-slate-300">Componentes na estrutura</span><div className="mt-1 flex justify-between text-2xl font-black">{lines.length}<Layers className="text-[#2D8DB8]"/></div></article><article className="border border-[#174433] border-l-4 border-l-[#3A9D78] bg-gradient-to-br from-[#0c2e22] to-[#061c14] p-3"><span className="text-[9px] font-black uppercase text-emerald-300">Custo estimado da estrutura</span><div className="mt-1 flex items-center justify-between gap-2 text-xl font-black text-[#48B7C7]">{money(cost)}<Coins size={18}/></div></article><article className="border border-[#4c3211] border-l-4 border-l-[#E6A34A] bg-gradient-to-br from-[#332007] to-[#1a1003] p-3"><span className="text-[9px] font-black uppercase text-amber-300">Estado da edição</span><div className="mt-1 text-sm font-black text-amber-200">{lines.length?'ESTRUTURA EM EDIÇÃO':'AGUARDANDO COMPONENTES'}</div></article></section>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12"><section className="space-y-3 border border-[#2E4A62] bg-[#0D2638] p-4 shadow-xl lg:col-span-5"><h2 className="border-b border-[#2E4A62] pb-2 text-xs font-black uppercase text-[#48B7C7]">1. Produto mestre e parâmetros</h2>{loading&&<p className="text-[10px] text-slate-400">Carregando cadastros reais…</p>}
      <div><label className={label}>Produto mestre *</label><select value={parentId} onChange={e=>setParentId(e.target.value)} className={input} disabled={loading}><option value="">Selecione o item produzido</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></div>
      <div className="grid grid-cols-12 gap-2"><div className="col-span-4"><label className={label}>Versão *</label><input type="number" min="1" step="1" value={version} onChange={e=>setVersion(e.target.value)} className={input}/></div><div className="col-span-8"><label className={label}>Molde / matriz</label><select value={toolId} onChange={e=>setToolId(e.target.value)} className={input} disabled={loading}><option value="">Sem ferramental vinculado</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} — {t.nome}</option>)}</select></div></div>
      <div className="border-t border-[#2E4A62] pt-3"><h3 className="mb-2 text-[10px] font-black uppercase">2. Inserir componente</h3><label className={label}>Matéria-prima / componente *</label><select value={componentId} onChange={e=>setComponentId(e.target.value)} className={input} disabled={loading}><option value="">Selecione um componente</option>{products.filter(p=>p.id!==parentId).map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-2"><div><label className={label}>Consumo por unidade *</label><input type="number" min="0.000001" step="any" value={qty} onChange={e=>setQty(e.target.value)} className={input} placeholder="0,0000"/></div><div><label className={label}>Perda (%)</label><input type="number" min="0" max="100" step="any" value={loss} onChange={e=>setLoss(e.target.value)} className={input}/></div></div>
      <button onClick={addLine} className={btn+' w-full bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><Plus size={14}/> Incluir componente</button>
      <div><label className={label}>Observações técnicas</label><textarea rows={3} maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border border-[#3b5e7c] bg-[#091522] p-2 text-xs text-white outline-none focus:border-[#48B7C7]" placeholder="Especificações, aditivos, montagem ou notas técnicas…"/></div>
      <button onClick={()=>void save()} disabled={saving||loading||!parentId||!lines.length} className={btn+' h-[34px] w-full bg-[#3A9D78] text-white hover:bg-[#287A5C]'}><Save size={14}/>{saving?'Gravando…':'Gravar ficha mestre'}</button><p className="text-[9px] leading-4 text-slate-400">O custo usa custo médio cadastrado. A gravação requer a RPC transacional e permissões do banco.</p>
    </section>
    <section className="min-w-0 space-y-3 lg:col-span-7"><div className="border border-[#2E4A62] bg-[#0E1E2F] p-4 shadow-xl"><div className="mb-3 flex flex-wrap items-center justify-between"><div><h2 className="text-xs font-black uppercase text-[#48B7C7]">Árvore de materiais (BOM)</h2><p className="mt-1 text-[10px] text-slate-400">{parent ? 'Produto: '+parent.codigo+' — '+parent.nome : 'Selecione o produto mestre para iniciar.'}</p></div><span className="border border-[#2D8DB8]/40 bg-[#123B50] px-2 py-1 text-[9px] font-black text-[#48B7C7]">{lines.length} ITEM(NS)</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[580px] border-collapse text-left text-[10px]"><thead><tr className="border-b border-[#2E4A62] bg-[#091522] text-[9px] uppercase text-slate-400"><th className="p-2">Componente</th><th className="p-2 text-right">Consumo</th><th className="p-2 text-right">Perda</th><th className="p-2 text-right">Custo estimado</th><th className="p-2 text-center">Ação</th></tr></thead><tbody>{lines.map(l=>{const p=productMap.get(l.componente_id);const q=Number(l.quantidade_gasto),lossPct=Number(l.perda_pct);return <tr key={l.key} className="border-b border-[#1b3447] hover:bg-[#10283A]"><td className="p-2"><b>{p?.codigo??'Produto indisponível'}</b><div className="text-slate-400">{p?.nome??l.componente_id}</div></td><td className="p-2 text-right">{q.toLocaleString('pt-BR',{maximumFractionDigits:6})}</td><td className="p-2 text-right">{lossPct.toLocaleString('pt-BR',{maximumFractionDigits:2})}%</td><td className="p-2 text-right">{money(q*(p?.custo_medio??0)*(1+lossPct/100))}</td><td className="p-2 text-center"><button onClick={()=>setLines(prev=>prev.filter(x=>x.key!==l.key))} aria-label="Remover componente" className="inline-flex h-7 w-7 items-center justify-center border border-rose-500/30 text-rose-300"><Trash2 size={13}/></button></td></tr>})}{!lines.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-500"><Layers size={22} className="mx-auto mb-2"/>Nenhum componente na estrutura em edição.</td></tr>}</tbody></table></div><div className="mt-3 border-t border-[#2E4A62] pt-3 text-right"><span className="text-[9px] font-black uppercase text-slate-400">Custo estimado por unidade</span><div className="text-lg font-black text-emerald-300">{money(cost)}</div></div></div>
    <div className="border border-[#2E4A62] bg-[#0E1E2F] p-4 shadow-xl"><div className="mb-3 flex items-center gap-2"><Wrench size={15} className="text-[#E6A34A]"/><h2 className="text-[10px] font-black uppercase">Fichas cadastradas nesta empresa</h2></div>{!headers.length?<p className="text-[10px] text-slate-400">{loading?'Consultando banco…':'Nenhuma ficha encontrada ou tabela ainda não instalada.'}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[400px] text-left text-[10px]"><thead><tr className="border-b border-[#2E4A62] text-[9px] uppercase text-slate-400"><th className="p-2">Produto</th><th className="p-2">Versão</th><th className="p-2">Status</th><th className="p-2">Data</th></tr></thead><tbody>{headers.map(h=><tr key={h.id} className="border-b border-[#1b3447]"><td className="p-2">{productMap.get(h.produto_pai_id)?.codigo??h.produto_pai_id}</td><td className="p-2">{h.versao}</td><td className="p-2">{h.status}</td><td className="p-2">{h.created_at?new Date(h.created_at).toLocaleDateString('pt-BR'):'—'}</td></tr>)}</tbody></table></div>}</div></section></div>
  </div></main>
}
