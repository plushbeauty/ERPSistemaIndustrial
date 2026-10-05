import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type ReversalRequest = {
  id: string
  documento_alvo: string
  data_estorno: string
  justificativa: string
  criado_em: string
}

const defaultDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function EstornoLancamentos() {
  const [document, setDocument] = useState('')
  const [reversalDate, setReversalDate] = useState(defaultDate())
  const [justification, setJustification] = useState('')
  const [rows, setRows] = useState<ReversalRequest[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setError('')
    const result = await supabase.from('erp_fiscal_estornos')
      .select('id,documento_alvo,data_estorno,justificativa,criado_em')
      .order('criado_em', { ascending: false })
      .limit(100)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setRows((result.data ?? []) as ReversalRequest[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const registerRequest = async () => {
    setError('')
    setMessage('')
    if (!document.trim() || !justification.trim()) {
      setError('Documento e justificativa são obrigatórios.')
      return
    }
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(reversalDate)
      && Number.isFinite(Date.parse(`${reversalDate}T00:00:00Z`))
      && new Date(`${reversalDate}T00:00:00Z`).toISOString().slice(0, 10) === reversalDate
    if (!validDate) {
      setError('Informe uma data de estorno válida.')
      return
    }

    setBusy(true)
    try {
      const result = await supabase.rpc('erp_fiscal_estornar_documento', {
        p_documento: document.trim(),
        p_data: reversalDate,
        p_justificativa: justification.trim(),
      })
      if (result.error) throw result.error
      setDocument('')
      setJustification('')
      setReversalDate(defaultDate())
      setMessage('Solicitação registrada. Esta tela não reverte lançamentos contábeis nem cancela NF-e.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar a solicitação de estorno.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="erp-dense fiscal-workspace min-h-full bg-slate-50 p-3 text-slate-900">
      <div className="mx-auto max-w-[1400px] space-y-3">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
          <Link to="/fiscal" className="inline-flex items-center border border-slate-300 bg-white px-3 text-sm font-medium">Voltar ao Fiscal</Link>
          <div>
            <p className="text-xs font-semibold uppercase text-blue-800">Fiscal / Contabilidade</p>
            <h1 className="text-xl font-semibold">Solicitações de estorno contábil</h1>
          </div>
        </header>
        <section className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          Esta operação registra uma solicitação com documento, data e justificativa. A RPC disponível
          não comprova reversão de lançamentos contábeis e não cancela NF-e.
        </section>
        {error && <div role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>}
        {message && <div role="status" className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>}
        <section className="border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Documento alvo
              <input className="erp-field-number h-10 rounded-sm border border-slate-300 px-2 text-sm" value={document} onChange={(event) => setDocument(event.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Data solicitada
              <input type="date" className="erp-field-date h-10 rounded-sm border border-slate-300 px-2 text-sm" value={reversalDate} onChange={(event) => setReversalDate(event.target.value)} />
            </label>
            <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium text-slate-700">
              Justificativa
              <input className="h-10 w-full rounded-sm border border-slate-300 px-2 text-sm" value={justification} onChange={(event) => setJustification(event.target.value)} />
            </label>
            <button type="button" onClick={() => void registerRequest()} disabled={busy} className="h-10 rounded-sm bg-blue-800 px-3 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Registrando…' : 'Registrar solicitação'}
            </button>
          </div>
        </section>
        <section className="overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr><th className="px-3 py-2">Documento</th><th className="px-3 py-2">Data solicitada</th><th className="px-3 py-2">Justificativa</th><th className="px-3 py-2">Registrado em</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{row.documento_alvo}</td>
                <td className="px-3 py-2">{new Date(`${row.data_estorno}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                <td className="max-w-[560px] whitespace-pre-wrap px-3 py-2">{row.justificativa}</td>
                <td className="px-3 py-2">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.criado_em))}</td>
              </tr>)}
              {!rows.length && <tr><td colSpan={4} className="p-6 text-center text-slate-600">Nenhuma solicitação de estorno registrada.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
