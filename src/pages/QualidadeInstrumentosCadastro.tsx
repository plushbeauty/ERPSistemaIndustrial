import { useEffect, useState } from 'react'
import { RefreshCw, Save, Plus, Ban, AlertTriangle } from 'lucide-react'
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
}

const emptyDraft: InstrumentDraft = {
  id: '', codigo: '', descricao: '', fabricante: '', equipamento: '',
  numero_serie: '', faixa_medicao: '', resolucao: '', setor: '',
  responsavel: '', status: 'BLOQUEADO',
}
const selectFields = 'id,empresa_id,codigo,descricao,fabricante,equipamento,numero_serie,faixa_medicao,resolucao,setor,responsavel,status'

export default function QualidadeInstrumentosCadastro() {
  const [form, setForm] = useState<InstrumentDraft>(emptyDraft)
  const [items, setItems] = useState<Instrument[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
      const result = await supabase.from('erp_equipamentos_medicao')
        .select(selectFields)
        .eq('empresa_id', empresaId)
        .order('codigo')
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
      id: item.id, codigo: item.codigo, descricao: item.descricao,
      fabricante: item.fabricante ?? '', equipamento: item.equipamento ?? '',
      numero_serie: item.numero_serie ?? '', faixa_medicao: item.faixa_medicao ?? '',
      resolucao: item.resolucao ?? '', setor: item.setor ?? '',
      responsavel: item.responsavel ?? '', status: item.status,
    })
    setNotice('')
    setError('')
  }

  async function save() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const empresaId = await currentCompanyId()
      if (!form.codigo.trim() || !form.descricao.trim()) {
        throw new Error('Preencha os campos obrigatórios: Código e Descrição.')
      }
      const payload = {
        empresa_id: empresaId,
        codigo: form.codigo.trim(),
        descricao: form.descricao.trim(),
        fabricante: form.fabricante.trim() || null,
        equipamento: form.equipamento.trim() || null,
        numero_serie: form.numero_serie.trim() || null,
        faixa_medicao: form.faixa_medicao.trim() || null,
        resolucao: form.resolucao.trim() || null,
        setor: form.setor.trim() || null,
        responsavel: form.responsavel.trim() || null,
        status: form.status,
      }
      const result = form.id
        ? await supabase.from('erp_equipamentos_medicao').update(payload)
            .eq('id', form.id).eq('empresa_id', empresaId).select('id').single()
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

  async function deactivate() {
    if (!form.id) return
    if (!window.confirm('Bloquear este instrumento de medição? O registro e seu histórico serão preservados.')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const empresaId = await currentCompanyId()
      const result = await supabase.from('erp_equipamentos_medicao')
        .update({ status: 'BLOQUEADO' })
        .eq('id', form.id).eq('empresa_id', empresaId).select('id').single()
      if (result.error) throw result.error
      setForm(emptyDraft)
      setNotice('Instrumento bloqueado; o histórico foi preservado.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível bloquear o instrumento.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = items.filter(item =>
    [item.codigo, item.descricao, item.fabricante, item.equipamento, item.numero_serie, item.setor, item.responsavel, item.status]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  )

  const fields: Array<{ key: Exclude<keyof InstrumentDraft, 'id' | 'status'>; label: string; required?: boolean }> = [
    { key: 'codigo', label: 'Código', required: true },
    { key: 'descricao', label: 'Descrição', required: true },
    { key: 'fabricante', label: 'Fabricante' },
    { key: 'equipamento', label: 'Equipamento' },
    { key: 'numero_serie', label: 'Número de série' },
    { key: 'faixa_medicao', label: 'Faixa de medição' },
    { key: 'resolucao', label: 'Resolução' },
    { key: 'setor', label: 'Setor' },
    { key: 'responsavel', label: 'Responsável' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-900 md:p-4">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Qualidade / Metrologia</p>
          <h1 className="text-base font-semibold">Cadastro de instrumentos de medição</h1>
          <p className="text-[11px] text-slate-600">Cadastro por empresa, com consulta e persistência no Supabase.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => { setForm(emptyDraft); setError(''); setNotice('') }} className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-3 text-[11px] font-semibold hover:bg-slate-100">
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Novo
          </button>
          <button type="button" onClick={() => void load()} disabled={busy} className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-3 text-[11px] font-semibold disabled:opacity-50">
            <RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Atualizar
          </button>
          <button type="button" onClick={() => void save()} disabled={busy} className="h-[30px] rounded-[2px] bg-[#2D8DB8] px-3 text-[11px] font-semibold text-white disabled:opacity-50">
            <Save className="mr-1 inline h-3.5 w-3.5" /> {busy ? 'Gravando…' : 'Salvar'}
          </button>
          <button type="button" onClick={() => void deactivate()} disabled={busy || !form.id} className="h-[30px] rounded-[2px] border border-rose-300 bg-white px-3 text-[11px] font-semibold text-rose-700 disabled:opacity-50">
            <Ban className="mr-1 inline h-3.5 w-3.5" /> Bloquear
          </button>
        </div>
      </header>

      {error && <div role="alert" className="mt-3 flex items-start gap-2 border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <p role="status" className="mt-3 border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}

      <section className="mt-3 border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-[#E8F4F9] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#17445A]">Dados do instrumento</div>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(field => (
            <label key={field.key} className="block min-w-0 text-[9px] font-bold uppercase text-slate-600">
              {field.label}{field.required ? ' *' : ''}
              <input
                value={form[field.key]}
                required={field.required}
                onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}
                className="mt-[2px] h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-normal normal-case text-slate-900 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]"
              />
            </label>
          ))}
          <label className="block text-[9px] font-bold uppercase text-slate-600">Status
            <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} className="mt-[2px] h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900 focus:border-[#2D8DB8]">
              <option value="BLOQUEADO">Bloqueado</option>
              <option value="ATIVO">Ativo</option>
              <option value="APROVADO">Aprovado</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-3 border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#E8F4F9] px-3 py-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-[#17445A]">Instrumentos cadastrados</h2>
          <span className="text-[10px] text-slate-600">{filtered.length} registro(s)</span>
          <input aria-label="Filtrar instrumentos" placeholder="Filtrar código, descrição, série, setor…" value={query} onChange={event => setQuery(event.target.value)} className="ml-auto h-[30px] w-full max-w-xs rounded-[2px] border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#2D8DB8]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="bg-slate-100 text-[9px] uppercase text-slate-600">
              <tr>{['Código', 'Descrição', 'Fabricante', 'Nº série', 'Setor', 'Responsável', 'Status'].map(label => <th key={label} className="border-b border-slate-200 px-2 py-2 font-bold">{label}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="cursor-pointer border-b border-slate-100 hover:bg-sky-50" onClick={() => edit(item)}>
                  <td className="px-2 py-2 font-semibold">{item.codigo}</td><td className="px-2 py-2">{item.descricao}</td>
                  <td className="px-2 py-2">{item.fabricante ?? '—'}</td><td className="px-2 py-2">{item.numero_serie ?? '—'}</td>
                  <td className="px-2 py-2">{item.setor ?? '—'}</td><td className="px-2 py-2">{item.responsavel ?? '—'}</td>
                  <td className="px-2 py-2">{item.status}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">{busy ? 'Consultando instrumentos…' : 'Nenhum instrumento encontrado para este filtro.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
