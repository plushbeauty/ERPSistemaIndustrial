/**
 * REVISÃO 2026-10-23 — Etiquetas industriais de estoque.
 * Modelos compactos para produto, saco, caixa/palete e processo interno.
 * Dados da empresa e produto carregados do tenant autenticado; sem dados de demonstração.
 * Imprimir abre o diálogo do navegador; Baixar ZPL gera arquivo para impressora térmica compatível.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Barcode, CheckCircle2, Copy, Download, Package, Printer, RefreshCw, Tags } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product = { id: string; codigo: string; nome: string; descricao_resumida: string | null; codigo_barras: string | null; unidade: string | null; peso_bruto: number | null; peso_liquido: number | null }
type Company = { razao_social: string | null; nome_fantasia: string | null; cnpj: string | null; endereco: string | null; cidade: string | null; uf: string | null; cep: string | null; logo_url: string | null; logo_impressao_url: string | null }
type Model = 'PRODUTO' | 'SACO' | 'CAIXA' | 'PROCESSO'
const models: Record<Model, { label: string; width: number; height: number; dbModel: 'PADRAO_INDUSTRIA' | 'CAIXA_PALETE' | 'INTERNO_PROCESSO' }> = {
  PRODUTO: { label: 'Produto · 100 × 50 mm', width: 100, height: 50, dbModel: 'PADRAO_INDUSTRIA' },
  SACO: { label: 'Saco / embalagem · 100 × 100 mm', width: 100, height: 100, dbModel: 'PADRAO_INDUSTRIA' },
  CAIXA: { label: 'Caixa / palete · 100 × 150 mm', width: 100, height: 150, dbModel: 'CAIXA_PALETE' },
  PROCESSO: { label: 'Processo interno · 80 × 40 mm', width: 80, height: 40, dbModel: 'INTERNO_PROCESSO' },
}
const input = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none transition focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-50'
const label = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500'
const safe = (value: unknown) => String(value ?? '').replace(/[\^~]/g, ' ').replace(/[\r\n]+/g, ' ').trim()
const fmtWeight = (value: number | string) => { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0,000' }
const dateBR = (value: string) => value ? value.split('-').reverse().join('/') : '—'

export default function EstoqueEtiquetas() {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [company, setCompany] = useState<Company | null>(null)
  const [model, setModel] = useState<Model>('CAIXA')
  const [quantity, setQuantity] = useState(1)
  const [lot, setLot] = useState('')
  const [boxNumber, setBoxNumber] = useState('1')
  const [pieces, setPieces] = useState('1')
  const [grossWeight, setGrossWeight] = useState('0')
  const [netWeight, setNetWeight] = useState('0')
  const [stackLimit, setStackLimit] = useState('')
  const [releasedBy, setReleasedBy] = useState('')
  const [order, setOrder] = useState('')
  const [invoice, setInvoice] = useState('')
  const [expiry, setExpiry] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
        const empresaId = String(tenant.data)
        const [companyResult, productsResult] = await Promise.all([
          supabase.from('erp_empresas').select('razao_social,nome_fantasia,cnpj,endereco,cidade,uf,cep,logo_url,logo_impressao_url').eq('id', empresaId).maybeSingle(),
          supabase.from('erp_produtos').select('id,codigo,nome,descricao_resumida,codigo_barras,unidade,peso_bruto,peso_liquido').eq('empresa_id', empresaId).eq('ativo', true).order('codigo').limit(2000),
        ])
        if (companyResult.error) throw companyResult.error
        if (productsResult.error) throw productsResult.error
        if (!cancelled) { setCompany(companyResult.data as Company | null); setProducts((productsResult.data ?? []) as Product[]) }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Falha ao carregar dados reais da empresa.')
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const product = products.find(item => item.id === productId)

  const brand = company?.nome_fantasia || company?.razao_social || ''
  const address = [company?.endereco, company?.cidade, company?.uf, company?.cep ? 'CEP ' + company.cep : null].filter(Boolean).join(' · ')
  const productDescription = product?.descricao_resumida || product?.nome || ''
  const qrPayload = [
    'EMPRESA=' + brand, 'CNPJ=' + (company?.cnpj ?? ''), 'CODIGO=' + (product?.codigo ?? ''),
    'LOTE=' + lot, 'CAIXA=' + boxNumber, 'PECAS=' + pieces, 'PESO_LIQ=' + netWeight,
    'PESO_BRUTO=' + grossWeight, 'OP=' + order, 'NF=' + invoice, 'DATA=' + issueDate,
  ].map(safe).join('|')

  const zpl = useMemo(() => {
    if (!product || !company) return ''
    const cfg = models[model]
    const width = Math.round(cfg.width * 8)
    const height = Math.round(cfg.height * 8)
    const companyLine = safe((company.cnpj ? 'CNPJ ' + company.cnpj : 'CNPJ NÃO CADASTRADO') + ' ' + address)
    const lines = [
      '^XA', '^CI28', '^PW' + width, '^LL' + height, '^LH0,0',
      '^FO20,16^A0N,24,24^FD' + safe(brand || 'EMPRESA NÃO CONFIGURADA') + '^FS',
      '^FO20,44^A0N,16,16^FD' + companyLine.slice(0, 110) + '^FS',
      '^FO20,66^GB' + (width - 40) + ',2,2^FS',
      '^FO20,76^A0N,20,20^FDCOD: ' + safe(product.codigo) + '^FS',
      '^FO20,100^A0N,18,18^FD' + safe(productDescription).slice(0, 48) + '^FS',
    ]
    if (model === 'CAIXA' || model === 'SACO') {
      lines.push(
        '^FO20,128^A0N,18,18^FDLOTE: ' + safe(lot || '—') + '^FS',
        '^FO20,152^A0N,18,18^FDPECAS: ' + safe(pieces || '0') + ' CX: ' + safe(boxNumber || '—') + '^FS',
        '^FO20,176^A0N,18,18^FDLIQ: ' + safe(netWeight) + ' kg BRUTO: ' + safe(grossWeight) + ' kg^FS',
        '^FO20,200^A0N,18,18^FDEMPILHAMENTO MAX: ' + safe(stackLimit || '—') + '^FS',
        '^FO20,224^A0N,18,18^FDLIBERADO: ' + safe(releasedBy || '—').slice(0, 28) + '^FS',
        '^FO20,248^A0N,18,18^FDOP: ' + safe(order || '—') + ' NF: ' + safe(invoice || '—') + '^FS',
        '^FO20,270^A0N,16,16^FDFAB: ' + safe(issueDate) + ' VAL: ' + safe(expiry || '—') + '^FS',
      )
    } else {
      lines.push('^FO20,128^A0N,16,16^FDLOTE: ' + safe(lot || '—') + '^FS', '^FO20,150^A0N,16,16^FDQTD: ' + safe(pieces || '1') + '^FS')
    }
    lines.push(
      '^FO20,' + Math.max(160, height - 115) + '^BY2,2,48^BCN,48,Y,N,N^FD' + safe(product.codigo_barras || product.codigo) + '^FS',
      '^FO' + Math.max(20, width - 150) + ',' + Math.max(170, height - 110) + '^BQN,2,4^FDLA,' + safe(qrPayload) + '^FS',
      '^XZ',
    )
    return Array.from({ length: quantity }, () => lines.join('\n')).join('\n')
  }, [product, company, model, brand, address, lot, boxNumber, pieces, netWeight, grossWeight, stackLimit, releasedBy, order, invoice, issueDate, expiry, quantity, qrPayload])

  const copy = async () => {
    if (!zpl) return
    try { await navigator.clipboard.writeText(zpl); setMessage('Comando ZPL copiado. A impressora ainda não foi acionada.'); setError('') }
    catch { setError('Não foi possível copiar automaticamente. Use Baixar ZPL.') }
  }
  const download = () => {
    if (!zpl) return
    const url = URL.createObjectURL(new Blob([zpl], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'etiquetas-' + safe(product?.codigo || 'produto') + '-' + model.toLowerCase() + '.zpl'
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Arquivo ZPL baixado. Envie-o à impressora térmica compatível pelo driver ou pela ponte de impressão.')
    setError('')
  }
  const printBrowser = async () => {
    if (!product || !company) return
    setError(''); setMessage(''); setPrinting(true)
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw auth.error ?? new Error('Sessão autenticada não encontrada.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const log = await supabase.from('erp_log_etiquetas').insert({
        empresa_id: String(tenant.data), codigo_produto: product.codigo,
        descricao_produto: productDescription.slice(0, 255), numero_lote: (lot.trim() || 'SEM-LOTE').slice(0, 50),
        numero_nfe: invoice.trim() ? Number(invoice) : null, quantidade_pecas: Math.max(0.001, Number(pieces) || 1),
        modelo_etiqueta: models[model].dbModel, operador_id: auth.data.user.id, data_emissao: issueDate || null,
      })
      if (log.error) throw log.error
      setMessage('Prévia impressa pelo navegador. Para imprimir códigos de barras e QR escaneáveis, use o arquivo ZPL em uma impressora térmica compatível.')
      window.print()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a solicitação de impressão.') }
    finally { setPrinting(false) }
  }

  const cfg = models[model]
  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-3 p-2 text-[11px] text-slate-800" aria-busy={loading}>
      <style>{'@page { size: ' + cfg.width + 'mm ' + cfg.height + 'mm; margin: 0; } @media print { body * { visibility: hidden !important; } .stock-label-print, .stock-label-print * { visibility: visible !important; } .stock-label-print { position: fixed !important; left: 0 !important; top: 0 !important; width: ' + cfg.width + 'mm !important; height: ' + cfg.height + 'mm !important; margin: 0 !important; padding: 3mm !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: hidden !important; } .no-label-print { display: none !important; } }'}</style>
      <header className="no-label-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div><p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700"><Barcode size={12} /> Estoque · Identificação industrial</p><h2 className="text-sm font-black uppercase text-slate-900">Modelos de etiquetas</h2><p className="text-[10px] text-slate-500">Caixas, sacos, produto e processo · dados da empresa autenticada.</p></div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border border-slate-200 bg-white px-2.5 text-[9px] font-bold uppercase text-slate-600"><Printer size={12} /> {cfg.width} × {cfg.height} mm</span>
      </header>
      {error && <div role="alert" className="no-label-print flex items-start gap-1.5 rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{error}</div>}
      {message && <div role="status" className="no-label-print flex items-start gap-1.5 rounded-[2px] border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-bold text-emerald-800"><CheckCircle2 size={13} className="mt-0.5 shrink-0" />{message}</div>}
      <div className="no-label-print grid grid-cols-1 gap-3 rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-12">
        <label className={label + ' md:col-span-5'}><span className="flex items-center gap-1"><Package size={10} /> Produto ativo</span><select className={input} value={productId} onChange={event => { const selected = products.find(item => item.id === event.target.value); setProductId(event.target.value); setGrossWeight(String(selected?.peso_bruto ?? 0)); setNetWeight(String(selected?.peso_liquido ?? 0)); setMessage(''); setError('') }} disabled={loading || !!error}><option value="">{loading ? 'Carregando catálogo…' : 'Selecione um produto'}</option>{products.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
        <label className={label + ' md:col-span-4'}><span className="flex items-center gap-1"><Tags size={10} /> Modelo de etiqueta</span><select className={input} value={model} onChange={event => setModel(event.target.value as Model)}>{Object.entries(models).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
        <label className={label + ' md:col-span-1'}>Cópias<input className={input + ' text-center font-mono'} type="number" min={1} max={100} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(100, Math.floor(Number(event.target.value) || 1))))} /></label>
        <label className={label + ' md:col-span-2'}>Data fabricação<input className={input} type="date" value={issueDate} onChange={event => setIssueDate(event.target.value)} /></label>
        <label className={label + ' md:col-span-3'}>Lote<input className={input} maxLength={50} value={lot} onChange={event => setLot(event.target.value)} placeholder="Lote real de produção" /></label>
        <label className={label + ' md:col-span-2'}>Nº caixa / saco<input className={input} maxLength={30} value={boxNumber} onChange={event => setBoxNumber(event.target.value)} /></label>
        <label className={label + ' md:col-span-2'}>Peças por embalagem<input className={input} type="number" min={1} value={pieces} onChange={event => setPieces(event.target.value)} /></label>
        <label className={label + ' md:col-span-2'}>Peso líquido (kg)<input className={input} type="number" min={0} step="0.001" value={netWeight} onChange={event => setNetWeight(event.target.value)} /></label>
        <label className={label + ' md:col-span-2'}>Peso bruto (kg)<input className={input} type="number" min={0} step="0.001" value={grossWeight} onChange={event => setGrossWeight(event.target.value)} /></label>
        <label className={label + ' md:col-span-3'}>Empilhamento máximo<input className={input} maxLength={30} value={stackLimit} onChange={event => setStackLimit(event.target.value)} placeholder="Ex.: 4 caixas" /></label>
        <label className={label + ' md:col-span-3'}>Liberado por<input className={input} maxLength={80} value={releasedBy} onChange={event => setReleasedBy(event.target.value)} placeholder="Responsável / qualidade" /></label>
        <label className={label + ' md:col-span-2'}>Ordem de produção<input className={input} maxLength={40} value={order} onChange={event => setOrder(event.target.value)} /></label>
        <label className={label + ' md:col-span-2'}>NF-e<input className={input} inputMode="numeric" maxLength={12} value={invoice} onChange={event => setInvoice(event.target.value.replace(/\D/g, ''))} /></label>
        <label className={label + ' md:col-span-2'}>Validade (se aplicável)<input className={input} type="date" value={expiry} onChange={event => setExpiry(event.target.value)} /></label>
        <div className="flex flex-wrap items-end gap-1.5 md:col-span-12">
          <button type="button" disabled={!zpl || loading} onClick={() => void copy()} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[9px] font-black uppercase text-white hover:bg-[#246f91] disabled:opacity-50"><Copy size={12} /> Copiar ZPL</button>
          <button type="button" disabled={!zpl || loading} onClick={download} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[9px] font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={12} /> Baixar ZPL</button>
          <button type="button" disabled={!product || !company || printing || loading} onClick={() => void printBrowser()} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] bg-[#123B50] px-3 text-[9px] font-black uppercase text-white hover:bg-[#0d2c3d] disabled:opacity-50"><Printer size={12} /> {printing ? 'Preparando…' : 'Registrar e imprimir'}</button>
          <button type="button" onClick={() => { setLot(''); setBoxNumber('1'); setPieces('1'); setGrossWeight(String(product?.peso_bruto ?? 0)); setNetWeight(String(product?.peso_liquido ?? 0)); setStackLimit(''); setReleasedBy(''); setOrder(''); setInvoice(''); setExpiry(''); setMessage(''); setError('') }} className="inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50"><RefreshCw size={12} /> Limpar dados de embalagem</button>
        </div>
      </div>
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <div className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm">
          <header className="no-label-print flex h-8 items-center justify-between border-b border-slate-200 bg-slate-50 px-3"><h3 className="text-[9px] font-black uppercase tracking-wider text-slate-700">Pré-visualização da etiqueta</h3><span className="font-mono text-[9px] text-slate-500">{product ? product.codigo + ' · ' + quantity + ' cópia(s)' : 'Aguardando seleção'}</span></header>
          <article className="stock-label-print relative flex flex-col overflow-hidden border border-slate-300 bg-white p-3 font-sans text-black" style={{ width: cfg.width + 'mm', minHeight: cfg.height + 'mm', maxWidth: '100%', gap: '2mm' }}>
            <div className="flex items-start gap-2 border-b border-black pb-2">{(company?.logo_impressao_url || company?.logo_url) && <img src={company.logo_impressao_url || company.logo_url || ''} alt="Logo da empresa" className="max-h-[15mm] max-w-[25mm] object-contain" />}<div className="min-w-0 flex-1"><strong className="block break-words text-[11px] font-black uppercase">{brand || 'Empresa não configurada'}</strong><span className="block text-[8px] font-bold">CNPJ: {company?.cnpj || 'NÃO CADASTRADO'}</span><span className="block break-words text-[7px] leading-tight">{address || 'Endereço não cadastrado'}</span></div><span className="text-right text-[7px] font-bold">{dateBR(issueDate)}</span></div>
            <div className="border-b border-black pb-1"><span className="block text-[7px] font-bold uppercase">Código / produto</span><strong className="block break-words text-[12px] font-black">{product?.codigo || '—'} · {productDescription || 'Selecione um produto'}</strong><span className="block text-[8px]">Código de barras: {product?.codigo_barras || product?.codigo || '—'}</span></div>
            {(model === 'CAIXA' || model === 'SACO') ? <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px]"><div><span className="block text-[6px] font-bold uppercase">Lote</span><strong className="break-words">{lot || '—'}</strong></div><div><span className="block text-[6px] font-bold uppercase">Caixa / saco nº</span><strong>{boxNumber || '—'}</strong></div><div><span className="block text-[6px] font-bold uppercase">Quantidade de peças</span><strong>{pieces || '—'}</strong></div><div><span className="block text-[6px] font-bold uppercase">Peso líquido</span><strong>{fmtWeight(netWeight)} kg</strong></div><div><span className="block text-[6px] font-bold uppercase">Peso bruto</span><strong>{fmtWeight(grossWeight)} kg</strong></div><div><span className="block text-[6px] font-bold uppercase">Empilhamento máximo</span><strong>{stackLimit || '—'}</strong></div><div><span className="block text-[6px] font-bold uppercase">Liberado por</span><strong className="break-words">{releasedBy || '—'}</strong></div><div><span className="block text-[6px] font-bold uppercase">OP / NF-e</span><strong>{order || '—'} / {invoice || '—'}</strong></div><div><span className="block text-[6px] font-bold uppercase">Validade</span><strong>{dateBR(expiry)}</strong></div><div><span className="block text-[6px] font-bold uppercase">Data fabricação</span><strong>{dateBR(issueDate)}</strong></div></div> : <div className="grid grid-cols-2 gap-1 text-[8px]"><div><b>Lote:</b> {lot || '—'}</div><div><b>Quantidade:</b> {pieces || '—'}</div></div>}
            <div className="mt-auto border-t border-black pt-1 text-center"><span className="block text-[7px] font-mono tracking-widest">{product?.codigo_barras || product?.codigo || '—'}</span><span className="block break-words text-[6px] font-bold">CÓDIGO DE BARRAS E QR ESCANEÁVEIS: USE O ARQUIVO ZPL</span></div>
          </article>
        </div>
        <section className="no-label-print overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm"><header className="flex h-8 items-center justify-between border-b border-slate-200 bg-slate-50 px-3"><h3 className="text-[9px] font-black uppercase tracking-wider text-slate-700">Comando para impressora térmica</h3><span className="font-mono text-[9px] text-slate-500">ZPL</span></header><pre className="max-h-[520px] min-h-[160px] overflow-auto bg-[#10222d] p-3 font-mono text-[9px] leading-4 text-cyan-100" aria-label="Conteúdo ZPL gerado">{zpl || (loading ? 'Carregando catálogo…' : 'Selecione um produto para gerar a etiqueta.')}</pre><p className="p-2 text-[9px] text-slate-500">A prévia do navegador inclui o logotipo cadastrado. O arquivo ZPL inclui textos, código de barras e QR; para reproduzir o logotipo no ZPL, a imagem precisa ser convertida ou instalada na memória da impressora. A saída física depende do driver/ponte e da mídia configurada.</p></section>
      </section>
    </section>
  )
}
