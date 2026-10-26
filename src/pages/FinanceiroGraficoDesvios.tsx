// Atualizado · Padrão Premium · 26/10/2026 — Comparativo de custos industriais.
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, BarChart3, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type CostRow = { codigo_produto: string; custo_padrao_total: number; custo_real_total: number; data_apuracao: string }
type ChartRow = { produto: string; padrao: number; real: number; desvio: number }

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function FinanceiroGraficoDesvios() {
  const [rows, setRows] = useState<CostRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const result = await supabase
        .from('erp_financeiro_apuracao_custos')
        .select('codigo_produto,custo_padrao_total,custo_real_total,data_apuracao')
        .order('data_apuracao', { ascending: false })
        .limit(500)
      if (result.error) throw result.error
      setRows((result.data ?? []) as CostRow[])
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a apuração real de custos.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const data = useMemo<ChartRow[]>(() => rows.map(row => {
    const padrao = Number(row.custo_padrao_total) || 0
    const real = Number(row.custo_real_total) || 0
    return { produto: row.codigo_produto || 'Sem código', padrao, real, desvio: real - padrao }
  }), [rows])
  const summary = useMemo(() => data.reduce((result, row) => ({
    padrao: result.padrao + row.padrao,
    real: result.real + row.real,
    critical: result.critical + Number(row.padrao > 0 && row.real > row.padrao * 1.2),
  }), { padrao: 0, real: 0, critical: 0 }), [data])
  const difference = summary.real - summary.padrao

  return (
    <main className="cost-variance-page">
      <div className="cost-variance-content">
        <header className="cost-variance-hero">
          <div>
            <span>FINANCEIRO · CONTROLADORIA INDUSTRIAL</span>
            <h1>Custo Padrão × Custo Real Absorvido</h1>
            <p>Compare valores das apurações persistidas no banco. Ausência de apuração não é preenchida por estimativa.</p>
            <small>Atualizado · Padrão Premium · 26/10/2026</small>
          </div>
          <BarChart3 size={40} aria-hidden="true" />
        </header>

        <div className="cost-variance-actions" aria-label="Ações do comparativo de custos">
          <span>{rows.length} apurações encontradas</span>
          <div>
            <button type="button" className="variance-button variance-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir relatório</button>
            <button type="button" className="variance-button variance-primary" onClick={() => void load()} disabled={busy}>
              <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> {busy ? 'Atualizando…' : 'Atualizar dados'}
            </button>
          </div>
        </div>

        {error && <div role="alert" className="variance-alert variance-error">{error}</div>}
        {summary.critical > 0 && <div role="status" className="variance-alert variance-critical"><AlertTriangle size={17} /> {summary.critical} produto(s) com desvio superior a 20% da apuração padrão.</div>}

        <section className="variance-kpis" aria-label="Resumo da apuração">
          <article><span>Custo padrão total</span><strong>{currency(summary.padrao)}</strong></article>
          <article><span>Custo real absorvido</span><strong>{currency(summary.real)}</strong></article>
          <article className={difference > 0 ? 'variance-kpi-danger' : 'variance-kpi-positive'}><span>Diferença apurada</span><strong>{currency(difference)}</strong></article>
          <article><span>Desvios críticos</span><strong>{summary.critical}</strong></article>
        </section>

        <section className="variance-panel">
          <div className="variance-panel-heading">
            <div><h2>Comparativo por produto</h2><p>Custos padrão e real registrados em cada apuração.</p></div>
          </div>
          {rows.length === 0 && !busy ? (
            <div className="variance-empty">Nenhuma apuração de custo real disponível.</div>
          ) : (
            <div className="variance-chart" role="img" aria-label="Gráfico comparando custo padrão e custo real por produto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 16, left: 10, bottom: 20 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="produto" stroke="#64748b" tick={{ fill: '#52677f', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 54 : 32} />
                  <YAxis stroke="#64748b" tick={{ fill: '#52677f', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} />
                  <Tooltip formatter={(value) => currency(Number(value) || 0)} contentStyle={{ border: '1px solid #dbe3ed', borderRadius: 10, boxShadow: '0 8px 22px rgba(15,23,42,.12)', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#475569' }} />
                  <Bar dataKey="padrao" fill="#2563eb" name="Custo padrão" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="real" fill="#f97316" name="Custo real" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="variance-panel">
          <div className="variance-panel-heading"><div><h2>Detalhamento da apuração</h2><p>Diferença positiva indica custo real acima do padrão.</p></div></div>
          <div className="variance-table-wrap"><table className="variance-table"><thead><tr><th>Produto</th><th>Data da apuração</th><th className="numeric">Padrão</th><th className="numeric">Real</th><th className="numeric">Desvio</th><th>Situação</th></tr></thead>
            <tbody>{data.map((row, index) => {
              const critical = row.padrao > 0 && row.real > row.padrao * 1.2
              const source = rows[index]
              return <tr key={`${row.produto}-${source?.data_apuracao}-${index}`}>
                <td><strong>{row.produto}</strong></td>
                <td>{source?.data_apuracao ? new Date(source.data_apuracao).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="numeric">{currency(row.padrao)}</td><td className="numeric">{currency(row.real)}</td>
                <td className={`numeric ${row.desvio > 0 ? 'variance-number-danger' : 'variance-number-positive'}`}>{currency(row.desvio)}</td>
                <td><span className={critical ? 'variance-badge variance-badge-danger' : 'variance-badge variance-badge-neutral'}>{critical ? 'Crítico' : 'Dentro do limite'}</span></td>
              </tr>
            })}</tbody>
          </table></div>
          {!data.length && <div className="variance-empty">Os detalhes aparecerão quando houver apurações gravadas.</div>}
        </section>
      </div>
      <style>{`
        .cost-variance-page{min-height:100vh;background:#f3f6fb;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif}.cost-variance-content{width:min(100%,1560px);margin:0 auto;padding:18px 22px 32px;display:grid;gap:13px}.cost-variance-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:132px;overflow:hidden;padding:20px 26px;border-radius:16px;background:linear-gradient(112deg,#0b2545 0%,#123f72 58%,#1d5fd1 100%);color:#fff;box-shadow:0 10px 24px rgba(11,37,69,.15)}.cost-variance-hero:after{position:absolute;right:9%;top:-115px;width:270px;height:270px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 30px rgba(255,255,255,.04),0 0 0 62px rgba(255,255,255,.025);content:"";pointer-events:none}.cost-variance-hero>div,.cost-variance-hero>svg{position:relative;z-index:1}.cost-variance-hero div>span{color:#bfeef6;font-size:10px;font-weight:800;letter-spacing:.15em}.cost-variance-hero h1{margin:7px 0 5px;color:#fff;font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-.02em}.cost-variance-hero p{margin:0;color:#e1edf9;font-size:12px;line-height:1.5}.cost-variance-hero small{display:inline-flex;margin-top:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-size:10px;font-weight:700}.cost-variance-hero>svg{margin-right:20px;color:#dbeafe}.cost-variance-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px;padding:9px 12px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.045)}.cost-variance-actions>span{color:#64748b;font-size:11px;font-weight:650}.cost-variance-actions>div{display:flex;flex-wrap:wrap;gap:8px}.variance-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;min-height:36px;padding:0 13px;border:1px solid transparent;border-radius:8px;font-size:11px;font-weight:750;line-height:1;white-space:nowrap;cursor:pointer;transition:transform .14s,box-shadow .14s}.variance-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 3px 8px rgba(15,23,42,.13)}.variance-button:disabled{opacity:.5;cursor:not-allowed}.variance-primary{background:linear-gradient(180deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 3px 0 #173f91}.variance-secondary{border-color:#cbd5e1;background:linear-gradient(180deg,#fff,#f1f5f9);color:#173452;box-shadow:0 2px 0 #d6dee8}.variance-alert{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid;border-radius:9px;font-size:11px;font-weight:700}.variance-error{border-color:#fecaca;background:#fff1f2;color:#b42318}.variance-critical{border-color:#fdba74;background:#fff7ed;color:#c2410c}.variance-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.variance-kpis article{display:flex;min-width:0;min-height:82px;flex-direction:column;justify-content:center;padding:12px 15px;border:1px solid #dfe7f1;border-radius:11px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.variance-kpis span{color:#64748b;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.variance-kpis strong{margin-top:6px;color:#102c4e;font-size:19px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}.variance-kpis .variance-kpi-danger{border-color:#fecaca;background:#fff7f7}.variance-kpis .variance-kpi-danger strong{color:#b91c1c}.variance-kpis .variance-kpi-positive{border-color:#bbf7d0;background:#f0fdf4}.variance-kpis .variance-kpi-positive strong{color:#15803d}.variance-panel{min-width:0;padding:16px;border:1px solid #dfe7f1;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.045)}.variance-panel-heading{margin:0 0 12px;padding-bottom:11px;border-bottom:1px solid #e7edf5}.variance-panel-heading h2{margin:0;color:#173452;font-size:14px;font-weight:800}.variance-panel-heading p{margin:4px 0 0;color:#64748b;font-size:11px}.variance-chart{width:100%;height:360px}.variance-empty{padding:22px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;font-size:11px;text-align:center}.variance-table-wrap{overflow:auto}.variance-table{width:100%;min-width:760px;border-collapse:separate;border-spacing:0;text-align:left;font-size:11px}.variance-table th{padding:9px 10px;border-bottom:1px solid #dfe7f1;background:#f1f5f9;color:#475569;font-size:9px;font-weight:800;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}.variance-table td{padding:9px 10px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle}.variance-table tbody tr:nth-child(even){background:#f8fafc}.variance-table .numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.variance-table .variance-number-danger{color:#b91c1c;font-weight:800}.variance-table .variance-number-positive{color:#15803d;font-weight:700}.variance-badge{display:inline-flex;align-items:center;min-height:22px;padding:3px 7px;border:1px solid;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap}.variance-badge-danger{border-color:#fecaca;background:#fee2e2;color:#b91c1c}.variance-badge-neutral{border-color:#bbf7d0;background:#dcfce7;color:#166534}.cost-variance-page :focus-visible{outline:3px solid rgba(34,184,207,.65);outline-offset:2px}@media(max-width:720px){.cost-variance-content{padding:10px 10px 24px}.cost-variance-hero{min-height:0;padding:17px;border-radius:13px}.cost-variance-hero h1{font-size:20px}.cost-variance-hero>svg{width:29px;height:29px;margin:0}.cost-variance-actions{align-items:stretch;flex-direction:column}.cost-variance-actions>div{display:grid;grid-template-columns:1fr 1fr}.variance-button{padding:0 8px;font-size:10px}.variance-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.variance-kpis article{min-height:72px;padding:10px}.variance-kpis strong{font-size:16px}.variance-panel{padding:12px}.variance-chart{height:300px}}@media(max-width:460px){.cost-variance-hero>svg{display:none}.cost-variance-actions>div{grid-template-columns:1fr}}
        @media print{.cost-variance-page{background:#fff}.cost-variance-content{padding:0}.cost-variance-hero{background:#0b2545!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cost-variance-actions{display:none}.variance-panel,.variance-kpis article{box-shadow:none;break-inside:avoid}}
      `}</style>
    </main>
  )
}
