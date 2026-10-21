/**
 * @DATA_REVISAO_APROVACAO: 2026-10-20
 * @NOME_SISTEMA: SYSNQRA ERP & SGQ INDUSTRIAL
 * @REVISAO: KIOSK-CONSULTA-RAPIDA-01
 * @ESCOPO: consulta real via RPC autenticada; sem resultados simulados.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Barcode, Search, ShieldAlert, RefreshCw, Layers, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export type TracingNode = {
  id: string
  codigo_lote: string
  tipo_componente: string
  status_inspecao: 'APROVADO' | 'REJEITADO' | 'EM_SETUP'
  quantidade: number
}

export type DadosConsultaResultado = {
  id_registro: string
  codigo_varrido: string
  tipo_modulo: 'PCP' | 'QUALIDADE' | 'SUPRIMENTOS'
  titulo_principal: string
  subtitulo_detalhe: string
  status_operacional: 'Online' | 'Offline' | 'Bloqueado' | 'Em Setup'
  arvore_rastreabilidade: TracingNode[]
}

interface KioskProps {
  onRecordFound?: (data: DadosConsultaResultado) => void
  onCloseKiosk?: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseResult(value: unknown): DadosConsultaResultado | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!isRecord(row)) return null

  const validModules = ['PCP', 'QUALIDADE', 'SUPRIMENTOS']
  const validStatuses = ['Online', 'Offline', 'Bloqueado', 'Em Setup']
  if (
    typeof row.id_registro !== 'string' ||
    typeof row.codigo_varrido !== 'string' ||
    typeof row.titulo_principal !== 'string' ||
    typeof row.subtitulo_detalhe !== 'string' ||
    !validModules.includes(String(row.tipo_modulo)) ||
    !validStatuses.includes(String(row.status_operacional)) ||
    !Array.isArray(row.arvore_rastreabilidade)
  ) return null

  const nodes: TracingNode[] = []
  for (const item of row.arvore_rastreabilidade) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.codigo_lote !== 'string' ||
      typeof item.tipo_componente !== 'string' ||
      !['APROVADO', 'REJEITADO', 'EM_SETUP'].includes(String(item.status_inspecao)) ||
      typeof item.quantidade !== 'number'
    ) return null

    nodes.push({
      id: item.id,
      codigo_lote: item.codigo_lote,
      tipo_componente: item.tipo_componente,
      status_inspecao: item.status_inspecao as TracingNode['status_inspecao'],
      quantidade: item.quantidade,
    })
  }

  return {
    id_registro: row.id_registro,
    codigo_varrido: row.codigo_varrido,
    tipo_modulo: row.tipo_modulo as DadosConsultaResultado['tipo_modulo'],
    titulo_principal: row.titulo_principal,
    subtitulo_detalhe: row.subtitulo_detalhe,
    status_operacional: row.status_operacional as DadosConsultaResultado['status_operacional'],
    arvore_rastreabilidade: nodes,
  }
}

export default function KioskConsultaRapida({ onRecordFound, onCloseKiosk }: KioskProps) {
  const [barcodeInput, setBarcodeQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DadosConsultaResultado | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    inputRef.current?.focus()
    return () => { mountedRef.current = false }
  }, [])

  const executarVarreduraOptica = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const codeClean = barcodeInput.trim().toUpperCase()
    if (!codeClean || loading) {
      inputRef.current?.focus()
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'erp_scan_barcode_metadata',
        { barcode_string: codeClean },
      )
      if (rpcError) throw rpcError

      const mapped = parseResult(data)
      if (!mapped) {
        setError('Nenhum registro válido encontrado para este código na empresa autenticada.')
        return
      }

      if (!mountedRef.current) return
      setResult(mapped)
      onRecordFound?.(mapped)
    } catch {
      if (mountedRef.current) {
        setError('Falha na consulta. Verifique a sessão, a permissão de acesso e a configuração da função de leitura.')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
  }, [barcodeInput, loading, onRecordFound])

  return (
    <section className="w-full min-w-0 border border-[#D8E4EA] bg-white p-3 text-[#123B50] shadow-sm antialiased sm:p-4" aria-label="Consulta rápida por código">
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-[#D8E4EA] pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Barcode size={18} className="shrink-0 text-[#2D8DB8]" aria-hidden="true" />
          <span className="truncate text-[10px] font-black uppercase tracking-widest">Consulta rápida · Leitor óptico</span>
        </div>
        {onCloseKiosk && (
          <button type="button" onClick={onCloseKiosk} aria-label="Fechar consulta rápida" className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-[#D65B61] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]">
            <X size={16} />
          </button>
        )}
      </header>

      <form onSubmit={executarVarreduraOptica} className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="kiosk-barcode" className="sr-only">Código de barras ou código interno</label>
        <input
          id="kiosk-barcode"
          ref={inputRef}
          type="text"
          value={barcodeInput}
          onChange={event => setBarcodeQuery(event.target.value)}
          placeholder="Aguardando leitura ou digitação do código…"
          autoComplete="off"
          spellCheck={false}
          maxLength={160}
          className="h-8 min-w-0 w-full rounded-[2px] border border-[#48B7C7] bg-[#F4FBFD] px-2.5 text-xs font-mono font-bold text-[#123B50] outline-none focus:ring-2 focus:ring-[#48B7C7]/30"
        />
        <button type="submit" disabled={loading || !barcodeInput.trim()} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[2px] bg-[#123B50] px-4 text-xs font-bold text-white transition-colors hover:bg-[#0E1E2F] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#48B7C7]">
          {loading ? <RefreshCw size={13} className="animate-spin text-[#48B7C7]" /> : <Search size={13} />}
          {loading ? 'CONSULTANDO' : 'CONSULTAR'}
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-1.5 border-l-2 border-[#D65B61] bg-[#D65B61]/10 p-2 font-mono text-[11px] text-[#B64049]">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 border border-[#D8E4EA] bg-[#F8FAFC] p-3 md:grid-cols-12">
          <div className="min-w-0 space-y-2 md:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`border px-2 py-0.5 font-mono text-[8px] font-black uppercase ${
                result.status_operacional === 'Online' ? 'border-[#3A9D78] bg-[#3A9D78]/10 text-[#3A9D78]' :
                result.status_operacional === 'Bloqueado' ? 'border-[#D65B61] bg-[#D65B61]/10 text-[#D65B61]' :
                'border-[#E6A34A] bg-[#E6A34A]/10 text-[#A56B15]'
              }`}>
                ● {result.status_operacional}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">MÓDULO: {result.tipo_modulo}</span>
            </div>
            <h3 className="break-words font-mono text-xs font-black uppercase tracking-tight text-[#123B50]">{result.titulo_principal}</h3>
            <p className="break-words text-[11px] leading-relaxed text-slate-600">{result.subtitulo_detalhe}</p>
            <p className="break-all font-mono text-[9px] text-slate-400">CÓDIGO: {result.codigo_varrido} · REGISTRO: {result.id_registro}</p>
          </div>

          <div className="min-w-0 space-y-2 border border-[#2E4A62] bg-[#0E1E2F] p-3 text-white md:col-span-5">
            <span className="block text-[9px] font-black uppercase tracking-widest text-[#48B7C7]">Rastreabilidade retornada pelo banco</span>
            {result.arvore_rastreabilidade.length ? (
              <div className="space-y-2 font-mono text-[10px]">
                {result.arvore_rastreabilidade.map(node => (
                  <div key={node.id} className="flex min-w-0 items-start justify-between gap-2 text-slate-300">
                    <div className="flex min-w-0 items-start gap-1">
                      <Layers size={11} className="mt-0.5 shrink-0 text-[#48B7C7]" />
                      <span className="break-all" title={node.codigo_lote}>{node.codigo_lote}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
                      <span className="max-w-[120px] text-right text-[8px] text-slate-400">{node.tipo_componente}</span>
                      <span className={`text-[8px] font-black ${
                        node.status_inspecao === 'APROVADO' ? 'text-[#3A9D78]' :
                        node.status_inspecao === 'REJEITADO' ? 'text-[#D65B61]' : 'text-[#E6A34A]'
                      }`}>[{node.status_inspecao}] · QTD {node.quantidade}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">O banco não retornou itens de rastreabilidade para este registro.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
