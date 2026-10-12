import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Download, ExternalLink, FileText, RefreshCw, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import QualitySidebar from '../../components/quality/QualitySidebar'
import { fetchAllPages } from '../../lib/supabasePagination'
import { emitirDossieTecnico8D } from '../../services/geradorDocumento'

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
const templateBucket = 'erp-documentos-qualidade'
const fieldClass = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 focus:border-[#2D8DB8] focus:outline-none'

export default function QualidadeProcedimentos() {
  const [empresa, setEmpresa] = useState('')
  const [docs, setDocs] = useState<Doc[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('')
  const [dossies, setDossies] = useState<Array<{ id: string; codigo: string }>>([])
  const [selected8D, setSelected8D] = useState('')
  const [generating, setGenerating] = useState(false)

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
      const d8Rows = await fetchAllPages<{ id: string; codigo: string }>((from, to) => supabase
        .from('erp_qualidade_8d')
        .select('id,codigo', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('updated_at', { ascending: false })
        .range(from, to))
      setDossies(d8Rows)
      setSelected8D(current => current && d8Rows.some(row => row.id === current) ? current : d8Rows[0]?.id ?? '')
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

  const uploadTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setErr('')
    setMsg('')
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErr('Selecione um modelo Word .docx válido.')
      return
    }
    if (!empresa) {
      setErr('A empresa da sessão ainda não foi identificada. Atualize a tela e tente novamente.')
      return
    }
    setBusy(true)
    let uploadedPath: string | null = null
    try {
      const path = empresa + '/modelos/' + crypto.randomUUID() + '.docx'
      const uploaded = await supabase.storage.from(templateBucket).upload(path, file, {
        upsert: false,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      if (uploaded.error) throw uploaded.error
      uploadedPath = path
      const saved = await supabase.rpc('erp_salvar_revisao_documento', {
        p_codigo: 'MODELO-DOSSIE-8D',
        p_titulo: 'Modelo Word — Dossiê Técnico 8D',
        p_departamento: 'QUALIDADE',
        p_conteudo: 'Modelo Word DOCX para emissão do dossiê técnico 8D a partir dos registros reais do ERP.',
        p_motivo: 'Inclusão de modelo Word para dossiê técnico 8D',
        p_logo_path: null,
        p_url_anexo: path,
        p_nome_arquivo: file.name,
      })
      if (saved.error) throw saved.error
      uploadedPath = null
      setMsg('Modelo Word registrado como nova revisão em análise. Após aprovação, ele poderá ser usado para gerar os dossiês 8D.')
      await load()
    } catch (cause) {
      if (uploadedPath) {
        const removed = await supabase.storage.from(templateBucket).remove([uploadedPath])
        if (removed.error) console.error('[SGQ] Falha ao remover arquivo de modelo não registrado', removed.error)
      }
      setErr(cause instanceof Error ? cause.message : 'Falha ao armazenar o modelo Word.')
    } finally {
      setBusy(false)
    }
  }

  const generate8D = async () => {
    if (!selected8D) {
      setErr('Selecione um registro 8D para emitir o dossiê.')
      return
    }
    setErr('')
    setMsg('')
    setGenerating(true)
    try {
      await emitirDossieTecnico8D(selected8D)
      setMsg('Dossiê técnico 8D gerado e enviado para download.')
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'Não foi possível gerar o dossiê técnico 8D.')
    } finally {
      setGenerating(false)
    }
  }

  const open = async (path: string | null, isTemplate = false) => {
    if (!path) return
    const result = await supabase.storage.from(isTemplate ? templateBucket : bucket).createSignedUrl(path, 900)
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

        <section className="grid gap-3 border border-slate-200 bg-white p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-[12px] font-bold"><FileText size={14}/> Modelo Word do dossiê técnico 8D</h2>
            <p className="text-[10px] leading-relaxed text-slate-600">Envie um arquivo .docx preparado no Word. Use campos como {'{id_8d}'}, {'{maquina_tag}'} e linhas dinâmicas com {'{#plano_5w2h}'} ... {'{/plano_5w2h}'}. A nova revisão fica em análise e só será usada após aprovação.</p>
            <label className="inline-flex h-[30px] cursor-pointer items-center gap-2 border border-[#2D8DB8] bg-[#F4FBFD] px-3 text-[11px] font-semibold hover:bg-[#E5F3F8]">
              <Upload size={13}/> {busy ? 'Enviando…' : 'Enviar modelo Word (.docx)'}
              <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} className="sr-only" onChange={event => void uploadTemplate(event)} />
            </label>
          </div>
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-[12px] font-bold"><Download size={14}/> Emitir dossiê técnico 8D</h2>
            <label className="block text-[9px] font-semibold uppercase text-slate-600">Registro 8D da empresa
              <select className={fieldClass} value={selected8D} onChange={event => setSelected8D(event.target.value)} disabled={!dossies.length || generating}>
                {!dossies.length && <option value="">Nenhum registro 8D disponível</option>}
                {dossies.map(item => <option key={item.id} value={item.id}>{item.codigo}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void generate8D()} disabled={!selected8D || generating} className="inline-flex h-[30px] items-center gap-2 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={13}/> {generating ? 'Gerando…' : 'Gerar e baixar DOCX'}
            </button>
          </div>
        </section>

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
                    <td className="p-2">{doc.url_anexo ? <button type="button" onClick={() => void open(doc.url_anexo, doc.codigo_documento === 'MODELO-DOSSIE-8D')} className="erp-row-action"><ExternalLink size={12} /> {doc.nome_arquivo || 'Abrir PDF'}</button> : <span className="text-slate-400">Sem anexo</span>}</td>
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
