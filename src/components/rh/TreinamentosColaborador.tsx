import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { GraduationCap, Plus, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Training = {
  id: string
  nome_treinamento: string
  data_realizacao: string
  data_validade: string | null
  instrutor: string | null
  status: 'VALIDO' | 'VENCIDO' | 'RECICLAGEM'
}
type Props = { funcionarioId: string }
type FormState = { nome: string; realizacao: string; validade: string; instrutor: string }
const emptyForm = (): FormState => ({ nome: '', realizacao: '', validade: '', instrutor: '' })
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Erro inesperado ao processar treinamento.'

export default function TreinamentosColaborador({ funcionarioId }: Props) {
  const [rows, setRows] = useState<Training[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!funcionarioId) return
    setLoading(true); setError('')
    try {
      const { data, error: queryError } = await supabase.from('rh_treinamentos')
        .select('id,nome_treinamento,data_realizacao,data_validade,instrutor,status')
        .eq('funcionario_id', funcionarioId).order('data_validade', { ascending: true })
      if (queryError) throw queryError
      setRows((data ?? []) as Training[])
    } catch (cause) {
      setError(errorText(cause))
    } finally { setLoading(false) }
  }, [funcionarioId])

  useEffect(() => { void load() }, [load])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setNotice('')
    if (!form.nome.trim() || !form.realizacao) {
      setError('Informe o nome do treinamento e a data de realização.')
      return
    }
    setSaving(true)
    try {
      const status: Training['status'] = form.validade && form.validade < new Date().toISOString().slice(0, 10) ? 'VENCIDO' : 'VALIDO'
      const { error: insertError } = await supabase.from('rh_treinamentos').insert({
        funcionario_id: funcionarioId,
        nome_treinamento: form.nome.trim(),
        data_realizacao: form.realizacao,
        data_validade: form.validade || null,
        instrutor: form.instrutor.trim() || null,
        status,
      })
      if (insertError) throw insertError
      setForm(emptyForm())
      setNotice('Treinamento registrado no Supabase.')
      await load()
    } catch (cause) {
      setError(errorText(cause))
    } finally { setSaving(false) }
  }

  return <section className="space-y-4" aria-label="Treinamentos regulamentares do colaborador">
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    <form onSubmit={save} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-12">
      <label className="md:col-span-4"><span className="mb-1 block text-[10px] font-bold text-slate-600">Treinamento / NR *</span><input required maxLength={150} value={form.nome} onChange={e=>setForm(old=>({...old,nome:e.target.value}))} className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs" placeholder="Ex.: NR-12 — Segurança em máquinas"/></label>
      <label className="md:col-span-2"><span className="mb-1 block text-[10px] font-bold text-slate-600">Realização *</span><input required type="date" value={form.realizacao} onChange={e=>setForm(old=>({...old,realizacao:e.target.value}))} className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs"/></label>
      <label className="md:col-span-2"><span className="mb-1 block text-[10px] font-bold text-slate-600">Validade</span><input type="date" min={form.realizacao || undefined} value={form.validade} onChange={e=>setForm(old=>({...old,validade:e.target.value}))} className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs"/></label>
      <label className="md:col-span-2"><span className="mb-1 block text-[10px] font-bold text-slate-600">Instrutor</span><input maxLength={100} value={form.instrutor} onChange={e=>setForm(old=>({...old,instrutor:e.target.value}))} className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs" placeholder="Nome"/></label>
      <div className="flex items-end md:col-span-2"><button disabled={saving} type="submit" className="inline-flex h-9 w-full items-center justify-center gap-1 rounded bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"><Plus size={13}/>{saving ? 'Salvando…' : 'Registrar'}</button></div>
    </form>
    <div className="flex items-center justify-between"><h3 className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600"><GraduationCap size={14}/>Histórico de treinamentos ({rows.length})</h3><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-[10px] font-bold text-slate-700"><RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>Atualizar</button></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="h-8 bg-slate-100 text-[10px] uppercase text-slate-600"><tr><th className="px-3">Treinamento</th><th className="px-3">Realização</th><th className="px-3">Validade</th><th className="px-3">Instrutor</th><th className="px-3">Status</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id} className="h-9 border-b border-slate-100"><td className="px-3 font-semibold text-slate-800">{row.nome_treinamento}</td><td className="px-3 font-mono">{new Date(row.data_realizacao+'T12:00:00').toLocaleDateString('pt-BR')}</td><td className="px-3 font-mono">{row.data_validade ? new Date(row.data_validade+'T12:00:00').toLocaleDateString('pt-BR') : 'Sem vencimento'}</td><td className="px-3">{row.instrutor || '—'}</td><td className="px-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${row.status==='VALIDO'?'border-emerald-200 bg-emerald-50 text-emerald-700':row.status==='VENCIDO'?'border-rose-200 bg-rose-50 text-rose-700':'border-amber-200 bg-amber-50 text-amber-700'}`}>{row.status}</span></td></tr>)}
      {!loading && rows.length===0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhum treinamento cadastrado para este colaborador.</td></tr>}
    </tbody></table></div>
  </section>
}
