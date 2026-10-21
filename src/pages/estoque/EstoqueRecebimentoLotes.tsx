/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: ALMOX-RECEBIMENTO-PREMIUM-UI-01
 * @STATUS: SUBSTITUICAO_INTEGRAL_VALIDAR_CI
 * @ESCOPO: recebimento de lotes, controles compactos h-8, grid responsivo de 12 colunas.
 * @BASE: fluxo original existente no ERP; mantidos tenant da sessão, Storage e RPC transacional.
 */
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react'
import { CheckCircle, FileText, Inbox, Layers, Save, Scale, Search, ShieldAlert, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../../components/industrial/EntityCodeLookup'
import VendasLayout from '../VendasLayout'

type Product = LookupRecord & {
  descricao?: string | null
  unidade?: string | null
}
type QualityStatus = 'APROVADO' | 'REPROVADO'

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const inputClass = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-100 placeholder:text-slate-400'
const labelClass = 'grid min-w-0 gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500'
const sectionClass = 'grid grid-cols-1 items-end gap-x-3 gap-y-2.5 rounded-[3px] border border-slate-200 bg-white p-3 md:grid-cols-12'

export default function EstoqueRecebimentoLotes(): ReactElement {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [produtoDescricao, setProdutoDescricao] = useState('')
  const [notaFiscal, setNotaFiscal] = useState('')
  const [loteFornecedor, setLoteFornecedor] = useState('')
  const [dataValidade, setDataValidade] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [laudoStatus, setLaudoStatus] = useState<QualityStatus>('APROVADO')
  const [certificado, setCertificado] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true)
      try {
        const tenant = await supabase.rpc('erp_current_empresa_id')
        if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Não foi possível identificar a empresa da sessão.')
        const result = await supabase.from('erp_produtos')
          .select('id,codigo,nome,descricao,unidade,estoque_atual,ativo')
          .eq('empresa_id', String(tenant.data)).eq('ativo', true).order('codigo').limit(2000)
        if (result.error) throw result.error
        if (alive) {
          setEmpresaId(String(tenant.data))
          setProducts((result.data ?? []) as Product[])
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Falha ao carregar os produtos.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const handleProductChange = (value: string) => {
    setProdutoId(value)
    const selected = products.find(product => product.id === value)
    setProdutoDescricao(selected?.descricao ?? selected?.nome ?? '')
  }

  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) { setCertificado(null); return }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('O certificado deve ser um arquivo PDF.')
      event.target.value = ''
      setCertificado(null)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('O certificado excede o limite de 25 MB.')
      event.target.value = ''
      setCertificado(null)
      return
    }
    setError('')
    setCertificado(file)
  }

  const efetivarEntrada = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const quantity = Number(quantidade)
    if (!empresaId) { setError('Empresa não identificada na sessão.'); return }
    if (!produtoId) { setError('Selecione o insumo mestre pela lupa.'); return }
    if (!notaFiscal.trim()) { setError('Informe o número da NF-e de entrada.'); return }
    if (!loteFornecedor.trim()) { setError('O lote do fornecedor é obrigatório.'); return }
    if (dataValidade && dataValidade <= new Date().toLocaleDateString('en-CA')) { setError('A validade deve ser posterior à data de recebimento.'); return }
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('A quantidade deve ser maior que zero.'); return }
    if (!certificado) { setError('Anexe o certificado químico em PDF antes de integrar o lote.'); return }
    if (laudoStatus !== 'APROVADO') { setError('Lote reprovado bloqueado: não é permitido integrar ao saldo ativo.'); return }

    setBusy(true)
    let certificatePath = ''
    let uploaded = false
    try {
      const safeName = certificado.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      certificatePath = `empresas/${empresaId}/recebimento-lotes/${crypto.randomUUID()}-${safeName}`
      const upload = await supabase.storage.from('documentos-erp').upload(certificatePath, certificado, {
        contentType: 'application/pdf', upsert: false,
      })
      if (upload.error) throw upload.error
      uploaded = true

      const result = await supabase.rpc('fn_receber_lote_almoxarifado', {
        p_empresa_id: empresaId,
        p_produto_id: produtoId,
        p_nf_numero: notaFiscal.trim(),
        p_lote_fornecedor: loteFornecedor.trim(),
        p_data_validade: dataValidade || null,
        p_quantidade: quantity,
        p_status_qualidade: laudoStatus,
        p_certificado_path: certificatePath,
      })
      if (result.error) throw result.error

      const selected = products.find(product => product.id === produtoId)
      setSuccess(`Lote ${loteFornecedor.trim()} recebido. ${numberFormat.format(quantity)} ${selected?.unidade ?? 'kg'} integrados ao saldo físico.`)
      setNotaFiscal('')
      setLoteFornecedor('')
      setDataValidade('')
      setQuantidade('')
      setCertificado(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (cause) {
      if (uploaded && certificatePath) {
        const cleanup = await supabase.storage.from('documentos-erp').remove([certificatePath])
        if (cleanup.error) setError(`Falha no recebimento e também na limpeza do PDF: ${cleanup.error.message}`)
      }
      setError(previous => previous || (cause instanceof Error ? cause.message : 'Erro crítico ao efetivar o recebimento.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout title="Recebimento de Insumos e Lotes" subtitle="Conferência quantitativa, certificado químico e integração rastreável ao Almoxarifado">
      <main className="space-y-3 p-1 text-xs text-slate-800">
        {(error || success) && <div className={`flex items-start gap-2 rounded-[2px] border px-3 py-2 text-[10px] font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`} role={error ? 'alert' : 'status'}>
          {error ? <X size={15} className="shrink-0" /> : <CheckCircle size={15} className="shrink-0" />}
          <span>{error || success}</span>
        </div>}

        <header className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-600">
            <Inbox size={16} className="text-sky-700" /> Balanço de entrada de carga
            <span className={`ml-1 border px-2 py-1 text-[9px] ${empresaId ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{loading ? 'VALIDANDO TENANT' : empresaId ? 'TENANT IDENTIFICADO' : 'TENANT INDISPONÍVEL'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleCertificateChange} className="sr-only" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[10px] font-bold hover:bg-slate-100">
              <Upload size={13} /> ANEXAR LAUDO PDF
            </button>
            <button form="recebimento-lote-form" type="submit" disabled={busy || loading} className="inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-teal-700 px-3 text-[10px] font-black text-white hover:bg-teal-800 disabled:opacity-40">
              <Save size={13} /> {busy ? 'INTEGRANDO...' : 'INTEGRAR AO SALDO REAL'}
            </button>
            <Link to="/ajuda/estoque-recebimento" className="inline-flex h-8 items-center border border-slate-300 bg-white px-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100">POP / AJUDA</Link>
          </div>
        </header>

        <form id="recebimento-lote-form" onSubmit={efetivarEntrada} className="space-y-3">
          <section className={sectionClass}>
            <h2 className="col-span-full flex items-center gap-1.5 border-b border-slate-200 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-600"><Layers size={13} className="text-sky-700" /> 1. Identificação homologada do insumo</h2>
            <div className="min-w-0 md:col-span-8">
              <EntityCodeLookup label="Insumo mestre *" value={produtoId} records={products} onChange={handleProductChange}
                onSelect={record => { setProdutoId(record.id); setProdutoDescricao(record.nome ?? '') }}
                entityType="product" required placeholder="Pesquisar SKU pela lupa..."
                helper={produtoDescricao || 'Selecione o cadastro mestre de engenharia.'} />
            </div>
            <label className={`${labelClass} md:col-span-4`}>Número da nota fiscal (NF-e) *
              <input value={notaFiscal} onChange={event => setNotaFiscal(event.target.value)} className={inputClass} placeholder="Ex.: 109232" required />
            </label>
          </section>

          <section className={sectionClass}>
            <h2 className="col-span-full flex items-center gap-1.5 border-b border-slate-200 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-600"><Scale size={13} className="text-sky-700" /> 2. Rastreabilidade de lote e metrologia</h2>
            <label className={`${labelClass} md:col-span-4`}>Lote identificador do fornecedor *
              <input value={loteFornecedor} onChange={event => setLoteFornecedor(event.target.value)} className={`${inputClass} font-mono`} placeholder="Ex.: LT-PP-2026-09A" required />
            </label>
            <label className={`${labelClass} md:col-span-3`}>Quantidade líquida *
              <span className="flex min-w-0">
                <input type="number" min="0.001" step="0.001" value={quantidade} onChange={event => setQuantidade(event.target.value)} className={`${inputClass} rounded-r-none font-mono`} placeholder="0,000" required />
                <span className="inline-flex h-8 items-center border border-l-0 border-slate-300 bg-slate-100 px-2 text-[10px] font-black text-slate-600">kg</span>
              </span>
            </label>
            <label className={`${labelClass} md:col-span-4`}>Data de validade
              <input type="date" value={dataValidade} onChange={event => setDataValidade(event.target.value)} className={inputClass} min={new Date().toLocaleDateString('en-CA')} />
            </label>
            <label className={`${labelClass} md:col-span-5`}>Parecer técnico da qualidade *
              <select value={laudoStatus} onChange={event => setLaudoStatus(event.target.value as QualityStatus)} className={`${inputClass} font-black uppercase ${laudoStatus === 'APROVADO' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                <option value="APROVADO">APROVADO / LIBERADO PARA ALMOXARIFADO</option>
                <option value="REPROVADO">REPROVADO / RETER LOTE</option>
              </select>
            </label>

            <div className="flex min-w-0 items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-2.5 py-2 md:col-span-12">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={17} className="shrink-0 text-sky-700" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase text-slate-600">Certificado de análise química (PDF)</p>
                  <p className="truncate text-[10px] text-slate-700" title={certificado?.name}>{certificado?.name ?? 'Nenhum documento anexado — limite de 25 MB'}</p>
                </div>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase hover:bg-slate-100"><Search size={12} /> Selecionar PDF</button>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className={laudoStatus === 'APROVADO' ? 'text-emerald-700' : 'text-rose-700'} />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-700">Rastreabilidade e isolamento por empresa</p>
                <p className="text-[10px] text-slate-500">A empresa vem da sessão autenticada; lote reprovado não entra no saldo ativo.</p>
              </div>
            </div>
            <span className="text-[9px] font-bold uppercase text-slate-500">{certificado ? 'PDF VALIDADO' : 'AGUARDANDO CERTIFICADO'}</span>
          </section>
        </form>
      </main>
    </VendasLayout>
  )
}
