/**
 * @AUTOR: FernandoSch (tela recebida do proprietario em 2026-11-01 em C:\\Users\\Dri\\Documents\\Qoder\\integracao-sgq-certificado-6006a807)
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-CERTIFICADO-CARIMBO-20261103-01 — somente o cabecalho de autoria/aprovacao foi adicionado; nenhuma linha de logica ou visual foi tocada
 * @STATUS_APROVACAO: APROVADO PELO PROPRIETARIO (ordem de 2026-11-03: "todas as telas novas vao ter revisao, aprovacao e travamento para o vercel nao pegar mais telas antigas")
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle, Check, CheckCircle2, FileCheck2, FilePlus2, FileText, Image,
  LoaderCircle, Plus, Printer, RefreshCw, Ruler, ShieldCheck, Trash2, Upload,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type CotaForm = {
  id: string
  identificador: string
  descricao: string
  nominal: string
  minimo: string
  maximo: string
  medido: string
}

type CotaRecord = {
  id: string
  identificador: string
  descricao: string
  nominal_mm: number
  minimo_mm: number
  maximo_mm: number
  medido_mm: number | null
  resultado: 'PENDENTE' | 'APROVADO' | 'REPROVADO'
}

type CertificateRecord = {
  id: string
  numero_certificado: string
  codigo_peca: string
  descricao_peca: string
  ordem_lote: string
  cliente: string | null
  numero_serie: string | null
  data_inspecao: string
  inspetor_nome: string
  desenho_storage_path: string
  desenho_nome: string
  desenho_mime: string
  observacoes: string | null
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO'
  created_at: string
}

type FormFields = {
  codigo: string
  descricao: string
  ordemLote: string
  cliente: string
  numeroSerie: string
  data: string
  observacoes: string
}

const BUCKET = 'qualidade-certificados'
const ROUTE_LABEL = 'Certificado de Qualidade'
const inputClass = 'mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const labelClass = 'block text-[10px] font-bold uppercase tracking-wide text-slate-600'
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const newCota = (): CotaForm => ({
  id: crypto.randomUUID(), identificador: '', descricao: '', nominal: '', minimo: '', maximo: '', medido: '',
})
const newForm = (): FormFields => ({
  codigo: '', descricao: '', ordemLote: '', cliente: '', numeroSerie: '', data: today(), observacoes: '',
})
const safeName = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-160) || 'desenho'
const drawingMime = (file: File) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg'
    : extension === 'png' ? 'image/png'
    : extension === 'webp' ? 'image/webp'
    : extension === 'pdf' ? 'application/pdf'
    : ''
}
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.'
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')
const formatMeasure = (value: number | null) => value === null ? '—' : `${Number(value).toFixed(3).replace('.', ',')} mm`

function resultTone(result: string) {
  if (result === 'APROVADO') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (result === 'REPROVADO') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-amber-200 bg-amber-50 text-amber-800'
}

export default function CertificadoQualidade() {
  const [companyId, setCompanyId] = useState('')
  const [operator, setOperator] = useState('')
  const [records, setRecords] = useState<CertificateRecord[]>([])
  const [selected, setSelected] = useState<CertificateRecord | null>(null)
  const [selectedCotas, setSelectedCotas] = useState<CotaRecord[]>([])
  const [selectedDrawingUrl, setSelectedDrawingUrl] = useState('')
  const [form, setForm] = useState<FormFields>(newForm)
  const [cotas, setCotas] = useState<CotaForm[]>([newCota()])
  const [drawing, setDrawing] = useState<File | null>(null)
  const [drawingPreview, setDrawingPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadHistory = useCallback(async (tenantId: string) => {
    setHistoryLoading(true)
    try {
      const { data, error: queryError } = await supabase
        .from('erp_qualidade_certificados')
        .select('id,numero_certificado,codigo_peca,descricao_peca,ordem_lote,cliente,numero_serie,data_inspecao,inspetor_nome,desenho_storage_path,desenho_nome,desenho_mime,observacoes,status,created_at')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (queryError) throw queryError
      setRecords((data ?? []) as CertificateRecord[])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const initialize = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão expirada. Entre novamente para acessar a Qualidade.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('A sessão não possui empresa ativa.')
      setCompanyId(String(tenant.data))
      setOperator(auth.data.user.email ?? 'Usuário autenticado')
      await loadHistory(String(tenant.data))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [loadHistory])

  useEffect(() => { void initialize() }, [initialize])
  useEffect(() => {
    if (!drawing) {
      setDrawingPreview('')
      return
    }
    const url = URL.createObjectURL(drawing)
    setDrawingPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [drawing])

  const previewResults = useMemo(() => cotas.map((cota) => {
    const measured = Number(cota.medido)
    const minimum = Number(cota.minimo)
    const maximum = Number(cota.maximo)
    if (!cota.medido.trim() || !cota.minimo.trim() || !cota.maximo.trim()) return 'PENDENTE'
    return measured >= minimum && measured <= maximum ? 'APROVADO' : 'REPROVADO'
  }), [cotas])

  const updateCota = (id: string, field: keyof Omit<CotaForm, 'id'>, value: string) =>
    setCotas((current) => current.map((cota) => cota.id === id ? { ...cota, [field]: value } : cota))

  const openRecord = async (record: CertificateRecord) => {
    setError('')
    setNotice('')
    setSelected(record)
    setSelectedCotas([])
    setSelectedDrawingUrl('')
    try {
      const [dimensions, drawingUrl] = await Promise.all([
        supabase.from('erp_qualidade_certificado_cotas')
          .select('id,identificador,descricao,nominal_mm,minimo_mm,maximo_mm,medido_mm,resultado')
          .eq('empresa_id', companyId)
          .eq('certificado_id', record.id)
          .order('created_at'),
        supabase.storage.from(BUCKET).createSignedUrl(record.desenho_storage_path, 300),
      ])
      if (dimensions.error) throw dimensions.error
      if (drawingUrl.error) throw drawingUrl.error
      setSelectedCotas((dimensions.data ?? []) as CotaRecord[])
      setSelectedDrawingUrl(drawingUrl.data.signedUrl)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  const resetForm = () => {
    setForm(newForm())
    setCotas([newCota()])
    setDrawing(null)
    setSelected(null)
    setSelectedCotas([])
    setSelectedDrawingUrl('')
    setError('')
    setNotice('')
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!companyId) {
      setError('Empresa da sessão não identificada.')
      return
    }
    if (!drawing) {
      setError('Anexe o desenho técnico da peça antes de salvar.')
      return
    }
    const mime = drawingMime(drawing)
    if (!mime) {
      setError('Formato inválido. Use uma imagem JPG, PNG, WebP ou um PDF.')
      return
    }
    if (drawing.size > 15 * 1024 * 1024) {
      setError('O desenho excede o limite de 15 MB.')
      return
    }
    if (!cotas.length || cotas.some((cota) => !cota.identificador.trim() || !cota.descricao.trim()
      || !cota.nominal.trim() || !cota.minimo.trim() || !cota.maximo.trim())) {
      setError('Preencha identificação, descrição, nominal e limites de todas as cotas.')
      return
    }
    const invalidInterval = cotas.some((cota) => {
      const nominal = Number(cota.nominal)
      const minimum = Number(cota.minimo)
      const maximum = Number(cota.maximo)
      return !Number.isFinite(nominal) || !Number.isFinite(minimum) || !Number.isFinite(maximum)
        || minimum < 0 || minimum > nominal || nominal > maximum
        || (cota.medido.trim() !== '' && (!Number.isFinite(Number(cota.medido)) || Number(cota.medido) < 0))
    })
    if (invalidInterval) {
      setError('Confira as cotas: mínimo ≤ nominal ≤ máximo e medições não negativas.')
      return
    }

    setSaving(true)
    const certificateId = crypto.randomUUID()
    const path = `${companyId}/${certificateId}/${crypto.randomUUID()}-${safeName(drawing.name)}`
    try {
      const upload = await supabase.storage.from(BUCKET).upload(path, drawing, { upsert: false, contentType: mime })
      if (upload.error) throw upload.error

      const result = await supabase.rpc('erp_qualidade_certificado_criar', {
        p_certificado_id: certificateId,
        p_codigo_peca: form.codigo.trim(),
        p_descricao_peca: form.descricao.trim(),
        p_ordem_lote: form.ordemLote.trim(),
        p_data_inspecao: form.data,
        p_cliente: form.cliente.trim() || null,
        p_numero_serie: form.numeroSerie.trim() || null,
        p_observacoes: form.observacoes.trim() || null,
        p_desenho_storage_path: path,
        p_desenho_nome: drawing.name,
        p_desenho_mime: mime,
        p_cotas: cotas.map((cota) => ({
          identificador: cota.identificador.trim(),
          descricao: cota.descricao.trim(),
          nominal: Number(cota.nominal),
          minimo: Number(cota.minimo),
          maximo: Number(cota.maximo),
          medido: cota.medido.trim() ? Number(cota.medido) : null,
        })),
      })
      if (result.error) {
        const cleanup = await supabase.storage.from(BUCKET).remove([path])
        if (cleanup.error) throw new Error(`${result.error.message} O arquivo enviado não pôde ser removido: ${cleanup.error.message}`)
        throw result.error
      }

      const created = result.data as Omit<CertificateRecord, 'created_at'> & {
        aprovadas: number; reprovadas: number; pendentes: number
      }
      if (!created?.id || !created.numero_certificado) {
        throw new Error('A confirmação do banco não retornou o certificado salvo.')
      }
      setNotice(`Certificado ${created.numero_certificado} gravado no Supabase. Resultado: ${created.status}.`)
      setForm(newForm())
      setCotas([newCota()])
      setDrawing(null)
      setSelected({
        ...created,
        created_at: new Date().toISOString(),
      })
      await loadHistory(companyId)
      const detail = await supabase.from('erp_qualidade_certificado_cotas')
        .select('id,identificador,descricao,nominal_mm,minimo_mm,maximo_mm,medido_mm,resultado')
        .eq('empresa_id', companyId)
        .eq('certificado_id', created.id)
        .order('created_at')
      if (detail.error) throw detail.error
      setSelectedCotas((detail.data ?? []) as CotaRecord[])
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
      if (signed.error) throw signed.error
      setSelectedDrawingUrl(signed.data.signedUrl)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = (status: string) => status === 'APROVADO' ? 'APROVADO' : status === 'REPROVADO' ? 'REPROVADO' : 'PENDENTE'

  return (
    <main className="cq-page min-h-[calc(100vh-74px)] bg-[#f4f8fa] p-3 text-slate-800 sm:p-5">
      <style>{`
        @page{size:A4;margin:12mm}
        @media print{
          body *{visibility:hidden!important}
          .cq-print,.cq-print *{visibility:visible!important}
          .cq-print{display:block!important;position:absolute!important;inset:0!important;width:100%!important;padding:0!important;background:#fff!important}
          .cq-no-print{display:none!important}
          .cq-print table{width:100%;border-collapse:collapse}
          .cq-print th,.cq-print td{border:1px solid #94a3b8;padding:6px;text-align:left;font-size:10px}
        }
      `}</style>
      <div className="mx-auto max-w-[1480px] space-y-4">
        <header className="cq-no-print flex flex-wrap items-center justify-between gap-3 border border-[#cbdce4] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center bg-[#123b50] text-white"><FileCheck2 size={20} /></span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#2d8db8]">SYSNQRA · QUALIDADE</p>
              <h1 className="text-base font-extrabold text-[#123b50] sm:text-lg">{ROUTE_LABEL} de Peças</h1>
              <p className="text-[10px] text-slate-500">Inspeção dimensional rastreável · documento A4/PDF</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-[260px] truncate border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-600" title={operator}>
              Operador autenticado: {operator || 'validando sessão…'}
            </span>
            <button type="button" onClick={() => void initialize()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
            <button type="button" onClick={resetForm} className="inline-flex h-8 items-center gap-1.5 bg-[#123b50] px-3 text-[10px] font-bold text-white hover:bg-[#1b506a]">
              <FilePlus2 size={13} /> Novo certificado
            </button>
          </div>
        </header>

        {error && <div role="alert" className="cq-no-print flex items-start gap-2 border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <div role="status" aria-live="polite" className="cq-no-print flex items-start gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{notice}</div>}
        {loading ? (
          <div role="status" className="cq-no-print grid min-h-64 place-items-center border border-slate-200 bg-white text-xs text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" />Validando sessão e consultando certificados…</span></div>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
            <form onSubmit={save} className="cq-no-print space-y-4">
              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                  <span className="grid size-7 place-items-center bg-[#eaf6fa] text-[#2d8db8]"><Ruler size={15} /></span>
                  <div><h2 className="text-xs font-extrabold text-[#123b50]">Identificação e rastreabilidade</h2><p className="mt-0.5 text-[9px] text-slate-500">Identificação do produto e vínculo com a ordem ou lote real.</p></div>
                </header>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelClass}>Código da peça *<input required maxLength={80} className={inputClass} value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} /></label>
                  <label className={`${labelClass} sm:col-span-2`}>Descrição da peça *<input required maxLength={200} className={inputClass} value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></label>
                  <label className={labelClass}>Ordem de produção / lote *<input required maxLength={120} className={inputClass} value={form.ordemLote} onChange={(event) => setForm({ ...form, ordemLote: event.target.value })} /></label>
                  <label className={labelClass}>Cliente<input maxLength={120} className={inputClass} value={form.cliente} onChange={(event) => setForm({ ...form, cliente: event.target.value })} /></label>
                  <label className={labelClass}>Número de série<input maxLength={120} className={inputClass} value={form.numeroSerie} onChange={(event) => setForm({ ...form, numeroSerie: event.target.value })} /></label>
                  <label className={labelClass}>Data da inspeção *<input type="date" required className={inputClass} value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} /></label>
                  <div className="flex items-end sm:col-span-2 lg:col-span-2">
                    <p className="w-full border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] leading-4 text-sky-900">
                      <ShieldCheck size={13} className="mr-1 inline" />O inspetor é atribuído pelo perfil ERP autenticado no banco no momento da gravação.
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2"><span className="grid size-7 place-items-center bg-[#eaf6fa] text-[#2d8db8]"><Image size={15} /></span><div><h2 className="text-xs font-extrabold text-[#123b50]">Desenho técnico</h2><p className="text-[9px] text-slate-500">Armazenamento privado por empresa · JPG, PNG, WebP ou PDF · até 15 MB.</p></div></div>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 border border-[#2d8db8] bg-white px-3 text-[10px] font-bold text-[#165b78] hover:bg-sky-50">
                    <Upload size={13} /> Selecionar arquivo
                    <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setDrawing(file)
                      if (file) setError('')
                      event.currentTarget.value = ''
                    }} />
                  </label>
                </header>
                {drawing ? (
                  <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="flex min-w-0 items-center gap-2 border border-slate-200 bg-slate-50 p-3">
                      <FileText size={17} className="shrink-0 text-[#2d8db8]" />
                      <div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-800">{drawing.name}</p><p className="text-[9px] text-slate-500">{(drawing.size / 1024 / 1024).toFixed(2)} MB</p></div>
                      <button type="button" onClick={() => setDrawing(null)} className="ml-auto grid size-7 shrink-0 place-items-center text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Remover desenho selecionado"><Trash2 size={14} /></button>
                    </div>
                    {drawing.type.startsWith('image/') && drawingPreview && <img src={drawingPreview} alt={`Pré-visualização do desenho ${drawing.name}`} className="max-h-40 w-full border border-slate-200 bg-white object-contain p-1" />}
                  </div>
                ) : <div className="p-5 text-center text-[10px] text-slate-500">Anexe o desenho técnico usado como referência para a inspeção.</div>}
              </section>

              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <div><h2 className="text-xs font-extrabold text-[#123b50]">Cotas e medições</h2><p className="mt-0.5 text-[9px] text-slate-500">O resultado de cada medida é calculado e validado novamente no banco.</p></div>
                  <button type="button" onClick={() => setCotas((current) => [...current, newCota()])} className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:border-[#2d8db8]"><Plus size={13} /> Adicionar cota</button>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left">
                    <thead><tr className="bg-[#f3f7f9] text-[9px] font-bold uppercase text-slate-600">
                      <th className="px-3 py-2">Identificação</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2">Nominal (mm)</th><th className="px-3 py-2">Mínimo (mm)</th><th className="px-3 py-2">Máximo (mm)</th><th className="px-3 py-2">Medido (mm)</th><th className="px-3 py-2">Resultado</th><th className="px-2 py-2"><span className="sr-only">Ações</span></th>
                    </tr></thead>
                    <tbody>{cotas.map((cota, index) => (
                      <tr key={cota.id} className="border-t border-slate-100 align-top">
                        <td className="p-2"><input aria-label={`Identificação da cota ${index + 1}`} required maxLength={40} className="h-8 w-28 border border-slate-300 px-2 text-[10px] outline-none focus:border-[#2d8db8]" value={cota.identificador} onChange={(event) => updateCota(cota.id, 'identificador', event.target.value)} /></td>
                        <td className="p-2"><input aria-label={`Descrição da cota ${index + 1}`} required maxLength={120} className="h-8 w-36 border border-slate-300 px-2 text-[10px] outline-none focus:border-[#2d8db8]" value={cota.descricao} onChange={(event) => updateCota(cota.id, 'descricao', event.target.value)} /></td>
                        {(['nominal', 'minimo', 'maximo', 'medido'] as const).map((field) => <td key={field} className="p-2"><input aria-label={`${field} da cota ${index + 1} em milímetros`} type="number" step="0.001" min="0" required={field !== 'medido'} className="h-8 w-28 border border-slate-300 px-2 text-[10px] outline-none focus:border-[#2d8db8]" value={cota[field]} onChange={(event) => updateCota(cota.id, field, event.target.value)} /></td>)}
                        <td className="p-2"><span className={`inline-flex h-7 items-center border px-2 text-[9px] font-bold ${resultTone(previewResults[index])}`}>{previewResults[index]}</span></td>
                        <td className="p-2"><button type="button" onClick={() => setCotas((current) => current.length > 1 ? current.filter((item) => item.id !== cota.id) : current)} disabled={cotas.length === 1} aria-label={`Remover cota ${index + 1}`} className="grid size-7 place-items-center text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[9px] text-slate-600">Resultado calculado automaticamente pela faixa inclusiva: mínimo ≤ medida ≤ máximo. Cotas sem medição permanecem pendentes.</div>
              </section>

              <section className="border border-slate-200 bg-white p-4 shadow-sm">
                <label className={labelClass}>Observações da inspeção<textarea rows={3} maxLength={2000} className="mt-1 w-full resize-y border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#2d8db8] focus:ring-2 focus:ring-[#2d8db8]/15" value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-[9px] text-slate-500">Os dados são salvos no Supabase da empresa autenticada, sem armazenamento local.</span>
                  <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 bg-[#123b50] px-4 text-[10px] font-extrabold uppercase text-white hover:bg-[#1b506a] disabled:cursor-wait disabled:opacity-60">
                    {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                    {saving ? 'Gravando…' : 'Salvar certificado'}
                  </button>
                </div>
              </section>
            </form>

            <aside className="cq-no-print space-y-4">
              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div><h2 className="text-xs font-extrabold text-[#123b50]">Histórico de certificados</h2><p className="mt-0.5 text-[9px] text-slate-500">Registros da empresa autenticada · até 50 itens recentes.</p></div>
                  {historyLoading && <LoaderCircle size={15} className="animate-spin text-[#2d8db8]" />}
                </header>
                <div className="max-h-[390px] divide-y divide-slate-100 overflow-y-auto">
                  {!historyLoading && records.length === 0 && <p className="p-5 text-center text-[10px] text-slate-500">Ainda não há certificados registrados para esta empresa.</p>}
                  {records.map((record) => (
                    <button key={record.id} type="button" onClick={() => void openRecord(record)} className={`block w-full p-3 text-left transition hover:bg-sky-50 ${selected?.id === record.id ? 'bg-sky-50' : 'bg-white'}`}>
                      <span className="flex items-start justify-between gap-2"><strong className="text-[10px] text-[#123b50]">{record.numero_certificado}</strong><span className={`border px-1.5 py-0.5 text-[8px] font-bold ${resultTone(record.status)}`}>{statusLabel(record.status)}</span></span>
                      <span className="mt-1 block truncate text-[10px] font-semibold text-slate-700">{record.codigo_peca} · {record.descricao_peca}</span>
                      <span className="mt-1 block text-[9px] text-slate-500">{formatDate(record.data_inspecao)} · OP/Lote {record.ordem_lote}</span>
                    </button>
                  ))}
                </div>
              </section>

              {selected && <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#2d8db8]">Certificado selecionado</p><h2 className="mt-1 text-sm font-extrabold text-[#123b50]">{selected.numero_certificado}</h2></div>
                  <span className={`border px-2 py-1 text-[8px] font-extrabold ${resultTone(selected.status)}`}>{statusLabel(selected.status)}</span>
                </header>
                <div className="space-y-3 p-4">
                  <dl className="grid grid-cols-2 gap-2 text-[9px]">
                    <div><dt className="text-slate-500">Peça</dt><dd className="font-bold text-slate-800">{selected.codigo_peca} · {selected.descricao_peca}</dd></div>
                    <div><dt className="text-slate-500">OP / lote</dt><dd className="font-bold text-slate-800">{selected.ordem_lote}</dd></div>
                    <div><dt className="text-slate-500">Inspeção</dt><dd className="font-bold text-slate-800">{formatDate(selected.data_inspecao)}</dd></div>
                    <div><dt className="text-slate-500">Inspetor</dt><dd className="font-bold text-slate-800">{selected.inspetor_nome}</dd></div>
                  </dl>
                  {selectedDrawingUrl && (selected.desenho_mime.startsWith('image/')
                    ? <img src={selectedDrawingUrl} alt={`Desenho técnico ${selected.desenho_nome}`} className="max-h-44 w-full border border-slate-200 object-contain p-1" />
                    : <a href={selectedDrawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-2 text-[10px] font-semibold text-sky-800"><FileText size={14} />Abrir desenho técnico PDF</a>)}
                  {selectedCotas.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[9px]"><thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-2">Cota</th><th className="p-2">Faixa (mm)</th><th className="p-2">Medido</th><th className="p-2">Resultado</th></tr></thead><tbody>{selectedCotas.map((cota) => <tr key={cota.id} className="border-t border-slate-100"><td className="p-2 font-semibold">{cota.identificador} · {cota.descricao}</td><td className="p-2">{formatMeasure(cota.minimo_mm)} – {formatMeasure(cota.maximo_mm)}</td><td className="p-2">{formatMeasure(cota.medido_mm)}</td><td className="p-2"><span className={`border px-1.5 py-0.5 text-[8px] font-bold ${resultTone(cota.resultado)}`}>{cota.resultado}</span></td></tr>)}</tbody></table></div>}
                  {selected.status === 'REPROVADO' && <p className="border border-rose-200 bg-rose-50 p-2 text-[9px] font-bold leading-4 text-rose-800">REPROVADO — este registro é um relatório de inspeção e não declara conformidade.</p>}
                  {selected.status === 'PENDENTE' && <p className="border border-amber-200 bg-amber-50 p-2 text-[9px] leading-4 text-amber-800">PENDENTE — há cotas ainda sem medição; o documento não declara conformidade.</p>}
                  {selected.observacoes && <p className="border-t border-slate-100 pt-2 text-[9px] leading-4 text-slate-600"><strong>Observações:</strong> {selected.observacoes}</p>}
                  <button type="button" onClick={() => window.print()} disabled={!selectedCotas.length} className="inline-flex h-8 w-full items-center justify-center gap-1.5 bg-[#123b50] px-3 text-[10px] font-bold text-white hover:bg-[#1b506a] disabled:opacity-40"><Printer size={13} /> Imprimir / salvar PDF</button>
                </div>
              </section>}
            </aside>
          </div>
        )}

        {selected && selectedCotas.length > 0 && (
          <section className="cq-print hidden bg-white p-8 text-slate-900">
            <header className="flex items-start justify-between gap-4 border-b-2 border-[#123b50] pb-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#2d8db8]">SYSNQRA ERP INDUSTRIAL · QUALIDADE</p><h1 className="mt-2 text-2xl font-extrabold">Certificado de Qualidade de Peças</h1><p className="mt-1 text-sm">{selected.numero_certificado}</p></div>
              <span className={`border px-3 py-2 text-xs font-extrabold ${resultTone(selected.status)}`}>{statusLabel(selected.status)}</span>
            </header>
            {selected.status !== 'APROVADO' && <p className="mt-4 border border-rose-500 p-3 text-sm font-extrabold">{selected.status === 'REPROVADO' ? 'REPROVADO — NÃO DECLARA CONFORMIDADE.' : 'PENDENTE — NÃO DECLARA CONFORMIDADE.'}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">Código da peça</dt><dd className="font-bold">{selected.codigo_peca}</dd></div>
              <div><dt className="text-xs text-slate-500">Descrição</dt><dd className="font-bold">{selected.descricao_peca}</dd></div>
              <div><dt className="text-xs text-slate-500">Ordem / lote</dt><dd className="font-bold">{selected.ordem_lote}</dd></div>
              <div><dt className="text-xs text-slate-500">Cliente / número de série</dt><dd className="font-bold">{selected.cliente || '—'} / {selected.numero_serie || '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Data de inspeção</dt><dd className="font-bold">{formatDate(selected.data_inspecao)}</dd></div>
              <div><dt className="text-xs text-slate-500">Inspetor autenticado</dt><dd className="font-bold">{selected.inspetor_nome}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slate-500">Desenho técnico</dt><dd className="font-bold">{selected.desenho_nome}</dd></div>
            </dl>
            {selectedDrawingUrl && selected.desenho_mime.startsWith('image/') && <img src={selectedDrawingUrl} alt={`Desenho técnico ${selected.desenho_nome}`} className="mt-4 max-h-64 w-full object-contain" />}
            <table className="mt-5">
              <thead><tr><th>Identificação</th><th>Descrição</th><th>Nominal (mm)</th><th>Mínimo (mm)</th><th>Máximo (mm)</th><th>Medido (mm)</th><th>Resultado</th></tr></thead>
              <tbody>{selectedCotas.map((cota) => <tr key={cota.id}><td>{cota.identificador}</td><td>{cota.descricao}</td><td>{formatMeasure(cota.nominal_mm)}</td><td>{formatMeasure(cota.minimo_mm)}</td><td>{formatMeasure(cota.maximo_mm)}</td><td>{formatMeasure(cota.medido_mm)}</td><td>{cota.resultado}</td></tr>)}</tbody>
            </table>
            {selected.observacoes && <p className="mt-4 whitespace-pre-wrap text-xs"><strong>Observações:</strong> {selected.observacoes}</p>}
            <footer className="mt-10 grid grid-cols-2 gap-10 text-center text-xs">
              <div className="border-t border-slate-500 pt-2">Inspetor responsável · {selected.inspetor_nome}</div>
              <div className="border-t border-slate-500 pt-2">SYSNQRA ERP INDUSTRIAL · {formatDate(selected.data_inspecao)}</div>
            </footer>
          </section>
        )}
      </div>
    </main>
  )
}
