import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Rule = {
  id: string
  nome_fiscal: string
  ncm_codigo: string
  aliquota: number
  data_vigencia: string
}

export default function ClassificacaoFiscal() {
  const [rows, setRows] = useState<Rule[]>([])
  const [nome, setNome] = useState('')
  const [ncm, setNcm] = useState('')
  const [aliquota, setAliquota] = useState('')
  const [vigencia, setVigencia] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setError('')
    const result = await supabase.from('erp_classificacao_fiscal')
      .select('id,nome_fiscal,ncm_codigo,aliquota,data_vigencia')
      .order('data_vigencia', { ascending: false })
    if (result.error) {
      setError(result.error.message)
      return
    }
    setRows((result.data ?? []) as Rule[])
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setError('')
    setMessage('')
    const rate = Number(aliquota.trim().replace(',', '.'))
    if (!nome.trim()) return setError('Informe o nome da classificação.')
    if (!/^\d{8}$/.test(ncm.trim())) return setError('Informe o NCM com oito dígitos.')
    if (!aliquota.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      return setError('Informe a alíquota explicitamente entre 0 e 100; nenhum valor é presumido.')
    }
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(vigencia)
      && Number.isFinite(Date.parse(`${vigencia}T00:00:00Z`))
      && new Date(`${vigencia}T00:00:00Z`).toISOString().slice(0, 10) === vigencia
    if (!validDate) {
      return setError('Informe uma data de vigência válida.')
    }

    setBusy(true)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa não identificada.')
      const result = await supabase.from('erp_classificacao_fiscal').insert({
        empresa_id: company.data,
        nome_fiscal: nome.trim(),
        ncm_codigo: ncm.trim(),
        aliquota: rate,
        data_vigencia: vigencia,
      })
      if (result.error) throw result.error
      setNome('')
      setNcm('')
      setAliquota('')
      setVigencia('')
      setMessage('Classificação cadastrada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar a classificação fiscal.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'h-10 rounded-sm border border-gray-300 bg-white px-2 text-[13px]'

  return (
    <main className="erp-dense fiscal-workspace min-h-full bg-slate-50 p-3 text-slate-900">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={`${input} px-2 font-medium`} onClick={() => window.history.back()}>Voltar</button>
        <h1 className="text-sm font-semibold">Cadastro e classificação fiscal de produtos (NCM / ICMS)</h1>
      </div>
      <section className="rounded-sm border border-gray-200 bg-white p-3">
        {error && <div role="alert" className="mb-2 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>}
        {message && <div role="status" className="mb-2 border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-gray-700">
            Classificação
            <input className={`${input} w-[min(260px,100%)]`} value={nome} onChange={(event) => setNome(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-700">
            NCM
            <input className={`${input} erp-field-ncm`} inputMode="numeric" maxLength={8} value={ncm} onChange={(event) => setNcm(event.target.value.replace(/\D/g, '').slice(0, 8))} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-700">
            Alíquota base (%)
            <input className={`${input} erp-field-percent`} type="number" min="0" max="100" step="0.0001" inputMode="decimal" value={aliquota} onChange={(event) => setAliquota(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-700">
            Vigência início
            <input className={`${input} erp-field-date`} type="date" value={vigencia} onChange={(event) => setVigencia(event.target.value)} />
          </label>
          <button type="button" aria-label="Adicionar classificação" title="Adicionar classificação" disabled={busy} onClick={() => void save()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-green-700 text-white disabled:opacity-50">
            <Plus size={16} />
          </button>
        </div>
        <div className="scroll-fade-x mt-3 max-h-[320px] overflow-auto rounded-sm border border-gray-200">
          <table className="w-full min-w-[720px] text-left">
            <thead className="sticky top-0 bg-slate-700 text-white">
              <tr className="h-9"><th className="p-2">Classificação</th><th className="p-2">NCM</th><th className="p-2 text-right">Alíquota</th><th className="p-2 text-center">Vigência</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => <tr key={row.id} className="h-9 border-b even:bg-slate-50">
                <td className="p-2">{row.nome_fiscal}</td>
                <td className="p-2 font-mono">{row.ncm_codigo}</td>
                <td className="p-2 text-right tabular-nums">{Number(row.aliquota).toFixed(2)}%</td>
                <td className="p-2 text-center">{row.data_vigencia}</td>
              </tr>)}
              {!rows.length && <tr><td colSpan={4} className="p-6 text-center text-sm text-slate-600">Nenhuma classificação fiscal cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
