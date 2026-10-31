import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

const input = 'h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none focus:border-blue-500'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500'

export default function AssistenteRetificacao() {
  const navigate = useNavigate()
  const [documento, setDocumento] = useState('')
  const [dataEstorno, setDataEstorno] = useState(new Date().toISOString().slice(0, 10))
  const [justificativa, setJustificativa] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    setMessage('')
    if (!documento.trim() || !dataEstorno || !justificativa.trim()) {
      setError('Informe documento de origem, data e justificativa para registrar o estorno.')
      return
    }
    setSaving(true)
    try {
      const result = await supabase.rpc('erp_fiscal_estornar_documento', {
        p_documento: documento.trim(),
        p_data: dataEstorno,
        p_justificativa: justificativa.trim(),
      })
      if (result.error) throw result.error
      setMessage('Registro de estorno documental gravado no PostgreSQL.')
      setDocumento('')
      setJustificativa('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar o estorno.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-full bg-slate-50 p-3 text-gray-800">
      <div className="mx-auto max-w-[1100px] space-y-3">
        <header className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-600">
            <ArrowLeft size={13} /> Voltar
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">ERP INDUSTRIAL • CONTROLADORIA</p>
            <h1 className="text-[13px] font-bold">Assistente de Retificação e Compliance Financeiro</h1>
          </div>
        </header>

        <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-3 text-xs font-bold text-gray-700">Registro de estorno documental</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <label className={label}>Documento de origem *</label>
              <input className={input} value={documento} onChange={event => setDocumento(event.target.value)} placeholder="Número ou identificação do documento" maxLength={120} />
            </div>
            <div>
              <label className={label}>Data do estorno *</label>
              <input className={input} type="date" value={dataEstorno} onChange={event => setDataEstorno(event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Justificativa *</label>
              <textarea className="min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500" value={justificativa} onChange={event => setJustificativa(event.target.value)} placeholder="Descreva o motivo e a evidência que fundamenta o estorno." maxLength={2000} />
            </div>
          </div>
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            Este procedimento registra o estorno documental e sua justificativa na tabela de controladoria. Ele não exclui nem altera automaticamente lançamentos bancários ou documentos fiscais originais.
          </p>
          {error && <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          {message && <div role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div>}
          <div className="mt-3 flex justify-end">
            <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={14} /> {saving ? 'Gravando…' : 'Registrar estorno'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
