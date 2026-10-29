import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Eye, FileText, RefreshCw, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type EmployeeDocument = {
  id: string
  nome_documento: string
  path_storage: string
  created_at: string
}
type GedProps = { funcionarioId: string }
const BUCKET = 'rh-privado'
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado no GED.'
}

export default function GedAbasColaborador({ funcionarioId }: GedProps) {
  const [arquivosGed, setArquivosGed] = useState<EmployeeDocument[]>([])
  const [enviando, setEnviando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const carregarDocumentos = useCallback(async () => {
    if (!funcionarioId) { setArquivosGed([]); return }
    setAtualizando(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('rh_documentos_colaborador')
        .select('id,nome_documento,path_storage,created_at')
        .eq('funcionario_id', funcionarioId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setArquivosGed((data ?? []) as EmployeeDocument[])
    } catch (error) {
      setErro(messageOf(error))
    } finally {
      setAtualizando(false)
    }
  }, [funcionarioId])

  useEffect(() => { void carregarDocumentos() }, [carregarDocumentos])

  async function handleUploadDocumento(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file || !funcionarioId) return
    setErro('')
    setAviso('')
    if (!ALLOWED_TYPES.has(file.type)) {
      setErro('Formato não permitido. Envie apenas PDF, JPG ou PNG.')
      input.value = ''
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setErro('O arquivo excede o limite de 10 MB.')
      input.value = ''
      return
    }

    setEnviando(true)
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    const pathStorage = `rh/funcionarios/${funcionarioId}/${crypto.randomUUID()}_${safeName}`
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error('Sua sessão expirou. Entre novamente no SYSNQRA ERP.')

      const { error: storageError } = await supabase.storage.from(BUCKET).upload(pathStorage, file, {
        contentType: file.type, cacheControl: '0', upsert: false,
      })
      if (storageError) throw storageError

      const { error: dbError } = await supabase.from('rh_documentos_colaborador').insert({
        funcionario_id: funcionarioId, nome_documento: file.name, path_storage: pathStorage,
      })
      if (dbError) {
        await supabase.storage.from(BUCKET).remove([pathStorage])
        throw dbError
      }
      setAviso('Documento enviado para o armazenamento privado.')
      await carregarDocumentos()
    } catch (error) {
      setErro(`Falha no upload do documento: ${messageOf(error)}`)
    } finally {
      setEnviando(false)
      input.value = ''
    }
  }

  async function visualizarDocumento(pathStorage: string) {
    setErro('')
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathStorage, 60)
      if (error) throw error
      if (!data?.signedUrl) throw new Error('Não foi possível gerar o acesso temporário.')
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setErro(`Acesso negado ao arquivo: ${messageOf(error)}`)
    }
  }

  return <section className="space-y-4" aria-label="GED do colaborador">
    {erro && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{erro}</p>}
    {aviso && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{aviso}</p>}
    <label className="relative flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-sky-500">
      <Upload size={20} className="mb-2 text-slate-500" />
      <span className="text-xs font-semibold text-slate-700">{enviando ? 'Enviando arquivo privado…' : 'Anexar RG, CPF, contrato ou certificado (PDF, JPG, PNG)'}</span>
      <span className="mt-1 text-[10px] text-slate-500">Máximo de 10 MB por arquivo. Acesso protegido por sessão e RLS.</span>
      <input type="file" disabled={enviando || !funcionarioId} onChange={event => void handleUploadDocumento(event)} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" aria-label="Selecionar documento para upload" />
    </label>
    <div className="flex items-center justify-between">
      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Dossiê digital · {arquivosGed.length} arquivo(s)</h3>
      <button type="button" onClick={() => void carregarDocumentos()} disabled={atualizando} className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={12} className={atualizando ? 'animate-spin' : ''}/>Atualizar</button>
    </div>
    <div className="space-y-1.5">
      {arquivosGed.map(doc => <div key={doc.id} className="flex min-h-9 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs">
        <div className="flex min-w-0 items-center gap-2"><FileText size={14} className="shrink-0 text-sky-700"/><span className="truncate text-slate-800">{doc.nome_documento}</span><span className="hidden text-[10px] text-slate-400 sm:inline">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span></div>
        <button type="button" onClick={() => void visualizarDocumento(doc.path_storage)} className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-slate-900 px-2 text-[10px] font-bold text-white hover:bg-slate-700"><Eye size={12}/>Ver (60 s)</button>
      </div>)}
      {!atualizando && arquivosGed.length === 0 && <p className="py-4 text-xs italic text-slate-500">Nenhum documento anexado a este colaborador.</p>}
    </div>
  </section>
}
