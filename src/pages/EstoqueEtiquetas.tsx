/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * REVISÃO 2026-10-23 — Etiquetas do Estoque.
 * Integração da geração ZPL por produto ativo, com consulta limitada à empresa da sessão.
 * Copiar/baixar gera arquivo; não afirma acionamento direto da impressora.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Barcode, CheckCircle2, Copy, Download, Package, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type P = { id: string; codigo: string; nome: string }
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none transition focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-50'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500'

export default function EstoqueEtiquetas() {
  const [products, setProducts] = useState<P[]>([])
  const [id, setId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) throw new Error('Sessão corporativa não autenticada.')
        const profile = await supabase
          .from('erp_usuarios')
          .select('empresa_id')
          .eq('auth_user_id', auth.data.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profile.error) throw profile.error
        if (!profile.data?.empresa_id) throw new Error('Empresa da sessão não identificada.')
        const result = await supabase
          .from('erp_produtos')
          .select('id,codigo,nome')
          .eq('empresa_id', profile.data.empresa_id)
          .eq('ativo', true)
          .order('codigo')
        if (result.error) throw result.error
        if (!cancelled) setProducts((result.data ?? []) as P[])
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Falha ao carregar produtos ativos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const product = products.find(item => item.id === id)
  const zpl = useMemo(() => product ? Array.from({ length: quantity }, () => [
    '^XA', '^CI28', '^FO30,30^A0N,30,30^FDSYSNQRA ERP INDUSTRIAL^FS',
    '^FO30,70^A0N,28,28^FDSKU: ' + product.codigo + '^FS',
    '^FO30,115^BY2,3,55^BCN,55,Y,N,N^FD' + product.codigo + '^FS', '^XZ',
  ].join('\n')).join('\n') : '', [product, quantity])

  const copy = async () => {
    if (!zpl) return
    setMessage('')
    setError('')
    try {
      await navigator.clipboard.writeText(zpl)
      setMessage('ZPL copiado. Nenhuma impressora foi acionada.')
    } catch {
      setError('Não foi possível copiar automaticamente. Baixe o arquivo ZPL.')
    }
  }

  const download = () => {
    if (!zpl) return
    const url = URL.createObjectURL(new Blob([zpl], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'etiqueta-' + (product?.codigo || 'produto') + '.zpl'
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Arquivo ZPL baixado para envio à ponte de impressão.')
    setError('')
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-3 p-2 text-[11px] text-slate-800" aria-busy={loading}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div>
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700"><Barcode size={12} /> Identificação · Etiquetas industriais</p>
          <h2 className="text-sm font-black uppercase text-slate-900">Código de barras</h2>
          <p className="text-[10px] text-slate-500">Geração de arquivo ZPL para impressão; a impressora não é acionada por esta tela.</p>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border border-slate-200 bg-white px-2.5 text-[9px] font-bold uppercase text-slate-600"><Printer size={12} /> Saída ZPL</span>
      </header>

      {error && <div role="alert" className="flex items-start gap-1.5 rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{error}</div>}
      {message && <div role="status" className="flex items-start gap-1.5 rounded-[2px] border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-bold text-emerald-800"><CheckCircle2 size={13} className="mt-0.5 shrink-0" />{message}</div>}

      <div className="grid grid-cols-1 gap-3 rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-12">
        <label className={label + ' md:col-span-8'}><span className="flex items-center gap-1"><Package size={10} /> Produto ativo</span>
          <select className={input} value={id} onChange={event => { setId(event.target.value); setMessage(''); setError('') }} disabled={loading || !!error}>
            <option value="">{loading ? 'Carregando catálogo…' : 'Selecione um produto'}</option>
            {products.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
          </select>
        </label>
        <label className={label + ' md:col-span-2'}>Quantidade de etiquetas
          <input className={input + ' text-center font-mono'} type="number" min={1} max={100} step={1} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(100, Math.floor(Number(event.target.value) || 1))))} />
        </label>
        <div className="flex flex-wrap items-end gap-1.5 md:col-span-2">
          <button type="button" disabled={!zpl} onClick={() => void copy()} className="inline-flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[2px] bg-[#2D8DB8] px-2 text-[9px] font-black uppercase text-white transition-colors hover:bg-[#246f91] disabled:cursor-not-allowed disabled:opacity-50"><Copy size={12} /> Copiar</button>
          <button type="button" disabled={!zpl} onClick={download} className="inline-flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-black uppercase text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Download size={12} /> Baixar</button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm">
        <header className="flex h-8 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
          <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-700">Pré-visualização do comando</h3>
          <span className="font-mono text-[9px] text-slate-500">{product ? `${product.codigo} · ${quantity} un.` : 'Aguardando seleção'}</span>
        </header>
        <pre className="max-h-[360px] min-h-[120px] overflow-auto bg-[#10222d] p-3 font-mono text-[10px] leading-5 text-cyan-100" aria-label="Conteúdo ZPL gerado">{zpl || (loading ? 'Carregando catálogo…' : 'Selecione um produto para visualizar o ZPL.')}</pre>
      </section>
    </section>
  )
}
