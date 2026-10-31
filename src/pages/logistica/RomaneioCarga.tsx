/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP & SGQ INDUSTRIAL
 * REV-LOG-ROMANEIO-001 | 2026-10-21
 * Usa o fluxo existente erp_expedicao_criar_romaneio e as NF-e autorizadas reais.
 * Não cria tabelas paralelas nem altera a roteirização aprovada.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, RefreshCw, Search, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Veiculo = { id: string; placa: string; descricao: string | null; capacidade_kg: number }
type Motorista = { id: string; nome: string; documento: string | null; cnh: string | null }
type Nota = { id: string; numero: number; destinatario_nome: string | null; destinatario_cidade: string | null; destinatario_uf: string | null; peso_liquido: number | null; peso_bruto: number | null; status: string }
type Romaneio = { id: string; numero: number; status: string; peso_total_kg: number; data_expedicao: string | null }
const field = 'h-9 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600/20'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500'
const PAGE_SIZE = 100

export default function RomaneioCarga() {
  const [empresa,setEmpresa] = useState('')
  const [veiculos,setVeiculos] = useState<Veiculo[]>([])
  const [motoristas,setMotoristas] = useState<Motorista[]>([])
  const [notas,setNotas] = useState<Nota[]>([])
  const [romaneios,setRomaneios] = useState<Romaneio[]>([])
  const [selecionadas,setSelecionadas] = useState<Set<string>>(new Set())
  const [veiculo,setVeiculo] = useState('')
  const [motorista,setMotorista] = useState('')
  const [numero,setNumero] = useState('')
  const [transportadora,setTransportadora] = useState('')
  const [dataSaida,setDataSaida] = useState(new Date().toLocaleDateString('en-CA'))
  const [busca,setBusca] = useState('')
  const [pagina,setPagina] = useState(0)
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      setEmpresa(empresaId)
      const [vs,ms,ns,rs] = await Promise.all([
        fetchAllPages<Veiculo>((from,to) => supabase.from('erp_veiculos').select('id,placa,descricao,capacidade_kg',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('placa').range(from,to)),
        fetchAllPages<Motorista>((from,to) => supabase.from('erp_motoristas').select('id,nome,documento,cnh',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('nome').range(from,to)),
        fetchAllPages<Nota>((from,to) => supabase.from('erp_documentos_fiscais').select('id,numero,destinatario_nome,destinatario_cidade,destinatario_uf,peso_liquido,peso_bruto,status',{count:'exact'}).eq('empresa_id',empresaId).eq('modelo','55').eq('status','Autorizada').order('numero',{ascending:false}).range(from,to)),
        fetchAllPages<Romaneio>((from,to) => supabase.from('erp_expedicoes').select('id,numero,status,peso_total_kg,data_expedicao',{count:'exact'}).eq('empresa_id',empresaId).order('numero',{ascending:false}).range(from,to)),
      ])
      setVeiculos(vs); setMotoristas(ms); setNotas(ns); setRomaneios(rs)
      const validIds = new Set(ns.map(n => n.id))
      setSelecionadas(old => new Set(Array.from(old).filter(id => validIds.has(id))))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar dados reais de logística.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const veiculoAtual = veiculos.find(v => v.id === veiculo)
  const pesoTotal = useMemo(() => notas.filter(n => selecionadas.has(n.id)).reduce((sum,n) => sum + Number(n.peso_bruto ?? n.peso_liquido ?? 0),0),[notas,selecionadas])
  const volumeNotas = useMemo(() => selecionadas.size,[selecionadas])
  const sobrepeso = Boolean(veiculoAtual && Number(veiculoAtual.capacidade_kg) > 0 && pesoTotal > Number(veiculoAtual.capacidade_kg))
  const filtradas = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR')
    return notas.filter(n => !q || String(n.numero).includes(q) || (n.destinatario_nome ?? '').toLocaleLowerCase('pt-BR').includes(q))
  },[notas,busca])
  const visiveis = filtradas.slice(pagina*PAGE_SIZE,(pagina+1)*PAGE_SIZE)

  function toggleNota(id:string) {
    setSelecionadas(old => { const next = new Set(old); if(next.has(id)) next.delete(id); else next.add(id); return next })
  }
  async function salvar() {
    setError(''); setMessage('')
    const n = Number(numero)
    if (!empresa || !veiculo || !motorista) { setError('Selecione veículo e motorista cadastrados.'); return }
    if (!Number.isInteger(n) || n <= 0) { setError('Informe um número inteiro positivo para o romaneio.'); return }
    if (!selecionadas.size) { setError('Selecione ao menos uma NF-e autorizada.'); return }
    if (sobrepeso) { setError('O peso das NF-e selecionadas ultrapassa a capacidade cadastrada do veículo.'); return }
    setSaving(true)
    try {
      const result = await supabase.rpc('erp_expedicao_criar_romaneio',{
        p_numero:n,
        p_veiculo_id:veiculo,
        p_motorista_id:motorista,
        p_transportadora:transportadora.trim() || null,
        p_capacidade_kg:veiculoAtual?.capacidade_kg ?? null,
        p_data_expedicao:dataSaida || null,
        p_documento_fiscal_ids:Array.from(selecionadas),
      })
      if (result.error) throw result.error
      const created = Array.isArray(result.data) ? result.data[0] as {id?:string;peso_total_kg?:number}|undefined : undefined
      if (!created?.id) throw new Error('O banco não confirmou o romaneio criado.')
      setMessage(`Romaneio ${n} criado pelo procedimento transacional existente. ${selecionadas.size} NF-e vinculada(s), peso calculado: ${Number(created.peso_total_kg ?? pesoTotal).toLocaleString('pt-BR')} kg.`)
      setNumero(''); setTransportadora(''); setSelecionadas(new Set())
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar o romaneio.')
    } finally { setSaving(false) }
  }
  async function liberar(id:string) {
    setError(''); setMessage(''); setSaving(true)
    try {
      const result = await supabase.from('erp_expedicoes').update({status:'LIBERADA',updated_at:new Date().toISOString()}).eq('id',id).eq('empresa_id',empresa).eq('status','PREPARACAO').select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Romaneio não está em preparação, não pertence à empresa atual ou não há permissão.')
      setMessage('Saída liberada.'); await load()
    } catch(cause) { setError(cause instanceof Error ? cause.message : 'Falha ao liberar a saída.') }
    finally { setSaving(false) }
  }

  return <main className="min-h-full bg-slate-50 p-4 text-slate-800 md:p-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex items-center gap-3"><Truck size={22} className="text-sky-700"/><div><h1 className="text-lg font-bold text-[#123B50]">Gestão de Romaneios e Carregamento</h1><p className="mt-1 text-xs text-slate-500">Agrupamento de NF-e autorizadas, cubagem real e controle de saída de carga.</p></div></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={14}/> Atualizar dados</button>
    </header>
    {(error || message) && <div role={error?'alert':'status'} className={`mb-4 border px-3 py-2 text-xs ${error?'border-rose-300 bg-rose-50 text-rose-800':'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
    <section className="mb-5 border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(18,59,80,0.06)]">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#123B50]"><ClipboardList size={15}/> Nova ordem de carregamento</h2>
      <div className="grid grid-cols-12 items-end gap-3">
        <div className="col-span-12 sm:col-span-3"><label className={label}>Número do romaneio</label><input className={field} inputMode="numeric" value={numero} onChange={e=>setNumero(e.target.value.replace(/\D/g,''))} placeholder="Número sequencial"/></div>
        <div className="col-span-12 sm:col-span-3"><label className={label}>Motorista cadastrado</label><select className={field} value={motorista} onChange={e=>setMotorista(e.target.value)}><option value="">Selecionar motorista</option>{motoristas.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
        <div className="col-span-12 sm:col-span-3"><label className={label}>Veículo cadastrado</label><select className={field} value={veiculo} onChange={e=>setVeiculo(e.target.value)}><option value="">Selecionar veículo</option>{veiculos.map(v=><option key={v.id} value={v.id}>{v.placa} · {v.descricao ?? 'Veículo'} · {Number(v.capacidade_kg).toLocaleString('pt-BR')} kg</option>)}</select></div>
        <div className="col-span-12 sm:col-span-3"><label className={label}>Data de saída</label><input className={field} type="date" value={dataSaida} onChange={e=>setDataSaida(e.target.value)}/></div>
        <div className="col-span-12 sm:col-span-6"><label className={label}>Transportadora (opcional)</label><input className={field} maxLength={150} value={transportadora} onChange={e=>setTransportadora(e.target.value)} placeholder="Transportadora vinculada"/></div>
        <div className="col-span-12 sm:col-span-3"><label className={label}>Peso das NF-e selecionadas</label><div className={`flex h-9 items-center border px-3 text-xs font-bold ${sobrepeso?'border-rose-300 bg-rose-50 text-rose-700':'border-slate-200 bg-slate-50 text-[#123B50]'}`}>{pesoTotal.toLocaleString('pt-BR',{maximumFractionDigits:3})} kg</div></div>
        <div className="col-span-12 sm:col-span-3"><label className={label}>Capacidade do veículo</label><div className="flex h-9 items-center border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#123B50]">{veiculoAtual?Number(veiculoAtual.capacidade_kg).toLocaleString('pt-BR')+' kg':'Selecione veículo'}</div></div>
        <div className="col-span-12 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={()=>void salvar()} disabled={saving||loading||sobrepeso} className="h-9 bg-sky-700 px-4 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50">{saving?'Gravando…':'Criar romaneio com NF-e selecionadas'}</button></div>
      </div>
      {sobrepeso && <p className="mt-2 text-xs font-semibold text-rose-700">Carga acima da capacidade cadastrada. Reduza as NF-e selecionadas ou escolha outro veículo.</p>}
    </section>
    <section className="mb-5 border border-slate-200 bg-white shadow-[0_3px_12px_rgba(18,59,80,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="text-xs font-bold uppercase tracking-wide text-[#123B50]">NF-e autorizadas disponíveis</h2><p className="mt-1 text-[10px] text-slate-500">Somente documentos com status fiscal Autorizada · {selecionadas.size} selecionada(s)</p></div><div className="w-full sm:max-w-sm"><label className={label}>Pesquisar NF-e / destinatário</label><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input className={field+' pl-8'} value={busca} onChange={e=>{setBusca(e.target.value);setPagina(0)}} placeholder="Número ou nome do destinatário"/></div></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#123B50] text-[9px] uppercase text-white"><tr><th className="w-10 px-3 py-3">Sel.</th><th className="px-3 py-3">NF-e</th><th className="px-3 py-3">Destinatário</th><th className="px-3 py-3">Cidade / UF</th><th className="px-3 py-3 text-right">Peso bruto</th><th className="px-3 py-3">Situação fiscal</th></tr></thead><tbody className="divide-y divide-slate-100">{loading?<tr><td colSpan={6} className="p-8 text-center text-slate-500">Carregando registros do PostgreSQL…</td></tr>:visiveis.length===0?<tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma NF-e autorizada encontrada para a empresa.</td></tr>:visiveis.map(n=><tr key={n.id} className="hover:bg-sky-50/50"><td className="px-3 py-3"><input type="checkbox" aria-label={`Selecionar NF-e ${n.numero}`} checked={selecionadas.has(n.id)} onChange={()=>toggleNota(n.id)} className="h-4 w-4 accent-sky-700"/></td><td className="px-3 py-3 font-bold">{n.numero}</td><td className="px-3 py-3">{n.destinatario_nome??'—'}</td><td className="px-3 py-3">{[n.destinatario_cidade,n.destinatario_uf].filter(Boolean).join(' / ')||'—'}</td><td className="px-3 py-3 text-right">{Number(n.peso_bruto??n.peso_liquido??0).toLocaleString('pt-BR')} kg</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800"><CheckCircle2 size={12}/> AUTORIZADA</span></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-200 p-3 text-[10px] text-slate-500"><span>{filtradas.length} NF-e encontradas · página {pagina+1} de {Math.max(1,Math.ceil(filtradas.length/PAGE_SIZE))}</span><div className="flex gap-2"><button type="button" disabled={pagina===0} onClick={()=>setPagina(p=>Math.max(0,p-1))} className="h-8 border border-slate-300 px-3 disabled:opacity-40">Anterior</button><button type="button" disabled={(pagina+1)*PAGE_SIZE>=filtradas.length} onClick={()=>setPagina(p=>p+1)} className="h-8 border border-slate-300 px-3 disabled:opacity-40">Próxima</button></div></div>
    </section>
    <section className="border border-slate-200 bg-white shadow-[0_3px_12px_rgba(18,59,80,0.06)]"><div className="border-b border-slate-200 p-4"><h2 className="text-xs font-bold uppercase tracking-wide text-[#123B50]">Histórico de romaneios</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-100 text-[9px] uppercase text-slate-600"><tr><th className="px-3 py-3">Romaneio</th><th className="px-3 py-3">Data de saída</th><th className="px-3 py-3 text-right">Peso total</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">{romaneios.map(r=><tr key={r.id}><td className="px-3 py-3 font-bold">{r.numero}</td><td className="px-3 py-3">{r.data_expedicao??'—'}</td><td className="px-3 py-3 text-right">{Number(r.peso_total_kg).toLocaleString('pt-BR')} kg</td><td className="px-3 py-3">{r.status}</td><td className="px-3 py-3">{r.status==='PREPARACAO'?<button type="button" disabled={saving} onClick={()=>void liberar(r.id)} className="h-8 bg-emerald-700 px-3 text-[10px] font-bold text-white disabled:opacity-50">Liberar saída</button>:'—'}</td></tr>)}</tbody></table>{!loading&&romaneios.length===0&&<p className="p-6 text-center text-xs text-slate-500">Nenhum romaneio cadastrado para esta empresa.</p>}</div></section>
  </main>
}
