/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_ANTERIOR: QUALIDADE-QUARENTENA-STEEL-BLUE-REVISAO
 * @ESCOPO: Interface compacta; retenção transacional existente preservada via erp_reter_lote.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Ban, CheckCircle2, ClipboardList, LockKeyhole, RefreshCw, Search, Server, ShieldAlert, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

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

const inputClass = 'h-8 w-full rounded-none border border-[#2E4A62] bg-[#071522] px-2.5 text-[10px] font-mono font-bold text-[#F4FBFD] outline-none placeholder:text-slate-500 focus:border-[#48B7C7] disabled:cursor-not-allowed disabled:opacity-60'
const labelClass = 'mb-1 block text-[9px] font-black uppercase tracking-widest text-[#9CB4C3]'
const panelClass = 'min-w-0 border border-[#2E4A62] bg-[#0D2638] shadow-sm'

export default function QualidadeQuarentena() {
  const [empresaId, setEmpresaId] = useState('')
  const [query, setQuery] = useState('')
  const [lot, setLot] = useState<Lot | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [reason, setReason] = useState('')
  const [rows, setRows] = useState<Quarantine[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [databaseRead, setDatabaseRead] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão autenticada não identificada.')
      const companyId = String(tenant.data)
      setEmpresaId(companyId)
      const { data, error: listError } = await supabase
        .from('erp_quarentenas_lotes')
        .select('id,lote_id,motivo,status,created_at')
        .eq('empresa_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (listError) throw listError
      setRows((data ?? []) as Quarantine[])
      setDatabaseRead(true)
    } catch (cause) {
      setDatabaseRead(false)
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar as quarentenas da empresa.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(row => `${row.lote_id} ${row.motivo} ${row.status}`.toLocaleLowerCase('pt-BR').includes(term))
  }, [rows, query])

  const localizar = async (event?: FormEvent) => {
    event?.preventDefault()
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
      let tenantId = empresaId
      if (!tenantId) {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error) throw tenant.error
        if (!tenant.data) throw new Error('Empresa não identificada.')
        tenantId = String(tenant.data)
        setEmpresaId(tenantId)
      }
      const lotColumns = 'id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel,status_inspecao'
      const internalLookup = await supabase.from('erp_estoque_lotes').select(lotColumns).eq('empresa_id', tenantId).eq('lote_interno', codigo).maybeSingle()
      if (internalLookup.error) throw internalLookup.error
      const supplierLookup = internalLookup.data ? null : await supabase.from('erp_estoque_lotes').select(lotColumns).eq('empresa_id', tenantId).eq('lote_fornecedor', codigo).maybeSingle()
      if (supplierLookup?.error) throw supplierLookup.error
      const data = internalLookup.data ?? supplierLookup?.data
      if (!data) throw new Error('Lote não encontrado na empresa atual. Confira o código informado.')
      setLot(data as Lot)
      const { data: productData, error: productError } = await supabase
        .from('erp_produtos')
        .select('codigo,nome')
        .eq('id', data.produto_id)
        .eq('empresa_id', tenantId)
        .maybeSingle()
      if (productError) throw productError
      setProduct(productData as Product | null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao localizar o lote.')
    } finally {
      setBusy(false)
    }
  }

  const reter = async (event: FormEvent) => {
    event.preventDefault()
    if (!lot) {
      setError('Localize um lote válido antes de registrar a retenção.')
      return
    }
    if (reason.trim().length < 5) {
      setError('Informe um motivo técnico com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_reter_lote', {
        p_lote_id: lot.id,
        p_motivo: reason.trim(),
      })
      if (rpcError) throw rpcError
      setMessage(`Retenção registrada pelo banco. Protocolo de quarentena: ${String(data)}.`)
      setReason('')
      await carregar()
      const { data: refreshedLot, error: refreshError } = await supabase
        .from('erp_estoque_lotes')
        .select('id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel,status_inspecao')
        .eq('id', lot.id)
        .eq('empresa_id', empresaId)
        .maybeSingle()
      if (refreshError) throw refreshError
      if (refreshedLot) setLot(refreshedLot as Lot)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao executar a retenção transacional.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0E1E2F] p-2.5 font-mono text-[#F4FBFD] antialiased sm:p-3">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-[#2E4A62] bg-[#0D2638] p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#2E4A62] bg-[#071522] text-[#48B7C7]"><ShieldAlert size={19} /></span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#48B7C7]">MOLDPLÁS ERP · SGQ / CONTENÇÃO</p>
              <h1 className="text-sm font-black uppercase tracking-wide text-white sm:text-base">Quarentena de lotes e materiais bloqueados</h1>
              <p className="mt-0.5 text-[9px] font-semibold text-slate-400">Retenção transacional de lotes com rastreabilidade por empresa autenticada.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 border border-[#2E4A62] bg-[#071522] px-2.5 text-[9px] font-black uppercase">
              <Server size={12} className={loading ? 'animate-pulse text-amber-400' : databaseRead ? 'text-emerald-400' : 'text-rose-400'} />
              <span className="text-slate-300">{loading ? 'Consultando banco' : databaseRead ? 'Leitura do banco confirmada' : 'Banco indisponível'}</span>
            </div>
            <button type="button" onClick={() => void carregar()} disabled={loading || busy} className="inline-flex h-8 items-center gap-1.5 border border-[#2E4A62] bg-[#123B50] px-2.5 text-[9px] font-black uppercase hover:border-[#48B7C7] disabled:opacity-50">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-2 border border-rose-800 bg-[#321821] px-3 py-2 text-[10px] font-bold text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex items-start gap-2 border border-emerald-800 bg-[#102C29] px-3 py-2 text-[10px] font-bold text-emerald-200"><CheckCircle2 size={14} className="mt-0.5 shrink-0" />{message}</div>}

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
          <section className={`${panelClass} xl:col-span-7`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#071522] p-2.5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white"><ClipboardList size={14} className="text-[#48B7C7]" /> Quarentenas recentes</div>
              <span className="border border-[#2E4A62] bg-[#0D2638] px-2 py-1 text-[8px] font-black text-[#48B7C7]">{filteredRows.length} REGISTROS</span>
            </header>
            <div className="flex flex-wrap items-center gap-2 border-b border-[#2E4A62] p-2.5">
              <div className="flex h-8 min-w-[180px] flex-1 items-center border border-[#2E4A62] bg-[#071522] px-2">
                <Search size={12} className="shrink-0 text-slate-400" />
                <input aria-label="Filtrar quarentenas" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrar lote, motivo ou status..." className="h-full w-full min-w-0 bg-transparent px-2 text-[10px] font-bold outline-none placeholder:text-slate-500" />
              </div>
              <button type="button" onClick={() => { setQuery(''); setLot(null); setProduct(null); setReason(''); setError(''); setMessage('') }} className="h-8 border border-[#2E4A62] bg-[#123B50] px-3 text-[9px] font-black uppercase hover:border-[#48B7C7]">Limpar mesa</button>
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead className="sticky top-0 z-10 bg-[#071522] text-[8px] font-black uppercase tracking-wider text-[#48B7C7]">
                  <tr className="h-8 border-b border-[#2E4A62]"><th className="px-2 py-1.5">Data</th><th className="px-2 py-1.5">Lote ID</th><th className="px-2 py-1.5">Motivo técnico</th><th className="px-2 py-1.5">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#2E4A62]/70">
                  {filteredRows.map(row => (
                    <tr key={row.id} className="h-9 hover:bg-[#123B50]/70">
                      <td className="whitespace-nowrap px-2 py-1.5 text-slate-400">{new Date(row.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="max-w-[140px] truncate px-2 py-1.5 font-bold text-white" title={row.lote_id}>{row.lote_id.slice(0, 8).toUpperCase()}</td>
                      <td className="max-w-[260px] truncate px-2 py-1.5 text-slate-300" title={row.motivo}>{row.motivo}</td>
                      <td className="px-2 py-1.5"><span className={`inline-flex border px-1.5 py-0.5 text-[8px] font-black uppercase ${row.status === 'RETIDO' ? 'border-rose-800 bg-rose-950 text-rose-300' : row.status === 'LIBERADO' ? 'border-emerald-800 bg-emerald-950 text-emerald-300' : 'border-amber-800 bg-amber-950 text-amber-300'}`}>{row.status}</span></td>
                    </tr>
                  ))}
                  {!loading && filteredRows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-[10px] font-bold text-slate-500">Nenhuma quarentena encontrada para este filtro.</td></tr>}
                  {loading && <tr><td colSpan={4} className="px-3 py-8 text-center text-[10px] font-bold text-slate-400">Consultando registros...</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="border-t border-[#2E4A62] bg-[#071522] px-2.5 py-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Exibe até 100 ocorrências recentes da empresa autenticada.</footer>
          </section>

          <section className={`${panelClass} xl:col-span-5`}>
            <header className="flex items-center gap-2 border-b border-[#2E4A62] bg-[#071522] p-2.5">
              <LockKeyhole size={14} className="text-rose-400" />
              <div><h2 className="text-[10px] font-black uppercase tracking-wider text-white">Reter lote / bloqueio técnico</h2><p className="mt-0.5 text-[9px] text-slate-400">Selecione um lote real do estoque para abrir a ocorrência.</p></div>
            </header>
            <form onSubmit={event => void reter(event)} className="space-y-3 p-3">
              <div>
                <label htmlFor="quarantine-lot-query" className={labelClass}>Lote interno ou do fornecedor *</label>
                <div className="flex gap-1.5">
                  <input id="quarantine-lot-query" value={query} onChange={event => setQuery(event.target.value)} placeholder="Código do lote..." className={inputClass} required />
                  <button type="button" onClick={() => void localizar()} disabled={busy || !query.trim()} aria-label="Localizar lote" className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[#2E4A62] bg-[#17617A] px-3 text-[9px] font-black uppercase hover:border-[#48B7C7] disabled:opacity-50"><Search size={12} /> Localizar</button>
                </div>
              </div>

              {lot && <div className="grid grid-cols-2 gap-2 border border-[#2E4A62] bg-[#071522] p-2.5">
                <div className="col-span-2"><span className={labelClass}>Produto identificado</span><p className="text-[10px] font-black text-white">{product ? `${product.codigo} — ${product.nome}` : 'Produto sem descrição disponível'}</p></div>
                <div><span className={labelClass}>Lote interno</span><p className="break-all text-[10px] font-bold text-[#48B7C7]">{lot.lote_interno}</p></div>
                <div><span className={labelClass}>Saldo disponível</span><p className="text-[10px] font-black text-white">{lot.quantidade_disponivel}</p></div>
                <div className="col-span-2"><span className={labelClass}>Status de inspeção</span><p className={`text-[10px] font-black ${lot.status_inspecao === 'RETIDO' ? 'text-rose-300' : 'text-slate-200'}`}>{lot.status_inspecao ?? 'NÃO INFORMADO'}</p></div>
              </div>}

              <div>
                <label htmlFor="quarantine-reason" className={labelClass}>Motivo técnico / laudo RNC *</label>
                <textarea id="quarantine-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Descreva o desvio observado, evidência e risco do material..." className="min-h-[92px] w-full resize-y rounded-none border border-[#2E4A62] bg-[#071522] p-2.5 text-[10px] font-semibold text-[#F4FBFD] outline-none placeholder:text-slate-500 focus:border-[#48B7C7]" required minLength={5} />
                <p className="mt-1 text-[8px] text-slate-500">Mínimo de 5 caracteres. O banco valida a sessão, empresa e o lote.</p>
              </div>

              <div className="flex items-start gap-2 border border-amber-900/80 bg-[#2B2113] p-2.5 text-[9px] font-semibold leading-relaxed text-amber-200">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                A gravação usa a RPC transacional existente. O banco marca o lote como RETIDO e registra a ocorrência; não declara liberação ou movimentação de saldo.
              </div>

              <button type="submit" disabled={busy || !lot || reason.trim().length < 5} className="inline-flex h-8 w-full items-center justify-center gap-2 border border-[#48B7C7] bg-[#17617A] px-3 text-[9px] font-black uppercase tracking-wider text-white hover:bg-[#1D718B] disabled:cursor-not-allowed disabled:opacity-50">
                <Ban size={13} /> {busy ? 'Processando retenção...' : 'Confirmar retenção transacional'}
              </button>
              <button type="button" disabled={busy} onClick={() => { setLot(null); setProduct(null); setReason(''); setMessage(''); setError('') }} className="h-8 w-full border border-[#2E4A62] bg-transparent px-3 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:bg-[#071522] disabled:opacity-50">Limpar formulário</button>
            </form>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E4A62] pt-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> MOLDPLÁS · CONTROLE SGQ</span>
          <span>Empresa: {empresaId ? empresaId.slice(0, 8).toUpperCase() : 'AGUARDANDO SESSÃO'} · Revisão 2026-10-19</span>
        </footer>
      </div>
    </main>
  )
}
