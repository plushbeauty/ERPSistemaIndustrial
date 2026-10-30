/**
 * REV-PCP-FICHA-TESTE-001 | 2026-10-21
 * Fonte: protótipo visual enviado pelo Lovable.dev.
 * Escopo: avaliação visual isolada; dados demonstrativos claramente identificados.
 * Segurança: não grava dados e não substitui a ficha aprovada.
 */
import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, BadgeCheck, Box, CalendarClock, ClipboardList, Factory, Gauge, Printer, Search, Thermometer, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import { Menubar, MenubarMenu, MenubarTrigger } from '../components/ui/menubar'

type DemoFicha = {
  id: string; codigo: string; descricao: string; maquina: string; molde: string; cavidades: number; resina: string; status: string; categoria: string
  temperaturas: { label: string; value: number }[]
  ciclo: { label: string; value: number }[]
  parametros: { grupo: string; label: string; valor: string }[]
}
type SavedFicha = { id: string; codigo_ficha: string; produto_id: string; ferramenta_id: string | null; maquina_id: string | null; categoria_processo: string; versao_ficha: number; status: string; parametros_tecnicos: Record<string, unknown> | null }
type Lookup = { id: string; codigo: string; nome: string; tipo?: string | null }
const numeric = (params: Record<string, unknown>, key: string) => {
  const value = params[key]
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
const formatValue = (value: unknown, unit: string) => value === null || value === undefined || value === '' ? '—' : String(value) + (unit ? ' ' + unit : '')

export default function PCPFichaProcessoTeste() {
  const [fichas, setFichas] = useState<DemoFicha[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState<'ficha' | 'parametros' | 'historico'>('ficha')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    let active = true
    async function loadRealFichas() {
      setLoading(true); setLoadError('')
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
        const [pr, tr, mr, fr] = await Promise.all([
          supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(3000),
          supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(2000),
          supabase.from('erp_maquinas').select('id,codigo,nome,tipo').eq('empresa_id', tenant.data).not('status', 'eq', 'INATIVA').order('codigo').limit(2000),
          supabase.from('erp_fichas_processo').select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,parametros_tecnicos').eq('empresa_id', tenant.data).order('codigo_ficha').limit(1000),
        ])
        for (const result of [pr,tr,mr,fr]) if (result.error) throw result.error
        const products = (pr.data ?? []) as Lookup[], tools = (tr.data ?? []) as Lookup[], machines = (mr.data ?? []) as Lookup[]
        const mapped = ((fr.data ?? []) as SavedFicha[]).map((row): DemoFicha => {
          const p = row.parametros_tecnicos ?? {}, product = products.find(x => x.id === row.produto_id), tool = tools.find(x => x.id === row.ferramenta_id), machine = machines.find(x => x.id === row.maquina_id)
          const temperatureFields = [['Bico','temp_bico_c'],['Zona 1','zona1_c'],['Zona 2','zona2_c'],['Zona 3','zona3_c'],['Zona 4','zona4_c'],['Molde fixo','temp_molde_fixo_c'],['Molde móvel','temp_molde_movel_c'],['Molde','temperatura_molde_c'],['Platô superior','temp_plato_superior_c'],['Platô inferior','temp_plato_inferior_c']] as const
          const temperatures = temperatureFields.flatMap(([label,key]) => { const value = numeric(p,key); return value === null ? [] : [{label,value}] })
          const cycleFields = [['Injeção','tempo_injecao_seg'],['Recalque','tempo_recalque_seg'],['Resfriamento','tempo_resfriamento_seg'],['Ciclo total','tempo_ciclo_seg']] as const
          const cycleParts = cycleFields.slice(0, 3).flatMap(([label,key]) => { const value = numeric(p,key); return value === null ? [] : [{label,value}] })
          const totalCycle = numeric(p, 'tempo_ciclo_seg')
          const cycle = cycleParts.length ? cycleParts : totalCycle === null ? [] : [{ label: 'Ciclo total', value: totalCycle }]
          const defs: {group:string;label:string;key:string;unit:string}[] = [
            {group:'Injeção e recalque',label:'Velocidade de injeção',key:'velocidade_injecao_mm_s',unit:'mm/s'},
            {group:'Injeção e recalque',label:'Pressão de injeção',key:'pressao_injecao_bar',unit:'bar'},
            {group:'Injeção e recalque',label:'Pressão de recalque',key:'pressao_recalque_bar',unit:'bar'},
            {group:'Injeção e recalque',label:'Posição de comutação',key:'posicao_comutacao_mm',unit:'mm'},
            {group:'Plastificação',label:'Rotação da rosca',key:'rpm_rosca',unit:'RPM'},
            {group:'Plastificação',label:'Contrapressão',key:'pressao_contrapressao_bar',unit:'bar'},
            {group:'Plastificação',label:'Curso de dosagem',key:'posicao_dosagem_mm',unit:'mm'},
            {group:'Fechamento e extração',label:'Força de fechamento',key:'forca_fechamento_ton',unit:'t'},
            {group:'Fechamento e extração',label:'Cavidades ativas',key:'cavidades_ativas',unit:''},
          ]
          const parameters = defs.flatMap(d => { const v = p[d.key]; return v === null || v === undefined || v === '' ? [] : [{grupo:d.group,label:d.label,valor:formatValue(v,d.unit)}] })
          return {id:row.id,codigo:row.codigo_ficha,descricao:product ? product.codigo+' · '+product.nome : 'Produto não localizado',maquina:machine ? machine.codigo+' · '+machine.nome : 'Máquina não vinculada',molde:tool ? tool.codigo+' · '+tool.nome : 'Ferramenta não vinculada',cavidades:numeric(p,'cavidades_ativas') ?? 0,resina:String(p.material_polimero ?? p.composto_material ?? p.material_base ?? '—'),status:row.status,categoria:row.categoria_processo,temperaturas: temperatures, ciclo: cycle, parametros:parameters}
        })
        if (active) { setFichas(mapped); setSelectedCode(current => mapped.some(x => x.codigo === current) ? current : (mapped[0]?.codigo ?? '')) }
      } catch (e) { if (active) setLoadError(e instanceof Error ? e.message : 'Falha ao carregar fichas reais.') }
      finally { if (active) setLoading(false) }
    }
    void loadRealFichas()
    return () => { active = false }
  }, [])
  const ficha = useMemo(() => fichas.find(x => x.codigo === selectedCode) ?? null, [fichas, selectedCode])
  const filtered = fichas.filter(x => (x.codigo+' '+x.descricao).toLowerCase().includes(search.toLowerCase()))
  const cycleTotal = ficha?.ciclo.reduce((sum,x) => sum+x.value,0) ?? 0
  const maxTemp = Math.max(...(ficha?.temperaturas.map(x => x.value) ?? []),250)

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#eef3f8] text-slate-800">
      <header className="bg-[#123B50] text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10"><Factory className="h-5 w-5 text-cyan-200" /></div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">SYSNQRA ERP & SGQ INDUSTRIAL · PCP</div>
              <h1 className="truncate text-lg font-bold tracking-tight">Ficha de Processo Industrial</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-blue-100 md:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Dados reais da empresa autenticada</div>
        </div>
        <div className="border-t border-white/10 bg-[#0d2e40] px-5 py-2">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
            <Menubar className="border-0 bg-transparent p-0 shadow-none">
              <MenubarMenu><MenubarTrigger className={activeView === 'ficha' ? 'bg-white/15 text-white' : ''} onClick={() => setActiveView('ficha')}><Activity className="mr-2 h-3.5 w-3.5" /> Visão geral</MenubarTrigger></MenubarMenu>
              <MenubarMenu><MenubarTrigger className={activeView === 'parametros' ? 'bg-white/15 text-white' : ''} onClick={() => setActiveView('parametros')}><Wrench className="mr-2 h-3.5 w-3.5" /> Parâmetros</MenubarTrigger></MenubarMenu>
              <MenubarMenu><MenubarTrigger className={activeView === 'historico' ? 'bg-white/15 text-white' : ''} onClick={() => setActiveView('historico')}><ClipboardList className="mr-2 h-3.5 w-3.5" /> Histórico</MenubarTrigger></MenubarMenu>
            </Menubar>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-2 rounded border border-white/20 px-3 text-xs font-bold text-white hover:bg-white/10"><Printer className="h-3.5 w-3.5" /> Imprimir</button>
              <Link to="/pcp" className="inline-flex h-8 items-center gap-2 rounded bg-white px-3 text-xs font-bold text-[#123B50] hover:bg-cyan-50"><ArrowLeft className="h-3.5 w-3.5" /> Voltar ao PCP</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Engenharia de processo / Injetados</div><h2 className="mt-1 text-xl font-bold text-slate-900">{ficha?.descricao ?? (loading ? 'Carregando ficha de processo…' : 'Nenhuma ficha de processo encontrada')}</h2><p className="mt-1 text-xs text-slate-500">Ficha técnica vinculada aos cadastros reais da empresa.</p></div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" /> Ficha real</span><span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600"><CalendarClock className="h-3.5 w-3.5" /> Revisão visual 01</span></div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700"><Box className="h-4 w-4 text-blue-700" /> Fichas de processo <span className="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">{filtered.length}</span></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ficha..." className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></div>
            <div className="space-y-1 p-2">{filtered.map((item) => <button key={item.codigo} type="button" onClick={() => setSelectedCode(item.codigo)} className={['w-full rounded border p-3 text-left transition-colors', selectedCode === item.codigo ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'].join(' ')}><div className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-slate-900">{item.codigo}</span><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800">{item.status}</span></div><div className="mt-1 text-xs font-semibold text-slate-600">{item.descricao}</div><div className="mt-2 text-[10px] text-slate-400">{item.maquina}</div></button>)}</div>
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600">{loading ? "Carregando fichas reais…" : loadError || (fichas.length + " ficha(s) real(is) carregada(s) do Supabase.")}</div>
          </aside>

          <section className="min-w-0 space-y-4">
            {activeView === 'ficha' && <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Perfil de temperatura</h3><p className="mt-1 text-[11px] text-slate-400">Setpoints por zona térmica · °C</p></div><Thermometer className="h-5 w-5 text-blue-700" /></div><div className="flex h-44 items-end justify-around gap-3 border-b border-slate-100 px-2 pb-2">{(ficha?.temperaturas ?? []).map((temp) => <div key={temp.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-extrabold tabular-nums text-slate-800">{temp.value}°</span><div className="flex w-full max-w-12 items-end" style={{ height: '100px' }}><div className="w-full rounded-t-sm bg-gradient-to-t from-blue-800 to-cyan-500 shadow-sm" style={{ height: Math.max(8, temp.value / maxTemp * 100) + 'px' }} /></div><span className="text-center text-[10px] font-bold text-slate-500">{temp.label}</span></div>)}</div><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Parâmetros registrados na ficha; não são leituras ao vivo da máquina.</div></article>
              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Resumo do ciclo</h3><p className="mt-1 text-[11px] text-slate-400">Tempos de processo em segundos</p></div><Gauge className="h-5 w-5 text-blue-700" /></div><div className="space-y-3">{(ficha?.ciclo ?? []).map((item) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-xs"><span className="text-slate-500">{item.label}</span><span className="font-bold tabular-nums text-slate-800">{item.value.toFixed(1)} s</span></div>)}</div><div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Tempo total calculado</div><div className="mt-1 text-2xl font-black tabular-nums text-emerald-700">{cycleTotal.toFixed(1)} <span className="text-sm font-bold">s</span></div></div></article>
            </div>}

            {activeView !== 'historico' && <article className="rounded-md border border-slate-200 bg-white px-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Parâmetros da injetora</h3><p className="mt-1 text-[11px] text-slate-400">Parâmetros reais registrados na ficha de processo</p></div><Wrench className="h-4 w-4 text-blue-700" /></div><Accordion type="multiple" defaultValue={['injecao','plastificacao']}><AccordionItem value="injecao"><AccordionTrigger><span>01 · Injeção e recalque</span><span className="ml-auto mr-3 text-[10px] font-semibold text-slate-400">4 parâmetros</span></AccordionTrigger><AccordionContent><div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-2 xl:grid-cols-4">{(ficha?.parametros ?? []).filter((item) => item.grupo === 'Injeção e recalque').map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-500">{item.label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{item.valor}</div></div>)}</div></AccordionContent></AccordionItem><AccordionItem value="plastificacao"><AccordionTrigger><span>02 · Plastificação</span><span className="ml-auto mr-3 text-[10px] font-semibold text-slate-400">3 parâmetros</span></AccordionTrigger><AccordionContent><div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-3">{(ficha?.parametros ?? []).filter((item) => item.grupo === 'Plastificação').map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-500">{item.label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{item.valor}</div></div>)}</div></AccordionContent></AccordionItem><AccordionItem value="fechamento"><AccordionTrigger><span>03 · Fechamento e extração</span><span className="ml-auto mr-3 text-[10px] font-semibold text-slate-400">3 parâmetros</span></AccordionTrigger><AccordionContent><div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-3">{(ficha?.parametros ?? []).filter((item) => item.grupo === 'Fechamento e extração').map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold text-slate-500">{item.label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{item.valor}</div></div>)}</div></AccordionContent></AccordionItem></Accordion></article>}

            {activeView !== 'parametros' && <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><div><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Histórico recente de ajustes</h3><p className="mt-1 text-[11px] text-slate-400">Histórico de alterações da ficha selecionada</p></div><ClipboardList className="h-4 w-4 text-blue-700" /></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left text-xs"><thead className="bg-[#123B50] text-[10px] uppercase tracking-wide text-white"><tr>{['Data / hora','Responsável','Parâmetro','Alteração','Status'].map((label) => <th key={label} className="px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Nenhum registro de histórico disponível para exibição.</td></tr></tbody></table></div></article>}
            <div className="text-right text-[10px] text-slate-400">PCP · Ficha de processo · dados consultados conforme sessão e permissões da empresa</div>
          </section>
        </div>
      </div>
      <style>{'@media print { header button, header a, aside, main > div > div:first-child { display: none !important; } main { background: white !important; } }'}</style>
    </main>
  )
}
