/** Atualizado: padrão visual premium SYSNQRA · 26/10/2026 · Metrologia e Paquímetro Digital. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, FileText, Gauge, RefreshCw, Ruler, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import DigitalCaliper from '../components/DigitalCaliper'
import '../styles/quality-metrology-premium.css'

type InstrumentOption = { codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Tab = 'metro' | 'docs'

const isBlocked = (item: InstrumentOption, today: string) =>
  item.status.trim().toUpperCase() !== 'APROVADO' ||
  !item.proxima_calibracao || item.proxima_calibracao < today

const localISODate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const fmtDate = (value: string | null) => {
  if (!value) return 'Sem data'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

export default function QualidadePaquimetroDigital() {
  const navigate = useNavigate()
  const [instruments, setInstruments] = useState<InstrumentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('metro')
  const [tag, setTag] = useState('')

  const loadInstruments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const sessionResult = await supabase.auth.getSession()
      if (sessionResult.error) throw sessionResult.error
      if (!sessionResult.data.session) throw new Error('É necessário entrar no ERP para consultar os instrumentos da empresa.')
      const companyResult = await supabase.rpc('erp_current_empresa_id')
      if (companyResult.error) throw companyResult.error
      const empresaId = companyResult.data
      if (!empresaId) throw new Error('A sessão não possui empresa ativa. Selecione uma empresa antes de continuar.')
      const result = await supabase.from('erp_equipamentos_medicao')
        .select('codigo,descricao,status,proxima_calibracao')
        .eq('empresa_id', empresaId)
        .order('codigo')
      if (result.error) throw result.error
      setInstruments((result.data ?? []).map(item => ({
        codigo: item.codigo,
        descricao: item.descricao,
        status: item.status,
        proxima_calibracao: item.proxima_calibracao,
      })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os instrumentos cadastrados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadInstruments() }, [loadInstruments])

  const today = localISODate()
  const rows = useMemo(() => instruments.map(item => ({
    ...item,
    blocked: isBlocked(item, today),
    days: item.proxima_calibracao
      ? Math.ceil((new Date(`${item.proxima_calibracao}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
      : null,
  })), [instruments, today])
  const blocked = rows.filter(item => item.blocked).length
  const calibrating = instruments.filter(item => /CALIBRAÇÃO|CALIBRACAO/i.test(item.status)).length
  const dueSoon = rows.filter(item => !item.blocked && item.days !== null && item.days >= 0 && item.days <= 15).length
  const released = rows.filter(item => !item.blocked).length
  const selected = rows.find(item => item.codigo.toUpperCase() === tag.trim().toUpperCase())

  const panel = 'rounded-xl border border-slate-200 bg-white shadow-sm'
  const muted = '#64748b'
  const accent = '#1d4ed8'

  return (
    <main className="quality-metrology-page min-h-screen bg-slate-50 p-3 text-slate-900 md:p-6">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className={`${panel} quality-metrology-hero relative flex flex-col items-center justify-between gap-5 overflow-hidden border-0 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-5 text-white shadow-lg md:flex-row md:p-6`}>
          <div>
            <p className="font-mono text-[11px] tracking-[.3em] text-blue-200">SYSNQRA · ERP INDUSTRIAL</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-4xl">Qualidade &amp; Metrologia</h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100">Rastreabilidade ISO 9001 / IATF 16949, controle de calibração e bloqueio de instrumentos vencidos.</p>
            <span className="quality-metrology-stamp mt-4 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-blue-50">Atualizado · Padrão Premium · 26/10/2026</span>
          </div>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 420 130" role="img" aria-label="Ilustração de paquímetro digital" className="h-auto w-full max-w-[340px]">
              <defs>
                <linearGradient id="sysnqra-header-steel" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#dce2e9"/><stop offset="1" stopColor="#687483"/></linearGradient>
                <linearGradient id="sysnqra-header-body" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#353d49"/><stop offset="1" stopColor="#171b22"/></linearGradient>
              </defs>
              <path d="M20 30 h22 v80 l-10 14 h-12 z M20 30 h22 v-18 l-8 -8 h-14 z" fill="url(#sysnqra-header-steel)"/>
              <rect x="20" y="30" width="390" height="26" rx="2" fill="url(#sysnqra-header-steel)"/>
              {Array.from({ length: 61 }, (_, i) => <g key={i}><line x1={48 + i * 5.9} x2={48 + i * 5.9} y1="30" y2={i % 10 === 0 ? 42 : i % 5 === 0 ? 38 : 35} stroke="#171b22" strokeWidth=".8"/>{i % 10 === 0 && <text x={48 + i * 5.9} y="51" fontSize="6" textAnchor="middle" fill="#171b22" fontFamily="monospace">{i / 10 * 25}</text>}</g>)}
              <g transform="translate(72 0)">
                <path d="M44 56 h18 v54 l-10 14 h-8 z M44 30 v-18 l6 -8 h12 v26 z" fill="url(#sysnqra-header-steel)"/>
                <rect x="44" y="22" width="130" height="62" rx="8" fill="url(#sysnqra-header-body)" stroke="#353b46"/>
                <rect x="56" y="30" width="96" height="30" rx="3" fill="#b9d8a8"/>
                <text x="104" y="52" fontSize="19" textAnchor="middle" fill="#263d2b" fontFamily="monospace" fontWeight="700">00.00</text>
                <text x="60" y="37" fontSize="5" fill="#263d2b" fontFamily="monospace">mm</text>
                <circle cx="70" cy="72" r="5" fill="#f4c66a"/><circle cx="90" cy="72" r="5" fill="#9aa3b2"/>
                <text x="122" y="75" fontSize="6" textAnchor="middle" fill="#9aa3b2" fontFamily="sans-serif" letterSpacing="1">SYSNQRA</text>
              </g>
            </svg>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Vencidos / bloqueados', value: blocked, color: '#dc2626', icon: <AlertTriangle size={15}/> },
            { label: 'Em calibração', value: calibrating, color: '#2563eb', icon: <Gauge size={15}/> },
            { label: 'Vencem em 15 dias', value: dueSoon, color: '#d97706', icon: <Ruler size={15}/> },
            { label: 'Liberados', value: released, color: '#15803d', icon: <ShieldCheck size={15}/> },
          ].map(kpi => <div key={kpi.label} className={`${panel} flex min-h-[112px] items-center justify-between p-4`}><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.icon}{kpi.label}</p><p className="mt-2 font-mono text-3xl font-extrabold text-slate-900" style={{ color: kpi.color }}>{loading ? '—' : String(kpi.value).padStart(2, '0')}</p></div><span className="grid size-10 place-items-center rounded-xl bg-slate-100" style={{ color: kpi.color, backgroundColor: `${kpi.color}14` }}>{kpi.icon}</span></div>)}
        </section>

        <nav className="flex w-full gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm md:w-fit" role="tablist" aria-label="Seções de qualidade">
          <button type="button" role="tab" aria-selected={tab === 'metro'} onClick={() => setTab('metro')} className="rounded-lg px-4 py-2.5 text-xs font-bold transition-colors" style={tab === 'metro' ? { background: '#0f172a', color: '#fff' } : { color: muted }}>Metrologia &amp; Calibração</button>
          <button type="button" role="tab" aria-selected={tab === 'docs'} onClick={() => setTab('docs')} className="rounded-lg px-4 py-2.5 text-xs font-bold transition-colors" style={tab === 'docs' ? { background: '#0f172a', color: '#fff' } : { color: muted }}>Documentos da Qualidade</button>
        </nav>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{error}</div>}
        {tab === 'metro' ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className={`${panel} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="text-sm font-extrabold text-slate-900">Cadastro de instrumentos e calibração</h2><p className="mt-1 text-xs text-slate-500">Instrumentos cadastrados para a empresa ativa</p></div><button type="button" onClick={() => void loadInstruments()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"><RefreshCw size={13}/>{loading ? 'Consultando…' : 'Atualizar'}</button></div>
              <div className="overflow-x-auto">
              <table className="quality-metrology-table w-full min-w-[640px] whitespace-nowrap text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500"><tr>{['TAG / Código', 'Instrumento', 'Próxima calibração', 'Situação'].map(name => <th key={name} className="px-4 py-3 font-bold">{name}</th>)}</tr></thead>
                <tbody>
                  {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">Nenhum instrumento cadastrado para a empresa autenticada. Cadastre em Qualidade → Instrumentos.</td></tr>}
                  {rows.map(item => <tr key={item.codigo} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50" style={item.blocked ? { background: '#fef2f2' } : undefined}>
                    <td className="px-4 py-3 font-mono font-bold text-blue-800">{item.codigo}</td><td className="px-4 py-3 font-medium text-slate-800">{item.descricao}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{fmtDate(item.proxima_calibracao)}{item.days !== null && <span className={`ml-2 font-bold ${item.days < 0 ? 'text-red-700' : item.days <= 15 ? 'text-amber-700' : 'text-slate-500'}`}>{item.days < 0 ? `${Math.abs(item.days)}d atraso` : `${item.days}d`}</span>}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${item.blocked ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{item.blocked ? 'BLOQUEADO' : item.status.toUpperCase()}</span></td>
                  </tr>)}
                </tbody>
              </table>
              </div>
            </section>
            <aside className={`${panel} p-5`}>
              <h2 className="text-base font-extrabold text-slate-900">Trava de chão de fábrica</h2><p className="mt-1 text-xs leading-5 text-slate-500">Digite a TAG de um instrumento cadastrado para validar a situação.</p>
              <input value={tag} onChange={event => setTag(event.target.value)} placeholder="Ex.: PAQ-002" className="erp-premium-input mt-4 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
              {tag.trim() && !selected && <p className="mt-3 text-sm text-slate-500">Instrumento não encontrado nesta empresa.</p>}
              {selected && (selected.blocked ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-bold">● Operação bloqueada</p><p className="mt-1">Instrumento com status impeditivo ou calibração vencida/sem data válida.</p></div> : <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="mr-1 inline"/>{selected.descricao} — confira a situação cadastral antes do uso.</div>)}
              <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Instrumentos disponíveis</p><div className="mt-2 flex flex-wrap gap-1.5">{rows.filter(item => !item.blocked).map(item => <button type="button" key={item.codigo} onClick={() => setTag(item.codigo)} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-xs font-bold text-blue-800 transition hover:border-blue-400 hover:bg-blue-100">{item.codigo}</button>)}</div></div>
            </aside>
          </div>
        ) : (
          <section className={`${panel} p-5`}>
            <div className="flex items-center gap-2"><FileText size={18} style={{ color: accent }}/><h2 className="font-semibold">Documentos da Qualidade</h2></div>
            <p className="mt-2 text-sm text-slate-500">A documentação oficial já fica centralizada no GED do ERP. Abra o módulo para consultar arquivos, revisões e permissões da empresa.</p>
            <button type="button" onClick={() => navigate('/qualidade/ged-documentos')} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-px hover:bg-blue-800">Abrir GED de Qualidade <ArrowUpRight size={14}/></button>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2"><Ruler size={16} style={{ color: accent }}/><h2 className="text-sm font-extrabold text-slate-900">Registro de medição dimensional</h2></div>
          <DigitalCaliper instrumentOptions={instruments} />
        </section>
        <p className="text-[10px]" style={{ color: muted }}>A régua deslizante da interface é demonstrativa, não é uma leitura física USB/Bluetooth. As medições registradas são gravadas no ERP e devem ser identificadas como entrada manual/simulada.</p>
      </div>
    </main>
  )
}

