/** @DATA_REVISAO_APROVACAO: 2026-10-18 | PCP-FICHAS-PROCESSO-PRENSADOS-GRAFICO-OK */
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarRange, CheckCircle2, FileSliders, Printer, RefreshCw, Save, Search, Thermometer, Gauge, Hammer } from 'lucide-react'
import PCPMoldPhotoPanel from '../components/PCPMoldPhotoPanel'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string }
type Tool = { id: string; codigo: string; nome: string; tipo: string }
type Machine = { id: string; codigo: string; nome: string; tipo: string | null }
type Category = 'INJETADOS' | 'PRENSADOS' | 'ESTAMPARIA' | 'MECANICA' | 'TRATAMENTO_SUPERFICIAL' | 'PINTURA_QUIMICA' | 'CORTE_VINCO'
type Param = { key: string; label: string; unit: string; type?: 'number' | 'text'; required?: boolean; step?: string }
type Saved = { id: string; codigo_ficha: string; produto_id: string; ferramenta_id?: string | null; maquina_id?: string | null; categoria_processo: Category; versao_ficha: number; status: string; data_homologacao?: string | null; assinatura_tecnica?: string | null; parametros_tecnicos: Record<string, unknown>; revisao?: number }
const categories: { value: Category; label: string }[] = [
 { value: 'INJETADOS', label: 'Injetados' }, { value: 'PRENSADOS', label: 'Prensados' },
 { value: 'ESTAMPARIA', label: 'Estampos / Estamparia' }, { value: 'MECANICA', label: 'Mecânica' },
 { value: 'TRATAMENTO_SUPERFICIAL', label: 'Tratamento superficial' },
 { value: 'PINTURA_QUIMICA', label: 'Pintura / Química' }, { value: 'CORTE_VINCO', label: 'Corte e vinco' },
]
const common: Param[] = [
 {key:'tempo_ciclo_seg',label:'Tempo de ciclo padrão',unit:'s',type:'number',step:'0.01',required:true},
 {key:'velocidade_dosagem_curso',label:'Velocidade de dosagem / curso',unit:'mm/s',type:'number',step:'0.01'},
 {key:'altura_molde_mm',label:'Altura do molde',unit:'mm',type:'number',step:'0.01'},
 {key:'tipo_fixacao',label:'Tipo de fixação',unit:'—',type:'text'},
 {key:'torque_aperto_nm',label:'Torque de aperto',unit:'N·m',type:'number',step:'0.1'},
 {key:'tipo_refrigeracao',label:'Refrigeração conectada',unit:'—',type:'text'},
 {key:'vazao_refrigeracao_l_min',label:'Vazão de refrigeração',unit:'L/min',type:'number',step:'0.1'},
 {key:'tempo_setup_min',label:'Tempo padrão de setup',unit:'min',type:'number',step:'0.1'},
 {key:'tempo_limpeza_min',label:'Tempo de limpeza / troca',unit:'min',type:'number',step:'0.1'},
 {key:'seguranca_ppe',label:'EPI e segurança obrigatórios',unit:'—',type:'text'},
]
const injection: Param[] = [
 {key:'forca_fechamento_ton',label:'Força de fechamento',unit:'ton',type:'number',step:'0.1',required:true},
 {key:'pressao_injecao_bar',label:'Pressão de injeção',unit:'bar',type:'number',step:'0.1'},
 {key:'pressao_recalque_bar',label:'Pressão de recalque',unit:'bar',type:'number',step:'0.1'},
 {key:'zona1_c',label:'Temperatura zona 1',unit:'°C',type:'number',step:'0.1'},
 {key:'zona2_c',label:'Temperatura zona 2',unit:'°C',type:'number',step:'0.1'},
 {key:'zona3_c',label:'Temperatura zona 3',unit:'°C',type:'number',step:'0.1'},
 {key:'zona4_c',label:'Temperatura zona 4',unit:'°C',type:'number',step:'0.1'},
 {key:'tempo_resfriamento_seg',label:'Tempo de resfriamento',unit:'s',type:'number',step:'0.01'},
 {key:'material_polimero',label:'Material / polímero cadastrado',unit:'—',type:'text',required:true},
 {key:'temperatura_secagem_c',label:'Temperatura de secagem',unit:'°C',type:'number',step:'0.1'},
 {key:'tempo_secagem_h',label:'Tempo de secagem',unit:'h',type:'number',step:'0.1'},
 {key:'cavidades_ativas',label:'Cavidades ativas',unit:'un',type:'number',step:'1',required:true},
 {key:'peso_peca_g',label:'Peso líquido da peça',unit:'g',type:'number',step:'0.001'},
 {key:'peso_canal_g',label:'Peso de canal / refugo',unit:'g',type:'number',step:'0.001'},
]
const press: Param[] = [
 {key:'tonelagem_prensa',label:'Tonelagem requerida',unit:'ton',type:'number',step:'0.1',required:true},
 {key:'pressao_prensagem_bar',label:'Pressão de prensagem',unit:'bar',type:'number',step:'0.1'},
 {key:'pressao_bomba_bar',label:'Pressão da bomba hidráulica',unit:'bar',type:'number',step:'0.1'},
 {key:'temp_placa_sup',label:'Temperatura do platô superior',unit:'°C',type:'number',step:'0.1'},
 {key:'temp_placa_inf',label:'Temperatura do platô inferior',unit:'°C',type:'number',step:'0.1'},
 {key:'temperatura_molde_c',label:'Temperatura do molde',unit:'°C',type:'number',step:'0.1'},
 {key:'tempo_cura_seg',label:'Tempo de cura',unit:'s',type:'number',step:'0.1'},
 {key:'tempo_pos_cura_min',label:'Tempo de pós-cura',unit:'min',type:'number',step:'0.1'},
 {key:'composto_material',label:'Composto / material',unit:'—',type:'text',required:true},
]
const stamping: Param[] = [
 {key:'material_chapa',label:'Material da chapa',unit:'—',type:'text',required:true},
 {key:'espessura_chapa_mm',label:'Espessura da chapa',unit:'mm',type:'number',step:'0.001',required:true},
 {key:'forca_prensa_ton',label:'Força da prensa',unit:'ton',type:'number',step:'0.1',required:true},
 {key:'curso_prensa_mm',label:'Curso da prensa',unit:'mm',type:'number',step:'0.1'},
 {key:'passo_alimentacao_mm',label:'Passo de alimentação',unit:'mm',type:'number',step:'0.01'},
 {key:'lubrificante',label:'Lubrificante',unit:'—',type:'text'},
 {key:'folga_matriz_mm',label:'Folga de matriz',unit:'mm',type:'number',step:'0.001'},
]
const surface: Param[] = [
 {key:'tempo_imersao_min',label:'Tempo de imersão / exposição',unit:'min',type:'number',step:'0.1',required:true},
 {key:'temperatura_banho_estufa_c',label:'Temperatura do banho / estufa',unit:'°C',type:'number',step:'0.1',required:true},
 {key:'ph_tanque',label:'pH do tanque',unit:'pH',type:'number',step:'0.01'},
 {key:'concentracao_quimica_pct',label:'Concentração química',unit:'%',type:'number',step:'0.01'},
 {key:'camada_requerida_um',label:'Camada de tinta / zinco requerida',unit:'µm',type:'number',step:'0.1',required:true},
 {key:'pressao_pistola_psi',label:'Pressão de aplicação / pistola',unit:'psi',type:'number',step:'0.1'},
 {key:'tempo_cura_secagem_min',label:'Tempo de cura / secagem',unit:'min',type:'number',step:'0.1',required:true},
 {key:'produto_quimico',label:'Produto químico / ficha de segurança',unit:'—',type:'text',required:true},
]
const cutting: Param[] = [
 {key:'material_base',label:'Material base',unit:'—',type:'text',required:true},
 {key:'espessura_material_mm',label:'Espessura do material',unit:'mm',type:'number',step:'0.001',required:true},
 {key:'ferramenta_corte',label:'Faca / ferramenta de corte',unit:'—',type:'text',required:true},
 {key:'pressao_corte',label:'Pressão de corte',unit:'bar',type:'number',step:'0.1'},
 {key:'registro_corte_mm',label:'Tolerância de registro',unit:'mm',type:'number',step:'0.01'},
 {key:'sequencia_operacao',label:'Sequência de corte e vinco',unit:'—',type:'text',required:true},
 {key:'criterio_rebarba',label:'Critério de rebarba / descarte',unit:'—',type:'text'},
]
const paramsFor = (category: Category) => [...common, ...(category === 'INJETADOS' ? injection : category === 'PRENSADOS' ? press : category === 'ESTAMPARIA' || category === 'MECANICA' ? stamping : category === 'TRATAMENTO_SUPERFICIAL' || category === 'PINTURA_QUIMICA' ? surface : cutting)]
const inputClass = 'h-[30px] w-full rounded-[3px] border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100'
const labelClass = 'mb-1 block text-[9px] font-bold uppercase tracking-wider text-neutral-500/90'
const blankParameters = (category: Category) => Object.fromEntries(paramsFor(category).map(p => [p.key, ''])) as Record<string, string>

export default function PCPFichasProcesso() {
 const [searchParams, setSearchParams] = useSearchParams()
 const initialCategory = (categories.find(c => c.value === searchParams.get('tipo')?.toUpperCase())?.value ?? 'INJETADOS') as Category
 const [category, setCategory] = useState<Category>(initialCategory)
 const [company, setCompany] = useState('')
 const [products, setProducts] = useState<Product[]>([])
 const [tools, setTools] = useState<Tool[]>([])
 const [machines, setMachines] = useState<Machine[]>([])
 const [rows, setRows] = useState<Saved[]>([])
 const [query, setQuery] = useState('')
 const [productId, setProductId] = useState(searchParams.get('produto') ?? '')
 const [toolId, setToolId] = useState('')
 const [machineId, setMachineId] = useState('')
 const [code, setCode] = useState('')
 const [version, setVersion] = useState('1')
 const [approvedAt, setApprovedAt] = useState('')
 const [signature, setSignature] = useState('')
 const [status, setStatus] = useState('RASCUNHO')
 const [params, setParams] = useState<Record<string, string>>(() => blankParameters(initialCategory))
 const [instructions, setInstructions] = useState('')
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')

 useEffect(() => {
  const next = categories.find(c => c.value === searchParams.get('tipo')?.toUpperCase())?.value
  if (next && next !== category) { setCategory(next); setParams(blankParameters(next)) }
  const product = searchParams.get('produto')
  if (product && product !== productId) setProductId(product)
 }, [searchParams, category, productId])

 async function load() {
  setBusy(true); setError('')
  try {
   const tenant = await supabase.rpc('erp_current_empresa_id')
   if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
   setCompany(tenant.data)
   const [p, t, m, f] = await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(3000),
    supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).not('status', 'eq', 'INATIVA').order('codigo').limit(2000),
    supabase.from('erp_fichas_processo').select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,data_homologacao,assinatura_tecnica,parametros_tecnicos,revisao').eq('empresa_id', tenant.data).order('codigo_ficha').limit(1000),
   ])
   for (const result of [p, t, m, f]) if (result.error) throw result.error
   setProducts((p.data ?? []) as Product[]); setTools((t.data ?? []) as Tool[]); setMachines((m.data ?? []) as Machine[]); setRows((f.data ?? []) as Saved[])
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar os cadastros da ficha.') }
  finally { setBusy(false) }
 }
 useEffect(() => { void load() }, [])

 const visibleRows = useMemo(() => rows.filter(r => {
  const product = products.find(p => p.id === r.produto_id)
  return !query || [r.codigo_ficha, product?.codigo, product?.nome, r.categoria_processo, r.status].join(' ').toLowerCase().includes(query.toLowerCase())
 }), [rows, products, query])
 const updateParam = (key: string, value: string) => setParams(current => ({ ...current, [key]: value }))

 function openRow(row: Saved) {
  setCode(row.codigo_ficha); setProductId(row.produto_id); setCategory(row.categoria_processo)
  setVersion(String(row.versao_ficha ?? row.revisao ?? 1)); setStatus(row.status); setToolId(row.ferramenta_id ?? ''); setMachineId(row.maquina_id ?? '')
  setParams({ ...blankParameters(row.categoria_processo), ...Object.fromEntries(Object.entries(row.parametros_tecnicos ?? {}).map(([k,v]) => [k, String(v ?? '')])) })
  setApprovedAt(row.data_homologacao ?? ''); setSignature(row.assinatura_tecnica ?? ''); setInstructions(String(row.parametros_tecnicos?.instrucoes_setup ?? ''))
  setSearchParams({ tipo: row.categoria_processo, produto: row.produto_id })
  setError(''); setNotice('')
 }

 async function save() {
  setBusy(true); setError(''); setNotice('')
  try {
   if (!company) throw new Error('Empresa não identificada.')
   if (!code.trim() || !productId) throw new Error('Código da ficha e produto são obrigatórios.')
   const versionNumber = Number(version)
   if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new Error('Versão deve ser um inteiro maior que zero.')
   const missing = paramsFor(category).filter(p => p.required && !String(params[p.key] ?? '').trim())
   if (missing.length) throw new Error('Preencha os parâmetros obrigatórios: ' + missing.map(p => p.label).join(', ') + '.')
   const numericInvalid = paramsFor(category).filter(p => p.type === 'number' && params[p.key] !== '' && !Number.isFinite(Number(params[p.key])))
   if (numericInvalid.length) throw new Error('Parâmetros numéricos inválidos: ' + numericInvalid.map(p => p.label).join(', ') + '.')
   if (approvedAt && !signature.trim()) throw new Error('A homologação requer assinatura técnica identificada.')
   const numericParams = Object.fromEntries(Object.entries(params).map(([key, value]) => {
    const definition = paramsFor(category).find(p => p.key === key)
    return [key, definition?.type === 'number' && value !== '' ? Number(value) : value]
   }))
   const payload = {
    empresa_id: company, codigo_ficha: code.trim(), produto_id: productId, ferramenta_id: toolId || null, maquina_id: machineId || null,
    cavidades_ativas: Number(params.cavidades_ativas) || 1, revisao: versionNumber, versao_ficha: versionNumber,
    categoria_processo: category, data_homologacao: approvedAt || null, assinatura_tecnica: signature.trim() || null,
    status, parametros_tecnicos: { ...numericParams, instrucoes_setup: instructions.trim() || null },
    ativo: status !== 'OBSOLETA', atualizado_em: new Date().toISOString(),
   }
   const result = await supabase.from('erp_fichas_processo').upsert(payload, { onConflict: 'empresa_id,codigo_ficha' }).select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,data_homologacao,assinatura_tecnica,parametros_tecnicos,revisao').single()
   if (result.error) throw result.error
   const saved = result.data as Saved
   setRows(current => [saved, ...current.filter(r => r.id !== saved.id)])
   setNotice('Ficha técnica gravada no cadastro de engenharia da empresa.')
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao gravar a ficha técnica.') }
  finally { setBusy(false) }
 }

 const fields = paramsFor(category)
 const selectedProduct = products.find(p => p.id === productId)
 const selectedTool = tools.find(t => t.id === toolId)
 const selectedMachine = machines.find(m => m.id === machineId)
 const expectedPph = Number(params.tempo_ciclo_seg) > 0 ? (3600 / Number(params.tempo_ciclo_seg)) * Math.max(1, Number(params.cavidades_ativas) || 1) : 0

 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4">
  <div className="mx-auto max-w-[1800px]">
   <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
    <span className="flex h-8 w-8 items-center justify-center bg-[#123B50] text-white"><FileSliders size={16}/></span>
    <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">MANUFATURA / PCP / ENGENHARIA</p><h1 className="text-[16px] font-semibold leading-5">Fichas de processo e parâmetros técnicos</h1><p className="text-[10px] text-slate-500">Roteiro, setup, parâmetros críticos, homologação e rastreabilidade de revisão.</p></div>
    <div className="ml-auto flex gap-1"><button className="erp-premium-button erp-premium-button-secondary print:hidden" type="button" onClick={()=>window.print()}><Printer size={12}/> Imprimir ficha</button><button className="erp-premium-button erp-premium-button-secondary print:hidden" onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button><button className="erp-premium-button" onClick={()=>{setCode('');setProductId('');setToolId('');setMachineId('');setVersion('1');setApprovedAt('');setSignature('');setStatus('RASCUNHO');setParams(blankParameters(category));setInstructions('')}}>Nova ficha</button></div>
   </header>
   {error && <div role="alert" className="mb-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</div>}
   {notice && <div role="status" className="mb-2 flex items-center gap-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800"><CheckCircle2 size={13}/>{notice}</div>}
   <section className="mb-3 border border-slate-200 bg-white p-2 print:hidden">
    <div className="mb-2 flex flex-wrap items-center gap-2"><label className="min-w-[220px] flex-1"><span className={labelClass}>Pesquisar ficha / produto</span><span className="relative block"><Search size={12} className="absolute left-2 top-2.5 text-slate-400"/><input className={inputClass+' pl-7'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, produto, categoria ou estado"/></span></label><div className="min-w-[220px] flex-1"><span className={labelClass}>Categoria de processo</span><select className={inputClass} value={category} onChange={e=>{const next=e.target.value as Category;setCategory(next);setParams(blankParameters(next));setSearchParams({tipo:next})}}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div></div>
    <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">{visibleRows.map(row=><button key={row.id} type="button" onClick={()=>openRow(row)} className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-slate-200 px-2 text-left hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-[10px] font-bold">{row.codigo_ficha} · {products.find(p=>p.id===row.produto_id)?.codigo ?? 'Produto'}</span><span className="block truncate text-[9px] text-slate-500">{categories.find(c=>c.value===row.categoria_processo)?.label ?? row.categoria_processo} · v{row.versao_ficha ?? row.revisao} · {row.status}</span></span><span className="text-[9px] text-sky-700">Abrir</span></button>)}</div>
   </section>
   <section className="pcp-ficha-print-sheet border border-slate-200 bg-white p-3 print:border-0 print:p-0"><div className="mb-3 hidden border-b border-slate-400 pb-2 print:block"><h1 className="text-base font-bold">FICHA TÉCNICA DE PROCESSO INDUSTRIAL</h1><p className="text-[10px]">Documento operacional para consulta e assinatura no posto de trabalho.</p></div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 print:hidden"><h2 className="text-[11px] font-bold uppercase tracking-wider print:hidden">Identificação e homologação</h2><div className="text-right"><span className="block text-[9px] text-slate-600">{selectedProduct ? selectedProduct.codigo+' · '+selectedProduct.nome : 'Selecione um produto'}</span><span className="block text-[9px] text-slate-500">Ferramenta: {selectedTool?.codigo ?? '—'} · Máquina: {selectedMachine?.codigo ?? '—'}</span></div></div>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
     <label><span className={labelClass}>ID / código da ficha</span><input className={inputClass} value={code} onChange={e=>setCode(e.target.value)} required/></label>
     <label><span className={labelClass}>Código do produto (FK)</span><select className={inputClass} value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
     <label><span className={labelClass}>Código do molde / ferramental (FK)</span><select className={inputClass} value={toolId} onChange={e=>setToolId(e.target.value)}><option value="">Não aplicável</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} · {t.nome}</option>)}</select></label>
     <label><span className={labelClass}>Máquina / recurso</span><select className={inputClass} value={machineId} onChange={e=>setMachineId(e.target.value)}><option value="">Selecione</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
     <label><span className={labelClass}>Versão da ficha</span><input className={inputClass} type="number" min="1" step="1" value={version} onChange={e=>setVersion(e.target.value)} required/></label>
     <label><span className={labelClass}>Data de homologação</span><input className={inputClass} type="date" value={approvedAt} onChange={e=>setApprovedAt(e.target.value)}/></label>
     <label className="xl:col-span-2"><span className={labelClass}>Assinatura técnica do engenheiro</span><input className={inputClass} value={signature} onChange={e=>setSignature(e.target.value)} placeholder="Nome completo / registro profissional"/></label>
     <label><span className={labelClass}>Estado da ficha</span><select className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option>RASCUNHO</option><option>EM_ANALISE</option><option>APROVADA</option><option>LIBERADA</option><option>OBSOLETA</option></select></label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 border-y border-slate-100 py-2 text-[9px]"><span className="font-bold uppercase text-slate-500">Capacidade nominal calculada</span><strong className="text-[12px] tabular-nums">{expectedPph > 0 ? expectedPph.toLocaleString('pt-BR',{maximumFractionDigits:1})+' peças/h' : 'Informe ciclo e cavidades'}</strong><span className="text-slate-500">Cálculo = 3.600 ÷ ciclo (s) × cavidades ativas</span></div>
    {category === 'PRENSADOS' && <section className="mt-3 overflow-hidden border border-slate-700 bg-[#142633] text-white shadow-sm">
     <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0D1E29] px-3 py-2"><Hammer size={14} className="text-amber-300"/><div><h3 className="text-[10px] font-black uppercase tracking-[.14em]">Prensa hidráulica · distribuição térmica e força</h3><p className="text-[9px] text-slate-400">Esquema técnico ilustrativo; informe os parâmetros homologados da máquina e da matriz.</p></div><span className="ml-auto text-[9px] font-bold text-amber-200">SETUP PCP</span></header>
     <div className="grid grid-cols-1 gap-2 p-3 lg:grid-cols-12">
      <div className="space-y-2 lg:col-span-8">
       <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="border border-purple-400/50 bg-[#211D35] p-2"><span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-purple-200"><Thermometer size={12}/> Platô térmico superior</span><span className="flex items-center gap-2"><input aria-label="Temperatura do platô superior em graus Celsius" className="h-8 min-w-0 w-full border border-purple-300/30 bg-[#100F1B] px-2 text-center font-mono text-[14px] font-black text-purple-200 outline-none focus:border-purple-300" type="number" step="0.1" value={String(params.temp_placa_sup??'')} onChange={e=>updateParam('temp_placa_sup',e.target.value)} placeholder="—"/><span className="text-[10px] font-bold text-purple-200">°C</span></span></label>
        <div className="flex min-h-[72px] flex-col items-center justify-center border border-dashed border-slate-500 bg-[#0B1821] px-3 py-2 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Área de cura</span><span className="mt-1 text-[11px] font-bold text-slate-100">Fechamento da matriz</span><span className="mt-1 text-[8px] text-slate-500">Cavidade / composto</span></div>
        <label className="border border-indigo-400/50 bg-[#1A203A] p-2"><span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-indigo-200"><Thermometer size={12}/> Platô térmico inferior</span><span className="flex items-center gap-2"><input aria-label="Temperatura do platô inferior em graus Celsius" className="h-8 min-w-0 w-full border border-indigo-300/30 bg-[#101526] px-2 text-center font-mono text-[14px] font-black text-indigo-200 outline-none focus:border-indigo-300" type="number" step="0.1" value={String(params.temp_placa_inf??'')} onChange={e=>updateParam('temp_placa_inf',e.target.value)} placeholder="—"/><span className="text-[10px] font-bold text-indigo-200">°C</span></span></label>
        <div className="flex items-center justify-center border border-slate-700 bg-[#101E29] p-2"><div className="text-center"><span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500">Estrutura da prensa</span><span className="mt-1 block text-[10px] font-black text-slate-200">Colunas · cilindro · platôs</span><span className="mt-1 block text-[8px] text-slate-500">Diagrama esquemático, não dimensional</span></div></div>
       </div>
      </div>
      <div className="space-y-2 lg:col-span-4">
       <label className="block border border-amber-400/50 bg-[#302718] p-3"><span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-amber-200"><Gauge size={13}/> Manômetro · bomba hidráulica</span><span className="flex items-center gap-2"><input aria-label="Pressão da bomba hidráulica em bar" className="h-8 min-w-0 w-full border border-amber-300/30 bg-[#17130D] px-2 text-center font-mono text-[14px] font-black text-amber-200 outline-none focus:border-amber-300" type="number" step="0.1" value={String(params.pressao_bomba_bar??'')} onChange={e=>updateParam('pressao_bomba_bar',e.target.value)} placeholder="—"/><span className="text-[10px] font-bold text-amber-200">bar</span></span></label>
       <label className="block border border-emerald-400/50 bg-[#132D2A] p-3"><span className="mb-2 block text-[9px] font-black uppercase tracking-wide text-emerald-200">Força de fechamento</span><span className="flex items-center gap-2"><input aria-label="Tonelagem requerida da prensa" className="h-8 min-w-0 w-full border border-emerald-300/30 bg-[#0B1A19] px-2 text-center font-mono text-[14px] font-black text-emerald-200 outline-none focus:border-emerald-300" type="number" step="0.1" value={String(params.tonelagem_prensa??'')} onChange={e=>updateParam('tonelagem_prensa',e.target.value)} placeholder="—"/><span className="text-[10px] font-bold text-emerald-200">ton</span></span></label>
       <p className="border-l-2 border-amber-400 px-2 py-1 text-[9px] leading-relaxed text-slate-400">Confirme pressão, tonelagem e temperatura na documentação homologada da prensa. O desenho é representativo e não substitui intertravamentos nem validação de segurança.</p>
      </div>
     </div>
    </section>}
    {category === 'INJETADOS' && <section className="mt-3 overflow-hidden border border-slate-700 bg-[#142633] text-white shadow-sm">
     <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0D1E29] px-3 py-2"><Thermometer size={14} className="text-cyan-300"/><div><h3 className="text-[10px] font-black uppercase tracking-[.14em]">Perfil térmico · fluxo do canhão</h3><p className="text-[9px] text-slate-400">Parâmetros de referência homologados para material, máquina e molde.</p></div><span className="ml-auto text-[9px] font-bold text-cyan-200">°C</span></header>
     <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-4">
      {[{key:'zona1_c',label:'Zona 01 · traseira',color:'border-cyan-400',text:'text-cyan-200'},{key:'zona2_c',label:'Zona 02 · intermediária',color:'border-amber-400',text:'text-amber-200'},{key:'zona3_c',label:'Zona 03 · frontal',color:'border-orange-400',text:'text-orange-200'},{key:'zona4_c',label:'Bico · injeção',color:'border-rose-400',text:'text-rose-200'}].map((zone,index)=><div key={zone.key} className={'relative min-w-0 border-l-2 '+zone.color+' bg-white/[.04] p-2'}>
       <div className="mb-2 flex items-center justify-between gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-300">{zone.label}</span>{index<3&&<ArrowRight size={11} className="shrink-0 text-slate-500"/>}</div>
       <div className="flex items-center gap-1"><input aria-label={zone.label+' em graus Celsius'} className="h-8 min-w-0 w-full border border-white/15 bg-[#0B1821] px-2 text-center font-mono text-[13px] font-black text-white outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300/30" type="number" step="0.1" value={String(params[zone.key]??'')} onChange={e=>updateParam(zone.key,e.target.value)} placeholder="—"/><span className={'text-[10px] font-bold '+zone.text}>°C</span></div>
      </div>)}
     </div><p className="border-t border-white/10 px-3 py-2 text-[9px] text-slate-400">Confirme os limites aprovados para o material e o processo antes de iniciar a produção. Não use receitas genéricas como valores de liberação.</p>
    </section>}
    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">{fields.filter(field => !(category === 'INJETADOS' && ['zona1_c','zona2_c','zona3_c','zona4_c'].includes(field.key)) && !(category === 'PRENSADOS' && ['tonelagem_prensa','pressao_bomba_bar','temp_placa_sup','temp_placa_inf'].includes(field.key))).map(field=><label key={field.key}><span className={labelClass}>{field.label} {field.required && <span className="text-rose-600">*</span>}</span><span className="flex"><input className={inputClass+' rounded-r-none'} type={field.type==='number'?'number':'text'} step={field.step} value={params[field.key]??''} onChange={e=>updateParam(field.key,e.target.value)} placeholder={field.unit==='—'?'Informar':field.unit}/><span className="flex h-[30px] min-w-[46px] items-center justify-center border border-l-0 border-slate-300 bg-slate-50 px-1 text-[9px] text-slate-500">{field.unit}</span></span></label>)}</div>
    <label className="mt-3 block"><span className={labelClass}>Instruções de setup / processo / segurança</span><textarea className="min-h-[72px] w-full rounded-[3px] border border-slate-300 p-2 text-[10px] outline-none focus:border-[#2D8DB8]" value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Sequência operacional, parâmetros de controle, inspeção inicial, reação a desvio, EPI e cuidados ambientais…"/></label>
    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2"><span className="text-[9px] text-slate-500">Dados separados por empresa · revisão técnica · sem valores fictícios</span><button className="erp-premium-button print:hidden" onClick={()=>void save()} disabled={busy}><Save size={12}/> Gravar ficha</button></div>
   </section>
   <div className="print:hidden"><PCPMoldPhotoPanel productId={productId} /></div>
   <footer className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-slate-500 print:hidden"><CalendarRange size={12}/> Calendário de recursos e parâmetros de processo devem usar capacidade, ciclo e setup homologados.<a href="/ajuda/pcp-fichas-processo" className="ml-auto inline-flex h-8 items-center border border-slate-300 bg-white px-2 font-bold text-[#123B50] hover:bg-slate-50">POP · Ajuda técnica</a></footer>
  </div>
 <style>{'@media print{body{background:#fff!important;color:#111!important}.pcp-ficha-print-sheet{break-inside:avoid;border:0!important;padding:0!important}.pcp-ficha-print-sheet input,.pcp-ficha-print-sheet select,.pcp-ficha-print-sheet textarea{color:#111!important;background:#fff!important;border-color:#777!important;box-shadow:none!important;print-color-adjust:exact}.pcp-ficha-print-sheet label{break-inside:avoid}.pcp-ficha-print-sheet button{display:none!important}}'}</style>
  </main>
}
