import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Plus, Save, ShieldAlert, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'

type Rnc = {
  id: string
  codigo: string
  data_abertura: string
  produto_id: string | null
  cliente_id: string | null
  origem: string
  criticidade: string
  quantidade_defeituosa: number
  unidade: string
  tipo_defeito: string | null
  disposicao: string | null
  causa_provavel: string | null
  acao_corretiva: string | null
  status: string
  observacoes: string | null
  dados_8d: Record<string, string>
}
type Form = Omit<Rnc, 'id' | 'data_abertura' | 'dados_8d'> & { id: string; dados_8d: Record<string, string> }

const input = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const area = 'min-h-28 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const label = 'grid gap-2 text-xs font-black uppercase tracking-wider text-slate-700'

const initialForm: Form = {
  id:'', codigo:'', produto_id:null, cliente_id:null, origem:'CHAO_FABRICA', criticidade:'ALTA',
  quantidade_defeituosa:0, unidade:'un', tipo_defeito:'', disposicao:'SEGREGAR',
  causa_provavel:'', acao_corretiva:'', status:'EM_ANALISE', observacoes:'',
  dados_8d:{d1:'',d2:'',d3:'',d4:'',d5:'',d6:'',d7:'',d8:'',causa_raiz:'',verificacao_eficacia:''}
}

export default function QualidadeRNC() {
  const [rows,setRows]=useState<Rnc[]>([])
  const [products,setProducts]=useState<LookupRecord[]>([])
  const [clients,setClients]=useState<LookupRecord[]>([])
  const [form,setForm]=useState<Form>(initialForm)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)

  const load=async()=>{
    setError('')
    const empresa=await supabase.rpc('erp_current_empresa_id')
    if(empresa.error||!empresa.data){setError('Empresa não identificada.');return}
    const [r,p,c]=await Promise.all([
      supabase.from('erp_rncs').select('*').eq('empresa_id',empresa.data).order('created_at',{ascending:false}),
      supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id',empresa.data).eq('ativo',true).limit(3000),
      supabase.from('erp_clientes').select('id,codigo,nome').eq('empresa_id',empresa.data).eq('ativo',true).limit(3000)
    ])
    const failure=[r,p,c].find(x=>x.error)
    if(failure?.error){setError(failure.error.message);return}
    setRows((r.data??[]) as Rnc[])
    setProducts((p.data??[]) as LookupRecord[])
    setClients((c.data??[]) as LookupRecord[])
  }
  useEffect(()=>{void load()},[])

  const save=async()=>{
    setBusy(true);setError('');setNotice('')
    try{
      const empresa=await supabase.rpc('erp_current_empresa_id')
      const user=await supabase.auth.getUser()
      if(empresa.error||!empresa.data) throw new Error('Empresa não identificada.')
      if(!form.codigo.trim()) throw new Error('Informe o número da RNC.')
      if(form.status==='ENCERRADA' && (!form.dados_8d.causa_raiz.trim() || !form.dados_8d.verificacao_eficacia.trim())) throw new Error('Para encerrar a RNC, informe causa raiz e verificação de eficácia.')
      const payload={
        empresa_id:empresa.data,codigo:form.codigo.trim(),produto_id:form.produto_id,cliente_id:form.cliente_id,origem:form.origem,
        criticidade:form.criticidade,quantidade_defeituosa:Number(form.quantidade_defeituosa)||0,unidade:form.unidade,
        tipo_defeito:form.tipo_defeito?.trim()||null,disposicao:form.disposicao,causa_provavel:form.causa_provavel?.trim()||null,
        acao_corretiva:form.acao_corretiva?.trim()||null,status:form.status,observacoes:form.observacoes?.trim()||null,
        dados_8d:form.dados_8d,criado_por:user.data.user?.id??null
      }
      const result=form.id?await supabase.from('erp_rncs').update(payload).eq('id',form.id):await supabase.from('erp_rncs').insert(payload)
      if(result.error) throw result.error
      setNotice('RNC 8D gravada com sucesso.');await load()
    }catch(e){setError(e instanceof Error?e.message:'Falha ao gravar RNC.')}finally{setBusy(false)}
  }

  const chart=useMemo(()=>rows.reduce<Record<string,number>>((acc,row)=>{const key=row.tipo_defeito?.trim()||'Sem classificação';acc[key]=(acc[key]??0)+(Number(row.quantidade_defeituosa)||0);return acc},{}),[rows])
  const chartData=Object.entries(chart).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([defeito,quantidade])=>({defeito,quantidade}))

  const set8d=(key:string,value:string)=>setForm(f=>({...f,dados_8d:{...f.dados_8d,[key]:value}}))
  const edit=(row:Rnc)=>setForm({...row,dados_8d:{...initialForm.dados_8d,...(row.dados_8d??{})}})
  const newRnc=()=>setForm({...initialForm,dados_8d:{...initialForm.dados_8d}})

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4">
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">QUALIDADE › RNC › 8D</p><h1 className="text-2xl font-black">Não Conformidade — Tratativa 8D</h1><p className="text-sm font-semibold text-slate-500">Causa raiz, contenção, ação corretiva e eficácia em um único registro auditável.</p></div>
      <div className="ml-auto flex gap-2"><button type="button" onClick={newRnc} className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-black"><Plus size={18}/> NOVA RNC</button><button type="button" onClick={()=>void save()} disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-xl bg-sky-700 px-5 font-black text-white"><Save size={18}/> SALVAR 8D</button></div>
    </div></header>
    <div className="mx-auto grid max-w-[1800px] gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        {(error||notice)&&<div className={`rounded-xl border p-4 font-bold ${error?'border-rose-200 bg-rose-50 text-rose-900':'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{error||notice}</div>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><ShieldAlert className="text-sky-700"/><h2 className="text-lg font-black">Identificação e contenção</h2></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className={label}>Nº DA RNC<input className={input} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
            <label className={label}>CRITICIDADE<select className={input} value={form.criticidade} onChange={e=>setForm({...form,criticidade:e.target.value})}>{['BAIXA','MEDIA','ALTA','CRITICA'].map(x=><option key={x}>{x}</option>)}</select></label>
            <EntityCodeLookup label="PRODUTO" value={form.produto_id??''} records={products} onChange={v=>setForm({...form,produto_id:v||null})} onSelect={r=>setForm({...form,produto_id:r.id})}/>
            <EntityCodeLookup label="CLIENTE" value={form.cliente_id??''} records={clients} onChange={v=>setForm({...form,cliente_id:v||null})} onSelect={r=>setForm({...form,cliente_id:r.id})}/>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><label className={label}>DESCRIÇÃO DO DEFEITO<textarea className={area} value={form.tipo_defeito??''} onChange={e=>setForm({...form,tipo_defeito:e.target.value})}/></label><label className={label}>CONTENÇÃO IMEDIATA (D3)<textarea className={area} value={form.dados_8d.d3} onChange={e=>set8d('d3',e.target.value)}/></label></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><ClipboardCheck className="text-sky-700"/><h2 className="text-lg font-black">8 disciplinas</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            {([['d1','D1 — EQUIPE RESPONSÁVEL'],['d2','D2 — DEFINIÇÃO DO PROBLEMA'],['d4','D4 — CAUSA RAIZ'],['d5','D5 — AÇÃO CORRETIVA PERMANENTE'],['d6','D6 — IMPLEMENTAÇÃO'],['d7','D7 — PREVENÇÃO DE RECORRÊNCIA'],['d8','D8 — RECONHECIMENTO / ENCERRAMENTO']] as const).map(([key,title])=><label key={key} className={label}>{title}<textarea className={area} value={form.dados_8d[key]} onChange={e=>set8d(key,e.target.value)}/></label>)}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><label className={label}>CAUSA RAIZ — OBRIGATÓRIA PARA ENCERRAR<textarea className={area} value={form.dados_8d.causa_raiz} onChange={e=>set8d('causa_raiz',e.target.value)}/></label><label className={label}>VERIFICAÇÃO DE EFICÁCIA — OBRIGATÓRIA PARA ENCERRAR<textarea className={area} value={form.dados_8d.verificacao_eficacia} onChange={e=>set8d('verificacao_eficacia',e.target.value)}/></label></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-3">
          <label className={label}>DISPOSIÇÃO<select className={input} value={form.disposicao??'SEGREGAR'} onChange={e=>setForm({...form,disposicao:e.target.value})}>{['SEGREGAR','RETRABALHO','REFUGO','DEVOLUCAO'].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className={label}>STATUS<select className={input} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['EM_ANALISE','ACAO_CORRETIVA','VERIFICACAO','ENCERRADA'].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className={label}>QTD. DEFEITUOSA<input className={input} type="number" min="0" value={form.quantidade_defeituosa} onChange={e=>setForm({...form,quantidade_defeituosa:Number(e.target.value)})}/></label>
        </div></section>
      </section>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Target className="text-sky-700"/><h2 className="font-black">RNCs por defeito</h2></div><div className="mt-4 h-[260px]">{chartData.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="defeito" width={110}/><Tooltip/><Bar dataKey="quantidade" fill="#0ea5e9" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center font-bold text-slate-400">Sem dados reais.</div>}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Histórico</h2><div className="mt-3 space-y-2">{rows.slice(0,8).map(row=><button type="button" key={row.id} onClick={()=>edit(row)} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-sky-300 hover:bg-sky-50"><div className="flex items-center justify-between"><strong>{row.codigo}</strong><span className="text-xs font-black">{row.status}</span></div><p className="mt-1 text-xs font-semibold text-slate-500">{row.tipo_defeito||'Sem classificação'}</p></button>)}{rows.length===0&&<p className="text-sm font-semibold text-slate-400">Nenhuma RNC cadastrada.</p>}</div></section>
        <div className="rounded-2xl bg-slate-900 p-5 text-white"><CheckCircle2 className="text-emerald-400"/><p className="mt-3 text-sm font-semibold text-slate-300">A conclusão é validada também pelo banco: causa raiz e verificação de eficácia são obrigatórias.</p></div>
      </aside>
    </div>
  </main>
}
