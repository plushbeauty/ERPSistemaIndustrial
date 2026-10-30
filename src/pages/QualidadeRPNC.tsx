/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — RPNC / Tela A: Abertura e triagem.
 * @REVISAO 29/10/2026
 * Integra a RPC atômica existente e o bucket privado de evidências; sem dados demonstrativos.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import DragDropEvidencias from '../components/qualidade/DragDropEvidencias'
import QualidadeRPNCTratamento from './QualidadeRPNCTratamento'
import { supabase } from '../lib/supabaseClient'

type Sector = { id: string; nome: string; codigo: string | null }
type RPNCRecord = {
  id: string
  numero_rpnc: string
  descricao_nao_conformidade: string
  status: string
  sgq_origem: string | null
  sgq_severidade: string | null
  criado_em: string
}
type CreatedRPNC = { id: string; numero_rpnc: string }
type Severity = 'Critica' | 'Maior' | 'Menor'
type Origin = 'interna' | 'fornecedor' | 'cliente' | 'processo'

const severityOptions: Array<{ value: Severity; label: string }> = [
  { value: 'Critica', label: 'Crítica' },
  { value: 'Maior', label: 'Maior' },
  { value: 'Menor', label: 'Menor' },
]
const originOptions: Array<{ value: Origin; label: string }> = [
  { value: 'interna', label: 'Interna' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'processo', label: 'Processo produtivo' },
]
const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15 disabled:bg-slate-100'
const labelClass = 'grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-[#2D8DB8] disabled:cursor-not-allowed disabled:opacity-50'

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Operação não concluída. Consulte o log do Supabase e tente novamente.'
}
function mimeFor(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  const mimeByExtension: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    txt: 'text/plain',
  }
  return extension ? mimeByExtension[extension] ?? 'application/octet-stream' : 'application/octet-stream'
}
function safeFileName(name: string): string {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'evidencia'
}

export default function QualidadeRPNC() {
  const [companyId, setCompanyId] = useState('')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [records, setRecords] = useState<RPNCRecord[]>([])
  const [sectorId, setSectorId] = useState('')
  const [origin, setOrigin] = useState<Origin>('interna')
  const [severity, setSeverity] = useState<Severity>('Menor')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedForInvestigation, setSelectedForInvestigation] = useState<RPNCRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sessão expirada. Entre novamente para acessar o SGQ.')
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error) throw tenant.error
      if (!tenant.data) throw new Error('Empresa da sessão não identificada.')
      const tenantId = String(tenant.data)
      const [sectorResult, recordResult] = await Promise.all([
        supabase.from('erp_setores').select('id,nome,codigo').eq('empresa_id', tenantId).eq('ativo', true).order('nome'),
        supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,status,sgq_origem,sgq_severidade,criado_em').eq('empresa_id', tenantId).order('criado_em', { ascending: false }).limit(20),
      ])
      const failure = sectorResult.error ?? recordResult.error
      if (failure) throw failure
      setCompanyId(tenantId)
      const nextSectors = (sectorResult.data ?? []) as Sector[]
      setSectors(nextSectors)
      setRecords((recordResult.data ?? []) as RPNCRecord[])
      setSectorId((current) => current && nextSectors.some((sector) => sector.id === current) ? current : nextSectors[0]?.id ?? '')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!companyId || !sectorId) {
      setError('Não há setor ativo disponível na empresa da sessão. Cadastre ou ative um setor antes de abrir a RPNC.')
      return
    }
    if (description.trim().length < 10) {
      setError('Descreva a não conformidade com pelo menos 10 caracteres.')
      return
    }
    setSaving(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sessão expirada. Entre novamente antes de salvar.')
      const result = await supabase.rpc('erp_sgq_abrir_rpnc', {
        p_descricao: description.trim(),
        p_origem: origin,
        p_severidade: severity,
        p_setor_id: sectorId,
        p_linked_entity_type: null,
        p_linked_entity_id: null,
      })
      if (result.error) throw result.error
      if (!result.data) throw new Error('A RPC de abertura não retornou o registro persistido.')
      const created = result.data as CreatedRPNC
      if (!created.id || !created.numero_rpnc) throw new Error('A RPC retornou um registro sem identificador ou protocolo.')

      let uploaded = 0
      const failedFiles: string[] = []
      for (const file of files) {
        const path = `${companyId}/${created.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`
        const mimeType = mimeFor(file)
        const upload = await supabase.storage.from('qualidade-evidencias').upload(path, file, { upsert: false, contentType: mimeType })
        if (upload.error) {
          failedFiles.push(`${file.name}: ${upload.error.message}`)
          continue
        }
        const metadata = await supabase.from('erp_qualidade_rpnc_evidencias').insert({
          empresa_id: companyId,
          rpnc_id: created.id,
          nome_arquivo: file.name,
          storage_path: path,
          mime_type: mimeType,
          tamanho_bytes: file.size,
          uploaded_by: authData.user.id,
        })
        if (metadata.error) {
          await supabase.storage.from('qualidade-evidencias').remove([path])
          failedFiles.push(`${file.name}: ${metadata.error.message}`)
          continue
        }
        uploaded += 1
      }

      setDescription('')
      setFiles([])
      await load()
      if (failedFiles.length) {
        setNotice(`RPNC ${created.numero_rpnc} registrada. ${uploaded} evidência(s) vinculada(s); falha ao anexar: ${failedFiles.join(' | ')}. Reabra o registro e envie os arquivos pendentes.`)
      } else {
        setNotice(`RPNC ${created.numero_rpnc} registrada no Supabase.${uploaded ? ` ${uploaded} evidência(s) privada(s) anexada(s).` : ''}`)
      }
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="space-y-3 p-2 text-slate-800">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#123B50] text-white"><ClipboardCheck size={16} /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2D8DB8]">SGQ · Sistema de Gestão da Qualidade</p>
          <h1 className="text-sm font-extrabold text-[#123B50]">RPNC · Abertura e triagem</h1>
          <p className="text-[11px] text-slate-500">Protocolo atômico, origem rastreável e evidências privadas vinculadas à empresa.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || saving} className={`${buttonClass} ml-auto`}><RefreshCw size={13} /> Atualizar</button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><span>{notice}</span></div>}

      <form onSubmit={(event) => void create(event)} className="space-y-3" aria-busy={saving}>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck size={15} className="text-[#2D8DB8]" />
            <h2 className="text-xs font-extrabold">Identificação da ocorrência</h2>
            <span className="ml-auto text-[10px] text-slate-500">Campos compactos · altura 36 px</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>Origem da ocorrência
              <select className={inputClass} value={origin} onChange={(event) => setOrigin(event.target.value as Origin)} disabled={saving}>
                {originOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className={labelClass}>Severidade
              <select className={inputClass} value={severity} onChange={(event) => setSeverity(event.target.value as Severity)} disabled={saving}>
                {severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className={labelClass}>Setor responsável
              <select required className={inputClass} value={sectorId} onChange={(event) => setSectorId(event.target.value)} disabled={saving || loading || !sectors.length}>
                <option value="">Selecionar setor cadastrado</option>
                {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.codigo ? `${sector.codigo} · ` : ''}{sector.nome}</option>)}
              </select>
            </label>
            <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>Descrição da não conformidade
              <textarea required minLength={10} maxLength={5000} rows={3} className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal normal-case text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15 disabled:bg-slate-100" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o desvio observado, requisito não atendido e impacto identificado." disabled={saving} />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 border-b border-slate-100 pb-2"><h2 className="text-xs font-extrabold">Evidências da ocorrência</h2><p className="mt-1 text-[11px] text-slate-500">Arquivos aceitos: PDF, DOCX, XLSX, PNG, JPEG, WEBP e TXT · limite de 15 MB por arquivo.</p></div>
          <DragDropEvidencias onArquivosAlterados={setFiles} maxFileSizeBytes={15 * 1024 * 1024} />
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-2xl text-[10px] text-slate-500">A abertura exige sessão autenticada, permissão de criação e setor ativo da empresa atual. A RPC existente gera o protocolo no banco e executa as validações transacionais.</p>
          <button type="submit" disabled={saving || loading || !companyId || !sectorId || !description.trim() || description.trim().length < 10} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#123B50] px-4 text-xs font-extrabold text-white hover:bg-[#1D5F7A] disabled:cursor-not-allowed disabled:opacity-50">
            <Save size={14} /> {saving ? 'Registrando…' : 'Registrar RPNC'}
          </button>
        </footer>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2"><h2 className="text-xs font-extrabold">RPNC recentes</h2><span className="text-[10px] text-slate-500">{records.length} registros · dados do banco</span></header>
        {loading ? <p className="p-4 text-xs text-slate-500">Consultando o Supabase…</p> : records.length ? (
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-800 text-white"><tr><th className="p-2.5">Protocolo</th><th className="p-2.5">Descrição</th><th className="p-2.5">Origem</th><th className="p-2.5">Severidade</th><th className="p-2.5">Status</th><th className="p-2.5">Abertura</th><th className="p-2.5">Ações</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-t border-slate-100 even:bg-slate-50"><td className="whitespace-nowrap p-2.5 font-mono font-bold">{record.numero_rpnc}</td><td className="min-w-64 max-w-xl p-2.5">{record.descricao_nao_conformidade}</td><td className="p-2.5">{record.sgq_origem ?? '—'}</td><td className="p-2.5">{record.sgq_severidade ?? '—'}</td><td className="p-2.5">{record.status}</td><td className="whitespace-nowrap p-2.5">{new Date(record.criado_em).toLocaleString('pt-BR')}</td><td className="whitespace-nowrap p-2.5"><button type="button" onClick={() => setSelectedForInvestigation(record)} className={buttonClass}>Investigar / eficácia</button></td></tr>)}</tbody></table></div>
        ) : <p className="p-4 text-xs text-slate-500">Nenhuma RPNC encontrada para esta empresa ou o usuário não possui acesso de leitura.</p>}
      </section>
      {selectedForInvestigation && <QualidadeRPNCTratamento companyId={companyId} record={selectedForInvestigation} onClose={() => setSelectedForInvestigation(null)} onSaved={() => { void load() }} />}
    </main>
  )
}
