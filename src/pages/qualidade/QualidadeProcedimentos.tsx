import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { ExternalLink, RefreshCw, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'
import { fetchAllPages } from '../../lib/supabasePagination'

type Doc = {
  id: string
  codigo_documento: string
  titulo_documento: string
  revisao: number
  status: string
  url_anexo: string | null
  nome_arquivo: string | null
}

const bucket = 'erp-qualidade-anexos'
const fieldClass = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 focus:border-[#2D8DB8] focus:outline-none'

export default function QualidadeProcedimentos() {
  const [empresa, setEmpresa] = useState('')
  const [docs, setDocs] = useState<Doc[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('')

  const load = useCallback(async () => {
    setErr('')
    const auth = await supabase.auth.getUser()
    if (auth.error || !auth.data.user) {
      setErr(auth.error?.message ?? 'Sessão não autenticada.')
      return
    }
    const profile = await supabase.from('erp_usuarios')
      .select('empresa_id')
      .eq('auth_user_id', auth.data.user.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (profile.error || !profile.data?.empresa_id) {
      setErr(profile.error?.message ?? 'Empresa não identificada para a sessão.')
      return
    }
    const empresaId = profile.data.empresa_id
    setEmpresa(empresaId)
    try {
      const rows = await fetchAllPages<Doc>((from, to) => supabase
        .from('erp_qualidade_documentos_revisoes')
        .select('id,codigo_documento,titulo_documento,revisao,status,url_anexo,nome_arquivo', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('codigo_documento')
        .order('revisao', { ascending: false })
        .range(from, to))
      setDocs(rows)
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'Não foi possível carregar os procedimentos.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setErr('')
    setMsg('')
    if (file.type !== 'application/pdf') {
      setErr('Selecione um arquivo PDF.')
      return
    }
    if (!empresa) {
      setErr('A empresa da sessão ainda não foi identificada. Atualize a tela e tente novamente.')
      return
    }
    if (!codigo.trim() || !titulo.trim()) {
      setErr('Informe o código e o título do procedimento antes de anexar o PDF.')
      return
    }

    setBusy(true)
    let uploadedPath: string | null = null
    try {
      const path = empresa + '/procedimentos/' + crypto.randomUUID() + '.pdf'
      const uploaded = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: 'application/pdf',
      })
      if (uploaded.error) throw uploaded.error
      uploadedPath = path

      const saved = await supabase.rpc('erp_salvar_revisao_documento', {
        p_codigo: codigo.trim(),
        p_titulo: titulo.trim(),
        p_departamento: 'QUALIDADE',
        p_conteudo: '',
        p_motivo: 'Inclusão de procedimento em PDF',
        p_url_anexo: path,
        p_nome_arquivo: file.name,
      })
      if (saved.error) throw saved.error
      uploadedPath = null
      const revision = saved.data && typeof saved.data === 'object' && 'revisao' in saved.data ? saved.data.revisao : ''
      setMsg('Procedimento ' + codigo.trim() + ' registrado como revisão ' + String(revision) + ', aguardando aprovação.')
      await load()
    } catch (cause) {
      if (uploadedPath) {
        await supabase.storage.from(bucket).remove([uploadedPath])
      }
      setErr(cause instanceof Error ? cause.message : 'Falha ao armazenar o procedimento.')
    } finally {
      setBusy(false)
    }
  }

  const open = async (path: string | null) => {
    if (!path) return
    const result = await supabase.storage.from(bucket).createSignedUrl(path, 900)
    if (result.error) {
      setErr(result.error.message)
      return
    }
    window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50]">
      <QualitySidebar active="/qualidade/procedimentos" />
      <div className="mx-auto max-w-[1800px] space-y-3">
        <header className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-2">
          <div className="mr-auto">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">SGQ · Documentação controlada</p>
            <h1 className="text-[18px] font-semibold">Procedimentos e PDFs</h1>
            <p className="text-[11px] text-slate-600">Cada envio cria uma revisão em análise; a vigente só é substituída após aprovação.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className="erp-row-action">
            <RefreshCw size={13} /> Atualizar
          </button>
        </header>

        {(err || msg) && <p role={err ? 'alert' : 'status'} className={err ? 'border border-red-300 bg-red-50 px-3 py-2 text-[11px] text-red-800' : 'border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800'}>{err || msg}</p>}

        <section className="grid gap-3 border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="space-y-2">
            <h2 className="text-[12px] font-bold">Cadastrar procedimento</h2>
            <label className="block text-[10px] font-semibold uppercase text-slate-600">Código do documento
              <input className={fieldClass} value={codigo} maxLength={50} onChange={event => setCodigo(event.target.value.toUpperCase())} required />
            </label>
            <label className="block text-[10px] font-semibold uppercase text-slate-600">Título
              <input className={fieldClass} value={titulo} maxLength={255} onChange={event => setTitulo(event.target.value)} required />
            </label>
            <label className="inline-flex h-[30px] cursor-pointer items-center gap-2 border border-[#2D8DB8] bg-[#F4FBFD] px-3 text-[11px] font-semibold hover:bg-[#E5F3F8]">
              <Upload size={13} /> {busy ? 'Enviando…' : 'Selecionar PDF'}
              <input type="file" accept="application/pdf,.pdf" disabled={busy} className="sr-only" onChange={event => void upload(event)} />
            </label>
          </div>

          <div className="min-w-0">
            <h2 className="mb-2 text-[12px] font-bold">Histórico de revisões</h2>
            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="bg-[#E5F3F8] text-[10px] uppercase">
                  <tr><th className="p-2">Código</th><th className="p-2">Título</th><th className="p-2">Rev.</th><th className="p-2">Status</th><th className="p-2">Arquivo</th></tr>
                </thead>
                <tbody>
                  {docs.map(doc => <tr key={doc.id} className="border-t border-slate-200">
                    <td className="p-2 font-semibold">{doc.codigo_documento}</td>
                    <td className="p-2">{doc.titulo_documento}</td>
                    <td className="p-2">{doc.revisao}</td>
                    <td className="p-2">{doc.status}</td>
                    <td className="p-2">{doc.url_anexo ? <button type="button" onClick={() => void open(doc.url_anexo)} className="erp-row-action"><ExternalLink size={12} /> {doc.nome_arquivo || 'Abrir PDF'}</button> : <span className="text-slate-400">Sem anexo</span>}</td>
                  </tr>)}
                  {!docs.length && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Nenhum procedimento registrado para esta empresa.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
