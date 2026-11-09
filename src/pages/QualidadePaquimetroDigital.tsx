/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-PAQUIMETRO-TENANT-REVALIDADO-20261109-01 — revisão do proprietário: tabela erp_equipamentos_medicao existente, filtro empresa_id e política RLS confirmados; banco sem instrumentos cadastrados, sem dados demonstrativos.
 * @STATUS_APROVACAO: CÓDIGO REVISADO; CADASTRO REAL POR EMPRESA, AGUARDANDO DADOS OPERACIONAIS.
 * @REVISAO: REV-METRO-INSTRUMENTOS-20261102-01 — controle de equipamentos de medição ISO 9001 na página do paquímetro
 * @STATUS_APROVACAO: CADASTRO REAL POR EMPRESA; MEDIÇÃO DEMONSTRATIVA REMOVIDA DESTA TELA
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Ban, CalendarClock, CheckCircle2, Gauge, Plus, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/quality-metrology-premium.css'

type Instrument = {
  id: string
  empresa_id: string
  codigo: string
  descricao: string
  fabricante: string | null
  equipamento: string | null
  numero_serie: string | null
  faixa_medicao: string | null
  resolucao: string | null
  setor: string | null
  responsavel: string | null
  status: string
  ultima_calibracao: string | null
  proxima_calibracao: string | null
}

type InstrumentDraft = {
  id: string
  codigo: string
  descricao: string
  fabricante: string
  equipamento: string
  numero_serie: string
  faixa_medicao: string
  resolucao: string
  setor: string
  responsavel: string
  status: string
  ultima_calibracao: string
  proxima_calibracao: string
}

const emptyDraft: InstrumentDraft = {
  id: '', codigo: '', descricao: '', fabricante: '', equipamento: '', numero_serie: '',
  faixa_medicao: '', resolucao: '', setor: '', responsavel: '', status: 'BLOQUEADO',
  ultima_calibracao: '', proxima_calibracao: '',
}
const selectFields = 'id,empresa_id,codigo,descricao,fabricante,equipamento,numero_serie,faixa_medicao,resolucao,setor,responsavel,status,ultima_calibracao,proxima_calibracao'
const inputClass = 'mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-100'
const labelClass = 'block min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-500'
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50'

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function todayPlusDays(today: string, days: number) {
  const [year, month, day] = today.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function dateLabel(value: string | null) {
  if (!value) return 'Não informada'
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : '—'
}
function effectiveStatus(item: Instrument, today: string) {
  if (['BLOQUEADO', 'INATIVO', 'REPROVADO'].includes(item.status.toUpperCase())) return 'BLOQUEADO'
  if (!item.proxima_calibracao) return 'SEM PRAZO'
  if (item.proxima_calibracao.slice(0, 10) < today) return 'VENCIDO'
  if (item.proxima_calibracao.slice(0, 10) <= todayPlusDays(today, 30)) return 'ATENÇÃO'
  return 'CALIBRADO'
}

export default function QualidadePaquimetroDigital() {
  const navigate = useNavigate()
  const [form, setForm] = useState<InstrumentDraft>(emptyDraft)
  const [items, setItems] = useState<Instrument[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const today = localToday()

  const currentCompanyId = useCallback(async (): Promise<string> => {
    const result = await supabase.rpc('erp_current_empresa_id')
    if (result.error) throw result.error
    if (!result.data) throw new Error('Empresa da sessão não identificada. Entre novamente ou solicite acesso ao administrador.')
    return String(result.data)
  }, [])

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const empresaId = await currentCompanyId()
      const result = await supabase.from('erp_equipamentos_medicao').select(selectFields)
        .eq('empresa_id', empresaId).order('codigo')
      if (result.error) throw result.error
      setItems((result.data ?? []) as Instrument[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar os equipamentos de medição.')
    } finally {
      setBusy(false)
    }
  }, [currentCompanyId])

  useEffect(() => { void load() }, [load])

  function edit(item: Instrument) {
    setForm({
      id: item.id, codigo: item.codigo, descricao: item.descricao, fabricante: item.fabricante ?? '',
      equipamento: item.equipamento ?? '', numero_serie: item.numero_serie ?? '', faixa_medicao: item.faixa_medicao ?? '',
      resolucao: item.resolucao ?? '', setor: item.setor ?? '', responsavel: item.responsavel ?? '',
      status: item.status, ultima_calibracao: item.ultima_calibracao?.slice(0, 10) ?? '',
      proxima_calibracao: item.proxima_calibracao?.slice(0, 10) ?? '',
    })
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function newInstrument() {
    setForm(emptyDraft)
    setNotice('')
    setError('')
  }
  async function save() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const empresaId = await currentCompanyId()
      if (!form.codigo.trim() || !form.descricao.trim()) throw new Error('Preencha os campos obrigatórios: Código e Descrição.')
      if (form.ultima_calibracao && form.proxima_calibracao && form.proxima_calibracao < form.ultima_calibracao) {
        throw new Error('A próxima calibração não pode anteceder a última calibração.')
      }
      const payload = {
        empresa_id: empresaId, codigo: form.codigo.trim().toUpperCase(), descricao: form.descricao.trim(),
        fabricante: form.fabricante.trim() || null, equipamento: form.equipamento.trim() || null,
        numero_serie: form.numero_serie.trim() || null, faixa_medicao: form.faixa_medicao.trim() || null,
        resolucao: form.resolucao.trim() || null, setor: form.setor.trim() || null,
        responsavel: form.responsavel.trim() || null, status: form.status,
        ultima_calibracao: form.ultima_calibracao || null, proxima_calibracao: form.proxima_calibracao || null,
      }
      const result = form.id
        ? await supabase.from('erp_equipamentos_medicao').update(payload).eq('id', form.id).eq('empresa_id', empresaId).select('id').single()
        : await supabase.from('erp_equipamentos_medicao').insert(payload).select('id').single()
      if (result.error) throw result.error
      const editing = Boolean(form.id)
      setForm(emptyDraft)
      setNotice(editing ? 'Equipamento atualizado.' : 'Equipamento cadastrado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o equipamento.')
    } finally {
      setBusy(false)
    }
  }
  async function blockInstrument() {
    if (!form.id || !window.confirm('Bloquear este equipamento? O registro e o histórico serão preservados.')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const empresaId = await currentCompanyId()
      const result = await supabase.from('erp_equipamentos_medicao').update({ status: 'BLOQUEADO' })
        .eq('id', form.id).eq('empresa_id', empresaId).select('id').single()
      if (result.error) throw result.error
      setForm(emptyDraft)
      setNotice('Equipamento bloqueado; o registro foi preservado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível bloquear o equipamento.')
    } finally {
      setBusy(false)
    }
  }

  const processed = useMemo(() => items.map(item => ({ ...item, statusEfetivo: effectiveStatus(item, today) })), [items, today])
  const filtered = processed.filter(item => {
    const matchesQuery = [item.codigo, item.descricao, item.fabricante, item.equipamento, item.numero_serie, item.setor, item.responsavel]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
    return matchesQuery && (statusFilter === 'TODOS' || item.statusEfetivo === statusFilter)
  })
  const calibrated = processed.filter(item => item.statusEfetivo === 'CALIBRADO').length
  const attention = processed.filter(item => item.statusEfetivo === 'ATENÇÃO' || item.statusEfetivo === 'SEM PRAZO').length
  const blocked = processed.filter(item => item.statusEfetivo === 'VENCIDO' || item.statusEfetivo === 'BLOQUEADO').length
  const fields: Array<{ key: Exclude<keyof InstrumentDraft, 'id' | 'status' | 'ultima_calibracao' | 'proxima_calibracao'>; label: string; required?: boolean }> = [
    { key: 'codigo', label: 'Código / TAG', required: true }, { key: 'descricao', label: 'Equipamento de medição', required: true },
    { key: 'fabricante', label: 'Fabricante' }, { key: 'equipamento', label: 'Modelo / tipo' },
    { key: 'numero_serie', label: 'Nº de série' }, { key: 'faixa_medicao', label: 'Faixa de medição' },
    { key: 'resolucao', label: 'Resolução' }, { key: 'setor', label: 'Setor' }, { key: 'responsavel', label: 'Responsável' },
  ]

  return (
    <main className="quality-metrology-page min-h-screen bg-slate-50 p-3 text-slate-900 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="quality-metrology-hero relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-5 text-white shadow-lg md:flex-row md:p-6">
          <div>
            <p className="font-mono text-[11px] tracking-[.3em] text-blue-200">SYSNQRA · ERP INDUSTRIAL</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-4xl">Controle de Equipamentos de Medição</h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100">Cadastro, identificação, valores técnicos, validade da calibração e bloqueio operacional conforme os requisitos da ISO 9001.</p>
            <button type="button" onClick={() => navigate('/qualidade/calibracao')} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20">Registrar calibração e certificado <ArrowUpRight size={14}/></button>
          </div>
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
        </header>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Equipamentos cadastrados', value: items.length, color: '#1d4ed8', icon: <Gauge size={15}/> },
            { label: 'Calibrados e liberados', value: calibrated, color: '#15803d', icon: <ShieldCheck size={15}/> },
            { label: 'Atenção / sem prazo', value: attention, color: '#d97706', icon: <CalendarClock size={15}/> },
            { label: 'Vencidos / bloqueados', value: blocked, color: '#dc2626', icon: <AlertTriangle size={15}/> },
          ].map(kpi => <div key={kpi.label} className="flex min-h-[100px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.icon}{kpi.label}</p><p className="mt-2 font-mono text-3xl font-extrabold" style={{ color: kpi.color }}>{busy && !items.length ? '—' : String(kpi.value).padStart(2, '0')}</p></div></div>)}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div><h2 className="text-sm font-extrabold text-slate-900">{form.id ? 'Alterar equipamento de medição' : 'Cadastrar equipamento de medição'}</h2><p className="mt-1 text-xs text-slate-500">Selecione um item do inventário para alterar. A situação de calibração é calculada pela validade registrada.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={newInstrument} className={`${buttonClass} border-slate-300 bg-white text-slate-700`}><Plus size={14}/> Novo</button>
              <button type="button" onClick={() => void blockInstrument()} disabled={busy || !form.id} className={`${buttonClass} border-rose-300 bg-rose-50 text-rose-700`}><Ban size={14}/> Bloquear</button>
              <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonClass} border-blue-700 bg-blue-700 text-white hover:bg-blue-800`}><Save size={14}/>{busy ? 'Gravando…' : 'Gravar'}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {fields.map(field => <label key={field.key} className={labelClass}>{field.label}{field.required ? ' *' : ''}<input className={inputClass} value={form[field.key]} required={field.required} disabled={busy} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}/></label>)}
            <label className={labelClass}>Última calibração<input type="date" className={inputClass} value={form.ultima_calibracao} disabled={busy} onChange={event => setForm(current => ({ ...current, ultima_calibracao: event.target.value }))}/></label>
            <label className={labelClass}>Validade da calibração<input type="date" className={inputClass} value={form.proxima_calibracao} disabled={busy} min={form.ultima_calibracao || undefined} onChange={event => setForm(current => ({ ...current, proxima_calibracao: event.target.value }))}/></label>
            <label className={labelClass}>Status operacional<select className={inputClass} value={form.status} disabled={busy} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="BLOQUEADO">Bloqueado</option><option value="ATIVO">Ativo</option><option value="APROVADO">Aprovado</option><option value="EM CALIBRAÇÃO">Em calibração</option><option value="INATIVO">Inativo</option></select></label>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <div><h2 className="text-sm font-extrabold text-slate-900">Inventário e validade da calibração</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} equipamento(s) nesta consulta</p></div>
            <div className="ml-auto flex w-full flex-wrap gap-2 md:w-auto">
              <label className="relative min-w-[220px] flex-1"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input aria-label="Pesquisar equipamentos" placeholder="TAG, descrição, série ou setor…" value={query} onChange={event => setQuery(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500"/></label>
              <select aria-label="Filtrar por situação da calibração" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs"><option value="TODOS">Todas as situações</option><option value="CALIBRADO">Calibrado</option><option value="ATENÇÃO">Atenção (30 dias)</option><option value="VENCIDO">Vencido</option><option value="BLOQUEADO">Bloqueado</option><option value="SEM PRAZO">Sem prazo</option></select>
              <button type="button" onClick={() => void load()} disabled={busy} className={`${buttonClass} border-slate-300 bg-white text-slate-700`}><RefreshCw size={14}/> Atualizar</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="quality-metrology-table w-full min-w-[1100px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>{['TAG / Código', 'Equipamento', 'Fabricante / modelo', 'Nº série', 'Faixa / resolução', 'Última calibração', 'Validade', 'Situação'].map(label => <th key={label} className="px-3 py-3 font-bold">{label}</th>)}</tr></thead>
              <tbody>
                {filtered.map(item => {
                  const status = item.statusEfetivo
                  const statusClass = status === 'VENCIDO' ? 'border-red-200 bg-red-50 text-red-700' : status === 'ATENÇÃO' || status === 'SEM PRAZO' ? 'border-amber-200 bg-amber-50 text-amber-700' : status === 'BLOQUEADO' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  return <tr key={item.id} tabIndex={0} onClick={() => edit(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(item) } }} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 ${status === 'VENCIDO' ? 'bg-red-50/60' : ''}`}>
                    <td className="px-3 py-3 font-mono font-bold text-blue-800">{item.codigo}</td>
                    <td className="max-w-[240px] px-3 py-3 font-medium text-slate-800"><span className="block truncate" title={item.descricao}>{item.descricao}</span><span className="text-[10px] text-slate-500">{item.setor || 'Setor não informado'}</span></td>
                    <td className="px-3 py-3 text-slate-600">{item.fabricante || '—'}<span className="block text-[10px] text-slate-500">{item.equipamento || ''}</span></td>
                    <td className="px-3 py-3 font-mono text-slate-600">{item.numero_serie || '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{item.faixa_medicao || '—'}<span className="block text-[10px] text-slate-500">{item.resolucao || ''}</span></td>
                    <td className="px-3 py-3 font-mono text-slate-600">{dateLabel(item.ultima_calibracao)}</td>
                    <td className="px-3 py-3 font-mono text-slate-600">{dateLabel(item.proxima_calibracao)}</td>
                    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${statusClass}`}>{status === 'CALIBRADO' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>} {status}</span></td>
                  </tr>
                })}
                {!filtered.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">{busy ? 'Consultando equipamentos…' : error ? 'Não foi possível carregar os registros. Verifique o alerta acima.' : 'Nenhum equipamento encontrado para este filtro.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500"><ShieldCheck size={14}/> Equipamento vencido, sem prazo ou bloqueado não deve ser liberado para uso. Certificados, incerteza e histórico são registrados no módulo de Calibração Industrial.</div>
        </section>
      </div>
    </main>
  )
}
