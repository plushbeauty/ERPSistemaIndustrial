/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_APROVACAO: QUALIDADE-QUARENTENA-STEEL-BLUE-OK
 * @ESCOPO: UI Steel Blue compacta; preserva a RPC transacional erp_reter_lote e o schema existente.
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { AlertTriangle, Ban, LockKeyhole, RefreshCw, Search, ShieldCheck, Server } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'

type Lot = {
  id: string
  lote_interno: string
  lote_fornecedor: string | null
  produto_id: string
  quantidade_disponivel: number
  status_inspecao: string | null
}
type Product = { codigo: string; nome: string }
type Quarantine = { id: string; lote_id: string; motivo: string; status: string; created_at: string }

const panelClass = 'min-w-0 border border-[#2E4A62] bg-[#0D2638] shadow-sm'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-widest text-[#8DA7BB]'
const inputClass = 'h-8 w-full min-w-0 rounded-none border border-[#2E4A62] bg-[#0E1E2F] px-2.5 text-xs font-mono font-bold text-[#F4FBFD] outline-none transition-colors placeholder:text-slate-500 focus:border-[#48B7C7] disabled:cursor-not-allowed disabled:opacity-60'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#2E4A62] px-3 text-[9px] font-black uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export default function QualidadeQuarentena(): ReactElement {
  const [query, setQuery] = useState('')
  const [lot, setLot] = useState<Lot | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [reason, setReason] = useState('')
  const [rows, setRows] = useState<Quarantine[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tenantReady, setTenantReady] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (!empresaId) throw new Error('Empresa não identificada na sessão autenticada.')
      setTenantReady(true)
      const { data, error: listError } = await supabase
        .from('erp_quarentenas_lotes')
        .select('id,lote_id,motivo,status,created_at')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (listError) throw listError
      setRows((data ?? []) as Quarantine[])
    } catch (err) {
      setTenantReady(false)
      setError(err instanceof Error ? err.message : 'Falha ao consultar quarentenas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const localizar = async () => {
    const codigo = query.trim()
    if (!codigo) {
      setError('Informe o lote interno ou o lote do fornecedor.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    setLot(null)
    setProduct(null)
    try {
      const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (!empresaId) throw new Error('Empresa não identificada na sessão autenticada.')
      const { data, error: lotError } = await supabase
        .from('erp_estoque_lotes')
        .select('id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel,status_inspecao')
        .eq('empresa_id', empresaId)
        .or(`lote_interno.eq.${codigo},lote_fornecedor.eq.${codigo}`)
        .maybeSingle()
      if (lotError) throw lotError
      if (!data) throw new Error('Lote não encontrado na empresa atual.')
      setLot(data as Lot)
      const { data: productData, error: productError } = await supabase
        .from('erp_produtos')
        .select('codigo,nome')
        .eq('id', data.produto_id)
        .eq('empresa_id', empresaId)
        .maybeSingle()
      if (productError) throw productError
      setProduct(productData as Product | null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao localizar lote.')
    } finally {
      setBusy(false)
    }
  }

  const reter = async () => {
    if (!lot || reason.trim().length < 5) {
      setError('Selecione um lote e informe o motivo com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      // A RPC existente realiza a retenção transacional e valida a sessão no banco.
      const { data, error: rpcError } = await supabase.rpc('erp_reter_lote', {
        p_lote_id: lot.id,
        p_motivo: reason.trim(),
      })
      if (rpcError) throw rpcError
      setMessage(`Lote retido com sucesso. Registro de quarentena: ${String(data)}.`)
      setReason('')
      setLot(null)
      setProduct(null)
      setQuery('')
      await carregar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar retenção no banco.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0E1E2F] p-2.5 font-mono text-[#F4FBFD] antialiased md:p-3">
      <QualitySidebar active="/qualidade/quarentena" />
      <section className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-[#2E4A62] bg-[#0D2638] p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 shrink-0 text-[#48B7C7]" />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#48B7C7]">MOLDPLÁS ERP · SGQ</p>
              <h1 className="text-sm font-black uppercase tracking-wide sm:text-base">Quarentena de lotes e materiais bloqueados</h1>
              <p className="mt-1 text-[10px] text-slate-400">Retenção transacional, rastreabilidade e segregação de não conformidades.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-7 items-center gap-1.5 border px-2 text-[8px] font-black uppercase tracking-wide ${tenantReady ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : 'border-amber-800 bg-amber-950 text-amber-300'}`}>
              <Server size={12} /> {tenantReady ? 'Sessão / empresa identificada' : 'Verificando sessão'}
            </span>
            <button type="button" disabled={loading} onClick={() => void carregar()} className={`${buttonClass} bg-[#123B50] text-white hover:bg-[#18516B]`}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="alert" className="border border-rose-800 bg-rose-950/70 p-2.5 text-xs font-bold text-rose-200">{error}</div>}
        {message && <div role="status" className="border border-emerald-800 bg-emerald-950/70 p-2.5 text-xs font-bold text-emerald-200">{message}</div>}

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
          <section className={`${panelClass} xl:col-span-5`}>
            <header className="flex items-center gap-2 border-b border-[#2E4A62] bg-[#0E1E2F] px-3 py-2.5">
              <LockKeyhole size={14} className="text-[#48B7C7]" />
              <h2 className="text-[10px] font-black uppercase tracking-widest">Reter novo lote</h2>
            </header>
            <div className="space-y-3 p-3">
              <div>
                <label htmlFor="qua-lote" className={labelClass}>Lote interno ou lote do fornecedor *</label>
                <div className="flex min-w-0 gap-1.5">
                  <input id="qua-lote" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void localizar() } }} placeholder="Informe a identificação física" className={inputClass} />
                  <button type="button" disabled={busy || !query.trim()} onClick={() => void localizar()} aria-label="Localizar lote" className={`${buttonClass} shrink-0 bg-[#2D8DB8] text-white hover:bg-[#236f91]`}>
                    <Search size={13} /> Localizar
                  </button>
                </div>
              </div>

              {lot && (
                <div className="grid grid-cols-1 gap-2 border border-[#2E4A62] bg-[#071522] p-2.5 sm:grid-cols-2">
                  <div className="min-w-0"><span className={labelClass}>Lote interno</span><p className="break-words text-xs font-black text-[#48B7C7]">{lot.lote_interno}</p></div>
                  <div className="min-w-0"><span className={labelClass}>Produto / SKU</span><p className="break-words text-xs font-bold">{product ? `${product.codigo} — ${product.nome}` : 'Produto não disponível'}</p></div>
                  <div><span className={labelClass}>Saldo disponível</span><p className="text-sm font-black tabular-nums">{lot.quantidade_disponivel}</p></div>
                  <div><span className={labelClass}>Status de inspeção</span><p className="text-xs font-black uppercase text-amber-300">{lot.status_inspecao || 'Não informado'}</p></div>
                </div>
              )}

              <div>
                <label htmlFor="qua-motivo" className={labelClass}>Motivo técnico / descrição da não conformidade *</label>
                <textarea id="qua-motivo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o desvio identificado e a evidência observada..." rows={4} className="w-full resize-y rounded-none border border-[#2E4A62] bg-[#0E1E2F] p-2.5 text-xs font-semibold text-[#F4FBFD] outline-none placeholder:text-slate-500 focus:border-[#48B7C7]" />
                <p className="mt-1 text-[9px] text-slate-500">Mínimo de 5 caracteres. A operação final é validada pela função do banco.</p>
              </div>
              <button type="button" disabled={busy || !lot || reason.trim().length < 5} onClick={() => void reter()} className={`${buttonClass} w-full border-rose-800 bg-rose-700 text-white hover:bg-rose-800`}>
                <Ban size={13} /> {busy ? 'Processando retenção...' : 'Reter lote e registrar bloqueio'}
              </button>
            </div>
          </section>

          <section className={`${panelClass} xl:col-span-7`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#0E1E2F] px-3 py-2.5">
              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#48B7C7]" /><h2 className="text-[10px] font-black uppercase tracking-widest">Quarentenas recentes</h2></div>
              <span className="border border-[#2E4A62] px-2 py-1 text-[9px] font-black text-slate-300">{rows.length} REGISTROS · LIMITE 50</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead><tr className="h-8 border-b border-[#2E4A62] bg-[#071522] text-[8px] font-black uppercase tracking-wider text-[#48B7C7]">
                  <th className="whitespace-nowrap px-2.5 py-2">Data / hora</th><th className="px-2.5 py-2">Lote ID</th><th className="min-w-40 px-2.5 py-2">Motivo</th><th className="px-2.5 py-2">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-[#2E4A62]/70">
                  {rows.map((row) => <tr key={row.id} className="min-h-8 hover:bg-[#123B50]/60">
                    <td className="whitespace-nowrap px-2.5 py-2 text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '—'}</td>
                    <td className="whitespace-nowrap px-2.5 py-2 font-black text-[#48B7C7]">{row.lote_id}</td>
                    <td className="max-w-sm px-2.5 py-2 text-slate-200">{row.motivo}</td>
                    <td className="whitespace-nowrap px-2.5 py-2"><span className={`inline-flex border px-1.5 py-0.5 text-[8px] font-black uppercase ${String(row.status).toUpperCase() === 'RETIDO' ? 'border-rose-800 bg-rose-950 text-rose-300' : 'border-[#2E4A62] bg-[#071522] text-slate-300'}`}>{row.status || '—'}</span></td>
                  </tr>)}
                  {!loading && rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-[10px] text-slate-400">Nenhuma retenção registrada para a empresa autenticada.</td></tr>}
                  {loading && <tr><td colSpan={4} className="p-6 text-center text-[10px] text-slate-400">Consultando registros no Supabase...</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="flex items-start gap-2 border-t border-[#2E4A62] bg-[#071522] p-2.5 text-[9px] leading-relaxed text-slate-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
              <p>A tela registra retenção por meio da RPC existente <span className="font-bold text-slate-200">erp_reter_lote</span>. Não executa liberação, reclassificação nem expurgo diretamente; essas destinações exigem fluxo autorizado próprio.</p>
            </footer>
          </section>
        </div>
      </section>
    </main>
  )
}
