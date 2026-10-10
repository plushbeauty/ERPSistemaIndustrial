import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { AlertTriangle, Ban, LockKeyhole, RefreshCw, Search, ShieldCheck, UnlockKeyhole } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'

type Lot = { id: string; lote_interno: string; lote_fornecedor: string | null; produto_id: string; quantidade_disponivel: number; status_inspecao: string | null }
type Product = { codigo: string; nome: string }
type Quarantine = { id: string; lote_id: string; motivo: string; status: string; created_at: string }

export default function QualidadeQuarentena(): ReactElement {
  const [query, setQuery] = useState('')
  const [lot, setLot] = useState<Lot | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [reason, setReason] = useState('')
  const [rows, setRows] = useState<Quarantine[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const carregar = useCallback(async () => {
    setError('')
    const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
    if (empresaError) { setError(empresaError.message); return }
    if (!empresaId) { setError('Empresa não identificada.'); return }
    const { data, error: listError } = await supabase.from('erp_quarentenas_lotes').select('id,lote_id,motivo,status,created_at').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(50)
    if (listError) setError(listError.message)
    else setRows((data ?? []) as Quarantine[])
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const localizar = async () => {
    const codigo = query.trim()
    if (!codigo) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { data: empresaId, error: empresaError } = await supabase.rpc('erp_current_empresa_id')
      if (empresaError) throw empresaError
      if (!empresaId) throw new Error('Empresa não identificada.')
      const { data, error: lotError } = await supabase.from('erp_estoque_lotes').select('id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel,status_inspecao').eq('empresa_id', empresaId).or(`lote_interno.eq.${codigo},lote_fornecedor.eq.${codigo}`).maybeSingle()
      if (lotError) throw lotError
      if (!data) throw new Error('Lote não encontrado na empresa atual.')
      setLot(data as Lot)
      const { data: productData, error: productError } = await supabase.from('erp_produtos').select('codigo,nome').eq('id', data.produto_id).eq('empresa_id', empresaId).maybeSingle()
      if (productError) throw productError
      setProduct(productData)
    } catch (err) {
      setLot(null); setProduct(null); setError(err instanceof Error ? err.message : 'Falha ao localizar lote.')
    } finally { setBusy(false) }
  }

  const reter = async () => {
    if (!lot || reason.trim().length < 5) { setError('Selecione um lote e informe um motivo com pelo menos 5 caracteres.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_reter_lote', { p_lote_id: lot.id, p_motivo: reason.trim() })
      if (rpcError) throw rpcError
      setMessage(`Lote retido. Quarentena ${String(data)} registrada e status de qualidade atualizado.`)
      setReason('')
      await localizar()
      await carregar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reter lote.')
    } finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 md:p-4 text-slate-900"><QualitySidebar active="/qualidade/quarentena" />
      <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-rose-700" /><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Qualidade</p><h1 className="text-xl font-black">Central de Bloqueio e Quarentena</h1></div></div>
          <button type="button" onClick={() => void carregar()} className="inline-flex h-[54px] items-center gap-2 rounded-lg border px-4 font-bold"><RefreshCw size={17} /> Atualizar</button>
        </header>
        <div className="space-y-6 p-5">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 font-bold text-rose-900">{error}</div>}
          {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{message}</div>}
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-slate-200 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase"><LockKeyhole size={18} /> Reter novo lote</h2>
              <label className="text-xs font-black uppercase text-slate-600">Lote
                <div className="mt-1 flex"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void localizar() }} placeholder="Lote interno ou fornecedor" className="h-[54px] w-full rounded-l-lg border px-4 font-bold" /><button type="button" disabled={busy} onClick={() => void localizar()} className="h-[54px] rounded-r-lg bg-slate-900 px-5 text-white disabled:opacity-50"><Search size={18} /></button></div>
              </label>
              {lot && <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4"><div><span className="text-xs font-black uppercase text-slate-500">Lote</span><p className="font-black">{lot.lote_interno}</p></div><div><span className="text-xs font-black uppercase text-slate-500">Produto</span><p className="font-bold">{product ? `${product.codigo} — ${product.nome}` : '—'}</p></div><div><span className="text-xs font-black uppercase text-slate-500">Saldo disponível</span><p className="font-bold">{lot.quantidade_disponivel}</p></div><div><span className="text-xs font-black uppercase text-slate-500">Status atual</span><p className="font-bold">{lot.status_inspecao ?? 'não informado'}</p></div></div>}
              <label className="mt-4 block text-xs font-black uppercase text-slate-600">Motivo da retenção<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva a não conformidade ou suspeita." className="mt-1 min-h-28 w-full rounded-lg border p-3 text-sm font-medium" /></label>
              <button type="button" disabled={busy || !lot || reason.trim().length < 5} onClick={() => void reter()} className="mt-4 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Ban size={18} /> RETER LOTE E BLOQUEAR</button>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex items-start gap-3"><AlertTriangle className="mt-1 text-rose-700" /><div><h2 className="font-black">Bloqueio de segurança</h2><p className="mt-1 text-sm font-medium text-rose-900">A retenção é transacional no Supabase: o lote recebe status RETIDO e a ocorrência é auditável. A emissão fiscal e os movimentos de estoque devem consultar esse status antes de confirmar a operação.</p></div></div>
            </div>
          </div>
          <div><h2 className="mb-2 text-sm font-black uppercase">Quarentenas recentes</h2><div className="overflow-x-auto rounded-lg border"><table className="w-full text-left"><thead><tr className="h-[54px] bg-slate-100 text-xs font-black uppercase"><th className="p-3">Data</th><th className="p-3">Lote</th><th className="p-3">Motivo</th><th className="p-3">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="h-[54px] border-t"><td className="p-3">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="p-3 font-bold">{row.lote_id}</td><td className="p-3">{row.motivo}</td><td className="p-3 font-black">{row.status}</td></tr>)}{rows.length===0 && <tr className="h-[54px]"><td colSpan={4} className="p-3 text-center text-slate-500">Nenhuma retenção registrada.</td></tr>}</tbody></table></div></div>
        </div>
      </section>
    </main>
  )
}
