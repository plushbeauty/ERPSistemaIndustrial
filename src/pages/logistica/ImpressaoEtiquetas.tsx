/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP & SGQ INDUSTRIAL
 * REV-LOG-ETIQUETAS-001 | 2026-10-21
 * Escopo: gerar prévia e registrar rastreabilidade antes de abrir diálogo de impressão.
 */
import { useState } from 'react'
import { Printer, RefreshCw, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Modelo = 'PADRAO_INDUSTRIA' | 'CAIXA_PALETE' | 'INTERNO_PROCESSO'
const modelLabel: Record<Modelo,string> = {
  PADRAO_INDUSTRIA: 'Padrão indústria · 100 × 50 mm',
  CAIXA_PALETE: 'Caixa / palete · 100 × 75 mm',
  INTERNO_PROCESSO: 'Processo interno · 80 × 40 mm',
}
const fieldClass = 'h-9 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600/20'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500'
export default function ImpressaoEtiquetas() {
  const [codigo,setCodigo] = useState('')
  const [descricao,setDescricao] = useState('')
  const [lote,setLote] = useState('')
  const [nfe,setNfe] = useState('')
  const [quantidade,setQuantidade] = useState('')
  const [data,setData] = useState(new Date().toLocaleDateString('en-CA'))
  const [modelo,setModelo] = useState<Modelo>('PADRAO_INDUSTRIA')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  async function imprimir() {
    setError(''); setMessage('')
    const qty = Number(quantidade)
    const nota = nfe.trim() ? Number(nfe) : null
    if (!codigo.trim() || !descricao.trim() || !lote.trim() || !Number.isFinite(qty) || qty <= 0) {
      setError('Preencha código, descrição, lote e quantidade maior que zero.')
      return
    }
    if (nfe.trim() && (!Number.isInteger(nota) || (nota ?? 0) <= 0)) {
      setError('A NF-e deve ser um número inteiro positivo ou ficar vazia.')
      return
    }
    setLoading(true)
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão autenticada não encontrada.')
      const log = await supabase.from('erp_log_etiquetas').insert({
        empresa_id: String(tenant.data),
        codigo_produto: codigo.trim().toUpperCase(),
        descricao_produto: descricao.trim(),
        numero_lote: lote.trim().toUpperCase(),
        numero_nfe: nota,
        quantidade_pecas: qty,
        modelo_etiqueta: modelo,
        operador_id: auth.data.user.id,
        data_emissao: data || null,
      })
      if (log.error) throw log.error
      setMessage('Registro de impressão salvo. Confirme a impressora e o tamanho do papel no diálogo do navegador.')
      window.print()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível registrar a impressão no banco.')
    } finally {
      setLoading(false)
    }
  }

  const dimensions = modelo === 'CAIXA_PALETE' ? '100mm' : modelo === 'INTERNO_PROCESSO' ? '80mm' : '100mm'
  const height = modelo === 'CAIXA_PALETE' ? '75mm' : modelo === 'INTERNO_PROCESSO' ? '40mm' : '50mm'
  return <main className="min-h-full bg-slate-50 p-4 text-slate-800 md:p-6 print:bg-white print:p-0">
    <style>{`
      @page { size: ${dimensions} ${height}; margin: 0; }
      @media print {
        body * { visibility: hidden !important; }
        .label-print, .label-print * { visibility: visible !important; }
        .label-print { position: fixed !important; left: 0 !important; top: 0 !important; width: ${dimensions} !important; height: ${height} !important; margin: 0 !important; padding: 3mm !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: hidden !important; }
        .no-print { display: none !important; }
      }
    `}</style>
    <header className="no-print mb-5 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4"><Tag size={21} className="text-sky-700"/><div><h1 className="text-lg font-bold text-[#123B50]">Impressão de Etiquetas Industriais</h1><p className="mt-1 text-xs text-slate-500">Prévia, identificação de lote e registro auditável de impressão.</p></div><span className="ml-auto rounded-sm bg-sky-100 px-2 py-1 text-[9px] font-bold uppercase text-sky-800">Zebra / Argox</span></header>
    {(error || message) && <div role={error ? 'alert' : 'status'} className={`no-print mb-4 border px-3 py-2 text-xs ${error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
    <div className="grid grid-cols-12 items-start gap-4">
      <section className="no-print col-span-12 border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(18,59,80,0.06)] lg:col-span-7">
        <h2 className="mb-4 border-b border-slate-100 pb-3 text-xs font-bold uppercase tracking-wide text-[#123B50]">Parâmetros da etiqueta</h2>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-6"><label className={labelClass}>Modelo</label><select className={fieldClass} value={modelo} onChange={e => setModelo(e.target.value as Modelo)}>{Object.entries(modelLabel).map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></div>
          <div className="col-span-12 sm:col-span-6"><label className={labelClass}>Código do produto *</label><input className={fieldClass} maxLength={50} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código cadastrado"/></div>
          <div className="col-span-12"><label className={labelClass}>Descrição técnica *</label><input className={fieldClass} maxLength={255} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do produto"/></div>
          <div className="col-span-12 sm:col-span-4"><label className={labelClass}>Lote industrial *</label><input className={fieldClass} maxLength={50} value={lote} onChange={e => setLote(e.target.value)} placeholder="Lote"/></div>
          <div className="col-span-12 sm:col-span-4"><label className={labelClass}>Número NF-e</label><input className={fieldClass} inputMode="numeric" value={nfe} onChange={e => setNfe(e.target.value.replace(/\D/g,''))} placeholder="Opcional"/></div>
          <div className="col-span-12 sm:col-span-4"><label className={labelClass}>Quantidade de peças *</label><input className={fieldClass} type="number" min="0.001" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0"/></div>
          <div className="col-span-12 sm:col-span-6"><label className={labelClass}>Data de emissão</label><input className={fieldClass} type="date" value={data} onChange={e => setData(e.target.value)}/></div>
          <div className="col-span-12 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => void imprimir()} disabled={loading} className="inline-flex h-9 items-center gap-2 bg-sky-700 px-4 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50"><Printer size={14}/>{loading ? 'Registrando…' : 'Registrar e imprimir'}</button></div>
        </div>
      </section>
      <section className="col-span-12 lg:col-span-5">
        <div className="no-print mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Pré-visualização técnica</span><button type="button" onClick={() => {setCodigo('');setDescricao('');setLote('');setNfe('');setQuantidade('');setError('');setMessage('')}} className="inline-flex h-7 items-center gap-1 text-[10px] font-semibold text-slate-500"><RefreshCw size={12}/> Limpar</button></div>
        <article className="label-print flex aspect-[2/1] w-full flex-col justify-between overflow-hidden border-2 border-dashed border-slate-300 bg-white p-4 font-mono text-black shadow-inner">
          <div className="flex items-start justify-between border-b border-black pb-2"><div><strong className="block text-sm tracking-tight">SYSNQRA ERP</strong><span className="text-[8px] uppercase tracking-wide">Identificação industrial</span></div><span className="text-right text-[9px]">{data ? data.split('-').reverse().join('/') : '—'}<span className="block">{modelo.replaceAll('_',' ')}</span></span></div>
          <div className="py-1"><div className="text-[9px] font-bold">CÓDIGO / PRODUTO</div><div className="break-words text-sm font-black">{codigo || '—'}</div><div className="break-words text-[10px]">{descricao || 'Descrição do produto'}</div></div>
          <div className="grid grid-cols-3 gap-2 border-t border-black pt-2 text-[9px]"><div><span className="block text-[7px] uppercase">Lote</span><strong className="break-words">{lote || '—'}</strong></div><div><span className="block text-[7px] uppercase">NF-e</span><strong>{nfe || '—'}</strong></div><div><span className="block text-[7px] uppercase">Quantidade</span><strong>{quantidade ? `${quantidade} un` : '—'}</strong></div></div>
          <div className="border-t border-black pt-1 text-center"><div aria-label="Representação visual de código de barras" className="mx-auto h-5 w-4/5" style={{backgroundImage:'repeating-linear-gradient(90deg,#000 0,#000 1px,transparent 1px,transparent 3px,#000 3px,#000 5px,transparent 5px,transparent 7px)'}}/><span className="text-[8px] tracking-widest">{(lote || 'LOTE') + '-' + (codigo || 'COD')}</span></div>
        </article>
        <p className="no-print mt-2 text-[10px] text-slate-500">A impressão do navegador não substitui configuração de DPI, calibração ou linguagem nativa da Zebra/Argox. Confira tamanho de mídia e escala 100% no diálogo.</p>
      </section>
    </div>
  </main>
}
