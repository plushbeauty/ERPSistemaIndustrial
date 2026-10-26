/** REVISÃO: PAQUIMETRO-APLICACAO-2026-10-26-R2 | Layout baseado no arquivo tela-paquimetro.html/tela-paquimetro-codigo.md; dados reais por empresa; sem alterar estilos globais. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Gauge, RefreshCw, Ruler, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import DigitalCaliper from '../components/DigitalCaliper'

type InstrumentOption = { codigo: string; descricao: string; status: string; proxima_calibracao: string | null }
type Tab = 'metro' | 'docs'

const isBlocked = (item: InstrumentOption, today: string) =>
  /BLOQUEADO|VENCIDO|INATIVO|REPROVADO|OBSOLETO|RESTRIÇÃO/i.test(item.status) ||
  !item.proxima_calibracao || item.proxima_calibracao < today

const fmtDate = (value: string | null) => {
  if (!value) return 'Sem data'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

export default function QualidadePaquimetroDigital() {
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

  const today = new Date().toISOString().slice(0, 10)
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
  const released = rows.filter(item => !item.blocked && /LIBERADO|APROVADO|ATIVO/i.test(item.status)).length
  const selected = rows.find(item => item.codigo.toUpperCase() === tag.trim().toUpperCase())

  const pageStyle = { backgroundColor: '#171b22', backgroundImage: 'linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)', backgroundSize: '32px 32px', color: '#edf0f4', fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif' }
  const panel = 'border border-[#353b46] rounded-lg bg-[#20252e] shadow-[0_1px_0_#ffffff0d_inset,0_20px_40px_-20px_#0009]'
  const muted = '#9aa3b2'
  const accent = '#f4c66a'

  return (
    <main className="min-h-screen p-3 md:p-6" style={pageStyle}>
      <div className="mx-auto max-w-[1280px] space-y-5">
        <header className={`${panel} flex flex-col items-center justify-between gap-5 overflow-hidden p-5 md:flex-row md:p-6`}>
          <div>
            <p className="font-mono text-[11px] tracking-[.3em]" style={{ color: accent }}>SYSNQRA · ERP INDUSTRIAL</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">Qualidade &amp; Metrologia</h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: muted }}>Rastreabilidade ISO 9001 / IATF 16949, controle de calibração e bloqueio de instrumentos vencidos.</p>
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

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Vencidos / bloqueados', value: blocked, color: '#ff737d', icon: <AlertTriangle size={14}/> },
            { label: 'Em calibração', value: calibrating, color: '#79c7f2', icon: <Gauge size={14}/> },
            { label: 'Vencem em 15 dias', value: dueSoon, color: accent, icon: <Ruler size={14}/> },
            { label: 'Liberados', value: released, color: '#78d6a3', icon: <ShieldCheck size={14}/> },
          ].map(kpi => <div key={kpi.label} className={`${panel} p-4`}><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{kpi.icon}{kpi.label}</p><p className="mt-2 font-mono text-3xl font-bold" style={{ color: kpi.color }}>{loading ? '—' : String(kpi.value).padStart(2, '0')}</p></div>)}
        </section>

        <nav className="flex w-full gap-1 rounded-lg border border-[#353b46] bg-[#20252e] p-1 md:w-fit" role="tablist" aria-label="Seções de qualidade">
          <button type="button" role="tab" aria-selected={tab === 'metro'} onClick={() => setTab('metro')} className="rounded-md px-4 py-2 text-sm font-medium transition-colors" style={tab === 'metro' ? { background: accent, color: '#252016' } : { color: muted }}>Metrologia &amp; Calibração</button>
          <button type="button" role="tab" aria-selected={tab === 'docs'} onClick={() => setTab('docs')} className="rounded-md px-4 py-2 text-sm font-medium transition-colors" style={tab === 'docs' ? { background: accent, color: '#252016' } : { color: muted }}>Documentos da Qualidade</button>
        </nav>

        {error && <div role="alert" className="flex items-start gap-2 rounded border border-rose-500/50 bg-rose-950/40 p-3 text-sm text-rose-200"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{error}</div>}
        {tab === 'metro' ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className={`${panel} overflow-x-auto`}>
              <div className="flex items-center justify-between border-b border-[#353b46] p-4"><h2 className="text-sm font-semibold">Cadastro de instrumentos e calibração</h2><button type="button" onClick={() => void loadInstruments()} disabled={loading} className="inline-flex h-8 items-center gap-2 rounded border border-[#454d5b] px-3 text-xs font-semibold disabled:opacity-50"><RefreshCw size={13}/>{loading ? 'Consultando…' : 'Atualizar'}</button></div>
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="border-b border-[#353b46] text-left text-[10px] uppercase tracking-wider" style={{ color: muted }}><tr>{['TAG / Código', 'Instrumento', 'Próxima calibração', 'Situação'].map(name => <th key={name} className="px-4 py-3 font-medium">{name}</th>)}</tr></thead>
                <tbody>
                  {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: muted }}>Nenhum instrumento cadastrado para a empresa autenticada. Cadastre em Qualidade → Instrumentos.</td></tr>}
                  {rows.map(item => <tr key={item.codigo} className="border-b border-[#353b46] last:border-0 hover:bg-[#ffffff08]" style={item.blocked ? { background: '#ff737d0a' } : undefined}>
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: accent }}>{item.codigo}</td><td className="px-4 py-3">{item.descricao}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: muted }}>{fmtDate(item.proxima_calibracao)}{item.days !== null && <span className="ml-2" style={{ color: item.days < 0 ? '#ff737d' : item.days <= 15 ? accent : muted }}>{item.days < 0 ? `${Math.abs(item.days)}d atraso` : `${item.days}d`}</span>}</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded border px-2 py-1 font-mono text-[10px] font-semibold" style={item.blocked ? { color: '#ff858d', borderColor: '#a9444c', background: '#a9444c22' } : { color: '#78d6a3', borderColor: '#397a5a', background: '#397a5a22' }}>{item.blocked ? 'BLOQUEADO' : item.status.toUpperCase()}</span></td>
                  </tr>)}
                </tbody>
              </table>
            </section>
            <aside className={`${panel} p-5`}>
              <h2 className="text-base font-semibold">Trava de chão de fábrica</h2><p className="mt-1 text-xs" style={{ color: muted }}>Digite a TAG de um instrumento cadastrado para validar a situação.</p>
              <input value={tag} onChange={event => setTag(event.target.value)} placeholder="Ex.: PAQ-002" className="mt-4 h-9 w-full rounded border border-[#454d5b] bg-[#171b22] px-3 font-mono text-sm uppercase outline-none focus:border-[#f4c66a]" />
              {tag.trim() && !selected && <p className="mt-3 text-sm" style={{ color: muted }}>Instrumento não encontrado nesta empresa.</p>}
              {selected && (selected.blocked ? <div className="mt-3 rounded border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200"><p className="font-bold">● Operação bloqueada</p><p className="mt-1">Instrumento com status impeditivo ou calibração vencida/sem data válida.</p></div> : <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-950/20 p-3 text-sm text-emerald-200"><CheckCircle2 size={14} className="mr-1 inline"/>{selected.descricao} — confira a situação cadastral antes do uso.</div>)}
              <div className="mt-5 border-t border-[#353b46] pt-4"><p className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>Instrumentos disponíveis</p><div className="mt-2 flex flex-wrap gap-1.5">{rows.filter(item => !item.blocked).map(item => <button type="button" key={item.codigo} onClick={() => setTag(item.codigo)} className="rounded border border-[#454d5b] px-2 py-1 font-mono text-xs hover:border-[#f4c66a]" >{item.codigo}</button>)}</div></div>
            </aside>
          </div>
        ) : (
          <section className={`${panel} p-5`}>
            <div className="flex items-center gap-2"><FileText size={18} style={{ color: accent }}/><h2 className="font-semibold">Documentos da Qualidade</h2></div>
            <p className="mt-2 text-sm" style={{ color: muted }}>Esta aba não apresenta documentos fictícios. Para listar e travar revisões aqui, é necessário conectar ao repositório documental real do ERP (GED), respeitando empresa, permissões e bloqueios de edição.</p>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2"><Ruler size={16} style={{ color: accent }}/><h2 className="text-sm font-semibold">Registro de medição dimensional</h2></div>
          <DigitalCaliper instrumentOptions={instruments} />
        </section>
        <p className="text-[10px]" style={{ color: muted }}>A régua deslizante da interface é demonstrativa, não é uma leitura física USB/Bluetooth. As medições registradas são gravadas no ERP e devem ser identificadas como entrada manual/simulada.</p>
      </div>
    </main>
  )
}
