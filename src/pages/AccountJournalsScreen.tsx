import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { CheckCircle2, RefreshCw, BookOpen, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type DiarioTipo = 'Vendas' | 'Compras' | 'Banco' | 'Caixa' | 'Geral'
type DiarioContabil = {
  id: string
  codigo: string
  nome: string
  tipo: DiarioTipo
  conta_devedora_padrao: string | null
  conta_credora_padrao: string | null
  proximo_numero_sequencia: number
  ativo: boolean
  created_at: string
}
type DiarioForm = {
  codigo: string
  nome: string
  tipo: DiarioTipo
  conta_devedora_padrao: string
  conta_credora_padrao: string
  proximo_numero_sequencia: number
}
const initialForm: DiarioForm = {
  codigo: '', nome: '', tipo: 'Geral', conta_devedora_padrao: '',
  conta_credora_padrao: '', proximo_numero_sequencia: 1,
}
const inputClass = 'w-full rounded-xl border border-slate-700 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-orange-500'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400'

export default function AccountJournalsScreen() {
  const [diarios, setDiarios] = useState<DiarioContabil[]>([])
  const [form, setForm] = useState<DiarioForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const carregarDiarios = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    const { data, error } = await supabase
      .from('fiscal_diario_contabil')
      .select('id,codigo,nome,tipo,conta_devedora_padrao,conta_credora_padrao,proximo_numero_sequencia,ativo,created_at')
      .order('codigo', { ascending: true })
    if (error) {
      setErrorMessage('Não foi possível carregar os diários. Verifique a migration e as permissões da sua empresa.')
      setDiarios([])
    } else {
      setDiarios((data ?? []) as DiarioContabil[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void carregarDiarios() }, [carregarDiarios])

  const alterarCampo = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    if (name === 'proximo_numero_sequencia') {
      setForm(current => ({ ...current, proximo_numero_sequencia: Math.max(1, Number.parseInt(value, 10) || 1) }))
      return
    }
    if (name === 'tipo' && ['Vendas', 'Compras', 'Banco', 'Caixa', 'Geral'].includes(value)) {
      setForm(current => ({ ...current, tipo: value as DiarioTipo }))
      return
    }
    if (name === 'codigo') {
      setForm(current => ({ ...current, codigo: value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 10) }))
      return
    }
    setForm(current => ({ ...current, [name]: value }))
  }

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    const codigo = form.codigo.trim()
    const nome = form.nome.trim()
    if (!codigo || !nome) {
      setErrorMessage('Informe o código e o nome do diário.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('fiscal_diario_contabil').insert({
      codigo,
      nome,
      tipo: form.tipo,
      conta_devedora_padrao: form.conta_devedora_padrao.trim() || null,
      conta_credora_padrao: form.conta_credora_padrao.trim() || null,
      proximo_numero_sequencia: Math.max(1, form.proximo_numero_sequencia),
      ativo: true,
    })
    setSaving(false)
    if (error) {
      setErrorMessage(error.code === '23505'
        ? 'Já existe um diário com este código nesta empresa.'
        : 'Não foi possível gravar. Confirme a migration, a sessão e as permissões da empresa.')
      return
    }
    setForm(initialForm)
    setSuccessMessage('Diário contábil registrado.')
    await carregarDiarios()
  }

  const alternarAtivo = async (diario: DiarioContabil) => {
    setErrorMessage('')
    setSuccessMessage('')
    const { error } = await supabase.from('fiscal_diario_contabil')
      .update({ ativo: !diario.ativo }).eq('id', diario.id)
    if (error) setErrorMessage('Não foi possível alterar o estado deste diário.')
    else {
      setSuccessMessage(diario.ativo ? 'Diário desativado.' : 'Diário ativado.')
      await carregarDiarios()
    }
  }

  return (
    <main className="min-h-full flex-1 space-y-5 bg-[#0b0f19] p-4 text-slate-100 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Fiscal · Contabilidade</p>
          <h1 className="font-mono text-xl font-bold uppercase tracking-wide text-white">Diários Contábeis</h1>
          <p className="mt-1 text-xs text-slate-400">Canais de escrituração, contas padrão e controle de sequência por empresa.</p>
        </div>
        <button type="button" onClick={() => void carregarDiarios()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      {errorMessage && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-xs text-rose-200"><AlertCircle size={16} className="mt-0.5 shrink-0" />{errorMessage}</div>}
      {successMessage && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-xs text-emerald-200"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{successMessage}</div>}

      <section className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl sm:p-5">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen size={17} className="text-orange-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Cadastrar diário</h2>
        </div>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label><span className={labelClass}>Código do diário *</span><input className={inputClass} name="codigo" value={form.codigo} onChange={alterarCampo} maxLength={10} autoComplete="off" placeholder="VEN" required /></label>
            <label><span className={labelClass}>Nome do diário *</span><input className={inputClass} name="nome" value={form.nome} onChange={alterarCampo} maxLength={100} placeholder="Diário de Vendas" required /></label>
            <label><span className={labelClass}>Tipo *</span><select className={inputClass} name="tipo" value={form.tipo} onChange={alterarCampo}><option value="Geral">Geral</option><option value="Vendas">Vendas</option><option value="Compras">Compras</option><option value="Banco">Banco</option><option value="Caixa">Caixa</option></select></label>
            <label><span className={labelClass}>Conta devedora padrão</span><input className={inputClass} name="conta_devedora_padrao" value={form.conta_devedora_padrao} onChange={alterarCampo} maxLength={50} placeholder="Código do plano de contas" /></label>
            <label><span className={labelClass}>Conta credora padrão</span><input className={inputClass} name="conta_credora_padrao" value={form.conta_credora_padrao} onChange={alterarCampo} maxLength={50} placeholder="Código do plano de contas" /></label>
            <label><span className={labelClass}>Próxima sequência</span><input className={inputClass} type="number" name="proximo_numero_sequencia" value={form.proximo_numero_sequencia} onChange={alterarCampo} min={1} step={1} required /></label>
          </div>
          <div className="flex justify-end border-t border-slate-800 pt-3">
            <button type="submit" disabled={saving} className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Gravando…' : 'Gravar diário'}</button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Diários registrados</h2><p className="mt-1 text-[11px] text-slate-500">{diarios.length} registro(s) visível(is) para a empresa ativa</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr className="border-b border-slate-800 bg-[#0b0f19] text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="p-3 pl-4">Código</th><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3">Conta (D)</th><th className="p-3">Conta (C)</th><th className="p-3 text-right">Sequência</th><th className="p-3 pr-4 text-right">Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
              {loading ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Carregando diários contábeis…</td></tr>
                : diarios.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum diário cadastrado para esta empresa.</td></tr>
                : diarios.map(diario => <tr key={diario.id} className="transition hover:bg-slate-800/30">
                  <td className="p-3 pl-4 font-mono font-bold text-orange-400">{diario.codigo}</td><td className="p-3 font-semibold text-white">{diario.nome}</td><td className="p-3">{diario.tipo}</td><td className="p-3 font-mono text-sky-300">{diario.conta_devedora_padrao || '—'}</td><td className="p-3 font-mono text-emerald-300">{diario.conta_credora_padrao || '—'}</td><td className="p-3 text-right font-mono tabular-nums">{diario.proximo_numero_sequencia}</td><td className="p-3 pr-4 text-right"><button type="button" onClick={() => void alternarAtivo(diario)} className={diario.ativo ? 'rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-1 text-[10px] font-bold text-emerald-300' : 'rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400'}>{diario.ativo ? 'Ativo' : 'Inativo'}</button></td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
