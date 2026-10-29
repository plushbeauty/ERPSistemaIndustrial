import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type ParametroGlobal = {
  id: string
  chave: string
  valor: string
  descricao: string
  editavel: boolean
  updated_at: string
}
type NovoParametro = { chave: string; valor: string; descricao: string }
const initialForm: NovoParametro = { chave: '', valor: '', descricao: '' }
const inputClass = 'w-full rounded-xl border border-slate-700 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400'

export default function SystemParametersScreen() {
  const [params, setParams] = useState<ParametroGlobal[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [form, setForm] = useState<NovoParametro>(initialForm)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savingNew, setSavingNew] = useState(false)
  const [isMaster, setIsMaster] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user) {
      setIsMaster(false)
      setAccessChecked(true)
      setLoading(false)
      setErrorMessage('Sessão autenticada não encontrada. Entre novamente no ERP.')
      return
    }
    const { data: masterData, error: masterError } = await supabase.rpc('erp_is_master')
    const master = !masterError && masterData === true
    setIsMaster(master)
    setAccessChecked(true)
    if (!master) {
      setParams([])
      setLoading(false)
      setErrorMessage('Acesso restrito à identidade Master do SYSNQRA ERP INDUSTRIAL.')
      return
    }
    const { data, error } = await supabase.from('sistema_parametro_global')
      .select('id,chave,valor,descricao,editavel,updated_at')
      .order('chave', { ascending: true })
    if (error) {
      setErrorMessage('Não foi possível carregar parâmetros. Confirme se a migration está aplicada e se a sessão tem acesso Master.')
      setParams([])
    } else {
      const rows = (data ?? []) as ParametroGlobal[]
      setParams(rows)
      setDrafts(Object.fromEntries(rows.map(row => [row.id, row.valor])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const salvarExistente = async (param: ParametroGlobal) => {
    if (!isMaster || !param.editavel || savingKey) return
    const valor = drafts[param.id] ?? param.valor
    setSavingKey(param.id)
    setErrorMessage('')
    setSuccessMessage('')
    const { error } = await supabase.from('sistema_parametro_global')
      .update({ valor }).eq('id', param.id).eq('editavel', true)
    if (error) {
      setErrorMessage(error.code === '42501' ? 'Permissão negada pelo banco. Verifique a política Master/RLS.' : 'Falha ao gravar o parâmetro. Confira a migration e tente novamente.')
    } else {
      setSuccessMessage(`Parâmetro “${param.chave}” atualizado.`)
      await carregar()
    }
    setSavingKey(null)
  }

  const adicionar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isMaster || savingNew) return
    const chave = form.chave.trim()
    const descricao = form.descricao.trim()
    if (!chave || !descricao || !form.valor.trim()) {
      setErrorMessage('Informe chave, valor e descrição.')
      return
    }
    setSavingNew(true)
    setErrorMessage('')
    setSuccessMessage('')
    const { error } = await supabase.from('sistema_parametro_global').insert({
      chave, valor: form.valor, descricao, editavel: true,
    })
    if (error) {
      setErrorMessage(error.code === '23505' ? 'Esta chave já existe. Edite o registro existente.' : 'Não foi possível adicionar o parâmetro. Confirme as permissões e a migration.')
    } else {
      setForm(initialForm)
      setSuccessMessage(`Parâmetro “${chave}” adicionado.`)
      await carregar()
    }
    setSavingNew(false)
  }

  return (
    <main className="flex min-h-full flex-1 flex-col gap-5 overflow-y-auto bg-[#0b0f19] p-4 text-slate-100 sm:p-6">
      <header className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-orange-400" />
          <h1 className="font-mono text-xl font-bold uppercase tracking-wide text-white">Parâmetros do Sistema</h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">Chaves globais de configuração do núcleo SYSNQRA ERP INDUSTRIAL.</p>
        <p className="mt-1 text-[11px] text-slate-500">Acesso exclusivo Master • alterações registram data e usuário responsável.</p>
      </header>

      {errorMessage && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>}
      {successMessage && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-900/70 bg-emerald-950/30 p-3 text-xs text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMessage}</span></div>}

      {loading ? <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 text-xs text-slate-400">Carregando parâmetros globais…</div>
        : accessChecked && !isMaster ? <section className="flex max-w-3xl items-start gap-3 rounded-2xl border border-orange-900/60 bg-[#111827] p-5"><ShieldCheck className="h-5 w-5 shrink-0 text-orange-400" /><div><h2 className="text-sm font-bold text-white">Área administrativa protegida</h2><p className="mt-1 text-xs leading-5 text-slate-400">Somente a identidade Master canônica pode consultar ou alterar parâmetros globais. O banco aplica a mesma restrição via RLS.</p></div></section>
        : <div className="flex flex-col gap-5">
          <section className="max-w-5xl rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl sm:p-5">
            <div className="mb-4 flex items-center gap-2"><KeyRound className="h-4 w-4 text-orange-400" /><h2 className="text-xs font-bold uppercase tracking-wider text-white">Adicionar parâmetro</h2></div>
            <form onSubmit={adicionar} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label><span className={labelClass}>Identificador (chave) *</span><input className={inputClass} value={form.chave} onChange={e => setForm(prev => ({ ...prev, chave: e.target.value }))} maxLength={255} autoComplete="off" placeholder="ex.: synqra.timeout.limite" required /></label>
                <label><span className={labelClass}>Valor do parâmetro *</span><input className={inputClass} value={form.valor} onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))} maxLength={10000} placeholder="Valor da configuração" required /></label>
                <label><span className={labelClass}>Descrição / finalidade *</span><div className="flex gap-2"><input className={inputClass} value={form.descricao} onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))} maxLength={255} placeholder="Finalidade para auditoria" required /><button type="submit" disabled={savingNew} className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-orange-500 disabled:opacity-50">{savingNew ? 'Gravando…' : 'Adicionar'}</button></div></label>
              </div>
              <p className="text-[10px] text-amber-300">Não grave aqui chaves privadas do Supabase, service_role, tokens de acesso ou segredos de hardware. Use as variáveis de ambiente/secret manager do deploy.</p>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Parâmetros cadastrados</h2><p className="mt-1 text-[11px] text-slate-500">{params.length} registro(s) • sem valores padrão inventados</p></div><button type="button" onClick={() => void carregar()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-orange-500"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead><tr className="border-b border-slate-800 bg-[#0b0f19] text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="p-3 pl-4">Chave</th><th className="p-3">Valor</th><th className="p-3">Descrição</th><th className="p-3">Atualizado em</th><th className="p-3 pr-4 text-right">Ação</th></tr></thead>
                <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                  {params.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum parâmetro cadastrado. Adicione apenas valores reais e documentados.</td></tr>
                    : params.map(param => <tr key={param.id} className="align-top transition hover:bg-slate-800/20">
                      <td className="max-w-[230px] break-all p-3 pl-4 font-mono font-bold text-orange-400">{param.chave}{!param.editavel && <span className="mt-1 block text-[9px] font-semibold uppercase text-amber-300">Somente leitura</span>}</td>
                      <td className="min-w-[220px] p-3"><input aria-label={`Valor de ${param.chave}`} className={inputClass} value={drafts[param.id] ?? param.valor} disabled={!param.editavel || savingKey === param.id} onChange={e => setDrafts(prev => ({ ...prev, [param.id]: e.target.value }))} /></td>
                      <td className="max-w-[260px] break-words p-3 text-slate-400">{param.descricao}</td>
                      <td className="whitespace-nowrap p-3 text-[10px] text-slate-500">{new Date(param.updated_at).toLocaleString('pt-BR')}</td>
                      <td className="p-3 pr-4 text-right"><button type="button" onClick={() => void salvarExistente(param)} disabled={!param.editavel || savingKey === param.id || (drafts[param.id] ?? param.valor) === param.valor} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-bold uppercase text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5" />{savingKey === param.id ? 'Salvando…' : 'Salvar'}</button></td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </div>}
    </main>
  )
}
