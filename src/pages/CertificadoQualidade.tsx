import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Check, CheckCircle2, FileCheck2, FilePlus2, FileText, Image, LoaderCircle, Plus, Printer, RefreshCw, Ruler, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type CotaForm = { id: string; identificador: string; descricao: string; nominal: string; minimo: string; maximo: string; medido: string }
type CotaRecord = { id: string; identificador: string; descricao: string; nominal_mm: number; minimo_mm: number; maximo_mm: number; medido_mm: number | null; resultado: 'PENDENTE' | 'APROVADO' | 'REPROVADO' }
type CertificateRecord = { id: string; numero_certificado: string; codigo_peca: string; descricao_peca: string; ordem_lote: string; cliente: string | null; numero_serie: string | null; data_inspecao: string; inspetor_nome: string; desenho_storage_path: string; desenho_nome: string; desenho_mime: string; observacoes: string | null; status: 'PENDENTE' | 'APROVADO' | 'REPROVADO'; created_at: string }
type FormFields = { codigo: string; descricao: string; ordemLote: string; cliente: string; numeroSerie: string; data: string; observacoes: string }

const BUCKET = 'qualidade-certificados'
const inputClass = 'mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const labelClass = 'block text-[10px] font-bold uppercase tracking-wide text-slate-600'
const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-') }
const newCota = (): CotaForm => ({ id: crypto.randomUUID(), identificador: '', descricao: '', nominal: '', minimo: '', maximo: '', medido: '' })
const newForm = (): FormFields => ({ codigo: '', descricao: '', ordemLote: '', cliente: '', numeroSerie: '', data: today(), observacoes: '' })
const safeName = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-160) || 'desenho'
const drawingMime = (file: File) => {
  if (['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'pdf' ? 'application/pdf' : ''
}
const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Não foi possível concluir a operação.'
const formatDate = (v: string) => new Date(v.slice(0,10) + 'T00:00:00').toLocaleDateString('pt-BR')
const formatMeasure = (v: number | null) => v === null ? '—' : Number(v).toFixed(3).replace('.', ',') + ' mm'
const resultTone = (v: string) => v === 'APROVADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : v === 'REPROVADO' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'

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
      const { data, error: e } = await supabase.from('erp_qualidade_certificados')
        .select('id,numero_certificado,codigo_peca,descricao_peca,ordem_lote,cliente,numero_serie,data_inspecao,inspetor_nome,desenho_storage_path,desenho_nome,desenho_mime,observacoes,status,created_at')
        .eq('empresa_id', tenantId).order('created_at', { ascending: false }).limit(50)
      if (e) throw e
      setRecords((data ?? []) as CertificateRecord[])
    } finally { setHistoryLoading(false) }
  }, [])

  const initialize = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão expirada. Entre novamente para acessar a Qualidade.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('A sessão não possui empresa ativa.')
      setCompanyId(String(tenant.data))
      setOperator(auth.data.user.email || 'Usuário autenticado')
      await loadHistory(String(tenant.data))
    } catch (e) { setError(errorMessage(e)) }
    finally { setLoading(false) }
  }, [loadHistory])

  useEffect(() => { void initialize() }, [initialize])
  useEffect(() => {
    if (!drawing) { setDrawingPreview(''); return }
    const url = URL.createObjectURL(drawing)
    setDrawingPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [drawing])

  const previewResults = useMemo(() => cotas.map(c => {
    if (!c.medido.trim() || !c.minimo.trim() || !c.maximo.trim()) return 'PENDENTE'
    const m = Number(c.medido), min = Number(c.minimo), max = Number(c.maximo)
    return Number.isFinite(m) && Number.isFinite(min) && Number.isFinite(max) && m >= min && m <= max ? 'APROVADO' : 'REPROVADO'
  }), [cotas])

  const updateCota = (id: string, field: keyof Omit<CotaForm,'id'>, value: string) =>
    setCotas(current => current.map(c => c.id === id ? { ...c, [field]: value } : c))

  const openRecord = async (record: CertificateRecord) => {
    setError(''); setNotice(''); setSelected(record); setSelectedCotas([]); setSelectedDrawingUrl('')
    try {
      const [dims, file] = await Promise.all([
        supabase.from('erp_qualidade_certificado_cotas').select('id,identificador,descricao,nominal_mm,minimo_mm,maximo_mm,medido_mm,resultado')
          .eq('empresa_id', companyId).eq('certificado_id', record.id).order('created_at'),
        supabase.storage.from(BUCKET).createSignedUrl(record.desenho_storage_path, 300),
      ])
      if (dims.error) throw dims.error
      if (file.error) throw file.error
      setSelectedCotas((dims.data ?? []) as CotaRecord[])
      setSelectedDrawingUrl(file.data.signedUrl)
    } catch (e) { setError(errorMessage(e)) }
  }

  const resetForm = () => {
    setForm(newForm()); setCotas([newCota()]); setDrawing(null); setSelected(null)
    setSelectedCotas([]); setSelectedDrawingUrl(''); setError(''); setNotice('')
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice('')
    if (!companyId) { setError('Empresa da sessão não identificada.'); return }
    if (!drawing) { setError('Anexe o desenho técnico da peça antes de salvar.'); return }
    const mime = drawingMime(drawing)
    if (!mime) { setError('Formato inválido. Use JPG, PNG, WebP ou PDF.'); return }
    if (drawing.size > 15 * 1024 * 1024) { setError('O desenho excede o limite de 15 MB.'); return }
    if (!cotas.length || cotas.some(c => !c.identificador.trim() || !c.descricao.trim() || !c.nominal.trim() || !c.minimo.trim() || !c.maximo.trim())) {
      setError('Preencha identificação, descrição, nominal e limites de todas as cotas.'); return
    }
    const invalid = cotas.some(c => {
      const n = Number(c.nominal), min = Number(c.minimo), max = Number(c.maximo), m = c.medido.trim() ? Number(c.medido) : null
      return !Number.isFinite(n) || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || min > n || n > max || (m !== null && (!Number.isFinite(m) || m < 0))
    })
    if (invalid) { setError('Confira as cotas: mínimo ≤ nominal ≤ máximo e medições não negativas.'); return }
    setSaving(true)
    const certificateId = crypto.randomUUID()
    const path = companyId + '/' + certificateId + '/' + crypto.randomUUID() + '-' + safeName(drawing.name)
    let uploaded = false
    try {
      const upload = await supabase.storage.from(BUCKET).upload(path, drawing, { upsert: false, contentType: mime })
      if (upload.error) throw upload.error
      uploaded = true
      const result = await supabase.rpc('erp_qualidade_certificado_criar', {
        p_certificado_id: certificateId, p_codigo_peca: form.codigo.trim(), p_descricao_peca: form.descricao.trim(),
        p_ordem_lote: form.ordemLote.trim(), p_data_inspecao: form.data, p_cliente: form.cliente.trim() || null,
        p_numero_serie: form.numeroSerie.trim() || null, p_observacoes: form.observacoes.trim() || null,
        p_desenho_storage_path: path, p_desenho_nome: drawing.name, p_desenho_mime: mime,
        p_cotas: cotas.map(c => ({ identificador: c.identificador.trim(), descricao: c.descricao.trim(),
          nominal: Number(c.nominal), minimo: Number(c.minimo), maximo: Number(c.maximo), medido: c.medido.trim() ? Number(c.medido) : null })),
      })
      if (result.error) throw result.error
      const created = result.data as Partial<CertificateRecord> & { aprovadas?: number; reprovadas?: number; pendentes?: number }
      if (!created?.id || !created.numero_certificado) throw new Error('O banco não confirmou o certificado gravado.')
      uploaded = false
      setNotice('Certificado ' + created.numero_certificado + ' gravado no Supabase. Resultado: ' + created.status + '.')
      setForm(newForm()); setCotas([newCota()]); setDrawing(null)
      const record = { ...created, created_at: new Date().toISOString() } as CertificateRecord
      setSelected(record)
      await loadHistory(companyId)
      await openRecord(record)
    } catch (e) {
      if (uploaded) {
        const cleanup = await supabase.storage.from(BUCKET).remove([path])
        if (cleanup.error) setError(errorMessage(e) + ' O desenho enviado não pôde ser removido: ' + cleanup.error.message)
        else setError(errorMessage(e))
      } else setError(errorMessage(e))
    } finally { setSaving(false) }
  }

  return (
    <main className="cq-page min-h-[calc(100vh-74px)] bg-[#f4f8fa] p-3 text-slate-800 sm:p-5">
      <style>{'@page{size:A4;margin:12mm}@media print{body *{visibility:hidden!important}.cq-print,.cq-print *{visibility:visible!important}.cq-print{display:block!important;position:absolute!important;inset:0!important;width:100%!important;padding:0!important;background:#fff!important}.cq-no-print{display:none!important}.cq-print table{width:100%;border-collapse:collapse}.cq-print th,.cq-print td{border:1px solid #94a3b8;padding:6px;text-align:left;font-size:10px}}'}</style>
      <div className="mx-auto max-w-[1480px] space-y-4">
        <header className="cq-no-print flex flex-wrap items-center justify-between gap-3 border border-[#cbdce4] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center bg-[#123b50] text-white"><FileCheck2 size={20}/></span><div>
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#2d8db8]">SYSNQRA · QUALIDADE</p>
            <h1 className="text-base font-extrabold text-[#123b50] sm:text-lg">Certificado de Qualidade de Peças</h1>
            <p className="text-[10px] text-slate-500">Inspeção dimensional rastreável · documento A4/PDF</p>
          </div></div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-[260px] truncate border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-600">Operador autenticado: {operator || 'validando sessão…'}</span>
            <button type="button" onClick={() => void initialize()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-3 text-[10px] font-bold"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>Atualizar</button>
            <button type="button" onClick={resetForm} className="inline-flex h-8 items-center gap-1.5 bg-[#123b50] px-3 text-[10px] font-bold text-white"><FilePlus2 size={13}/>Novo certificado</button>
          </div>
        </header>
        {error && <div role="alert" className="cq-no-print flex items-start gap-2 border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-800"><AlertTriangle size={15}/>{error}</div>}
        {notice && <div role="status" aria-live="polite" className="cq-no-print flex items-start gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800"><CheckCircle2 size={15}/>{notice}</div>}
        {loading ? <div role="status" className="cq-no-print grid min-h-64 place-items-center border bg-white text-xs text-slate-500"><LoaderCircle size={16} className="animate-spin"/>Validando sessão e consultando certificados…</div> :
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
            <form onSubmit={save} className="cq-no-print space-y-4">
              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center gap-2 border-b px-4 py-3"><Ruler size={16} className="text-[#2d8db8]"/><div><h2 className="text-xs font-extrabold text-[#123b50]">Identificação e rastreabilidade</h2><p className="text-[9px] text-slate-500">Produto e vínculo com a ordem ou lote.</p></div></header>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelClass}>Código da peça *<input required maxLength={80} className={inputClass} value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label>
                  <label className={labelClass + ' sm:col-span-2'}>Descrição da peça *<input required maxLength={200} className={inputClass} value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></label>
                  <label className={labelClass}>Ordem de produção / lote *<input required maxLength={120} className={inputClass} value={form.ordemLote} onChange={e=>setForm({...form,ordemLote:e.target.value})}/></label>
                  <label className={labelClass}>Cliente<input maxLength={120} className={inputClass} value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})}/></label>
                  <label className={labelClass}>Número de série<input maxLength={120} className={inputClass} value={form.numeroSerie} onChange={e=>setForm({...form,numeroSerie:e.target.value})}/></label>
                  <label className={labelClass}>Data da inspeção *<input type="date" required className={inputClass} value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></label>
                  <div className="flex items-end sm:col-span-2"><p className="w-full border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] text-sky-900"><ShieldCheck size={13} className="mr-1 inline"/>Inspetor atribuído pelo perfil ERP autenticado no banco.</p></div>
                </div>
              </section>
              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><div className="flex items-center gap-2"><Image size={16} className="text-[#2d8db8]"/><div><h2 className="text-xs font-extrabold text-[#123b50]">Desenho técnico</h2><p className="text-[9px] text-slate-500">Bucket privado · JPG, PNG, WebP ou PDF · até 15 MB.</p></div></div>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 border border-[#2d8db8] px-3 text-[10px] font-bold text-[#165b78]"><Upload size={13}/>Selecionar arquivo<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={e=>{const f=e.target.files?.[0]??null;setDrawing(f);if(f)setError('');e.currentTarget.value=''}}/></label>
                </header>
                {drawing ? <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_220px]"><div className="flex min-w-0 items-center gap-2 border bg-slate-50 p-3"><FileText size={17}/><div className="min-w-0"><p className="truncate text-[11px] font-bold">{drawing.name}</p><p className="text-[9px] text-slate-500">{(drawing.size/1024/1024).toFixed(2)} MB</p></div><button type="button" onClick={()=>setDrawing(null)} className="ml-auto"><Trash2 size={14}/></button></div>{drawing.type.startsWith('image/')&&drawingPreview&&<img src={drawingPreview} alt="Pré-visualização do desenho" className="max-h-40 w-full border object-contain p-1"/>}</div> : <div className="p-5 text-center text-[10px] text-slate-500">Anexe o desenho técnico usado como referência para a inspeção.</div>}
              </section>
              <section className="border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><div><h2 className="text-xs font-extrabold text-[#123b50]">Cotas e medições</h2><p className="text-[9px] text-slate-500">Resultado calculado e validado novamente no banco.</p></div><button type="button" onClick={()=>setCotas(cs=>[...cs,newCota()])} className="inline-flex h-8 items-center gap-1 border px-3 text-[10px] font-bold"><Plus size={13}/>Adicionar cota</button></header>
                <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr className="bg-[#f3f7f9] text-[9px] font-bold uppercase text-slate-600">{['Identificação','Descrição','Nominal (mm)','Mínimo (mm)','Máximo (mm)','Medido (mm)','Resultado',''].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>
                  {cotas.map((c,i)=><tr key={c.id} className="border-t border-slate-100"><td className="p-2"><input required aria-label={'Identificação da cota '+(i+1)} maxLength={40} className="h-8 w-28 border px-2 text-[10px]" value={c.identificador} onChange={e=>updateCota(c.id,'identificador',e.target.value)}/></td><td className="p-2"><input required aria-label={'Descrição da cota '+(i+1)} maxLength={120} className="h-8 w-36 border px-2 text-[10px]" value={c.descricao} onChange={e=>updateCota(c.id,'descricao',e.target.value)}/></td>
                    {(['nominal','minimo','maximo','medido'] as const).map(f=><td key={f} className="p-2"><input aria-label={f+' da cota '+(i+1)} type="number" step="0.001" min="0" required={f!=='medido'} className="h-8 w-28 border px-2 text-[10px]" value={c[f]} onChange={e=>updateCota(c.id,f,e.target.value)}/></td>)}
                    <td className="p-2"><span className={'inline-flex h-7 items-center border px-2 text-[9px] font-bold '+resultTone(previewResults[i])}>{previewResults[i]}</span></td><td className="p-2"><button type="button" disabled={cotas.length===1} onClick={()=>setCotas(cs=>cs.length>1?cs.filter(x=>x.id!==c.id):cs)} aria-label={'Remover cota '+(i+1)} className="disabled:opacity-30"><Trash2 size={14}/></button></td></tr>)}
                </tbody></table></div><div className="border-t bg-slate-50 px-4 py-2 text-[9px] text-slate-600">Faixa inclusiva: mínimo ≤ medida ≤ máximo. Cotas sem medição permanecem pendentes.</div>
              </section>
              <section className="border border-slate-200 bg-white p-4 shadow-sm"><label className={labelClass}>Observações da inspeção<textarea rows={3} maxLength={2000} className="mt-1 w-full border border-slate-300 px-3 py-2 text-xs" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="text-[9px] text-slate-500">Dados gravados no Supabase da empresa autenticada.</span><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 bg-[#123b50] px-4 text-[10px] font-extrabold uppercase text-white disabled:opacity-60">{saving?<LoaderCircle size={14} className="animate-spin"/>:<Check size={14}/ >}{saving?'Gravando…':'Salvar certificado'}</button></div>
              </section>
            </form>
            <aside className="cq-no-print space-y-4">
              <section className="border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-xs font-extrabold text-[#123b50]">Histórico de certificados</h2><p className="text-[9px] text-slate-500">Empresa autenticada · 50 itens recentes.</p></div>{historyLoading&&<LoaderCircle size={15} className="animate-spin"/>}</header>
                <div className="max-h-[390px] divide-y overflow-y-auto">{!historyLoading&&records.length===0&&<p className="p-5 text-center text-[10px] text-slate-500">Ainda não há certificados registrados.</p>}
                  {records.map(r=><button key={r.id} type="button" onClick={()=>void openRecord(r)} className={'block w-full p-3 text-left hover:bg-sky-50 '+(selected?.id===r.id?'bg-sky-50':'bg-white')}><span className="flex justify-between gap-2"><strong className="text-[10px] text-[#123b50]">{r.numero_certificado}</strong><span className={'border px-1.5 py-0.5 text-[8px] font-bold '+resultTone(r.status)}>{r.status}</span></span><span className="mt-1 block truncate text-[10px] font-semibold">{r.codigo_peca} · {r.descricao_peca}</span><span className="mt-1 block text-[9px] text-slate-500">{formatDate(r.data_inspecao)} · OP/Lote {r.ordem_lote}</span></button>)}
                </div>
              </section>
              {selected&&<section className="border border-slate-200 bg-white shadow-sm"><header className="flex items-start justify-between border-b px-4 py-3"><div><p className="text-[9px] font-bold uppercase text-[#2d8db8]">Certificado selecionado</p><h2 className="text-sm font-extrabold text-[#123b50]">{selected.numero_certificado}</h2></div><span className={'border px-2 py-1 text-[8px] font-extrabold '+resultTone(selected.status)}>{selected.status}</span></header>
                <div className="space-y-3 p-4"><dl className="grid grid-cols-2 gap-2 text-[9px]"><div><dt className="text-slate-500">Peça</dt><dd className="font-bold">{selected.codigo_peca} · {selected.descricao_peca}</dd></div><div><dt className="text-slate-500">OP / lote</dt><dd className="font-bold">{selected.ordem_lote}</dd></div><div><dt className="text-slate-500">Inspeção</dt><dd className="font-bold">{formatDate(selected.data_inspecao)}</dd></div><div><dt className="text-slate-500">Inspetor</dt><dd className="font-bold">{selected.inspetor_nome}</dd></div></dl>
                  {selectedDrawingUrl&&(selected.desenho_mime.startsWith('image/')?<img src={selectedDrawingUrl} alt={'Desenho técnico '+selected.desenho_nome} className="max-h-44 w-full border object-contain p-1"/>:<a href={selectedDrawingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 border bg-slate-50 p-2 text-[10px] font-semibold text-sky-800"><FileText size={14}/>Abrir desenho técnico PDF</a>)}
                  {selectedCotas.length>0&&<div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[9px]"><thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-2">Cota</th><th className="p-2">Faixa (mm)</th><th className="p-2">Medido</th><th className="p-2">Resultado</th></tr></thead><tbody>{selectedCotas.map(c=><tr key={c.id} className="border-t"><td className="p-2 font-semibold">{c.identificador} · {c.descricao}</td><td className="p-2">{formatMeasure(c.minimo_mm)} – {formatMeasure(c.maximo_mm)}</td><td className="p-2">{formatMeasure(c.medido_mm)}</td><td className="p-2"><span className={'border px-1.5 py-0.5 '+resultTone(c.resultado)}>{c.resultado}</span></td></tr>)}</tbody></table></div>}
                  {selected.status!=='APROVADO'&&<p className="border border-rose-200 bg-rose-50 p-2 text-[9px] font-bold text-rose-800">{selected.status==='REPROVADO'?'REPROVADO — NÃO DECLARA CONFORMIDADE.':'PENDENTE — NÃO DECLARA CONFORMIDADE.'}</p>}
                  {selected.observacoes&&<p className="border-t pt-2 text-[9px] text-slate-600"><strong>Observações:</strong> {selected.observacoes}</p>}
                  <button type="button" onClick={()=>window.print()} disabled={!selectedCotas.length} className="inline-flex h-8 w-full items-center justify-center gap-1.5 bg-[#123b50] text-[10px] font-bold text-white disabled:opacity-40"><Printer size={13}/>Imprimir / salvar PDF</button>
                </div>
              </section>}
            </aside>
          </div>}
        {selected&&selectedCotas.length>0&&<section className="cq-print hidden bg-white p-8 text-slate-900">
          <header className="flex items-start justify-between gap-4 border-b-2 border-[#123b50] pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#2d8db8]">SYSNQRA ERP INDUSTRIAL · QUALIDADE</p><h1 className="mt-2 text-2xl font-extrabold">Certificado de Qualidade de Peças</h1><p className="mt-1 text-sm">{selected.numero_certificado}</p></div><strong>{selected.status}</strong></header>
          {selected.status!=='APROVADO'&&<p className="mt-4 border border-rose-500 p-3 text-sm font-extrabold">{selected.status==='REPROVADO'?'REPROVADO — NÃO DECLARA CONFORMIDADE.':'PENDENTE — NÃO DECLARA CONFORMIDADE.'}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[['Código da peça',selected.codigo_peca],['Descrição',selected.descricao_peca],['Ordem / lote',selected.ordem_lote],['Cliente / série',(selected.cliente||'—')+' / '+(selected.numero_serie||'—')],['Data da inspeção',formatDate(selected.data_inspecao)],['Inspetor',selected.inspetor_nome],['Desenho técnico',selected.desenho_nome]].map(([k,v])=><div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-bold">{v}</dd></div>)}</dl>
          {selectedDrawingUrl&&selected.desenho_mime.startsWith('image/')&&<img src={selectedDrawingUrl} alt="Desenho técnico" className="mt-4 max-h-64 w-full object-contain"/>}
          <table className="mt-5"><thead><tr>{['Identificação','Descrição','Nominal','Mínimo','Máximo','Medido','Resultado'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{selectedCotas.map(c=><tr key={c.id}><td>{c.identificador}</td><td>{c.descricao}</td><td>{formatMeasure(c.nominal_mm)}</td><td>{formatMeasure(c.minimo_mm)}</td><td>{formatMeasure(c.maximo_mm)}</td><td>{formatMeasure(c.medido_mm)}</td><td>{c.resultado}</td></tr>)}</tbody></table>
          {selected.observacoes&&<p className="mt-4 whitespace-pre-wrap text-xs"><strong>Observações:</strong> {selected.observacoes}</p>}
          <footer className="mt-10 grid grid-cols-2 gap-10 text-center text-xs"><div className="border-t pt-2">Inspetor responsável · {selected.inspetor_nome}</div><div className="border-t pt-2">SYSNQRA ERP INDUSTRIAL · {formatDate(selected.data_inspecao)}</div></footer>
        </section>}
      </div>
    </main>
  )
}
