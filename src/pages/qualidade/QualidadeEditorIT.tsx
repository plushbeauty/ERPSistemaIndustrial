import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, FileEdit, ImageUp, Plus, Printer, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { emitirProcedimentoIT } from '../../services/geradorDocumento'
import QualitySidebar from '../../components/quality/QualitySidebar'

type FlowKind = 'INICIO' | 'ETAPA' | 'DECISAO' | 'FIM'
type FlowStep = { id: string; kind: FlowKind; title: string; responsible: string }
type ProcedureContent = { objective: string; scope: string; responsibilities: string; method: string; steps: FlowStep[] }

const emptyContent: ProcedureContent = { objective: '', scope: '', responsibilities: '', method: '', steps: [
  { id: 'step-start', kind: 'INICIO', title: 'Iniciar procedimento', responsible: '' },
  { id: 'step-work', kind: 'ETAPA', title: 'Executar atividade conforme instrução', responsible: '' },
  { id: 'step-check', kind: 'DECISAO', title: 'Resultado atende aos critérios?', responsible: '' },
  { id: 'step-end', kind: 'FIM', title: 'Registrar e encerrar', responsible: '' },
] }
const sectionNames = ['OBJETIVO', 'ESCOPO', 'RESPONSABILIDADES', 'MÉTODO E CRITÉRIOS', 'FLUXO DO PROCESSO'] as const
const inputClass = 'mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100'
const labelClass = 'block text-[9px] font-semibold uppercase tracking-wide text-slate-600'

function serialize(value: ProcedureContent): string {
  const flow = value.steps.map((step, index) => {
    const owner = step.responsible.trim() ? ' | Responsável: ' + step.responsible.trim() : ''
    return String(index + 1).padStart(2, '0') + '. [' + step.kind + '] ' + step.title.trim() + owner
  }).join('\n')
  return [
    '[OBJETIVO]', value.objective.trim(),
    '', '[ESCOPO]', value.scope.trim(),
    '', '[RESPONSABILIDADES]', value.responsibilities.trim(),
    '', '[MÉTODO E CRITÉRIOS]', value.method.trim(),
    '', '[FLUXO DO PROCESSO]', flow,
  ].join('\n').trim()
}

function parseContent(raw: string): ProcedureContent {
  if (!raw.trim()) return emptyContent
  const values: ProcedureContent = { ...emptyContent, steps: [] }
  const markers = sectionNames.map(name => '[' + name + ']')
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index]
    const start = raw.indexOf(marker)
    if (start < 0) continue
    const from = start + marker.length
    const nextPositions = markers.map(next => raw.indexOf(next, from)).filter(position => position >= 0)
    const end = nextPositions.length ? Math.min(...nextPositions) : raw.length
    const section = raw.slice(from, end).trim()
    if (index === 0) values.objective = section
    if (index === 1) values.scope = section
    if (index === 2) values.responsibilities = section
    if (index === 3) values.method = section
    if (index === 4) {
      const parsed: FlowStep[] = []
      for (const line of section.split('\n')) {
        const match = line.match(/^\s*\d+\.\s*\[(INICIO|ETAPA|DECISAO|FIM)\]\s*(.*?)(?:\s*\|\s*Responsável:\s*(.*))?$/i)
        if (match) parsed.push({
          id: String(crypto.randomUUID()),
          kind: match[1].toUpperCase() as FlowKind,
          title: match[2].trim(),
          responsible: (match[3] ?? '').trim(),
        })
      }
      if (parsed.length) values.steps = parsed
    }
  }
  if (!markers.some(marker => raw.includes(marker))) values.method = raw
  if (!values.steps.length) values.steps = emptyContent.steps
  return values
}

function wrapText(text: string, max = 24): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max && line) {
      lines.push(line)
      line = word
    } else line = (line + ' ' + word).trim()
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

export default function QualidadeEditorIT() {
  const [empresa, setEmpresa] = useState('')
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('')
  const [departamento, setDepartamento] = useState('QUALIDADE')
  const [revisao, setRevisao] = useState(0)
  const [data, setData] = useState('')
  const [logo, setLogo] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [content, setContent] = useState<ProcedureContent>(emptyContent)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [procedures, setProcedures] = useState<Array<{ codigo_documento: string; titulo_documento: string; revisao: number; data_homologacao: string | null; conteudo_texto: string; logo_path: string | null; setor_responsavel: string | null; status: string | null }>>([])
  const [selectedCode, setSelectedCode] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const session = await supabase.auth.getSession()
      if (session.error || !session.data.session) {
        if (!cancelled) setErr(session.error?.message ?? 'Sessão não autenticada.')
        return
      }
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        if (!cancelled) setErr(company.error?.message ?? 'Empresa não identificada para a sessão.')
        return
      }
      const empresaId = String(company.data)
      const user = await supabase.from('erp_usuarios')
        .select('id')
        .eq('auth_user_id', session.data.session.user.id)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (user.error || !user.data) {
        if (!cancelled) setErr(user.error?.message ?? 'Perfil ERP ativo não localizado na empresa da sessão.')
        return
      }
      const result = await supabase.from('erp_qualidade_documentos_editor')
        .select('codigo_documento,titulo_documento,revisao,data_homologacao,conteudo_texto,logo_path,setor_responsavel,status')
        .eq('empresa_id', empresaId)
        .order('atualizado_em', { ascending: false })
      if (cancelled) return
      setEmpresa(empresaId)
      if (result.error) {
        setErr(result.error.message)
        return
      }
      const rows = ((result.data ?? []) as Array<{ codigo_documento: string; titulo_documento: string; revisao: number; data_homologacao: string | null; conteudo_texto: string; logo_path: string | null; setor_responsavel: string | null; status: string | null }>).filter(row => !row.codigo_documento.startsWith('MODELO-'))
      setProcedures(rows)
      const first = rows[0]
      if (first) {
        setSelectedCode(first.codigo_documento)
        setCodigo(first.codigo_documento ?? '')
        setTitulo(first.titulo_documento ?? '')
        setRevisao(first.revisao ?? 0)
        setData(first.data_homologacao ?? '')
        setDepartamento(first.setor_responsavel ?? 'QUALIDADE')
        setLogo(first.logo_path ?? '')
        setContent(parseContent(first.conteudo_texto ?? ''))
        if (first.logo_path) {
          const signed = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(first.logo_path, 3600)
          if (!cancelled && !signed.error) setLogoUrl(signed.data.signedUrl)
        }
      }
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [])

  const documentBody = useMemo(() => serialize(content), [content])
  const chooseProcedure = async (code: string) => {
    setSelectedCode(code)
    setErr('')
    setMsg('')
    setLogoUrl('')
    if (!code) {
      setCodigo('')
      setTitulo('')
      setRevisao(0)
      setData('')
      setDepartamento('QUALIDADE')
      setLogo('')
      setContent(emptyContent)
      return
    }
    const selected = procedures.find(row => row.codigo_documento === code)
    if (!selected) return
    setCodigo(selected.codigo_documento)
    setTitulo(selected.titulo_documento)
    setRevisao(selected.revisao)
    setData(selected.data_homologacao ?? '')
    setDepartamento(selected.setor_responsavel ?? 'QUALIDADE')
    setLogo(selected.logo_path ?? '')
    setContent(parseContent(selected.conteudo_texto ?? ''))
    if (selected.logo_path) {
      const signed = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(selected.logo_path, 3600)
      if (signed.error) setErr(signed.error.message)
      else setLogoUrl(signed.data.signedUrl)
    }
  }
  const updateContent = (field: 'objective' | 'scope' | 'responsibilities' | 'method', value: string) => {
    setContent(current => ({ ...current, [field]: value }))
  }
  const updateStep = (id: string, field: 'kind' | 'title' | 'responsible', value: string) => {
    setContent(current => ({ ...current, steps: current.steps.map(step => step.id === id ? { ...step, [field]: value } as FlowStep : step) }))
  }
  const addStep = () => setContent(current => {
    const endIndex = current.steps.findIndex(step => step.kind === 'FIM')
    const next = { id: crypto.randomUUID(), kind: 'ETAPA' as FlowKind, title: '', responsible: '' }
    const steps = [...current.steps]
    steps.splice(endIndex >= 0 ? endIndex : steps.length, 0, next)
    return { ...current, steps }
  })
  const removeStep = (id: string) => setContent(current => {
    const steps = current.steps.filter(step => step.id !== id)
    return { ...current, steps: steps.length ? steps : emptyContent.steps }
  })

  const uploadWordTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setErr(''); setMsg('')
    if (!file.name.toLowerCase().endsWith('.docx')) { setErr('Selecione um modelo Word .docx.'); return }
    if (!empresa) { setErr('Empresa não identificada para a sessão.'); return }
    setBusy(true)
    let uploadedPath: string | null = null
    try {
      const path = empresa + '/modelos/' + crypto.randomUUID() + '.docx'
      const uploaded = await supabase.storage.from('erp-documentos-qualidade').upload(path, file, { upsert: false, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (uploaded.error) throw uploaded.error
      uploadedPath = path
      const saved = await supabase.rpc('erp_salvar_revisao_documento', {
        p_codigo: 'MODELO-PROCEDIMENTO-IT',
        p_titulo: 'Modelo Word — Procedimento / Instrução de Trabalho',
        p_departamento: 'QUALIDADE',
        p_conteudo: 'Modelo Word para exportação de procedimentos e instruções de trabalho com campos Docxtemplater.',
        p_motivo: 'Cadastro de modelo Word para procedimento gráfico',
        p_logo_path: null,
        p_url_anexo: path,
        p_nome_arquivo: file.name,
      })
      if (saved.error) throw saved.error
      uploadedPath = null
      setMsg('Modelo Word registrado como revisão em análise. Aprove-o no GED antes de gerar procedimentos DOCX.')
    } catch (cause) {
      if (uploadedPath) {
        const removed = await supabase.storage.from('erp-documentos-qualidade').remove([uploadedPath])
        if (removed.error) console.error('[SGQ] Falha ao remover modelo não registrado', removed.error)
      }
      setErr(cause instanceof Error ? cause.message : 'Falha ao enviar o modelo Word.')
    } finally { setBusy(false) }
  }

  const exportWord = async () => {
    if (!codigo.trim() || !titulo.trim()) { setErr('Informe o código e o título antes de exportar.'); return }
    if (content.steps.some(step => !step.title.trim())) { setErr('Preencha ou remova todas as etapas sem título.'); return }
    setBusy(true); setErr(''); setMsg('')
    try {
      await emitirProcedimentoIT({
        codigo: codigo.trim(), titulo: titulo.trim(), departamento: departamento.trim() || 'QUALIDADE', revisao,
        objetivo: content.objective, escopo: content.scope, responsabilidades: content.responsibilities, metodo: content.method,
        etapas: content.steps.map(step => ({ tipo: kindLabel(step.kind), descricao: step.title, responsavel: step.responsible })),
      })
      setMsg('Arquivo Word de rascunho gerado. Ele está marcado como não controlado até a aprovação da revisão no GED.')
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'Falha ao gerar o procedimento Word.')
    } finally { setBusy(false) }
  }

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file || !empresa) return
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setErr('Use um logotipo PNG, JPG, SVG ou WebP.')
      return
    }
    setBusy(true); setErr(''); setMsg('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const path = empresa + '/logos/' + crypto.randomUUID() + '.' + ext
      const uploaded = await supabase.storage.from('erp-qualidade-anexos').upload(path, file, { upsert: false, contentType: file.type })
      if (uploaded.error) throw uploaded.error
      setLogo(path)
      const signed = await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(path, 3600)
      if (signed.error) throw signed.error
      setLogoUrl(signed.data.signedUrl)
      setMsg('Logotipo armazenado para a empresa autenticada.')
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'Falha ao armazenar o logotipo.')
    } finally { setBusy(false) }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!empresa) { setErr('Empresa não identificada. Atualize a tela e tente novamente.'); return }
    if (!codigo.trim() || !titulo.trim()) { setErr('Código e título são obrigatórios.'); return }
    if (![content.objective, content.scope, content.responsibilities, content.method].some(value => value.trim()) && !content.steps.some(step => step.title.trim())) {
      setErr('Preencha o conteúdo do procedimento antes de salvar.')
      return
    }
    if (content.steps.some(step => !step.title.trim())) { setErr('Preencha ou remova todas as etapas sem título do fluxograma.'); return }
    setBusy(true); setErr(''); setMsg('')
    try {
      const result = await supabase.rpc('erp_salvar_revisao_documento', {
        p_codigo: codigo.trim(),
        p_titulo: titulo.trim(),
        p_departamento: departamento.trim() || 'QUALIDADE',
        p_conteudo: documentBody,
        p_motivo: 'Criação/edição de procedimento gráfico no Editor Mestre IT',
        p_logo_path: logo || null,
      })
      if (result.error) throw result.error
      const saved = result.data as { revisao?: number; status?: string } | null
      const newRevision = saved?.revisao ?? revisao + 1
      setRevisao(newRevision)
      setData('')
      setMsg('Revisão ' + String(newRevision) + ' salva em análise. A versão vigente permanece ativa até a aprovação no GED.')
      setProcedures(current => {
        const existing = current.find(item => item.codigo_documento === codigo.trim())
        const next = { codigo_documento: codigo.trim(), titulo_documento: titulo.trim(), revisao: newRevision, data_homologacao: null, conteudo_texto: documentBody, logo_path: logo || existing?.logo_path || null, setor_responsavel: departamento.trim() || 'QUALIDADE', status: 'EM_REVISAO' }
        return [next, ...current.filter(item => item.codigo_documento !== codigo.trim())]
      })
      setSelectedCode(codigo.trim())
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'Falha ao salvar a revisão do procedimento.')
    } finally { setBusy(false) }
  }

  const kindLabel = (kind: FlowKind) => kind === 'INICIO' ? 'INÍCIO' : kind === 'FIM' ? 'FIM' : kind === 'DECISAO' ? 'DECISÃO' : 'ETAPA'

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] print:bg-white print:p-0">
      <QualitySidebar active="/qualidade/editor-it" />
      <div className="mx-auto max-w-[1500px] space-y-3">
        <header className="no-print flex flex-wrap items-end gap-2 border-b border-slate-200 pb-2 print:hidden">
          <div className="mr-auto">
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#2D8DB8]">SGQ · Editor gráfico de procedimentos</p>
            <h1 className="text-[18px] font-semibold">Instruções de Trabalho · ISO 9001</h1>
            <p className="text-[10px] text-slate-600">Edite procedimentos existentes ou crie novos com fluxo operacional gráfico.</p>
          </div>
          <label className={labelClass + ' min-w-[220px]'}>Procedimento existente
            <select className={inputClass} value={selectedCode} onChange={event => void chooseProcedure(event.target.value)} disabled={!loaded || busy}>
              <option value="">+ Criar novo procedimento</option>
              {procedures.map(item => <option key={item.codigo_documento} value={item.codigo_documento}>{item.codigo_documento} — {item.titulo_documento}</option>)}
            </select>
          </label>
          <label className="inline-flex h-[30px] cursor-pointer items-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-semibold hover:bg-slate-50">
            <ImageUp size={13}/> LOGOTIPO
            <input hidden type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" disabled={busy} onChange={event => void uploadLogo(event)} />
          </label>
          <label className="inline-flex h-[30px] cursor-pointer items-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-semibold hover:bg-slate-50">
            <Upload size={13}/> MODELO WORD
            <input hidden type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} onChange={event => void uploadWordTemplate(event)} />
          </label>
          <button type="button" onClick={() => void exportWord()} disabled={busy || !loaded} className="inline-flex h-[30px] items-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-semibold hover:bg-slate-50 disabled:opacity-50"><Download size={13}/> EXPORTAR DOCX</button>
          <button type="button" onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-semibold hover:bg-slate-50"><Printer size={13}/> VISUALIZAR / IMPRIMIR</button>
          <button type="submit" form="procedure-form" disabled={busy || !loaded} className="inline-flex h-[30px] items-center gap-2 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={13}/>{busy ? 'SALVANDO…' : 'SALVAR NOVA REVISÃO'}</button>
        </header>

        {(err || msg) && <p role={err ? 'alert' : 'status'} className={err ? 'no-print border border-red-300 bg-red-50 px-3 py-2 text-[10px] text-red-800' : 'no-print border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800 print:hidden'}>{err || msg}</p>}
        <details className="no-print border border-slate-200 bg-white px-3 py-2 text-[10px] print:hidden">
          <summary className="cursor-pointer font-semibold text-[#246F98]">Como preparar o modelo Word para exportação</summary>
          <p className="mt-2 leading-5 text-slate-600">No Word, crie o cabeçalho e o layout visual do procedimento e insira os campos exatamente como abaixo. Salve em .docx, envie em “MODELO WORD” e aprove a revisão no GED antes de exportar.</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <code>{'{codigo_documento}'}</code><code>{'{titulo_documento}'}</code>
            <code>{'{departamento}'}</code><code>{'{revisao}'}</code>
            <code>{'{objetivo}'}</code><code>{'{escopo}'}</code>
            <code>{'{responsabilidades}'}</code><code>{'{metodo_criterios_registros}'}</code>
            <code>{'{status_documento}'}</code><code>{'{fluxo_processo}'}</code>
          </div>
          <p className="mt-2 leading-5 text-slate-600">Para uma tabela dinâmica de etapas, coloque <code>{'{#etapas}'}</code> no início da primeira célula da linha repetida; use <code>{'{numero}'}</code>, <code>{'{tipo}'}</code>, <code>{'{descricao}'}</code> e <code>{'{responsavel}'}</code> nas células; termine a linha com <code>{'{/etapas}'}</code>. A exportação é identificada como rascunho até a aprovação da revisão.</p>
        </details>
        {!loaded && !err && <p className="border border-slate-200 bg-white p-3 text-[10px] text-slate-500">Carregando empresa e procedimento…</p>}

        <form id="procedure-form" onSubmit={save} className="space-y-3">
          <section className="border border-slate-200 bg-white p-3 print:hidden">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2"><FileEdit size={14} className="text-[#2D8DB8]"/><h2 className="text-[11px] font-semibold">Identificação e controle</h2><span className="ml-auto text-[9px] text-slate-500">REV. {String(revisao || 'NOVA')} · {data || 'EM PREPARAÇÃO'}</span></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className={labelClass}>Código do documento<input className={inputClass} value={codigo} onChange={event => setCodigo(event.target.value.toUpperCase())} maxLength={50} required placeholder="IT-QUAL-001"/></label>
              <label className={labelClass}>Título do procedimento<input className={inputClass} value={titulo} onChange={event => setTitulo(event.target.value)} maxLength={255} required placeholder="Inspeção de recebimento"/></label>
              <label className={labelClass}>Departamento<input className={inputClass} value={departamento} onChange={event => setDepartamento(event.target.value)} maxLength={100} required/></label>
              <div className="flex items-end gap-2 border border-slate-200 bg-slate-50 p-2 text-[9px] text-slate-600"><ShieldCheck size={14} className="shrink-0 text-[#2D8DB8]"/> Nova revisão entra em análise; aprovação no GED controla a vigência.</div>
            </div>
          </section>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)] print:hidden">
            <section className="space-y-3 border border-slate-200 bg-white p-3">
              <div className="border-b border-slate-100 pb-2"><h2 className="text-[11px] font-semibold">Conteúdo do procedimento</h2><p className="mt-1 text-[9px] text-slate-500">O conteúdo é salvo junto da revisão no registro documental do SGQ.</p></div>
              <label className={labelClass}>1. Objetivo<textarea className="mt-1 min-h-[64px] w-full rounded-[2px] border border-slate-300 p-2 text-[11px] font-normal normal-case outline-none focus:border-[#2D8DB8]" value={content.objective} onChange={event => updateContent('objective', event.target.value)} placeholder="Descreva o resultado esperado e a finalidade do procedimento."/></label>
              <label className={labelClass}>2. Escopo e aplicação<textarea className="mt-1 min-h-[64px] w-full rounded-[2px] border border-slate-300 p-2 text-[11px] font-normal normal-case outline-none focus:border-[#2D8DB8]" value={content.scope} onChange={event => updateContent('scope', event.target.value)} placeholder="Informe onde, quando e a quais processos se aplica."/></label>
              <label className={labelClass}>3. Responsabilidades<textarea className="mt-1 min-h-[64px] w-full rounded-[2px] border border-slate-300 p-2 text-[11px] font-normal normal-case outline-none focus:border-[#2D8DB8]" value={content.responsibilities} onChange={event => updateContent('responsibilities', event.target.value)} placeholder="Defina quem executa, verifica, aprova e registra."/></label>
              <label className={labelClass}>4. Método, critérios e registros<textarea className="mt-1 min-h-[140px] w-full rounded-[2px] border border-slate-300 p-2 text-[11px] font-normal normal-case outline-none focus:border-[#2D8DB8]" value={content.method} onChange={event => updateContent('method', event.target.value)} placeholder="Descreva equipamentos, sequência detalhada, critérios de aceitação, segurança, evidências e registros obrigatórios."/></label>
            </section>

            <section className="min-w-0 border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2"><div className="mr-auto"><h2 className="text-[11px] font-semibold">5. Fluxograma do processo</h2><p className="mt-1 text-[9px] text-slate-500">Adicione etapas e decisões. O desenho acompanha os campos editados.</p></div><button type="button" onClick={addStep} className="inline-flex h-[28px] items-center gap-1 border border-[#2D8DB8] bg-[#F4FBFD] px-2 text-[9px] font-semibold text-[#246F98]"><Plus size={12}/> ADICIONAR ETAPA</button></div>
              <div className="mt-3 space-y-2">
                {content.steps.map((step, index) => <div key={step.id} className="grid gap-2 border border-slate-200 bg-slate-50/70 p-2 sm:grid-cols-[105px_minmax(0,1fr)_minmax(110px,.7fr)_28px] sm:items-end">
                  <label className={labelClass}>Tipo<select className={inputClass} value={step.kind} onChange={event => updateStep(step.id, 'kind', event.target.value)}><option value="INICIO">Início</option><option value="ETAPA">Etapa</option><option value="DECISAO">Decisão</option><option value="FIM">Fim</option></select></label>
                  <label className={labelClass}>Descrição da etapa<input className={inputClass} value={step.title} onChange={event => updateStep(step.id, 'title', event.target.value)} maxLength={180} placeholder={'Etapa ' + (index + 1)} required/></label>
                  <label className={labelClass}>Responsável<input className={inputClass} value={step.responsible} onChange={event => updateStep(step.id, 'responsible', event.target.value)} maxLength={100} placeholder="Área / função"/></label>
                  <button type="button" aria-label={'Remover etapa ' + (index + 1)} onClick={() => removeStep(step.id)} className="mb-0.5 flex h-[30px] items-center justify-center border border-slate-300 bg-white text-slate-500 hover:border-red-300 hover:text-red-600"><Trash2 size={13}/></button>
                </div>)}
              </div>

              <div className="mt-4 border border-slate-200 bg-[#F8FBFD] p-2">
                <div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wide text-slate-600">Prévia gráfica do fluxo</span><span className="text-[9px] text-slate-400">{content.steps.length} elementos</span></div>
                <svg viewBox={'0 0 560 ' + Math.max(130, content.steps.length * 104 + 12)} role="img" aria-label="Fluxograma do procedimento" className="h-auto w-full">
                  {content.steps.map((step, index) => {
                    const y = 12 + index * 104
                    const lines = wrapText(step.title || 'Etapa sem título')
                    const isDecision = step.kind === 'DECISAO'
                    const isTerminator = step.kind === 'INICIO' || step.kind === 'FIM'
                    return <g key={step.id}>
                      {index > 0 && <g><line x1="280" y1={y - 25} x2="280" y2={y - 5} stroke="#7B9AAA" strokeWidth="2"/><path d={'M274 ' + (y - 11) + ' L280 ' + (y - 4) + ' L286 ' + (y - 11)} fill="none" stroke="#7B9AAA" strokeWidth="2"/></g>}
                      {isDecision ? <polygon points={'280,' + y + ' 430,' + (y + 35) + ' 280,' + (y + 70) + ' 130,' + (y + 35)} fill="#FFF7E8" stroke="#D99A36" strokeWidth="2"/> : isTerminator ? <rect x="145" y={y + 3} width="270" height="46" rx="23" fill={step.kind === 'INICIO' ? '#E6F5EE' : '#E7F2FA'} stroke={step.kind === 'INICIO' ? '#3A9D78' : '#2D8DB8'} strokeWidth="2"/> : <rect x="130" y={y} width="300" height="54" rx="2" fill="white" stroke="#2D8DB8" strokeWidth="2"/>}
                      <text x="280" y={y + (isDecision ? 20 : 17)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#123B50">{kindLabel(step.kind)}</text>
                      {lines.map((line, lineIndex) => <text key={lineIndex} x="280" y={y + (isDecision ? 34 : 31) + lineIndex * 12} textAnchor="middle" fontSize="10" fill="#123B50">{line}</text>)}
                      {step.responsible.trim() && <text x="280" y={y + (isDecision ? 82 : 68)} textAnchor="middle" fontSize="9" fill="#64748B">Responsável: {step.responsible.slice(0, 54)}</text>}
                    </g>
                  })}
                </svg>
                {content.steps.some(step => step.kind === 'DECISAO') && <p className="mt-1 text-[9px] text-amber-800">Decisões aparecem em losango. Registre no método do procedimento os critérios e os caminhos para “sim” e “não”.</p>}
              </div>
            </section>
          </div>

          <section className="border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-2"><h2 className="text-[11px] font-semibold">Prévia do documento controlado</h2><span className="ml-auto text-[9px] text-slate-500">{codigo || 'SEM CÓDIGO'} · REV. {revisao || 'NOVA'}</span></div>
            <article className="mx-auto mt-3 max-w-[900px] border border-slate-300 bg-white p-5 text-slate-900 print:border-0 print:p-0">
              <div className="grid grid-cols-[100px_minmax(0,1fr)_115px] border-2 border-slate-800">
                <div className="flex min-h-[64px] items-center justify-center border-r border-slate-800 p-2">{logoUrl ? <img src={logoUrl} alt="Logotipo da empresa" className="max-h-12 max-w-full object-contain"/> : <span className="text-[9px] text-slate-400">LOGOTIPO</span>}</div>
                <div className="flex flex-col justify-center border-r border-slate-800 px-3 py-2"><span className="text-[8px] font-semibold uppercase text-slate-500">Procedimento / Instrução de Trabalho</span><span className="mt-1 text-[13px] font-semibold">{titulo || 'Título do procedimento'}</span><span className="mt-1 text-[9px]">{departamento || 'QUALIDADE'}</span></div>
                <div className="flex flex-col justify-center gap-1 px-2 text-[9px]"><span><strong>CÓDIGO</strong><br/>{codigo || '—'}</span><span><strong>REVISÃO</strong><br/>{revisao || 'NOVA'}</span><span><strong>VIGÊNCIA</strong><br/>{data || 'PENDENTE'}</span></div>
              </div>
              {[
                ['1. OBJETIVO', content.objective],
                ['2. ESCOPO E APLICAÇÃO', content.scope],
                ['3. RESPONSABILIDADES', content.responsibilities],
                ['4. MÉTODO, CRITÉRIOS E REGISTROS', content.method],
              ].map(([heading, value]) => <section key={heading} className="mt-4"><h3 className="border-b border-slate-300 pb-1 text-[10px] font-semibold uppercase">{heading}</h3><p className="mt-2 whitespace-pre-wrap text-[10px] leading-5">{value || 'A preencher.'}</p></section>)}
              <section className="mt-4"><h3 className="border-b border-slate-300 pb-1 text-[10px] font-semibold uppercase">5. FLUXOGRAMA DO PROCESSO</h3><svg viewBox={'0 0 560 ' + Math.max(130, content.steps.length * 104 + 12)} role="img" aria-label="Fluxograma do procedimento para impressão" className="mt-2 h-auto w-full">{content.steps.map((step, index) => { const y = 12 + index * 104; const lines = wrapText(step.title || 'Etapa sem título'); const isDecision = step.kind === 'DECISAO'; const isTerminator = step.kind === 'INICIO' || step.kind === 'FIM'; return <g key={step.id}>{index > 0 && <g><line x1="280" y1={y - 25} x2="280" y2={y - 5} stroke="#7B9AAA" strokeWidth="2"/><path d={'M274 ' + (y - 11) + ' L280 ' + (y - 4) + ' L286 ' + (y - 11)} fill="none" stroke="#7B9AAA" strokeWidth="2"/></g>}{isDecision ? <polygon points={'280,' + y + ' 430,' + (y + 35) + ' 280,' + (y + 70) + ' 130,' + (y + 35)} fill="#FFF7E8" stroke="#D99A36" strokeWidth="2"/> : isTerminator ? <rect x="145" y={y + 3} width="270" height="46" rx="23" fill={step.kind === 'INICIO' ? '#E6F5EE' : '#E7F2FA'} stroke={step.kind === 'INICIO' ? '#3A9D78' : '#2D8DB8'} strokeWidth="2"/> : <rect x="130" y={y} width="300" height="54" rx="2" fill="white" stroke="#2D8DB8" strokeWidth="2"/>}<text x="280" y={y + (isDecision ? 20 : 17)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#123B50">{kindLabel(step.kind)}</text>{lines.map((line, lineIndex) => <text key={lineIndex} x="280" y={y + (isDecision ? 34 : 31) + lineIndex * 12} textAnchor="middle" fontSize="10" fill="#123B50">{line}</text>)}{step.responsible.trim() && <text x="280" y={y + (isDecision ? 82 : 68)} textAnchor="middle" fontSize="9" fill="#64748B">Responsável: {step.responsible.slice(0, 54)}</text>}</g>})}</svg><ol className="mt-2 list-decimal space-y-1 pl-5 text-[10px]">{content.steps.map(step => <li key={step.id}><strong>{kindLabel(step.kind)}:</strong> {step.title}{step.responsible.trim() ? ' — Responsável: ' + step.responsible : ''}</li>)}</ol></section>
              <footer className="mt-5 grid grid-cols-3 border border-slate-300 text-center text-[8px]"><div className="border-r border-slate-300 p-2">ELABORAÇÃO<br/><strong>{'Responsável do SGQ'}</strong></div><div className="border-r border-slate-300 p-2">APROVAÇÃO<br/><strong>Conforme fluxo do GED</strong></div><div className="p-2">STATUS<br/><strong>{data ? 'VIGENTE' : 'EM ANÁLISE / RASCUNHO'}</strong></div></footer>
            </article>
          </section>

          <footer className="no-print flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2 text-[9px] text-slate-500 print:hidden">
            <span>Empresa identificada pela sessão · revisão registrada no Supabase · aprovação controlada no GED</span>
            <button type="submit" disabled={busy || !loaded} className="inline-flex h-[30px] items-center gap-2 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={13}/>{busy ? 'SALVANDO…' : 'SALVAR NOVA REVISÃO'}</button>
          </footer>
        </form>
      </div>
      <style>{'@page{size:A4;margin:12mm}@media print{body{background:#fff!important}.no-print,nav,aside,button,input,select,textarea{display:none!important}main{padding:0!important}.grid{break-inside:avoid}article{box-shadow:none!important;max-width:100%!important}}'}</style>
    </main>
  )
}
