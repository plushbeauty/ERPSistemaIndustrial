import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Gauge, RefreshCw, Save, Sigma } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import VendasLayout from '../VendasLayout'

type Product = { id: string; codigo: string; descricao_tecnica: string }
type Measurement = {
  id: string
  produto_id: string
  parametro: string
  amostra_numero: number
  valor_medido: number
  nominal: number
  limite_superior: number
  limite_inferior: number
  medido_em: string
}
type Stats = { mean: number; sigma: number; cpk: number | null; upper: number; lower: number; nominal: number }

const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-[#2D8DB8]'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'
const button = 'inline-flex h-[30px] items-center justify-center gap-1 border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50'

function fixed(value: number, digits = 4) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

function CustomTooltip({ active, payload, label, stats }: {
  active?: boolean
  payload?: Array<{ value?: number; name?: string }>
  label?: string | number
  stats: Stats | null
}) {
  if (!active || !payload?.length) return null
  return <div className="border border-slate-200 bg-white/90 p-2 text-[9px] shadow-md backdrop-blur-sm">
    <p className="mb-1 font-bold text-slate-700">Amostra {label}</p>
    {payload.map((entry, index) => <p key={String(entry.name) + index} className="text-slate-600">{entry.name}: {typeof entry.value === 'number' ? fixed(entry.value) : '—'} mm</p>)}
    {stats && <div className="mt-1 border-t border-slate-200 pt-1 text-slate-700"><p>Desvio padrão: {fixed(stats.sigma)}</p><p>Cpk: {stats.cpk === null ? 'Amostra insuficiente' : fixed(stats.cpk, 3)}</p></div>}
  </div>
}

export default function QualidadeCEP() {
  const [companyId, setCompanyId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<Measurement[]>([])
  const [productId, setProductId] = useState('')
  const [parameter, setParameter] = useState('')
  const [newParameter, setNewParameter] = useState('')
  const [nominal, setNominal] = useState('')
  const [upper, setUpper] = useState('')
  const [lower, setLower] = useState('')
  const [measured, setMeasured] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      setCompanyId(company.data)
      const [productResult, measurementResult] = await Promise.all([
        supabase.from('engenharia_produtos').select('id,codigo,descricao_tecnica').eq('empresa_id', company.data).eq('ativo', true).order('codigo').limit(1000),
        supabase.from('qualidade_cep_medicoes').select('id,produto_id,parametro,amostra_numero,valor_medido,nominal,limite_superior,limite_inferior,medido_em').eq('empresa_id', company.data).order('medido_em', { ascending: false }).limit(1000),
      ])
      if (productResult.error) throw productResult.error
      if (measurementResult.error) throw measurementResult.error
      const productRows = (productResult.data ?? []) as Product[]
      const measurementRows = (measurementResult.data ?? []) as Measurement[]
      setProducts(productRows)
      setRows(measurementRows)
      setProductId(current => current || productRows[0]?.id || '')
      setParameter(current => current || measurementRows[0]?.parametro || '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar dados reais do CEP.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const parameters = useMemo(() => [...new Set(rows.filter(row => !productId || row.produto_id === productId).map(row => row.parametro))].sort(), [rows, productId])
  const filtered = useMemo(() => rows.filter(row => (!productId || row.produto_id === productId) && (!parameter || row.parametro === parameter)).sort((a, b) => a.amostra_numero - b.amostra_numero).slice(-200), [rows, productId, parameter])
  const stats = useMemo<Stats | null>(() => {
    if (!filtered.length) return null
    const values = filtered.map(row => Number(row.valor_medido))
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const sigma = values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)) : 0
    const latest = filtered[filtered.length - 1]
    const upperLimit = Number(latest.limite_superior)
    const lowerLimit = Number(latest.limite_inferior)
    const cpk = sigma > 0 ? Math.min((upperLimit - mean) / (3 * sigma), (mean - lowerLimit) / (3 * sigma)) : null
    return { mean, sigma, cpk, upper: upperLimit, lower: lowerLimit, nominal: Number(latest.nominal) }
  }, [filtered])

  const chartData = useMemo(() => filtered.map(row => ({
    sample: row.amostra_numero,
    measured: Number(row.valor_medido),
    nominal: Number(row.nominal),
    upper: Number(row.limite_superior),
    lower: Number(row.limite_inferior),
  })), [filtered])

  async function saveMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!companyId || !productId) throw new Error('Selecione um produto cadastrado.')
      const param = newParameter.trim() || parameter.trim()
      if (!param) throw new Error('Informe o nome da característica medida.')
      const target = [Number(nominal), Number(upper), Number(lower), Number(measured)]
      if (target.some(value => !Number.isFinite(value)) || Number(upper) < Number(lower) || Number(measured) < 0) throw new Error('Confira os valores medidos e os limites informados.')
      const existing = rows.filter(row => row.produto_id === productId && row.parametro === param)
      const sampleNumber = existing.reduce((max, row) => Math.max(max, row.amostra_numero), 0) + 1
      const session = await supabase.auth.getSession()
      if (session.error) throw session.error
      const result = await supabase.from('qualidade_cep_medicoes').insert({
        empresa_id: companyId,
        produto_id: productId,
        parametro: param,
        amostra_numero: sampleNumber,
        valor_medido: Number(measured),
        nominal: Number(nominal),
        limite_superior: Number(upper),
        limite_inferior: Number(lower),
        operador_id: session.data.session?.user.id ?? null,
      }).select('id').single()
      if (result.error) throw result.error
      setParameter(param)
      setNewParameter('')
      setMeasured('')
      setNotice('Medição ' + sampleNumber + ' gravada no CEP.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a medição.')
    } finally {
      setBusy(false)
    }
  }

  return <VendasLayout title="CEP · Cartas de Controle" subtitle="Controle estatístico do processo com medições reais" onRefresh={() => void load()}>
    <div className="grid gap-3 bg-[#F4FBFD] p-3">
      <section className="border border-slate-200 bg-white">
        <header className="flex h-10 items-center gap-2 border-b border-slate-200 px-3"><Activity size={16} className="text-[#2D8DB8]"/><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Característica monitorada</h2><button type="button" onClick={() => void load()} className={button + ' ml-auto'}><RefreshCw size={13}/> ATUALIZAR</button></header>
        <div className="grid gap-2 p-3 md:grid-cols-[minmax(220px,1.2fr)_minmax(160px,.8fr)]">
          <label><span className={label}>Produto</span><select className={field} value={productId} onChange={event => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} · {product.descricao_tecnica}</option>)}</select></label>
          <label><span className={label}>Característica / parâmetro</span><select className={field} value={parameter} onChange={event => setParameter(event.target.value)}><option value="">Todos os parâmetros</option>{parameters.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        <article className="border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Média amostral</p><p className="mt-1 text-lg font-semibold text-[#123B50]">{stats ? fixed(stats.mean) : '—'} <span className="text-[9px] font-normal">mm</span></p></article>
        <article className="border border-slate-200 bg-white p-3"><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500"><Sigma size={12}/> Desvio padrão amostral (s)</p><p className="mt-1 text-lg font-semibold text-[#123B50]">{stats ? fixed(stats.sigma) : '—'} <span className="text-[9px] font-normal">mm</span></p></article>
        <article className="border border-slate-200 bg-white p-3"><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500"><Gauge size={12}/> Índice de capacidade Cpk</p><p className="mt-1 text-lg font-semibold text-[#123B50]">{stats?.cpk === null || !stats ? '—' : fixed(stats.cpk, 3)}</p><p className="text-[9px] text-slate-500">{filtered.length} medições reais no recorte</p></article>
      </div>

      <section className="border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Carta de controle · valores individuais</h3><p className="text-[9px] text-slate-500">LST/LIT conforme limites cadastrados; linha central pela cota nominal.</p></div><div className="flex flex-wrap gap-3 text-[9px]"><span className="text-blue-700">● Medição</span><span className="text-slate-600">┄ Nominal</span><span className="text-rose-600">┄ LST / LIT</span></div></div>
        <div className="h-[280px] w-full">
          {loading ? <div className="grid h-full place-items-center text-[10px] text-slate-500">Carregando medições…</div> : chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 18, left: 6, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="sample" tick={{ fontSize: 9 }} label={{ value: 'AMOSTRA', position: 'insideBottom', offset: -2, fontSize: 9 }}/><YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} tickFormatter={(value: number) => Number(value).toFixed(3)}/><Tooltip content={<CustomTooltip stats={stats}/>} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}/><Line type="monotone" dataKey="measured" name="Medido" stroke="#2D8DB8" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }}/><ReferenceLine y={stats?.nominal} stroke="#64748b" strokeDasharray="4 3" label={{ value: 'NOMINAL', fontSize: 9, fill: '#64748b' }}/><ReferenceLine y={stats?.upper} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'LST', fontSize: 9, fill: '#dc2626' }}/><ReferenceLine y={stats?.lower} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'LIT', fontSize: 9, fill: '#dc2626' }}/></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center border border-dashed border-slate-200 text-center text-[10px] text-slate-500">Sem medições para os filtros selecionados.<br/>Registre uma medição para iniciar a carta.</div>}
        </div>
      </section>

      <section className="border border-slate-200 bg-white">
        <header className="h-10 border-b border-slate-200 px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Registrar medição</header>
        <form onSubmit={saveMeasurement} className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2"><span className={label}>Parâmetro *</span><input className={field} value={newParameter} onChange={event => setNewParameter(event.target.value)} placeholder={parameter || 'Ex.: Diâmetro externo'} maxLength={120}/></label>
          <label><span className={label}>Cota nominal *</span><input className={field} type="number" step="any" value={nominal} onChange={event => setNominal(event.target.value)} required/></label>
          <label><span className={label}>LST *</span><input className={field} type="number" step="any" value={upper} onChange={event => setUpper(event.target.value)} required/></label>
          <label><span className={label}>LIT *</span><input className={field} type="number" step="any" value={lower} onChange={event => setLower(event.target.value)} required/></label>
          <label><span className={label}>Valor medido *</span><input className={field} type="number" step="any" value={measured} onChange={event => setMeasured(event.target.value)} required/></label>
          <div className="flex items-end lg:col-span-6"><button disabled={busy || !productId} className={button + ' border-[#2D8DB8] bg-[#2D8DB8] text-white'}><Save size={13}/>{busy ? 'GRAVANDO…' : 'REGISTRAR MEDIÇÃO'}</button></div>
        </form>
      </section>

      {error && <p role="alert" className="border border-red-200 bg-red-50 p-2 text-[10px] text-red-700">{error}</p>}
      {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</p>}

      <section className="overflow-hidden border border-slate-200 bg-white">
        <header className="flex h-9 items-center justify-between border-b border-slate-200 px-3"><h3 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Histórico de medições</h3><span className="text-[9px] text-slate-500">{filtered.length} linhas</span></header>
        <div className="max-h-[360px] overflow-auto"><table className="w-full border-collapse text-left text-[10px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr>{['Amostra','Parâmetro','Medido (mm)','Nominal (mm)','LST (mm)','LIT (mm)','Data/hora'].map(item => <th key={item} className="h-8 border-b border-slate-200 px-2 font-bold">{item}</th>)}</tr></thead><tbody>{filtered.slice().reverse().map(row => <tr key={row.id} className="h-8 border-b border-slate-100 hover:bg-sky-50"><td className="px-2">{row.amostra_numero}</td><td className="px-2">{row.parametro}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.valor_medido))}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.nominal))}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.limite_superior))}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.limite_inferior))}</td><td className="px-2">{new Date(row.medido_em).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  </VendasLayout>
}
