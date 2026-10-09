import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Save, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Instrument = {
  id?: string
  tag: string
  numero_serie: string
  equipamento: string
  fabricante: string
  faixa_medicao: string
  resolucao: string
  setor: string
  responsavel: string
  ativo: boolean
}
type InstrumentRow = Instrument & { id: string }

const empty: Instrument = { tag: '', numero_serie: '', equipamento: '', fabricante: '', faixa_medicao: '', resolucao: '', setor: '', responsavel: '', ativo: true }
const input = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-900 outline-none focus:border-[#2D8DB8]'
const label = 'grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600'

export default function QualidadeInstrumentosCadastro() {
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState<Instrument>(empty)
  const [rows, setRows] = useState<InstrumentRow[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const result = await supabase.from('erp_equipamentos_medicao')
        .select('id,tag,numero_serie,equipamento,fabricante,faixa_medicao,resolucao,setor,responsavel,ativo')
        .eq('empresa_id', id).order('tag').limit(2000)
      if (result.error) throw result.error
      setEmpresaId(id)
      setRows((result.data ?? []) as InstrumentRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar instrumentos de medição.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(row => !term || [row.tag, row.numero_serie, row.equipamento, row.fabricante, row.setor, row.responsavel]
      .some(value => String(value ?? '').toLowerCase().includes(term)))
  }, [rows, query])

  function update<K extends keyof Instrument>(key: K, value: Instrument[K]) {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
    setNotice('')
  }

  async function save() {
    setError('')
    setNotice('')
    if (!empresaId) { setError('Empresa da sessão não identificada.'); return }
    if (!form.tag.trim() || !form.equipamento.trim()) { setError('TAG e equipamento são obrigatórios.'); return }
    if (!form.numero_serie.trim()) { setError('Número de série é obrigatório para rastreabilidade.'); return }
    setBusy(true)
    try {
      const payload = {
        empresa_id: empresaId,
        tag: form.tag.trim(),
        numero_serie: form.numero_serie.trim(),
        equipamento: form.equipamento.trim(),
        fabricante: form.fabricante.trim() || null,
        faixa_medicao: form.faixa_medicao.trim() || null,
        resolucao: form.resolucao.trim() || null,
        setor: form.setor.trim() || null,
        responsavel: form.responsavel.trim() || null,
        ativo: form.ativo,
      }
      const result = form.id
        ? await supabase.from('erp_equipamentos_medicao').update(payload).eq('id', form.id).eq('empresa_id', empresaId)
        : await supabase.from('erp_equipamentos_medicao').insert(payload)
      if (result.error) throw result.error
      setNotice(form.id ? 'Instrumento atualizado na empresa atual.' : 'Instrumento cadastrado na empresa atual.')
      setForm(empty)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar instrumento.')
    } finally {
      setBusy(false)
    }
  }

  async function inactivate() {
    if (!form.id || !empresaId) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await supabase.from('erp_equipamentos_medicao').update({ ativo: false }).eq('id', form.id).eq('empresa_id', empresaId)
      if (result.error) throw result.error
      setNotice('Instrumento inativado; o registro foi preservado para rastreabilidade.')
      setForm(empty)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao inativar instrumento.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="erp-global-surface erp-compact min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-700 bg-slate-900 px-3 py-2 text-white">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-2">
        <div><p className="text-[9px] font-medium uppercase tracking-widest text-sky-300">SGQ • METROLOGIA</p><h1 className="text-[15px] font-semibold">Instrumentos de Medição</h1><p className="text-[10px] text-slate-300">Cadastro por empresa; calibração e validade são controladas no módulo de metrologia.</p></div>
        <div className="flex gap-1"><button type="button" className="h-[30px] border border-slate-500 px-2 text-[10px]" disabled={busy} onClick={() => void load()}><RefreshCw size={12} className="mr-1 inline"/> Atualizar</button><button type="button" className="h-[30px] border border-slate-500 px-2 text-[10px]" onClick={() => { setForm(empty); setError(''); setNotice('') }}><Plus size={12} className="mr-1 inline"/> Novo</button><button type="button" disabled={busy || !form.id} onClick={() => void inactivate()} className="h-[30px] border border-rose-400 px-2 text-[10px] text-rose-100 disabled:opacity-40"><X size={12} className="mr-1 inline"/> Inativar</button><button type="button" disabled={busy} onClick={() => void save()} className="h-[30px] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={12} className="mr-1 inline"/> Salvar</button></div>
      </div>
    </header>
    <div className="mx-auto max-w-[1700px] space-y-3 p-3">
      {(error || notice) && <div role={error ? 'alert' : 'status'} className={error ? 'border border-red-300 bg-red-50 p-2 text-[11px] text-red-800' : 'border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-emerald-800'}>{error || notice}</div>}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="border border-slate-200 bg-white p-3">
          <h2 className="mb-2 text-[12px] font-semibold">{form.id ? 'Editar instrumento' : 'Cadastro do instrumento'}</h2>
          <div className="grid gap-2">
            <label className={label}>TAG<input className={input} value={form.tag} onChange={event => update('tag', event.target.value)} required/></label>
            <label className={label}>Número de série<input className={input} value={form.numero_serie} onChange={event => update('numero_serie', event.target.value)} required/></label>
            <label className={label}>Equipamento<input className={input} value={form.equipamento} onChange={event => update('equipamento', event.target.value)} required/></label>
            <label className={label}>Fabricante<input className={input} value={form.fabricante} onChange={event => update('fabricante', event.target.value)}/></label>
            <label className={label}>Faixa de medição<input className={input} value={form.faixa_medicao} onChange={event => update('faixa_medicao', event.target.value)} placeholder="Ex.: 0–150 mm"/></label>
            <label className={label}>Resolução<input className={input} value={form.resolucao} onChange={event => update('resolucao', event.target.value)} placeholder="Ex.: 0,01 mm"/></label>
            <label className={label}>Setor<input className={input} value={form.setor} onChange={event => update('setor', event.target.value)}/></label>
            <label className={label}>Responsável<input className={input} value={form.responsavel} onChange={event => update('responsavel', event.target.value)}/></label>
            <label className="flex items-center gap-2 text-[10px] normal-case"><input type="checkbox" checked={form.ativo} onChange={event => update('ativo', event.target.checked)}/> Ativo para uso</label>
            <div className="text-[10px] text-slate-500">Empresa autenticada: {empresaId || 'carregando…'}</div>
          </div>
        </section>
        <section className="min-w-0 border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2"><div><h2 className="text-[12px] font-semibold">Cadastro mestre de instrumentos</h2><p className="text-[10px] text-slate-500">{visibleRows.length} registros • dados reais isolados por empresa</p></div><input className="h-[30px] w-[240px] rounded-[2px] border border-slate-300 px-2 text-[11px]" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar TAG, série, equipamento…"/></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-[11px]"><thead className="bg-slate-100 text-[9px] uppercase text-slate-600"><tr><th className="p-2">TAG</th><th className="p-2">Série</th><th className="p-2">Equipamento</th><th className="p-2">Fabricante</th><th className="p-2">Setor</th><th className="p-2">Status</th></tr></thead><tbody>
            {visibleRows.map(row => <tr key={row.id} onClick={() => { setForm({ ...row }); setError(''); setNotice('') }} className={`h-8 cursor-pointer border-t border-slate-100 hover:bg-sky-50 ${form.id === row.id ? 'bg-sky-50' : ''}`}><td className="p-2 font-semibold">{row.tag}</td><td className="p-2">{row.numero_serie}</td><td className="p-2">{row.equipamento}</td><td className="p-2">{row.fabricante || '—'}</td><td className="p-2">{row.setor || '—'}</td><td className="p-2">{row.ativo ? 'ATIVO' : 'INATIVO'}</td></tr>)}
            {!visibleRows.length && <tr><td colSpan={6} className="p-4 text-center text-[11px] text-slate-500">{busy ? 'Carregando…' : 'Nenhum instrumento encontrado.'}</td></tr>}
          </tbody></table></div>
        </section>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500"><ShieldCheck size={13}/> Nenhum instrumento de outra empresa é carregado, editado ou inativado por esta tela.</div>
    </div>
  </main>
}
