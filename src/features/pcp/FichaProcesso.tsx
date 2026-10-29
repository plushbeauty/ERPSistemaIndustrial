import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Factory, Printer, Save, Thermometer, Gauge, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type ProcessType = 'injetora' | 'prensados'
type Params = {
  machineName: string
  capacity: string
  material: string
  mold: string
  temperatures: string[]
  platenTemperatures: string[]
  pumpPressure: string
  injectionPressure: string
  injectionSpeed: string
  holdingPressure: string
  holdingTime: string
  coolingTime: string
  cycleTime: string
  notes: string
}
const blank: Params = {
  machineName: '', capacity: '', material: '', mold: '',
  temperatures: Array(8).fill(''), platenTemperatures: Array(4).fill(''),
  pumpPressure: '', injectionPressure: '', injectionSpeed: '',
  holdingPressure: '', holdingTime: '', coolingTime: '', cycleTime: '', notes: '',
}
const field = 'box-border h-9 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500'
const panel = 'min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm'
function Field({ title, value, onChange, unit, type = 'text', placeholder = '—' }: { title: string; value: string; onChange: (v: string) => void; unit?: string; type?: string; placeholder?: string }) {
  return <label className="block min-w-0"><span className={label}>{title}{unit ? ` · ${unit}` : ''}</span><input className={field} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>
}
function MachineDiagram({ type, values }: { type: ProcessType; values: string[] }) {
  if (type === 'injetora') return <svg viewBox="0 0 560 205" role="img" aria-label="Esquema técnico da injetora com zonas de aquecimento" className="h-auto w-full">
    <rect x="18" y="30" width="524" height="145" rx="10" fill="#F4FBFD" stroke="#B7D8E3" strokeWidth="2"/>
    <rect x="36" y="52" width="115" height="95" rx="5" fill="#DCEAF0" stroke="#477C91" strokeWidth="2"/><rect x="48" y="65" width="90" height="17" rx="3" fill="#123B50"/><text x="93" y="77" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">UNIDADE</text>
    <path d="M150 100 H190 L210 88 H355 L375 100 H424" fill="none" stroke="#123B50" strokeWidth="13" strokeLinejoin="round"/>
    {values.slice(0,8).map((v,i)=><g key={i}><rect x={190+i*29} y="60" width="23" height="22" rx="4" fill={v ? '#2D8DB8' : '#D7E5EA'} stroke="#477C91"/><text x={201.5+i*29} y="74" fontSize="9" textAnchor="middle" fill={v?'white':'#123B50'} fontWeight="700">{i+1}</text></g>)}
    <rect x="424" y="48" width="83" height="104" rx="5" fill="#C7DFE8" stroke="#477C91" strokeWidth="2"/><path d="M438 62 L493 138 M493 62 L438 138" stroke="#477C91" strokeWidth="3"/><text x="465" y="164" textAnchor="middle" fontSize="10" fill="#123B50" fontWeight="700">MOLDE</text>
    <text x="280" y="20" textAnchor="middle" fontSize="12" fill="#123B50" fontWeight="700">ZONAS DE AQUECIMENTO / RESISTÊNCIAS</text>
    <text x="280" y="194" textAnchor="middle" fontSize="10" fill="#526A75">Esquema ilustrativo — identificar as zonas conforme a máquina instalada</text>
  </svg>
  return <svg viewBox="0 0 560 205" role="img" aria-label="Esquema técnico de prensa com platôs e bomba hidráulica" className="h-auto w-full">
    <rect x="18" y="25" width="524" height="155" rx="10" fill="#F4FBFD" stroke="#B7D8E3" strokeWidth="2"/>
    <rect x="52" y="43" width="25" height="120" rx="3" fill="#123B50"/><rect x="200" y="43" width="25" height="120" rx="3" fill="#123B50"/><rect x="52" y="52" width="173" height="12" fill="#2D8DB8"/><rect x="52" y="143" width="173" height="12" fill="#2D8DB8"/>
    {[0,1,2,3].map((n)=><g key={n}><rect x="92" y={70+n*17} width="93" height="12" rx="2" fill={values[n] ? '#2D8DB8' : '#C7DFE8'} stroke="#477C91"/><text x="138" y={79+n*17} fontSize="9" textAnchor="middle" fill={values[n]?'white':'#123B50'} fontWeight="700">PLATÔ {n+1}</text></g>)}
    <rect x="300" y="55" width="82" height="65" rx="6" fill="#DCEAF0" stroke="#477C91" strokeWidth="2"/><circle cx="341" cy="87" r="20" fill="#fff" stroke="#477C91" strokeWidth="2"/><path d="M341 87 L353 76" stroke="#D65B61" strokeWidth="3"/><text x="341" y="135" textAnchor="middle" fontSize="10" fill="#123B50" fontWeight="700">BOMBA</text>
    <path d="M382 85 H420 V112 H451" fill="none" stroke="#2D8DB8" strokeWidth="5" strokeLinejoin="round"/><rect x="451" y="88" width="59" height="49" rx="5" fill="#123B50"/><text x="480" y="108" textAnchor="middle" fontSize="9" fill="white">PRESSÃO</text><text x="480" y="122" textAnchor="middle" fontSize="9" fill="white">HIDRÁULICA</text>
    <text x="280" y="18" textAnchor="middle" fontSize="12" fill="#123B50" fontWeight="700">PRENSA · PLATÔS E CIRCUITO HIDRÁULICO</text>
    <text x="280" y="195" textAnchor="middle" fontSize="10" fill="#526A75">Esquema ilustrativo — confirmar número/posição dos platôs na prensa real</text>
  </svg>
}
export default function FichaProcesso() {
  const [tipo, setTipo] = useState<ProcessType>('injetora')
  const [produto, setProduto] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [params, setParams] = useState<Params>(blank)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const update = (key: keyof Params, value: string) => setParams(p => ({ ...p, [key]: value }))
  const updateArray = (key: 'temperatures' | 'platenTemperatures', index: number, value: string) => setParams(p => ({ ...p, [key]: p[key].map((v, i) => i === index ? value : v) }))
  const selected = useMemo(() => products.find(p => p.id === produto), [products, produto])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true); setError('')
      const r = await supabase.from('erp_produtos').select('id,codigo,nome').eq('ativo', true).order('codigo').limit(3000)
      if (!active) return
      if (r.error) setError(`Não foi possível carregar os produtos: ${r.error.message}`)
      else setProducts((r.data ?? []) as Product[])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setParams(blank); setNotice('')
    if (!produto) return
    void (async () => {
      setLoading(true); setError('')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) { if (active) { setError('Não foi possível identificar a empresa autenticada.'); setLoading(false) } return }
      const r = await supabase.from('erp_pcp_fichas_parametros').select('parametros').eq('empresa_id', tenant.data).eq('produto_id', produto).eq('tipo_processo', tipo).maybeSingle()
      if (!active) return
      if (r.error && r.error.code !== 'PGRST116') setError(`Falha ao carregar parâmetros: ${r.error.message}`)
      else if (r.data?.parametros) setParams({ ...blank, ...(r.data.parametros as Partial<Params>), temperatures: (r.data.parametros as Params).temperatures ?? blank.temperatures, platenTemperatures: (r.data.parametros as Params).platenTemperatures ?? blank.platenTemperatures })
      setLoading(false)
    })()
    return () => { active = false }
  }, [produto, tipo])

  const save = async () => {
    setError(''); setNotice('')
    if (!produto) { setError('Selecione o produto antes de salvar a ficha.'); return }
    if (!params.machineName.trim()) { setError('Informe a identificação da máquina.'); return }
    if (!params.capacity.trim()) { setError(tipo === 'injetora' ? 'Informe o porte/capacidade da injetora conforme a placa.' : 'Informe a capacidade da prensa conforme a placa.'); return }
    setSaving(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw new Error('Empresa não identificada na sessão autenticada.')
      const r = await supabase.from('erp_pcp_fichas_parametros').upsert({
        empresa_id: tenant.data, produto_id: produto, tipo_processo: tipo,
        maquina_nome: params.machineName.trim(), capacidade_maquina: params.capacity.trim(),
        parametros: params, updated_at: new Date().toISOString()
      }, { onConflict: 'empresa_id,produto_id,tipo_processo' })
      if (r.error) throw new Error(r.error.message)
      setNotice('Ficha salva com sucesso.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar a ficha.') }
    finally { setSaving(false) }
  }
  const print = () => window.print()
  return <main className="min-w-0 bg-[#F4FBFD] p-2 text-slate-800 sm:p-3">
    <div className="mx-auto max-w-[1500px] space-y-3">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-[#123B50] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10"><ClipboardList size={18}/></div><div className="min-w-0"><h1 className="text-sm font-extrabold tracking-wide">FICHA TÉCNICA DE PROCESSO</h1><p className="text-[10px] text-slate-300">PCP INDUSTRIAL · revisão controlada · 28/10/2026</p></div></div>
        <div className="flex flex-wrap gap-2 print:hidden"><button onClick={print} type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 px-3 text-xs font-bold hover:bg-white/10"><Printer size={14}/> Imprimir</button><button onClick={() => void save()} disabled={saving || loading} type="button" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2D8DB8] px-3 text-xs font-bold text-white disabled:opacity-50"><Save size={14}/>{saving ? 'Salvando…' : 'Salvar ficha'}</button></div>
      </header>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <section className={panel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-extrabold text-[#123B50]">IDENTIFICAÇÃO DO PROCESSO</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">Campos padronizados · sem valores presumidos</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="block min-w-0 sm:col-span-2 xl:col-span-2"><span className={label}>Produto / código</span><select className={field} value={produto} onChange={e => setProduto(e.target.value)}><option value="">Selecione um produto cadastrado</option>{products.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
            <label className="block min-w-0"><span className={label}>Tipo de processo</span><select className={field} value={tipo} onChange={e => setTipo(e.target.value as ProcessType)}><option value="injetora">Injetora</option><option value="prensados">Prensados</option></select></label>
            <Field title="Máquina / patrimônio" value={params.machineName} onChange={v => update('machineName', v)} placeholder="Identificação real"/>
            <Field title={tipo === 'injetora' ? 'Capacidade da injetora' : 'Capacidade da prensa'} value={params.capacity} onChange={v => update('capacity', v)} placeholder={tipo === 'injetora' ? 'Ex.: força de fechamento da placa' : 'Ex.: capacidade nominal da placa'}/>
            <Field title="Material / composto" value={params.material} onChange={v => update('material', v)}/>
            <Field title="Molde / ferramenta" value={params.mold} onChange={v => update('mold', v)}/>
          </div>
        </section>
        <section className={panel}><h2 className="mb-2 text-xs font-extrabold text-[#123B50]">ESQUEMA DA MÁQUINA</h2><MachineDiagram type={tipo} values={tipo === 'injetora' ? params.temperatures : params.platenTemperatures}/><p className="mt-1 text-[10px] text-slate-500">Diagrama orientativo, não substitui identificação do fabricante nem dispositivo de segurança.</p></section>
      </div>
      {tipo === 'injetora' ? <section className={panel}>
        <div className="mb-3 flex items-center gap-2"><Thermometer size={16} className="text-[#2D8DB8]"/><h2 className="text-xs font-extrabold text-[#123B50]">ZONAS DE TEMPERATURA · RESISTÊNCIAS</h2><span className="text-[10px] text-slate-500">°C · preencher conforme receita aprovada</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{params.temperatures.map((v,i)=><Field key={i} title={['Bico','Zona 1','Zona 2','Zona 3','Zona 4','Zona 5','Zona 6','Zona 7'][i]} value={v} onChange={n=>updateArray('temperatures',i,n)} unit="°C" type="number"/>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"><Field title="Pressão de injeção" value={params.injectionPressure} onChange={v=>update('injectionPressure',v)} unit="bar" type="number"/><Field title="Velocidade de injeção" value={params.injectionSpeed} onChange={v=>update('injectionSpeed',v)} unit="mm/s" type="number"/><Field title="Pressão de recalque" value={params.holdingPressure} onChange={v=>update('holdingPressure',v)} unit="bar" type="number"/><Field title="Tempo de recalque" value={params.holdingTime} onChange={v=>update('holdingTime',v)} unit="s" type="number"/><Field title="Tempo de resfriamento" value={params.coolingTime} onChange={v=>update('coolingTime',v)} unit="s" type="number"/><Field title="Tempo de ciclo" value={params.cycleTime} onChange={v=>update('cycleTime',v)} unit="s" type="number"/></div>
      </section> : <section className={panel}>
        <div className="mb-3 flex flex-wrap items-center gap-2"><Thermometer size={16} className="text-[#2D8DB8]"/><h2 className="text-xs font-extrabold text-[#123B50]">TEMPERATURA DOS PLATÔS</h2><span className="text-[10px] text-slate-500">°C · preencher conforme ficha validada</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{params.platenTemperatures.map((v,i)=><Field key={i} title={`Platô ${i+1}`} value={v} onChange={n=>updateArray('platenTemperatures',i,n)} unit="°C" type="number"/>)}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><Field title="Pressão da bomba hidráulica" value={params.pumpPressure} onChange={v=>update('pumpPressure',v)} unit="bar" type="number"/><Field title="Tempo de prensagem" value={params.holdingTime} onChange={v=>update('holdingTime',v)} unit="s" type="number"/><Field title="Tempo total de ciclo" value={params.cycleTime} onChange={v=>update('cycleTime',v)} unit="s" type="number"/></div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900"><Gauge size={15} className="mt-0.5 shrink-0"/><span>Registre a unidade indicada no manômetro e no manual da prensa. Não converta nem adote pressão nominal sem confirmar a especificação da máquina.</span></div>
      </section>}
      <section className={panel}><label className="block"><span className={label}>Instruções de processo / observações críticas</span><textarea className="box-border min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15" value={params.notes} onChange={e=>update('notes',e.target.value)} placeholder="Critérios de partida, inspeção da primeira peça, tolerâncias e cuidados específicos aprovados…"/></label><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"><ShieldCheck size={14}/> Acesso via sessão Supabase e isolamento por empresa (RLS).</span><span className="text-[10px] text-slate-500">{selected ? `Produto: ${selected.codigo}` : 'Nenhum produto selecionado'}</span></div></section>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{notice}</div>}
      {loading && <p className="text-[10px] text-slate-500">Carregando dados cadastrados…</p>}
    </div>
    <style>{`@media print { body * { visibility: hidden !important; } main, main * { visibility: visible !important; } main { position: absolute; inset: 0; width: 100%; padding: 0 !important; background: white !important; } .print\\:hidden { display: none !important; } input, select, textarea { border: 1px solid #aaa !important; } section { break-inside: avoid; box-shadow: none !important; } }`}</style>
  </main>
}
