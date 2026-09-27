import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react'
import { CheckCircle, FileText, Inbox, Save, Search, Upload, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import EntityCodeLookup, { type LookupRecord } from '../../components/industrial/EntityCodeLookup'

type Product = LookupRecord & {
  descricao?: string | null
  unidade?: string | null
}

type QualityStatus = 'APROVADO' | 'REPROVADO'

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

export default function EstoqueRecebimentoLotes(): ReactElement {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [produtoDescricao, setProdutoDescricao] = useState('')
  const [notaFiscal, setNotaFiscal] = useState('')
  const [loteFornecedor, setLoteFornecedor] = useState('')
  const [quantidade, setQuantidade] = useState<number>(0)
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
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) {
        if (alive) {
          setError(tenant.error?.message ?? 'Não foi possível identificar a empresa da sessão.')
          setLoading(false)
        }
        return
      }

      const result = await supabase
        .from('erp_produtos')
        .select('id,codigo,nome,descricao,unidade,unidade_medida,estoque_atual,ativo')
        .eq('empresa_id', tenant.data)
        .eq('ativo', true)
        .order('codigo')
        .limit(2000)

      if (alive) {
        if (result.error) setError(result.error.message)
        setEmpresaId(tenant.data)
        setProducts((result.data ?? []) as Product[])
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const handleProductChange = (value: string) => {
    setProdutoId(value)
    const selected = products.find(product => product.id === value)
    setProdutoDescricao(selected?.descricao ?? selected?.nome ?? '')
  }

  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setCertificado(null)
      return
    }
    if (file.type !== 'application/pdf') {
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

    if (!empresaId) {
      setError('Empresa não identificada na sessão.')
      return
    }
    if (!produtoId) {
      setError('Selecione o insumo mestre pela lupa.')
      return
    }
    if (!loteFornecedor.trim()) {
      setError('O lote do fornecedor é obrigatório.')
      return
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setError('A quantidade deve ser maior que zero.')
      return
    }
    if (!certificado) {
      setError('Anexe o certificado químico em PDF antes de integrar o lote.')
      return
    }
    if (laudoStatus !== 'APROVADO') {
      setError('Ação interrompida: lote com laudo REPROVADO não pode entrar no saldo ativo.')
      return
    }

    setBusy(true)

    let certificatePath = ''
    try {
      const safeName = certificado.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      certificatePath = `empresas/${empresaId}/recebimento-lotes/${crypto.randomUUID()}-${safeName}`

      const upload = await supabase.storage
        .from('documentos-erp')
        .upload(certificatePath, certificado, {
          contentType: certificado.type,
          upsert: false,
        })

      if (upload.error) throw upload.error

      const result = await supabase.rpc('fn_receber_lote_almoxarifado', {
        p_empresa_id: empresaId,
        p_produto_id: produtoId,
        p_nf_numero: notaFiscal.trim() || null,
        p_lote_fornecedor: loteFornecedor.trim(),
        p_quantidade: quantidade,
        p_status_qualidade: laudoStatus,
        p_certificado_path: certificatePath,
      })

      if (result.error) throw result.error

      const selected = products.find(product => product.id === produtoId)
      setSuccess(`Lote ${loteFornecedor.trim()} recebido com sucesso. ${numberFormat.format(quantidade)} ${selected?.unidade ?? 'kg'} integrados ao saldo físico.`)
      setNotaFiscal('')
      setLoteFornecedor('')
      setQuantidade(0)
      setCertificado(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      if (certificatePath) {
        await supabase.storage.from('documentos-erp').remove([certificatePath])
      }
      setError(err instanceof Error ? err.message : 'Erro crítico ao efetivar o recebimento.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4fbfd] p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <Inbox className="h-7 w-7 text-sky-700" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Almoxarifado &gt; Recebimento de insumos</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">Recebimento de matéria-prima e laudo do fornecedor</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleCertificateChange} className="sr-only" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-[54px] items-center gap-2 rounded-md border border-slate-400 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" /> UPLOAD CERTIFICADO QUÍMICO
            </button>
            <button
              form="recebimento-lote-form"
              type="submit"
              disabled={busy || loading}
              className="inline-flex h-[54px] items-center gap-2 rounded-md bg-sky-700 px-5 text-sm font-black text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {busy ? 'INTEGRANDO...' : 'INTEGRAR AO SALDO REAL'}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900" role="alert">
            <X className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900" role="status">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        <form id="recebimento-lote-form" onSubmit={efetivarEntrada} className="space-y-5">
          <section className="rounded-md border border-slate-300 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-800">1</span>
              <h2 className="text-lg font-black text-slate-950">Identificação do insumo comercial</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <EntityCodeLookup
                label="Insumo mestre"
                value={produtoId}
                records={products}
                onChange={handleProductChange}
                onSelect={record => {
                  setProdutoId(record.id)
                  setProdutoDescricao(record.nome ?? '')
                }}
                entityType="product"
                required
                placeholder="Código do insumo"
                helper={produtoDescricao || 'Use a lupa para selecionar o cadastro mestre do insumo.'}
              />

              <label className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                NF-e de entrada
                <input
                  value={notaFiscal}
                  onChange={event => setNotaFiscal(event.target.value)}
                  className="mt-2 h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-semibold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                  placeholder="Ex.: NF-109232"
                />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-slate-300 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-800">2</span>
              <h2 className="text-lg font-black text-slate-950">Certificação da matéria-prima</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Lote do fornecedor
                <input
                  value={loteFornecedor}
                  onChange={event => setLoteFornecedor(event.target.value)}
                  className="mt-2 h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                  placeholder="Ex.: LT-PP-2026-09A"
                  required
                />
              </label>

              <label className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Quantidade líquida da nota
                <div className="mt-2 flex">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={quantidade || ''}
                    onChange={event => setQuantidade(Number(event.target.value))}
                    className="h-[54px] w-full rounded-l-md border border-slate-300 bg-white px-3 text-base font-black outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                    placeholder="0,000"
                    required
                  />
                  <span className="grid h-[54px] min-w-16 place-items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-100 px-3 text-sm font-black text-slate-700">
                    kg
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-sky-700" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-black uppercase text-slate-800">Certificado de análise</p>
                    <p className="text-sm font-medium text-slate-600">{certificado?.name ?? 'Nenhum PDF anexado'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-400 bg-white px-4 text-sm font-black hover:bg-slate-100">
                  <Search className="h-4 w-4" /> SELECIONAR PDF
                </button>
              </div>
            </div>

            <div className={`mt-4 flex flex-wrap items-center justify-between gap-4 rounded-md border p-4 ${laudoStatus === 'APROVADO' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-6 w-6 ${laudoStatus === 'APROVADO' ? 'text-emerald-700' : 'text-rose-700'}`} aria-hidden="true" />
                <div>
                  <p className="text-sm font-black uppercase text-slate-900">Parecer técnico do certificado</p>
                  <p className="text-sm font-medium text-slate-700">Laudo reprovado bloqueia a integração do saldo.</p>
                </div>
              </div>
              <select
                value={laudoStatus}
                onChange={event => setLaudoStatus(event.target.value as QualityStatus)}
                className="h-[54px] rounded-md border border-slate-400 bg-white px-4 text-sm font-black text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              >
                <option value="APROVADO">APROVADO / DENTRO DOS REQUISITOS</option>
                <option value="REPROVADO">REPROVADO / RETER LOTE</option>
              </select>
            </div>
          </section>

          <section className="rounded-md border border-slate-300 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Rastreabilidade e isolamento por empresa</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">A empresa é resolvida pela sessão autenticada; não é editável pela tela.</p>
              </div>
              <div className="rounded-md bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                {empresaId ? 'TENANT IDENTIFICADO' : 'VALIDANDO TENANT...'}
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  )
}
