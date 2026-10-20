import { useState, type FormEvent } from 'react'
import { AlertCircle, Barcode, CheckCircle2, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type ScanResult = {
  tipo?: string
  mensagem?: string
  id?: string
  codigo?: string | null
  nome?: string | null
  descricao?: string | null
  codigo_barras?: string | null
  referencia_interna?: string | null
  status?: string | null
  data?: string | null
}

function parseScanResult(value: unknown): ScanResult | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const result: ScanResult = {}
  if (typeof record.tipo === 'string') result.tipo = record.tipo
  if (typeof record.id === 'string') result.id = record.id
  if (typeof record.codigo === 'string' || record.codigo === null) result.codigo = record.codigo
  if (typeof record.nome === 'string' || record.nome === null) result.nome = record.nome
  if (typeof record.descricao === 'string' || record.descricao === null) result.descricao = record.descricao
  if (typeof record.codigo_barras === 'string' || record.codigo_barras === null) result.codigo_barras = record.codigo_barras
  if (typeof record.referencia_interna === 'string' || record.referencia_interna === null) result.referencia_interna = record.referencia_interna
  if (typeof record.status === 'string' || record.status === null) result.status = record.status
  if (typeof record.data === 'string' || record.data === null) result.data = record.data
  if (typeof record.mensagem === 'string') result.mensagem = record.mensagem
  return result
}

export default function KioskConsultaRapida() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = code.trim()
    if (!normalized) {
      setError('Bipe ou informe um código para consultar.')
      setResult(null)
      return
    }

    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await supabase.rpc('erp_scan_barcode_metadata', { p_codigo: normalized })
      if (response.error) throw response.error
      const parsed = parseScanResult(response.data)
      if (!parsed) throw new Error('O banco não retornou metadados reconhecidos para esse código.')
      if (parsed.tipo === 'nao_encontrado') throw new Error(parsed.mensagem || 'Código não localizado na empresa autenticada.')
      setResult(parsed)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o código na empresa autenticada.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Consulta rápida por código de barras" className="mt-3 border border-[#D8E4EA] bg-white p-3">
      <form onSubmit={consult} className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <label htmlFor="kiosk-consulta-codigo" className="mb-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#496574]">
            <Barcode size={13} className="mr-1 inline" aria-hidden="true" />Consulta rápida • código / part number / RNC
          </label>
          <input
            id="kiosk-consulta-codigo"
            autoComplete="off"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            placeholder="Bipe ou digite o código"
            maxLength={160}
            className="h-8 w-full max-w-[320px] rounded-none border border-[#B8CDD7] bg-[#F4F7F9] px-2 text-xs font-mono text-[#123B50] outline-none focus:border-[#2D8DB8]"
          />
        </div>
        <button type="submit" disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-none border border-[#123B50] bg-[#123B50] px-3 text-[10px] font-bold text-white hover:bg-[#1A526D] disabled:opacity-50">
          <Search size={13} aria-hidden="true" />{busy ? 'Consultando…' : 'Consultar'}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-[#A12D32]"><AlertCircle size={14} className="shrink-0" />{error}</p>}
      {result && (
        <div role="status" className="mt-3 flex flex-wrap items-start gap-2 border border-[#B8DCCB] bg-[#F2FAF5] p-2 text-[11px] text-[#215C40]">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold">{result.tipo === 'rnc' ? 'Registro de não conformidade' : 'Produto / part number'} localizado</p>
            <p className="mt-0.5 break-words">{result.codigo || result.codigo_barras || result.referencia_interna || result.id || 'Registro localizado'}{result.nome ? ' — ' + result.nome : ''}</p>
            {result.descricao && <p className="mt-0.5 break-words">{result.descricao}</p>}
            {result.status && <p className="mt-0.5">Status: {result.status.replaceAll('_', ' ')}</p>}
            {result.data && <p className="mt-0.5">Data: {result.data}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
