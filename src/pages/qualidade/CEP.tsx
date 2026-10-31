/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Gauge, RefreshCw, Save, Sigma } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabaseClient'

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

const field = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-medium text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const label = 'mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-neutral-500'
const button = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

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

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4"><div className="mx-auto grid w-full max-w-[1500px] gap-3">
      <header className="flex flex-wrap items-center gap-3 border border-slate-200 bg-white px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-[#2D8DB8]/30 bg-[#123B50] text-[#48B7C7]"><Activity size={18}/></span>
        <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2D8DB8]">SYSNQRA · SGQ / IT-QAL-CEP-004</p><h1 className="text-sm font-black text-[#123B50]">Controle Dimensional de Peças & CEP</h1><p className="text-[10px] text-slate-500">Medições reais, limites de especificação e capacidade do processo.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className={button}><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Sincronizar</button>
        <button type="button" onClick={() => window.print()} disabled={!filtered.length} className={button}><Activity size={13}/> Imprimir laudo A4</button>
      </header>
      <section className="border border-slate-200 bg-white">
        <header className="flex h-9 items-center gap-2 border-b border-slate-200 px-3"><Activity size={14} className="text-[#2D8DB8]"/><h2 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Característica monitorada</h2></header>
        <div className="grid grid-cols-12 gap-2 p-3">
          <label className="col-span-12 min-w-0 md:col-span-7"><span className={label}>Produto</span><select className={field} value={productId} onChange={event => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.map(product => <option key={product.id} value={product.id}>{product.codigo} · {product.descricao_tecnica}</option>)}</select></label>
          <label className="col-span-12 min-w-0 md:col-span-5"><span className={label}>Característica / parâmetro</span><select className={field} value={parameter} onChange={event => setParameter(event.target.value)}><option value="">Todos os parâmetros</option>{parameters.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
        <form onSubmit={saveMeasurement} className="grid grid-cols-12 gap-2 p-3">
          <label className="col-span-12 min-w-0 md:col-span-6 xl:col-span-4"><span className={label}>Parâmetro *</span><input className={field} value={newParameter} onChange={event => setNewParameter(event.target.value)} placeholder={parameter || 'Ex.: Diâmetro externo'} maxLength={120}/></label>
          <label className="col-span-6 min-w-0 md:col-span-3 xl:col-span-2"><span className={label}>Cota nominal *</span><input className={field} type="number" step="any" value={nominal} onChange={event => setNominal(event.target.value)} required/></label>
          <label className="col-span-6 min-w-0 md:col-span-3 xl:col-span-2"><span className={label}>LST *</span><input className={field} type="number" step="any" value={upper} onChange={event => setUpper(event.target.value)} required/></label>
          <label className="col-span-6 min-w-0 md:col-span-3 xl:col-span-2"><span className={label}>LIT *</span><input className={field} type="number" step="any" value={lower} onChange={event => setLower(event.target.value)} required/></label>
          <label className="col-span-6 min-w-0 md:col-span-3 xl:col-span-2"><span className={label}>Valor medido *</span><input className={field} type="number" step="any" value={measured} onChange={event => setMeasured(event.target.value)} required/></label>
          <div className="col-span-12 flex items-end"><button disabled={busy || !productId} className={button + ' border-[#2D8DB8] bg-[#2D8DB8] text-white'}><Save size={13}/>{busy ? 'GRAVANDO…' : 'REGISTRAR MEDIÇÃO'}</button></div>
        </form>
      </section>

      {error && <p role="alert" className="border border-red-200 bg-red-50 p-2 text-[10px] text-red-700">{error}</p>}
      {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</p>}

      <section className="overflow-hidden border border-slate-200 bg-white">
        <header className="flex h-9 items-center justify-between border-b border-slate-200 px-3"><h3 className="text-[10px] font-bold uppercase tracking-wider text-[#123B50]">Histórico de medições</h3><span className="text-[9px] text-slate-500">{filtered.length} linhas</span></header>
        <div className="max-h-[360px] overflow-auto"><table className="w-full border-collapse text-left text-[10px]"><thead className="sticky top-0 bg-slate-50 text-[9px] uppercase text-slate-500"><tr>{['Amostra','Parâmetro','Medido (mm)','Nominal (mm)','LST (mm)','LIT (mm)','Data/hora'].map(item => <th key={item} className="h-8 border-b border-slate-200 px-2 font-bold">{item}</th>)}</tr></thead><tbody>{filtered.slice().reverse().map(row => <tr key={row.id} className="h-8 border-b border-slate-100 hover:bg-sky-50"><td className="px-2">{row.amostra_numero}</td><td className="px-2">{row.parametro}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.valor_medido))}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.nominal))}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.limite_superior))}</td><td className="px-2 text-right tabular-nums">{fixed(Number(row.limite_inferior))}</td><td className="px-2">{new Date(row.medido_em).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div>
      </section>

      <section className="cep-print-sheet">
        <header className="cep-print-header"><div><h1>SYSNQRA SISTEMAS INDUSTRIAIS</h1><p>SGQ · CERTIFICADO DE CONTROLE ESTATÍSTICO DE PROCESSO (CEP)</p></div><div className="cep-print-meta"><strong>IT-QAL-CEP-004</strong><br/>Emitido em: {new Date().toLocaleString('pt-BR')}</div></header>
        <div className="cep-print-summary">
          <p><strong>Produto:</strong> {products.find(item => item.id === productId)?.codigo ?? '—'} — {products.find(item => item.id === productId)?.descricao_tecnica ?? ''}</p>
          <p><strong>Característica:</strong> {parameter || 'Todos os parâmetros'}</p>
          <p><strong>Nominal:</strong> {stats ? fixed(stats.nominal) : '—'} mm · <strong>LST:</strong> {stats ? fixed(stats.upper) : '—'} mm · <strong>LIT:</strong> {stats ? fixed(stats.lower) : '—'} mm</p>
          <p><strong>Média:</strong> {stats ? fixed(stats.mean) : '—'} mm · <strong>Desvio padrão:</strong> {stats ? fixed(stats.sigma) : '—'} mm · <strong>Cpk:</strong> {stats?.cpk == null ? 'Não calculável' : fixed(stats.cpk, 3)}</p>
        </div>
        <table className="cep-print-table"><thead><tr><th>Amostra</th><th>Característica</th><th>Valor medido</th><th>Nominal</th><th>LST</th><th>LIT</th><th>Data/hora</th></tr></thead>
          <tbody>{filtered.map(row => <tr key={row.id}><td>{row.amostra_numero}</td><td>{row.parametro}</td><td>{fixed(Number(row.valor_medido))}</td><td>{fixed(Number(row.nominal))}</td><td>{fixed(Number(row.limite_superior))}</td><td>{fixed(Number(row.limite_inferior))}</td><td>{new Date(row.medido_em).toLocaleString('pt-BR')}</td></tr>)}</tbody>
        </table>
        <p className="cep-print-note">Este laudo reproduz as medições persistidas no sistema para o filtro selecionado. A liberação formal do lote deve respeitar o plano de controle e as regras de qualidade aplicáveis.</p>
        <div className="cep-print-signatures"><div>Inspetor responsável</div><div>Garantia da Qualidade / SGQ</div></div>
      </section>
      <style>{'.cep-print-sheet{display:none}@media print{@page{size:A4 landscape;margin:10mm}body *{visibility:hidden!important}.cep-print-sheet,.cep-print-sheet *{visibility:visible!important}.cep-print-sheet{display:block!important;position:absolute!important;inset:0 auto auto 0;width:100%;background:#fff!important;color:#111827!important;font:9pt Arial,sans-serif!important}.cep-print-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #123B50;padding-bottom:8px}.cep-print-header h1{margin:0;font-size:15pt;font-weight:700}.cep-print-header p{margin:3px 0 0;font-size:8pt;color:#475569}.cep-print-meta{text-align:right;font-size:8pt}.cep-print-summary{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;margin:14px 0}.cep-print-summary p{margin:0}.cep-print-table{width:100%;border-collapse:collapse;font-size:7.5pt}.cep-print-table th,.cep-print-table td{border:1px solid #94a3b8;padding:5px;text-align:left}.cep-print-table th{background:#eaf2f6!important;color:#123B50}.cep-print-note{margin-top:12px;font-size:8pt}.cep-print-signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:42px;text-align:center}.cep-print-signatures div{border-top:1px solid #111827;padding-top:5px}}'}</style>
    </div></main>
}
