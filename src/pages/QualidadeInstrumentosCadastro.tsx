/**
 * SYSNQRA SISTEMAS INDUSTRIAIS — QUALIDADE / METROLOGIA
 * Revisão: METRO-002 | Data: 22/10/2026
 * Escopo: cadastro real de instrumentos, prazos de calibração e bloqueio visual por vencimento.
 * Fonte de dados: public.erp_equipamentos_medicao; sem dados de demonstração.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, Plus, RefreshCw, Save, Search, ShieldCheck, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

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
const inputClass = 'mt-0.5 h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100'
const labelClass = 'block min-w-0 text-[9px] font-black uppercase tracking-wide text-slate-500'
const buttonClass = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-2.5 text-[10px] font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50'
function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function dateLabel(value: string | null) {
  if (!value) return 'Não informada'
  const date = value.slice(0, 10)
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}/${month}/${year}` : '—'
}
function effectiveStatus(item: Instrument, today: string) {
  if (['BLOQUEADO', 'INATIVO', 'REPROVADO'].includes(item.status.toUpperCase())) return 'BLOQUEADO'
  if (!item.proxima_calibracao) return 'SEM PRAZO'
  if (item.proxima_calibracao.slice(0, 10) < today) return 'VENCIDO'
  if (item.proxima_calibracao.slice(0, 10) <= todayPlusDays(today, 30)) return 'ATENÇÃO'
  return 'CALIBRADO'
}
function todayPlusDays(today: string, days: number) {
  const [year, month, day] = today.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export default function QualidadeInstrumentosCadastro() {
  const [form, setForm] = useState<InstrumentDraft>(emptyDraft)
  const [items, setItems] = useState<Instrument[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const today = localToday()

  async function currentCompanyId(): Promise<string> {
    const result = await supabase.rpc('erp_current_empresa_id')
    if (result.error) throw result.error
    if (!result.data) throw new Error('Empresa da sessão não identificada. Entre novamente ou solicite acesso ao administrador.')
    return String(result.data)
  }
  async function load() {
    setBusy(true)
    setError('')
    try {
      const empresaId = await currentCompanyId()
      const result = await supabase.from('erp_equipamentos_medicao').select(selectFields)
        .eq('empresa_id', empresaId).order('codigo')
      if (result.error) throw result.error
      setItems((result.data ?? []) as Instrument[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar instrumentos de medição.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { void load() }, [])
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
      setForm(emptyDraft)
      setNotice(form.id ? 'Instrumento atualizado.' : 'Instrumento cadastrado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o instrumento.')
    } finally {
      setBusy(false)
    }
  }
  async function blockInstrument() {
    if (!form.id) return
    if (!window.confirm('Bloquear este instrumento? O registro será preservado.')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const empresaId = await currentCompanyId()
      const result = await supabase.from('erp_equipamentos_medicao').update({ status: 'BLOQUEADO' })
        .eq('id', form.id).eq('empresa_id', empresaId).select('id').single()
      if (result.error) throw result.error
      setForm(emptyDraft)
      setNotice('Instrumento bloqueado; o registro foi preservado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível bloquear o instrumento.')
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
  const overdue = processed.filter(item => item.statusEfetivo === 'VENCIDO').length
  const attention = processed.filter(item => item.statusEfetivo === 'ATENÇÃO' || item.statusEfetivo === 'SEM PRAZO').length
  const fields: Array<{ key: Exclude<keyof InstrumentDraft, 'id' | 'status' | 'ultima_calibracao' | 'proxima_calibracao'>; label: string; required?: boolean }> = [
    { key: 'codigo', label: 'Código / TAG', required: true }, { key: 'descricao', label: 'Descrição', required: true },
    { key: 'fabricante', label: 'Fabricante' }, { key: 'equipamento', label: 'Equipamento' },
    { key: 'numero_serie', label: 'Nº de série' }, { key: 'faixa_medicao', label: 'Faixa de medição' },
    { key: 'resolucao', label: 'Resolução' }, { key: 'setor', label: 'Setor' }, { key: 'responsavel', label: 'Responsável' },
  ]
  return (
    <main className="min-h-screen bg-[#F8FAFC] p-3 text-slate-800 md:p-4">
      <div className="mx-auto max-w-[1680px] space-y-3">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white p-3 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-slate-200 bg-[#E8F4F9] text-[#123B50]"><Wrench size={18}/></span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">SYSNQRA • Qualidade / Metrologia</p>
            <h1 className="text-sm font-black uppercase text-[#123B50]">Instrumentos de medição e calibração</h1>
            <p className="text-[10px] text-slate-500">Cadastro real por empresa, rastreabilidade e monitoramento de vencimentos.</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5 print:hidden">
            <button type="button" onClick={newInstrument} className={`${buttonClass} border-slate-300 bg-white text-slate-700`}><Plus size={13}/> Novo</button>
            <button type="button" onClick={() => void load()} disabled={busy} className={`${buttonClass} border-slate-300 bg-white text-slate-700`}><RefreshCw size={13}/> Atualizar</button>
            <button type="button" onClick={() => void blockInstrument()} disabled={busy || !form.id} className={`${buttonClass} border-rose-300 bg-rose-50 text-rose-700`}><Ban size={13}/> Bloquear</button>
            <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonClass} border-[#2D8DB8] bg-[#2D8DB8] text-white`}><Save size={13}/>{busy ? 'Gravando…' : 'Gravar'}</button>
          </div>
        </header>
        {error && <div role="alert" className="flex gap-2 border border-rose-300 bg-rose-50 p-2 text-[11px] font-semibold text-rose-800"><AlertTriangle size={15} className="shrink-0"/>{error}</div>}
        {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[11px] font-semibold text-emerald-800">{notice}</div>}
        <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="border border-slate-200 border-t-2 border-t-[#2D8DB8] bg-white p-3 shadow-sm"><p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Instrumentos cadastrados</p><p className="mt-1 text-xl font-black text-[#123B50]">{items.length}</p></div>
          <div className="border border-rose-200 border-t-2 border-t-rose-500 bg-white p-3 shadow-sm"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-rose-700"><AlertTriangle size={12}/> Calibração vencida</p><p className="mt-1 text-xl font-black text-rose-700">{overdue}</p></div>
          <div className="border border-amber-200 border-t-2 border-t-amber-500 bg-white p-3 shadow-sm"><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-amber-700"><CalendarClock size={12}/> Atenção / sem prazo</p><p className="mt-1 text-xl font-black text-amber-700">{attention}</p></div>
        </section>
        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[#E8F4F9] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#17445A]">Ficha técnica do instrumento</div>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fields.map(field => <label key={field.key} className={labelClass}>{field.label}{field.required ? ' *' : ''}<input className={inputClass} value={form[field.key]} required={field.required} disabled={busy} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}/></label>)}
            <label className={labelClass}>Última calibração<input type="date" className={inputClass} value={form.ultima_calibracao} disabled={busy} onChange={event => setForm(current => ({ ...current, ultima_calibracao: event.target.value }))}/></label>
            <label className={labelClass}>Próxima calibração / vencimento<input type="date" className={inputClass} value={form.proxima_calibracao} disabled={busy} min={form.ultima_calibracao || undefined} onChange={event => setForm(current => ({ ...current, proxima_calibracao: event.target.value }))}/></label>
            <label className={labelClass}>Status operacional<select className={inputClass} value={form.status} disabled={busy} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="BLOQUEADO">Bloqueado</option><option value="ATIVO">Ativo</option><option value="APROVADO">Aprovado</option><option value="INATIVO">Inativo</option></select></label>
          </div>
        </section>
        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#E8F4F9] px-3 py-2">
            <h2 className="text-[10px] font-black uppercase tracking-wide text-[#17445A]">Inventário de instrumentos</h2>
            <span className="text-[10px] text-slate-500">{filtered.length} registro(s)</span>
            <div className="ml-auto flex w-full flex-wrap gap-1.5 sm:w-auto">
              <label className="relative min-w-[200px] flex-1 sm:flex-none"><Search size={13} className="absolute left-2 top-2 text-slate-400"/><input aria-label="Pesquisar instrumentos" placeholder="Código, descrição, série…" value={query} onChange={event => setQuery(event.target.value)} className="h-[28px] w-full rounded-[2px] border border-slate-300 bg-white pl-7 pr-2 text-[10px] outline-none focus:border-[#2D8DB8]"/></label>
              <select aria-label="Filtrar por status de calibração" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-[28px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px]"><option value="TODOS">Todos os status</option><option value="CALIBRADO">Calibrado</option><option value="ATENÇÃO">Atenção (30 dias)</option><option value="VENCIDO">Vencido</option><option value="BLOQUEADO">Bloqueado</option><option value="SEM PRAZO">Sem prazo</option></select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-[10px]">
              <thead className="bg-slate-100 text-[9px] uppercase text-slate-600"><tr>{['Código', 'Instrumento / descrição', 'Fabricante', 'Nº série', 'Última calibração', 'Próxima calibração', 'Situação'].map(label => <th key={label} className="border-b border-slate-200 px-2 py-2 font-black">{label}</th>)}</tr></thead>
              <tbody>
                {filtered.map(item => {
                  const status = item.statusEfetivo
                  const rowClass = status === 'VENCIDO' ? 'border-l-4 border-l-rose-500 bg-rose-50 text-rose-900 hover:bg-rose-100' : status === 'ATENÇÃO' || status === 'SEM PRAZO' ? 'border-l-4 border-l-amber-400 bg-amber-50/70 hover:bg-amber-50' : status === 'BLOQUEADO' ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-white hover:bg-sky-50'
                  return <tr key={item.id} tabIndex={0} onClick={() => edit(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(item) } }} className={`h-[34px] cursor-pointer border-b border-slate-100 ${rowClass}`}><td className="px-2 font-bold">{item.codigo}</td><td className="max-w-[300px] truncate px-2" title={item.descricao}>{item.descricao}</td><td className="px-2">{item.fabricante ?? '—'}</td><td className="px-2">{item.numero_serie ?? '—'}</td><td className="px-2 tabular-nums">{dateLabel(item.ultima_calibracao)}</td><td className="px-2 tabular-nums">{dateLabel(item.proxima_calibracao)}</td><td className="px-2"><span className={`inline-flex items-center gap-1 font-black ${status === 'VENCIDO' ? 'text-rose-700' : status === 'ATENÇÃO' || status === 'SEM PRAZO' ? 'text-amber-700' : status === 'BLOQUEADO' ? 'text-slate-500' : 'text-emerald-700'}`}>{status === 'CALIBRADO' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/ >}{status}</span></td></tr>
                })}
                {!filtered.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">{busy ? 'Consultando instrumentos reais…' : error ? 'Não foi possível carregar os registros. Verifique o alerta acima.' : 'Nenhum instrumento encontrado para este filtro.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 text-[9px] text-slate-500"><ShieldCheck size={12}/> O vencimento é calculado pela data registrada. O status visual não substitui o bloqueio transacional nas operações que consomem instrumentos.</div>
        </section>
      </div>
    </main>
  )
}
