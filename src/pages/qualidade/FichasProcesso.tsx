/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, CheckCircle2, ClipboardList, Factory, RefreshCw, Search, Thermometer, Timer, Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Ficha = {
  id: string
  codigo_ficha: string
  produto_id: string
  ferramenta_id: string | null
  maquina_id: string | null
  categoria_processo: string
  versao_ficha: number
  status: string
  revisao: number
  cavidades_ativas: number
  ciclo_seg: number | null
  temperatura_trabalho: number | null
  pressao_injecao: number | null
  forca_fechamento: number | null
  zonas_temperatura: Record<string, unknown> | null
  parametros_tecnicos: Record<string, unknown> | null
  atualizado_em: string | null
}
type Historico = {
  id: string
  data_ajuste: string
  responsavel: string
  parametro: string
  alteracao: string
  status: string
}
type Lookup = { id: string; codigo: string; nome: string }
const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
const fmt = (value: unknown, suffix = '') => {
  const n = numeric(value)
  return n === null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${suffix}`
}
const statusClass = (status: string) => {
  const s = status.toUpperCase()
  if (['LIBERADA', 'APROVADA', 'APROVADO'].includes(s)) return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (['OBSOLETA', 'REJEITADO'].includes(s)) return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-amber-200 bg-amber-50 text-amber-800'
}
const paramsLabel: Record<string, string> = {
  temp_bico: 'Bico', bico_c: 'Bico', zona1: 'Zona 1', zona1_c: 'Zona 1', zona2: 'Zona 2', zona2_c: 'Zona 2',
  zona3: 'Zona 3', zona3_c: 'Zona 3', zona4: 'Zona 4', zona4_c: 'Zona 4', temp_alimentacao: 'Alimentação',
  temperatura_secagem_c: 'Secagem', temp_molde_fixo: 'Molde fixo', temp_molde_movel: 'Molde móvel',
}
const isTemperature = (key: string) => /temp|temperatura|zona|bico/i.test(key)

export default function FichasProcessoQualidade() {
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [products, setProducts] = useState<Record<string, Lookup>>({})
  const [tools, setTools] = useState<Record<string, Lookup>>({})
  const [machines, setMachines] = useState<Record<string, Lookup>>({})
  const [history, setHistory] = useState<Historico[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data || typeof company.data !== 'string') throw new Error('Empresa da sessão não identificada. A consulta foi bloqueada.')
      const tenantId = company.data
      const [f, p, t, m] = await Promise.all([
        supabase.from('erp_fichas_processo')
          .select('id,codigo_ficha,produto_id,ferramenta_id,maquina_id,categoria_processo,versao_ficha,status,revisao,cavidades_ativas,ciclo_seg,temperatura_trabalho,pressao_injecao,forca_fechamento,zonas_temperatura,parametros_tecnicos,atualizado_em')
          .eq('empresa_id', tenantId).eq('categoria_processo', 'INJETADOS').order('codigo_ficha').limit(1000),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenantId).eq('ativo', true).limit(3000),
        supabase.from('erp_ferramentas_industriais').select('id,codigo,nome').eq('empresa_id', tenantId).eq('ativo', true).limit(2000),
        supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', tenantId).not('status', 'eq', 'INATIVA').limit(2000),
      ])
      for (const result of [f, p, t, m]) if (result.error) throw result.error
      const nextFichas = (f.data ?? []) as Ficha[]
      setFichas(nextFichas)
      setProducts(Object.fromEntries(((p.data ?? []) as Lookup[]).map((x) => [x.id, x])))
      setTools(Object.fromEntries(((t.data ?? []) as Lookup[]).map((x) => [x.id, x])))
      setMachines(Object.fromEntries(((m.data ?? []) as Lookup[]).map((x) => [x.id, x])))
      setSelectedId((current) => nextFichas.some((x) => x.id === current) ? current : nextFichas[0]?.id ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao consultar as fichas de processo.')
      setFichas([])
      setSelectedId('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selected = useMemo(() => fichas.find((x) => x.id === selectedId) ?? null, [fichas, selectedId])
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR')
    return fichas.filter((x) => {
      const product = products[x.produto_id]
      return !q || [x.codigo_ficha, product?.codigo, product?.nome, x.status].some((v) => String(v ?? '').toLocaleLowerCase('pt-BR').includes(q))
    })
  }, [fichas, products, search])

  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      setHistory([])
      setHistoryError('')
      if (!selectedId) return
      setHistoryLoading(true)
      try {
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error) throw company.error
        if (!company.data || typeof company.data !== 'string') throw new Error('Empresa da sessão não identificada.')
        const result = await supabase.from('erp_historico_ajustes_maquina')
          .select('id,data_ajuste,responsavel,parametro,alteracao,status')
          .eq('empresa_id', company.data).eq('ficha_id', selectedId).order('data_ajuste', { ascending: false }).limit(100)
        if (result.error) throw result.error
        if (!cancelled) setHistory((result.data ?? []) as Historico[])
      } catch (e) {
        if (!cancelled) setHistoryError(e instanceof Error ? e.message : 'Falha ao consultar o histórico.')
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    void loadHistory()
    return () => { cancelled = true }
  }, [selectedId])

  const temperatures = useMemo(() => {
    if (!selected) return []
    const combined = { ...(selected.zonas_temperatura ?? {}), ...(selected.parametros_tecnicos ?? {}) }
    return Object.entries(combined).filter(([key, value]) => isTemperature(key) && numeric(value) !== null)
      .map(([key, value]) => ({ key, label: paramsLabel[key] ?? key.replace(/_/g, ' '), value: numeric(value) as number }))
      .slice(0, 10)
  }, [selected])
  const parameterEntries = useMemo(() => {
    if (!selected) return []
    return Object.entries(selected.parametros_tecnicos ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== '')
      .filter(([key]) => !isTemperature(key)).slice(0, 80)
  }, [selected])
  const maxTemperature = Math.max(250, ...temperatures.map((x) => x.value))

  return (
    <main className="min-h-[calc(100vh-48px)] bg-[#eef3f8] px-3 py-4 text-slate-800 md:px-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#0d2e40] bg-[#123B50] px-4 py-3 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded border border-white/20 bg-white/10"><Factory className="h-5 w-5 text-cyan-200" /></span>
            <div><div className="text-[9px] font-bold uppercase tracking-[.18em] text-cyan-200">SYSNQRA ERP & SGQ INDUSTRIAL · QUALIDADE</div><h1 className="text-base font-bold">Ficha Técnica de Inspeção de Processo — Injetados</h1></div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded border border-white/25 px-3 text-xs font-bold hover:bg-white/10 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar dados</button>
        </header>

        {error && <div role="alert" className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Não foi possível carregar as fichas.</strong><p className="mt-1 break-words">{error}</p></div></div>}

        <div className="grid grid-cols-12 gap-3">
          <aside className="col-span-12 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-slate-600"><span>Fichas de injetados</span><span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">{filtered.length}</span></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input aria-label="Buscar ficha" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código ou produto..." className="h-9 w-full rounded border border-slate-300 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div></div>
            <div className="max-h-[62vh] space-y-1 overflow-y-auto p-2">
              {loading && <p className="p-3 text-xs text-slate-500">Consultando banco de dados...</p>}
              {!loading && !error && filtered.length === 0 && <p className="p-3 text-xs text-slate-500">Nenhuma ficha real de injetados encontrada para esta empresa.</p>}
              {filtered.map((f) => <button type="button" key={f.id} onClick={() => setSelectedId(f.id)} className={`w-full rounded border p-3 text-left transition-colors ${selectedId === f.id ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-slate-900">{f.codigo_ficha}</span><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${statusClass(f.status)}`}>{f.status}</span></div><p className="mt-1 truncate text-[11px] text-slate-600">{products[f.produto_id]?.codigo ?? 'Produto'} · {products[f.produto_id]?.nome ?? f.produto_id}</p><p className="mt-1 text-[10px] text-slate-400">Rev. {f.revisao} · v{f.versao_ficha}</p></button>)}
            </div>
          </aside>

          <section className="col-span-12 min-w-0 space-y-3 lg:col-span-9">
            {!selected && !loading && !error && <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Selecione uma ficha para consultar os parâmetros homologados.</div>}
            {selected && <>
              <div className="grid grid-cols-12 gap-3">
                <article className="col-span-12 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:col-span-7">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[9px] font-bold uppercase tracking-widest text-blue-700">Ficha selecionada</div><h2 className="mt-1 text-lg font-extrabold text-slate-900">{selected.codigo_ficha}</h2><p className="mt-1 text-xs text-slate-600">{products[selected.produto_id]?.codigo ?? 'Produto'} · {products[selected.produto_id]?.nome ?? selected.produto_id}</p></div><span className={`rounded border px-2 py-1 text-[10px] font-bold ${statusClass(selected.status)}`}>{selected.status}</span></div>
                  <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">{[{ label: 'Máquina', value: machines[selected.maquina_id ?? '']?.codigo ?? 'Não vinculada' }, { label: 'Molde / ferramenta', value: tools[selected.ferramenta_id ?? '']?.codigo ?? 'Não vinculado' }, { label: 'Cavidades ativas', value: String(selected.cavidades_ativas ?? '—') }, { label: 'Ciclo padrão', value: fmt(selected.ciclo_seg, ' s') }].map((item) => <div key={item.label} className="rounded border border-slate-200 bg-slate-50 p-2.5"><div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div><div className="mt-1 truncate text-xs font-extrabold text-slate-800">{item.value}</div></div>)}</div>
                </article>
                <article className="col-span-12 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:col-span-5"><div className="mb-3 flex items-center gap-2"><Timer className="h-4 w-4 text-blue-700" /><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">Parâmetros principais</h3></div><div className="space-y-2 text-xs">{[{ label: 'Força de fechamento', value: fmt(selected.forca_fechamento, ' t') }, { label: 'Pressão de injeção', value: fmt(selected.pressao_injecao, ' bar') }, { label: 'Temperatura de trabalho', value: fmt(selected.temperatura_trabalho, ' °C') }, { label: 'Atualização', value: selected.atualizado_em ? new Date(selected.atualizado_em).toLocaleString('pt-BR') : '—' }].map((item) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0"><span className="text-slate-500">{item.label}</span><strong className="text-right text-slate-800">{item.value}</strong></div>)}</div></article>
              </div>

              <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><Thermometer className="h-4 w-4 text-blue-700" /><div><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Blocos térmicos · perfil de temperatura</h3><p className="mt-1 text-[10px] text-slate-400">Valores obtidos dos parâmetros reais da ficha selecionada.</p></div></div>
                {temperatures.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-4 text-xs text-slate-500">Esta ficha ainda não possui valores térmicos numéricos cadastrados em zonas_temperatura ou parametros_tecnicos.</p> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6">{temperatures.map((t) => <div key={t.key} className="rounded border border-blue-100 bg-[#f4fbfd] p-3"><div className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-500">{t.label}</div><div className="mt-2 h-1.5 overflow-hidden rounded bg-blue-100"><div className="h-full rounded bg-gradient-to-r from-blue-800 to-cyan-500" style={{ width: `${Math.max(0, Math.min(100, t.value / maxTemperature * 100))}%` }} /></div><div className="mt-2 text-lg font-black tabular-nums text-[#123B50]">{fmt(t.value, ' °C')}</div></div>)}</div>}
              </article>

              <article className="rounded-md border border-slate-200 bg-white px-4 shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 py-3"><Wrench className="h-4 w-4 text-blue-700" /><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Parâmetros operacionais regulados</h3><span className="ml-auto text-[10px] text-slate-400">{parameterEntries.length} itens</span></div><details className="group" open><summary className="flex h-9 cursor-pointer list-none items-center justify-between text-xs font-bold text-slate-700">Parâmetros técnicos cadastrados <span className="text-blue-700 group-open:rotate-180">⌄</span></summary>{parameterEntries.length === 0 ? <p className="pb-3 text-xs text-slate-500">Nenhum parâmetro operacional adicional cadastrado.</p> : <div className="grid grid-cols-1 gap-2 pb-3 sm:grid-cols-2 xl:grid-cols-3">{parameterEntries.map(([key, value]) => <div key={key} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-semibold capitalize text-slate-500">{key.replace(/_/g, ' ')}</div><div className="mt-1 break-words text-xs font-bold text-slate-800">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</div></div>)}</div>}</details></article>

              <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3"><ClipboardList className="h-4 w-4 text-blue-700" /><div><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Histórico de ajustes da máquina</h3><p className="mt-1 text-[10px] text-slate-400">Trilha de registros vinculados à ficha ativa e à empresa autenticada.</p></div><span className="ml-auto text-[10px] font-bold text-slate-500">{history.length} registros</span></div>
                {historyError && <div role="alert" className="m-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{historyError}</div>}
                <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-xs"><thead className="bg-[#123B50] text-[9px] uppercase tracking-wide text-white"><tr>{['Data / hora','Responsável','Parâmetro editado','Alteração','Status'].map((x) => <th key={x} className="px-3 py-2.5 font-bold">{x}</th>)}</tr></thead><tbody>{historyLoading ? <tr><td colSpan={5} className="p-4 text-center text-slate-500">Carregando histórico...</td></tr> : history.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-slate-500">Nenhum ajuste registrado para esta ficha.</td></tr> : history.map((h) => <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50"><td className="whitespace-nowrap px-3 py-3 text-slate-500">{new Date(h.data_ajuste).toLocaleString('pt-BR')}</td><td className="px-3 py-3 font-semibold text-slate-700">{h.responsavel}</td><td className="px-3 py-3 text-slate-600">{h.parametro}</td><td className="px-3 py-3 font-semibold text-slate-800">{h.alteracao}</td><td className="px-3 py-3"><span className={`rounded border px-2 py-1 text-[9px] font-bold ${statusClass(h.status)}`}>{h.status}</span></td></tr>)}</tbody></table></div>
              </article>
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Revisão de interface · somente leitura · dados do Supabase</div>
            </>}
          </section>
        </div>
      </div>
    </main>
  )
}
