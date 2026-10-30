/**
 * SYSNQRA ERP INDUSTRIAL — RH operacional
 * @DATA_REVISAO_APROVACAO 30/10/2026
 * @STATUS_APROVACAO Em validação
 * @REVISAO REV-RH-20261030
 * Dados persistidos no Supabase; isolamento por empresa/RLS; sem dados fictícios.
 */
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CalendarDays, Camera, CheckCircle2, Clock3, FileText, GraduationCap, RefreshCw, Save, Search, UserRound, Users, X } from 'lucide-react'

type Staff = {
  id: string
  empresa_id: string
  nome?: string | null
  nome_completo?: string | null
  matricula?: string | null
  cpf?: string | null
  rg?: string | null
  data_nascimento?: string | null
  celular?: string | null
  telefone?: string | null
  email?: string | null
  data_admissao?: string | null
  cargo?: string | null
  departamento?: string | null
  regime_trabalho?: string | null
  turno_trabalho?: string | null
  numero_cracha_rfid?: string | null
  salario_nominal?: number | null
  custo_hora_homem?: number | null
  status?: string | null
  foto_path?: string | null
}
type Row = Record<string, string | number | boolean | null | undefined> & { id: string }
type Tab = 'Visão geral' | 'Funcionários' | 'Ponto / Presença' | 'Treinamentos' | 'Avaliações' | 'Ausências' | 'Acidentes' | 'Documentos'
type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[] }
const tabs: { label: Tab; icon: typeof Users }[] = [
  { label: 'Visão geral', icon: Users },
  { label: 'Funcionários', icon: Users },
  { label: 'Ponto / Presença', icon: Clock3 },
  { label: 'Treinamentos', icon: GraduationCap },
  { label: 'Avaliações', icon: CheckCircle2 },
  { label: 'Ausências', icon: CalendarDays },
  { label: 'Acidentes', icon: CalendarDays },
  { label: 'Documentos', icon: FileText },
]
const schemas: Record<Exclude<Tab, 'Funcionários' | 'Visão geral'>, { table: string; fields: Field[] }> = {
  'Ponto / Presença': { table: 'erp_rh_ponto_eventos', fields: [
    { key: 'funcionario_id', label: 'Funcionário', type: 'staff', required: true },
    { key: 'tipo', label: 'Evento', type: 'select', options: ['ENTRADA', 'SAIDA_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA'], required: true },
    { key: 'registrado_em', label: 'Data e hora', type: 'datetime-local', required: true },
    { key: 'origem', label: 'Origem', type: 'select', options: ['MANUAL', 'RELOGIO', 'CATRACA', 'IMPORTACAO'], required: true },
    { key: 'observacao', label: 'Observação' },
  ]},
  'Ausências': { table: 'erp_rh_faltas', fields: [
    { key: 'funcionario_id', label: 'Funcionário', type: 'staff', required: true },
    { key: 'data_inicio', label: 'Data inicial', type: 'date', required: true },
    { key: 'data_fim', label: 'Data final', type: 'date' },
    { key: 'tipo', label: 'Ocorrência', type: 'select', options: ['FALTA', 'ATESTADO', 'ATRASO', 'SAIDA_ANTECIPADA', 'OUTRA'], required: true },
    { key: 'status', label: 'Situação', type: 'select', options: ['PENDENTE', 'JUSTIFICADA', 'INJUSTIFICADA', 'CANCELADA'], required: true },
    { key: 'justificativa', label: 'Justificativa' },
    { key: 'observacoes', label: 'Observações' },
  ]},
  'Treinamentos': { table: 'erp_rh_treinamentos_registros', fields: [
    { key: 'funcionario_id', label: 'Funcionário', type: 'staff', required: true },
    { key: 'titulo', label: 'Treinamento', required: true },
    { key: 'instrutor', label: 'Instrutor' },
    { key: 'data_treinamento', label: 'Data', type: 'date', required: true },
    { key: 'carga_horas', label: 'Carga horária', type: 'number', required: true },
    { key: 'resultado', label: 'Resultado / avaliação' },
    { key: 'status', label: 'Situação', type: 'select', options: ['PENDENTE', 'CONCLUIDO', 'REPROVADO', 'VENCIDO'], required: true },
    { key: 'validade_ate', label: 'Validade até', type: 'date' },
    { key: 'observacoes', label: 'Observações' },
  ]},
  'Avaliações': { table: 'erp_rh_avaliacoes', fields: [
    { key: 'funcionario_id', label: 'Funcionário', type: 'staff', required: true },
    { key: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true },
    { key: 'tipo', label: 'Tipo de avaliação', type: 'select', options: ['DESEMPENHO', 'EXPERIENCIA', 'COMPETENCIAS', 'PERIODICA', 'OUTRA'], required: true },
    { key: 'avaliador', label: 'Avaliador', required: true },
    { key: 'nota', label: 'Nota', type: 'number' },
    { key: 'resultado', label: 'Resultado' },
    { key: 'plano_acao', label: 'Plano de ação' },
    { key: 'observacoes', label: 'Observações' },
  ]},
  'Acidentes': { table: 'erp_rh_acidentes', fields: [
    { key: 'funcionario_id', label: 'Funcionário', type: 'staff', required: true },
    { key: 'data_ocorrencia', label: 'Data da ocorrência', type: 'date', required: true },
    { key: 'hora_ocorrencia', label: 'Hora', type: 'time' },
    { key: 'local', label: 'Local da ocorrência', required: true },
    { key: 'tipo', label: 'Tipo', type: 'select', options: ['TIPICO', 'TRAJETO', 'DOENCA_OCUPACIONAL', 'QUASE_ACIDENTE', 'OUTRO'], required: true },
    { key: 'gravidade', label: 'Gravidade', type: 'select', options: ['LEVE', 'MODERADA', 'GRAVE', 'FATAL'], required: true },
    { key: 'descricao', label: 'Descrição', required: true },
    { key: 'afastamento_dias', label: 'Dias de afastamento', type: 'number' },
    { key: 'providencias', label: 'Providências adotadas' },
    { key: 'status', label: 'Situação', type: 'select', options: ['ABERTO', 'EM_ANALISE', 'ENCERRADO'], required: true },
  ]},
  'Documentos': { table: 'erp_rh_documentos', fields: [
    { key: 'funcionario_id', label: 'Funcionário', type: 'staff', required: true },
    { key: 'tipo_documento', label: 'Tipo de documento', type: 'select', options: ['CONTRATO', 'RG', 'CPF', 'ASO', 'ATESTADO', 'CERTIFICADO', 'ADVERTENCIA', 'OUTRO'], required: true },
    { key: 'titulo', label: 'Título / descrição', required: true },
    { key: 'numero_documento', label: 'Número do documento' },
    { key: 'data_emissao', label: 'Data de emissão', type: 'date' },
    { key: 'validade_ate', label: 'Validade até', type: 'date' },
    { key: 'observacoes', label: 'Observações' },
  ]},
}
const blank = (fields: Field[]) => Object.fromEntries(fields.map(f => [f.key, f.type === 'datetime-local' ? new Date().toISOString().slice(0, 16) : ''])) as Record<string, string>
const display = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value)
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.'

export default function RHIndustrial() {
  const [empresaId, setEmpresaId] = useState('')
  const [tab, setTab] = useState<Tab>('Visão geral')
  const [staff, setStaff] = useState<Staff[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10))

  const employeeFields: Field[] = useMemo(() => [
    { key: 'nome_completo', label: 'Nome completo do colaborador', required: true },
    { key: 'data_nascimento', label: 'Data de nascimento', type: 'date', required: true },
    { key: 'cpf', label: 'CPF', required: true },
    { key: 'rg', label: 'RG' },
    { key: 'celular', label: 'Celular / WhatsApp' },
    { key: 'email', label: 'E-mail corporativo', type: 'email' },
    { key: 'matricula', label: 'Matrícula', required: true },
    { key: 'data_admissao', label: 'Data de admissão', type: 'date', required: true },
    { key: 'cargo', label: 'Cargo', required: true },
    { key: 'departamento', label: 'Departamento', required: true },
    { key: 'regime_trabalho', label: 'Regime de trabalho', type: 'select', options: ['CLT', 'Estágio', 'Aprendiz', 'Temporário', 'Terceirizado'], required: true },
    { key: 'turno_trabalho', label: 'Turno', type: 'select', options: ['Administrativo', '1º turno', '2º turno', '3º turno', 'Comercial', 'Escala'], required: true },
    { key: 'numero_cracha_rfid', label: 'Número do crachá RFID' },
    { key: 'salario_nominal', label: 'Salário nominal (R$)', type: 'number' },
    { key: 'custo_hora_homem', label: 'Custo hora-homem (R$)', type: 'number' },
    { key: 'status', label: 'Situação', type: 'select', options: ['Ativo', 'Afastado', 'Férias', 'Desligado'], required: true },
  ], [])

  const loadStaff = useCallback(async (tenant: string) => {
    const { data, error } = await supabase.from('erp_funcionarios').select('*').eq('empresa_id', tenant).order('nome', { ascending: true }).limit(1000)
    if (error) throw error
    const people = (data ?? []) as Staff[]
    setStaff(people)
    return people
  }, [])

  const loadRows = useCallback(async (selectedTab: Tab, tenant: string) => {
    if (selectedTab === 'Funcionários' || selectedTab === 'Visão geral') { setRows([]); return }
    const schema = schemas[selectedTab as Exclude<Tab, 'Funcionários' | 'Visão geral'>]
    let request = supabase.from(schema.table).select('*').eq('empresa_id', tenant).limit(300)
    if (selectedTab === 'Ponto / Presença') request = request.gte('registrado_em', new Date(filterDate + 'T00:00:00').toISOString()).lt('registrado_em', new Date(new Date(filterDate + 'T00:00:00').getTime() + 86400000).toISOString()).order('registrado_em', { ascending: false })
    else if (selectedTab === 'Ausências') request = request.order('data_inicio', { ascending: false })
    else if (selectedTab === 'Treinamentos') request = request.order('data_treinamento', { ascending: false })
    else if (selectedTab === 'Avaliações') request = request.order('data_avaliacao', { ascending: false })
    else if (selectedTab === 'Acidentes') request = request.order('data_ocorrencia', { ascending: false })
    else request = request.order('criado_em', { ascending: false })
    const { data, error } = await request
    if (error) throw error
    setRows((data ?? []) as Row[])
  }, [filterDate])

  const reload = useCallback(async (tenant: string, selectedTab: Tab) => {
    setBusy(true)
    try {
      await loadStaff(tenant)
      await loadRows(selectedTab, tenant)
      setMessage('')
    } catch (error) {
      setMessage(errorText(error))
    } finally { setBusy(false) }
  }, [loadRows, loadStaff])

  useEffect(() => {
    let alive = true
    void (async () => {
      setBusy(true)
      try {
        const { data, error } = await supabase.rpc('erp_current_empresa_id')
        if (error) throw error
        const tenant = typeof data === 'string' ? data : ''
        if (!tenant) throw new Error('Selecione uma empresa ativa antes de acessar o RH.')
        if (!alive) return
        setEmpresaId(tenant)
        await reload(tenant, 'Funcionários')
      } catch (error) { if (alive) setMessage(errorText(error)) }
      finally { if (alive) setBusy(false) }
    })()
    return () => { alive = false }
  }, [reload])

  useEffect(() => {
    if (empresaId) void loadRows(tab, empresaId).catch(error => setMessage(errorText(error)))
  }, [empresaId, tab, filterDate, loadRows])

  const startNew = () => {
    if (tab === 'Visão geral') return
    setEditingId(null)
    setForm(tab === 'Funcionários' ? blank(employeeFields) : tab === 'Visão geral' ? {} : blank(schemas[tab as Exclude<Tab, 'Funcionários' | 'Visão geral'>].fields))
    setPhoto(null); setPhotoUrl(''); setMessage('')
  }
  const editStaff = async (person: Staff) => {
    setEditingId(person.id)
    setForm(Object.fromEntries(employeeFields.map(field => [field.key, display(person[field.key as keyof Staff]) === '—' ? '' : String(person[field.key as keyof Staff] ?? '')])))
    setPhoto(null); setPhotoUrl('')
    if (person.foto_path) {
      const { data } = await supabase.storage.from('rh-arquivos').createSignedUrl(person.foto_path, 900)
      if (data?.signedUrl) setPhotoUrl(data.signedUrl)
    }
    setMessage('')
  }

  const saveEmployee = async (event: FormEvent) => {
    event.preventDefault()
    if (!empresaId) return
    setBusy(true); setMessage('')
    try {
      const payload: Record<string, unknown> = { empresa_id: empresaId, nome: form.nome_completo.trim(), nome_completo: form.nome_completo.trim(), atualizado_em: new Date().toISOString() }
      for (const field of employeeFields) {
        const value = (form[field.key] ?? '').trim()
        if (field.required && !value) throw new Error('Preencha: ' + field.label)
        payload[field.key] = value === '' ? null : field.type === 'number' ? Number(value) : value
      }
      if (photo) {
        const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${empresaId}/funcionarios/${editingId ?? crypto.randomUUID()}/foto.${extension}`
        const { error: uploadError } = await supabase.storage.from('rh-arquivos').upload(path, photo, { upsert: true, contentType: photo.type })
        if (uploadError) throw uploadError
        payload.foto_path = path
      }
      const result = editingId
        ? await supabase.from('erp_funcionarios').update(payload).eq('id', editingId).eq('empresa_id', empresaId).select('id').single()
        : await supabase.from('erp_funcionarios').insert(payload).select('id').single()
      if (result.error) throw result.error
      setMessage('Cadastro salvo no banco.')
      setEditingId(null); setPhoto(null); setPhotoUrl(''); setForm(blank(employeeFields))
      await reload(empresaId, 'Funcionários')
    } catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }

  const saveOperational = async (event: FormEvent) => {
    event.preventDefault()
    if (!empresaId || tab === 'Funcionários' || tab === 'Visão geral') return
    setBusy(true); setMessage('')
    try {
      const schema = schemas[tab as Exclude<Tab, 'Funcionários' | 'Visão geral'>]
      const payload: Record<string, unknown> = { empresa_id: empresaId, criado_por: (await supabase.auth.getUser()).data.user?.id ?? null }
      for (const field of schema.fields) {
        const value = (form[field.key] ?? '').trim()
        if (field.required && !value) throw new Error('Preencha: ' + field.label)
        payload[field.key] = value === '' ? null : field.type === 'number' ? Number(value) : field.type === 'datetime-local' ? new Date(value).toISOString() : value
      }
      const { error } = await supabase.from(schema.table).insert(payload)
      if (error) throw error
      setMessage('Registro gravado com sucesso.')
      setForm(blank(schema.fields))
      await reload(empresaId, tab)
    } catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }

  const uploadOperationalAttachment = async (file: File, rowId: string, column: 'anexo_path' | 'certificado_path' | 'documento_path') => {
    const path = `${empresaId}/anexos/${rowId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('rh-arquivos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const schema = schemas[tab as Exclude<Tab, 'Funcionários' | 'Visão geral'>]
    const { error: updateError } = await supabase.from(schema.table).update({ [column]: path }).eq('id', rowId).eq('empresa_id', empresaId)
    if (updateError) throw updateError
    setMessage('Anexo enviado com controle de acesso por empresa.')
    await reload(empresaId, tab)
  }

  const filteredStaff = staff.filter(person => [person.nome_completo, person.nome, person.cpf, person.matricula, person.cargo].some(value => String(value ?? '').toLowerCase().includes(query.toLowerCase())))
  const activeCount = staff.filter(person => !['desligado', 'inativo'].includes(String(person.status ?? '').toLowerCase())).length
  const pendingTrainings = tab === 'Treinamentos' ? rows.filter(row => ['PENDENTE', 'VENCIDO', 'REPROVADO'].includes(String(row.status))) : []
  const staffName = (id: unknown) => staff.find(person => person.id === id)?.nome_completo ?? staff.find(person => person.id === id)?.nome ?? 'Funcionário não localizado'

  const fieldControl = (field: Field) => {
    const common = { id: field.key, name: field.key, required: field.required, value: form[field.key] ?? '', onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(previous => ({ ...previous, [field.key]: event.target.value })), className: 'w-full min-w-0 h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100' }
    if (field.type === 'select') return <select {...common}><option value="">Selecione…</option>{(field.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}</select>
    if (field.type === 'staff') return <select {...common}><option value="">Selecione o colaborador…</option>{staff.map(person => <option key={person.id} value={person.id}>{person.matricula ? person.matricula + ' — ' : ''}{person.nome_completo ?? person.nome ?? person.id}</option>)}</select>
    if (field.key === 'observacoes' || field.key === 'justificativa') return <textarea {...common} rows={2} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800" />
    return <input {...common} type={field.type ?? 'text'} step={field.type === 'number' ? '0.01' : undefined} />
  }

  return <main className="rh-page min-h-[70vh] bg-slate-50 p-3 text-slate-800 md:p-5">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 px-5 py-4 text-white shadow-sm">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">SYSNQRA ERP INDUSTRIAL · GESTÃO DE PESSOAS</p><h1 className="mt-1 text-xl font-extrabold text-white">Recursos Humanos</h1><p className="mt-1 text-xs text-slate-300">Cadastro, jornada, ocorrências, capacitação e férias</p></div>
      <button onClick={() => empresaId && void reload(empresaId, tab)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-white hover:bg-slate-800"><RefreshCw size={15}/> Atualizar</button>
    </header>

    <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Users className="mb-2 text-sky-700" size={19}/><p className="text-xs text-slate-500">Funcionários cadastrados</p><strong className="text-2xl">{staff.length}</strong></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><CheckCircle2 className="mb-2 text-emerald-700" size={19}/><p className="text-xs text-slate-500">Ativos</p><strong className="text-2xl">{activeCount}</strong></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Clock3 className="mb-2 text-amber-700" size={19}/><p className="text-xs text-slate-500">Eventos de ponto no período</p><strong className="text-2xl">{tab === 'Ponto / Presença' ? rows.length : '—'}</strong></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><GraduationCap className="mb-2 text-violet-700" size={19}/><p className="text-xs text-slate-500">Treinamentos pendentes</p><strong className="text-2xl">{tab === 'Treinamentos' ? pendingTrainings.length : '—'}</strong></div>
    </section>

    <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Abas do módulo RH">
      {tabs.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => { setTab(item.label); setForm(item.label === 'Funcionários' ? blank(employeeFields) : item.label === 'Visão geral' ? {} : blank(schemas[item.label as Exclude<Tab, 'Funcionários' | 'Visão geral'>].fields)); setEditingId(null); setMessage('') }} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold transition ${tab === item.label ? 'bg-sky-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={15}/>{item.label}</button> })}
    </nav>

    {message && <div role="status" className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${/sucesso|salvo|gravado|enviado/i.test(message) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{message}</div>}

    {tab === 'Visão geral' ? <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"><article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Users className="mb-2 text-sky-700" size={19}/><p className="text-xs text-slate-500">Funcionários cadastrados</p><strong className="text-2xl">{staff.length}</strong></article><article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><CheckCircle2 className="mb-2 text-emerald-700" size={19}/><p className="text-xs text-slate-500">Colaboradores ativos</p><strong className="text-2xl">{activeCount}</strong></article><article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Clock3 className="mb-2 text-amber-700" size={19}/><p className="text-xs text-slate-500">Eventos de ponto</p><strong className="text-2xl">—</strong></article><article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><GraduationCap className="mb-2 text-violet-700" size={19}/><p className="text-xs text-slate-500">Treinamentos pendentes</p><strong className="text-2xl">—</strong></article></section> : tab === 'Funcionários' ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3"><h2 className="font-bold text-slate-900">{editingId ? 'Editar colaborador' : 'Cadastro de colaborador'}</h2><p className="mt-1 text-xs text-slate-500">Campos compactos, medidas conforme especificação; foto 3×4 protegida por empresa.</p></div>
      <form onSubmit={saveEmployee} className="p-4 md:p-5">
        <div className="mb-4 flex items-start gap-4">
          <div>
            <label htmlFor="rh-foto" className="flex aspect-[3/4] max-h-36 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500 hover:border-sky-500">
              {photo ? <img src={URL.createObjectURL(photo)} alt="Prévia da foto do colaborador" className="h-full w-full object-cover"/> : photoUrl ? <img src={photoUrl} alt="Foto atual do colaborador" className="h-full w-full object-cover"/> : <><Camera size={25} className="mb-2"/><span className="font-semibold">Foto 3×4</span><span className="mt-1 px-2">JPG, PNG ou WebP</span></>}
            </label>
            <input id="rh-foto" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0] ?? null; if (file && file.size > 5 * 1024 * 1024) { setMessage('A foto deve ter no máximo 5 MB.'); return } setPhoto(file); if (file) setPhotoUrl('') }}/>
            <p className="mt-2 text-[11px] text-slate-500">Foto 3×4 · máx. 5 MB</p>
          </div>
          <p className="pt-1 text-xs text-slate-500">Preencha os dados do colaborador. Os campos pessoais respeitam as proporções especificadas e os dados são gravados no banco da empresa selecionada.</p>
        </div>
        <div className="grid grid-cols-1 content-start gap-4 md:grid-cols-12">
          {employeeFields.map(field => {
            const span = field.key === 'nome_completo' ? 'md:col-span-9' : field.key === 'data_nascimento' ? 'md:col-span-3' : ['cpf','rg','celular'].includes(field.key) ? 'md:col-span-3' : field.key === 'email' ? 'md:col-span-6' : 'md:col-span-6'
            return <div key={field.key} className={span}><label htmlFor={field.key} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600">{field.label}{field.required ? ' *' : ''}</label>{fieldControl(field)}</div>
          })}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={startNew} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700"><X size={15}/> Cancelar</button>
          <button disabled={busy} type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-bold text-white disabled:opacity-60"><Save size={15}/>{busy ? 'Gravando…' : 'Gravar'}</button>
        </div>
      </form>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Funcionários cadastrados</h3><label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome, CPF, matrícula…" className="h-9 w-64 max-w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm"/></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600"><tr><th className="p-3">Matrícula</th><th className="p-3">Colaborador</th><th className="p-3">Cargo / departamento</th><th className="p-3">Situação</th><th className="p-3">Ação</th></tr></thead><tbody>{filteredStaff.map(person => <tr key={person.id} className="border-b border-slate-100"><td className="p-3">{display(person.matricula)}</td><td className="p-3 font-semibold">{display(person.nome_completo ?? person.nome)}<div className="mt-1 font-normal text-slate-500">{display(person.cpf)}</div></td><td className="p-3">{display(person.cargo)}<div className="mt-1 text-slate-500">{display(person.departamento)}</div></td><td className="p-3">{display(person.status)}</td><td className="p-3"><button onClick={() => void editStaff(person)} className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">Editar</button></td></tr>)}{filteredStaff.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">{busy ? 'Carregando registros…' : 'Nenhum funcionário encontrado.'}</td></tr>}</tbody></table></div>
      </div>
    </section> : <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3"><h2 className="font-bold text-slate-900">{tab}</h2><p className="mt-1 text-xs text-slate-500">Registros persistidos no Supabase com isolamento por empresa.</p></div>
      {tab === 'Ponto / Presença' && <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4"><label className="text-xs font-bold text-slate-600">Consultar dia <input type="date" value={filterDate} onChange={event => setFilterDate(event.target.value)} className="ml-2 h-9 rounded-lg border border-slate-300 px-3 font-normal"/></label><span className="text-xs text-slate-500">Para controle físico de catraca ou relógio, conecte o equipamento ou a integração de origem.</span></div>}
      <form onSubmit={saveOperational} className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        {schemas[tab].fields.map(field => <div key={field.key}><label htmlFor={field.key} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600">{field.label}{field.required ? ' *' : ''}</label>{fieldControl(field)}</div>)}
        <div className="flex items-end"><button disabled={busy} type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-bold text-white disabled:opacity-60"><Save size={15}/> Gravar registro</button></div>
      </form>
      <div className="overflow-x-auto border-t border-slate-200 p-4"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase text-slate-600"><tr><th className="p-3">Funcionário</th>{schemas[tab].fields.filter(field => field.key !== 'funcionario_id' && field.key !== 'observacoes' && field.key !== 'justificativa').slice(0,4).map(field => <th key={field.key} className="p-3">{field.label}</th>)}<th className="p-3">Anexo</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{staffName(row.funcionario_id)}</td>{schemas[tab].fields.filter(field => field.key !== 'funcionario_id' && field.key !== 'observacoes' && field.key !== 'justificativa').slice(0,4).map(field => <td key={field.key} className="p-3">{display(row[field.key])}</td>)}<td className="p-3">{(tab === 'Ausências' || tab === 'Treinamentos' || tab === 'Documentos') && <label className="cursor-pointer font-semibold text-sky-700 underline">{row[tab === 'Ausências' ? 'anexo_path' : tab === 'Treinamentos' ? 'certificado_path' : 'documento_path'] ? 'Substituir anexo' : 'Anexar arquivo'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setMessage('O arquivo deve ter no máximo 5 MB.'); return } void uploadOperationalAttachment(file, row.id, tab === 'Ausências' ? 'anexo_path' : tab === 'Treinamentos' ? 'certificado_path' : 'documento_path').catch(error => setMessage(errorText(error))) }}/></label>}{tab !== 'Ausências' && tab !== 'Treinamentos' && tab !== 'Documentos' ? '—' : null}</td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">{busy ? 'Carregando registros…' : 'Nenhum registro para os filtros atuais.'}</td></tr>}</tbody></table></div>
    </section>}
    <footer className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><UserRound size={13}/> Dados pessoais e anexos são restritos por empresa e sujeitos às políticas de acesso do Supabase.</footer>
  </main>
}
