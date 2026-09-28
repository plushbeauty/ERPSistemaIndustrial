import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Archive, Boxes, CheckCircle2, Code2, Layers3, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import type { Area, CodigoConfig, Grupo, HistoricoCodigo } from '../../types/configuracoes'

type Props = { profile: { nome?: string } | null }
const MODOS = [
  { value: 'NUM' as const, label: 'Numérico' },
  { value: 'PS' as const, label: 'Prefixo + sequência' },
  { value: 'PGR' as const, label: 'Prefixo + grupo + sequência' },
]
const msgError = (e: unknown) => e instanceof Error ? e.message : 'Não foi possível concluir a operação.'

export default function ConfiguracaoCodificacaoAreas({ profile }: Props) {
  const [empresaId,setEmpresaId]=useState(''),[config,setConfig]=useState<CodigoConfig|null>(null)
  const [prefixo,setPrefixo]=useState(''),[separador,setSeparador]=useState('-'),[modo,setModo]=useState<CodigoConfig['modo_numeracao']>('PS'),[sequencia,setSequencia]=useState(0),[grupo,setGrupo]=useState('')
  const [grupos,setGrupos]=useState<Grupo[]>([]),[areas,setAreas]=useState<Area[]>([]),[historico,setHistorico]=useState<HistoricoCodigo[]>([])
  const [gc,setGc]=useState(''),[gn,setGn]=useState(''),[ac,setAc]=useState(''),[an,setAn]=useState('')
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const auth=(await supabase.auth.getUser()).data.user
      if(!auth) throw new Error('Sessão não encontrada.')
      const {data:u,error:ue}=await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id',auth.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
      if(ue) throw ue
      if(!u?.empresa_id){setEmpresaId('');setConfig(null);setGrupos([]);setAreas([]);setHistorico([]);return}
      const id=String(u.empresa_id);setEmpresaId(id)
      const [c,g,a,h]=await Promise.all([
        supabase.from('erp_codigos').select('*').eq('empresa_id',id).maybeSingle(),
        supabase.from('erp_grupos').select('id,empresa_id,codigo,nome,ativo,created_at,updated_at').eq('empresa_id',id).eq('ativo',true).order('codigo'),
        supabase.from('erp_areas').select('id,empresa_id,codigo,nome,created_at').eq('empresa_id',id).order('codigo'),
        supabase.from('erp_historico_codigos').select('id,empresa_id,codigo_completo,codigo_base,sequencia,gerado_por,created_at').eq('empresa_id',id).order('created_at',{ascending:false}).limit(20)
      ])
      if(c.error)throw c.error;if(g.error)throw g.error;if(a.error)throw a.error;if(h.error)throw h.error
      const current=c.data as CodigoConfig|null;setConfig(current);setPrefixo(current?.prefixo??'');setSeparador(current?.separador??'-');setModo(current?.modo_numeracao??'PS');setSequencia(Number(current?.sequencia_atual??0))
      setGrupos((g.data??[]) as Grupo[]);setAreas((a.data??[]) as Area[]);setHistorico((h.data??[]) as HistoricoCodigo[])
    }catch(e){setError(msgError(e))}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])
  const next=useMemo(()=>{
    if(modo!=='PGR')return sequencia+1
    const base=prefixo.trim().toUpperCase()+separador+(grupos.find(x=>x.codigo===grupo)?.codigo??'').toUpperCase()
    const max=historico.filter(x=>x.codigo_base===base).reduce((n,x)=>Math.max(n,Number(x.sequencia)),0)
    return Math.max(sequencia,max)+1
  },[modo,sequencia,prefixo,separador,grupo,grupos,historico])
  const preview=useMemo(()=>{
    const n=String(next).padStart(4,'0')
    if(modo==='NUM')return n
    if(!prefixo.trim())return '—'
    if(modo==='PGR'){const g=grupos.find(x=>x.codigo===grupo);return g?prefixo.trim().toUpperCase()+separador+g.codigo.toUpperCase()+separador+n:'Selecione um grupo'}
    return prefixo.trim().toUpperCase()+separador+n
  },[modo,next,prefixo,separador,grupo,grupos])

  const save=async(e:FormEvent)=>{
    e.preventDefault();setMessage('');setError('')
    if(!empresaId)return setError('Usuário sem empresa vinculada.')
    if(modo!=='NUM'&&!prefixo.trim())return setError('Informe o prefixo.')
    if(config?.id){
      setBusy(true);try{const {data,error:e}=await supabase.from('erp_codigos').update({prefixo:prefixo.trim().toUpperCase(),separador,modo_numeracao:modo,sequencia_atual:Math.max(0,sequencia),updated_at:new Date().toISOString()}).eq('id',config.id).select('*').single();if(e)throw e;setConfig(data as CodigoConfig);setMessage('Configuração de codificação salva.')}catch(e){setError(msgError(e))}finally{setBusy(false)}
    }else{
      setBusy(true);try{const {data,error:e}=await supabase.from('erp_codigos').insert({empresa_id:empresaId,prefixo:prefixo.trim().toUpperCase(),separador,modo_numeracao:modo,sequencia_atual:Math.max(0,sequencia)}).select('*').single();if(e)throw e;setConfig(data as CodigoConfig);setMessage('Configuração de codificação salva.')}catch(e){setError(msgError(e))}finally{setBusy(false)}
    }
  }
  const generate=async()=>{
    setMessage('');setError('')
    if(!config?.id)return setError('Salve a configuração antes de gerar.')
    if(modo==='PGR'&&!grupo)return setError('Selecione o grupo.')
    setBusy(true);try{const {data,error:e}=await supabase.rpc('erp_gerar_codigo',{p_config_id:config.id,p_grupo_codigo:modo==='PGR'?grupo:null});if(e)throw e;setMessage('Código gerado e registrado: '+String(data));await load()}catch(e){setError(msgError(e))}finally{setBusy(false)}
  }
  const addGroup=async(e:FormEvent)=>{e.preventDefault();if(!empresaId||!gc.trim()||!gn.trim())return setError('Informe código e nome do grupo.');setBusy(true);try{const {error:e}=await supabase.from('erp_grupos').insert({empresa_id:empresaId,codigo:gc.trim().toUpperCase(),nome:gn.trim(),ativo:true});if(e)throw e;setGc('');setGn('');setMessage('Grupo cadastrado.');await load()}catch(e){setError(msgError(e))}finally{setBusy(false)}}
  const addArea=async(e:FormEvent)=>{e.preventDefault();if(!empresaId||!ac.trim()||!an.trim())return setError('Informe código e nome da área.');setBusy(true);try{const {error:e}=await supabase.from('erp_areas').insert({empresa_id:empresaId,codigo:ac.trim().toUpperCase(),nome:an.trim()});if(e)throw e;setAc('');setAn('');setMessage('Área cadastrada.');await load()}catch(e){setError(msgError(e))}finally{setBusy(false)}}
  const removeArea=async(id:string)=>{if(!window.confirm('Excluir esta área?'))return;setBusy(true);try{const {error:e}=await supabase.from('erp_areas').delete().eq('id',id);if(e)throw e;await load()}catch(e){setError(msgError(e))}finally{setBusy(false)}}

  if(loading)return <div className="rounded-2xl border border-[#C5DEE6] bg-white p-10 text-center font-black text-[#123B50]">Carregando configuração da empresa…</div>
  if(!empresaId)return <div className="rounded-2xl border border-[#E6B8B8] bg-white p-8"><h2 className="text-xl font-black text-[#8A2424]">Empresa não vinculada</h2><p className="mt-2 font-semibold text-[#4B5563]">Não foi criado dado fictício. Vincule o usuário a uma empresa para usar a codificação.</p></div>

  return <div className="space-y-5">
    {(message||error)&&<div className={`rounded-xl border px-4 py-3 text-sm font-black ${error?'border-[#E6B8B8] bg-[#FFF6F6] text-[#8A2424]':'border-[#B8DCCF] bg-[#F3FBF7] text-[#1D6B4D]'}`}>{error||message}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <form onSubmit={save} className="rounded-2xl border border-[#C5DEE6] bg-[#F8FCFD] p-5">
        <div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-lg"><Code2 size={21}/></div><div><h2 className="text-lg font-black text-[#123B50]">Configuração de codificação</h2><p className="text-xs font-bold text-[#5C7480]">Regra real da empresa.</p></div></div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#17445A] px-4 py-2.5 text-sm font-black text-white"><Save size={16}/>Salvar</button></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black text-[#123B50]">Modo de numeração<select value={modo} onChange={e=>setModo(e.target.value as CodigoConfig['modo_numeracao'])} className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]">{MODOS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label className="text-sm font-black text-[#123B50]">Prefixo<input value={prefixo} disabled={modo==='NUM'} onChange={e=>setPrefixo(e.target.value.toUpperCase())} className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"/></label>
          <label className="text-sm font-black text-[#123B50]">Separador<input value={separador} maxLength={3} onChange={e=>setSeparador(e.target.value)} className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"/></label>
          <label className="text-sm font-black text-[#123B50]">Sequência atual<input type="number" min={0} value={sequencia} onChange={e=>setSequencia(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"/></label>
          {modo==='PGR'&&<label className="text-sm font-black text-[#123B50] md:col-span-2">Grupo<select value={grupo} onChange={e=>setGrupo(e.target.value)} className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"><option value="">Selecione</option>{grupos.map(x=><option key={x.id} value={x.codigo}>{x.codigo} — {x.nome}</option>)}</select></label>}
        </div>
      </form>
      <div className="rounded-2xl bg-[#123B50] p-5 text-white shadow-xl"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#55B8C8] to-[#2D8DB8] shadow-lg"><RefreshCw size={21}/></div><div><span className="block text-[9px] font-black tracking-[.16em] text-[#8DE0EA]">PRÉVIA EM TEMPO REAL</span><h2 className="text-lg font-black text-white">Próximo código</h2></div></div><div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-6 text-center"><span className="font-mono text-3xl font-black tracking-wider text-white">{preview}</span></div><button type="button" onClick={()=>void generate()} disabled={busy||!config?.id||(modo==='PGR'&&!grupo)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#55B8C8] px-4 py-3 text-sm font-black text-[#123B50] shadow-lg disabled:opacity-50"><CheckCircle2 size={18}/>Gerar e registrar código</button><p className="mt-3 text-xs font-semibold text-white/75">A geração grava o histórico e preserva códigos já emitidos.</p></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-[#C5DEE6] bg-white p-5"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-md"><Boxes size={19}/></div><div><h2 className="font-black text-[#123B50]">Grupos</h2><p className="text-xs font-semibold text-[#5C7480]">Usados quando o modo inclui grupo.</p></div></div><form onSubmit={addGroup} className="grid gap-2 md:grid-cols-[120px_1fr_auto]"><input value={gc} onChange={e=>setGc(e.target.value.toUpperCase())} placeholder="Código" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold text-[#123B50]"/><input value={gn} onChange={e=>setGn(e.target.value)} placeholder="Nome" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold text-[#123B50]"/><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#17445A] px-4 py-2.5 font-black text-white"><Plus size={16}/>Adicionar</button></form><div className="mt-4 divide-y divide-[#E4EFF2]">{grupos.map(x=><div key={x.id} className="flex items-center py-3 text-sm"><span className="font-black text-[#123B50]">{x.codigo}</span><span className="ml-3 font-semibold text-[#526A75]">{x.nome}</span></div>)}{!grupos.length&&<p className="py-4 text-sm font-semibold text-[#6B7F88]">Nenhum grupo cadastrado.</p>}</div></section>
      <section className="rounded-2xl border border-[#C5DEE6] bg-white p-5"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#55B8C8] to-[#2D8DB8] text-white shadow-md"><Layers3 size={19}/></div><div><h2 className="font-black text-[#123B50]">Áreas</h2><p className="text-xs font-semibold text-[#5C7480]">Cadastro real por empresa.</p></div></div><form onSubmit={addArea} className="grid gap-2 md:grid-cols-[120px_1fr_auto]"><input value={ac} onChange={e=>setAc(e.target.value.toUpperCase())} placeholder="Código" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold text-[#123B50]"/><input value={an} onChange={e=>setAn(e.target.value)} placeholder="Nome" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold text-[#123B50]"/><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#17445A] px-4 py-2.5 font-black text-white"><Plus size={16}/>Adicionar</button></form><div className="mt-4 divide-y divide-[#E4EFF2]">{areas.map(x=><div key={x.id} className="flex items-center py-3 text-sm"><span className="font-black text-[#123B50]">{x.codigo}</span><span className="ml-3 mr-auto font-semibold text-[#526A75]">{x.nome}</span><button type="button" onClick={()=>void removeArea(x.id)} className="rounded-lg p-2 text-[#8A2424] hover:bg-[#FFF2F2]" aria-label={`Excluir área ${x.codigo}`}><Trash2 size={16}/></button></div>)}{!areas.length&&<p className="py-4 text-sm font-semibold text-[#6B7F88]">Nenhuma área cadastrada.</p>}</div></section>
    </div>
    <section className="rounded-2xl border border-[#C5DEE6] bg-white p-5"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#17445A] to-[#2D8DB8] text-white shadow-md"><Archive size={19}/></div><div><h2 className="font-black text-[#123B50]">Histórico de códigos</h2><p className="text-xs font-semibold text-[#5C7480]">Somente códigos realmente gerados.</p></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[#DCECF0] text-xs uppercase tracking-wider text-[#5C7480]"><th className="px-3 py-3">Código</th><th className="px-3 py-3">Base</th><th className="px-3 py-3">Sequência</th><th className="px-3 py-3">Gerado em</th></tr></thead><tbody>{historico.map(x=><tr key={x.id} className="border-b border-[#EEF5F7]"><td className="px-3 py-3 font-mono font-black text-[#123B50]">{x.codigo_completo}</td><td className="px-3 py-3 font-mono text-[#526A75]">{x.codigo_base||'—'}</td><td className="px-3 py-3 font-black text-[#123B50]">{x.sequencia}</td><td className="px-3 py-3 text-[#526A75]">{new Date(x.created_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table>{!historico.length&&<p className="py-5 text-center text-sm font-semibold text-[#6B7F88]">Nenhum código foi gerado ainda.</p>}</div></section>
    <div className="rounded-xl border border-[#D7EAF0] bg-[#F8FCFD] px-4 py-3 text-xs font-semibold text-[#5C7480]">Usuário conectado: <span className="font-black text-[#123B50]">{profile?.nome||'Usuário ERP'}</span></div>
  </div>
}
