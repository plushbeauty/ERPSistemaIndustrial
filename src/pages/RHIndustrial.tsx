import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, BadgeCheck, BriefcaseBusiness, Factory, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, Users, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab = 'pessoais' | 'contratuais' | 'fabrica'
type Status = 'Ativo' | 'Afastado' | 'Desligado'
type Employee = {
  id: string
  matricula: string | number | null
  nome: string
  nome_completo: string
  cpf: string
  rg: string
  data_nascimento: string
  celular: string
  telefone: string
  email: string
  data_admissao: string
  cargo: string
  departamento: string
  regime_trabalho: string
  turno_trabalho: string
  numero_cracha_rfid: string
  salario_nominal: number
  custo_hora_homem: number
  status: Status
  status_colaborador: Status
}
type Profile = { empresa_id: string | null; auth_user_id: string; is_master: boolean | null; nivel_admin: number | null; perfil: string | null }
type FieldProps = { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; readOnly?: boolean; mono?: boolean; step?: string; min?: string }
const emptyEmployee = (): Omit<Employee, 'id' | 'matricula'> => ({
  nome: '', nome_completo: '', cpf: '', rg: '', data_nascimento: '', celular: '', telefone: '', email: '',
  data_admissao: '', cargo: '', departamento: 'PRODUCAO_CHAO', regime_trabalho: 'CLT', turno_trabalho: 'TURNO_1',
  numero_cracha_rfid: '', salario_nominal: 0, custo_hora_homem: 0, status: 'Ativo', status_colaborador: 'Ativo',
})
const departments = [
  ['PRODUCAO_CHAO', 'Produção — chão de fábrica'], ['PCP', 'PCP / Engenharia'], ['COMPRAS', 'Compras / Suprimentos'],
  ['ALMOXARIFADO', 'Almoxarifado / WMS'], ['FINANCEIRO', 'Financeiro'], ['ADMINISTRACAO', 'Administração'],
]
const shifts = [['TURNO_1', 'Turno 1 · 06h–14h'], ['TURNO_2', 'Turno 2 · 14h–22h'], ['TURNO_3', 'Turno 3 · 22h–06h'], ['ADMINISTRATIVO', 'Administrativo · 08h–18h']]
const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0)
const asStatus = (value: unknown): Status => value === 'Afastado' || value === 'Desligado' ? value : 'Ativo'
const text = (value: unknown) => value == null ? '' : String(value)
const costPerHour = (salary: number) => salary > 0 ? Number((salary * 1.8 / 220).toFixed(4)) : 0

function Field({ label, value, onChange, type = 'text', required, placeholder, readOnly, mono, step, min }: FieldProps) {
  return <label className="synqra-field min-w-0"><span>{label}{required ? ' *' : ''}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} readOnly={readOnly} step={step} min={min} className={`h-9 w-full max-w-full min-w-0 rounded-xl border px-2 text-xs outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100 ${mono ? 'font-mono' : ''} ${readOnly ? 'bg-slate-50 font-bold text-slate-600' : 'border-slate-300 bg-white text-slate-900'}`} /></label>
}
function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[][]; required?: boolean }) {
  return <label className="synqra-field min-w-0"><span>{label}{required ? ' *' : ''}</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-sky-600" value={value} onChange={e => onChange(e.target.value)} required={required}>{options.map(([v, title]) => <option key={v} value={v}>{title}</option>)}</select></label>
}
function Panel({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">{title}</h2>{right}</header><div className="p-4">{children}</div></section>
}

export default function RHIndustrial() {
  const [tab, setTab] = useState<Tab>('pessoais')
  const [rows, setRows] = useState<Employee[]>([])
  const [form, setForm] = useState(emptyEmployee)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isMaster = profile?.is_master === true && Number(profile.nivel_admin ?? 0) >= 100 && String(profile.perfil ?? '').toUpperCase() === 'MASTER' && profile.empresa_id === null

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente no SYSNQRA ERP.')
      const { data: p, error: profileError } = await supabase.from('erp_usuarios')
        .select('empresa_id,auth_user_id,is_master,nivel_admin,perfil')
        .eq('auth_user_id', auth.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (profileError) throw profileError
      if (!p?.auth_user_id) throw new Error('Perfil empresarial autenticado não encontrado.')
      const nextProfile = p as Profile
      setProfile(nextProfile)
      if (!nextProfile.empresa_id && !(nextProfile.is_master === true && Number(nextProfile.nivel_admin ?? 0) >= 100 && String(nextProfile.perfil ?? '').toUpperCase() === 'MASTER')) {
        throw new Error('O usuário autenticado não possui empresa ativa vinculada.')
      }
      if (!nextProfile.empresa_id) {
        setRows([])
        setError('Acesso Master detectado. Selecione uma empresa no painel Master para operar o RH com isolamento por empresa.')
        return
      }
      const { data, error: listError } = await supabase.from('erp_funcionarios')
        .select('id,matricula,nome,nome_completo,cpf,rg,data_nascimento,celular,telefone,email,data_admissao,cargo,departamento,regime_trabalho,turno_trabalho,numero_cracha_rfid,salario_nominal,custo_hora_homem,status,status_colaborador')
        .eq('empresa_id', nextProfile.empresa_id).order('nome', { ascending: true }).limit(1000)
      if (listError) throw listError
      setRows((data ?? []).map((r: Record<string, unknown>) => ({
        id: text(r.id), matricula: r.matricula as string | number | null, nome: text(r.nome || r.nome_completo),
        nome_completo: text(r.nome_completo || r.nome), cpf: text(r.cpf), rg: text(r.rg), data_nascimento: text(r.data_nascimento),
        celular: text(r.celular || r.telefone), telefone: text(r.telefone || r.celular), email: text(r.email),
        data_admissao: text(r.data_admissao), cargo: text(r.cargo), departamento: text(r.departamento || 'PRODUCAO_CHAO'),
        regime_trabalho: text(r.regime_trabalho || 'CLT'), turno_trabalho: text(r.turno_trabalho || 'TURNO_1'),
        numero_cracha_rfid: text(r.numero_cracha_rfid), salario_nominal: Number(r.salario_nominal ?? 0),
        custo_hora_homem: Number(r.custo_hora_homem ?? 0), status: asStatus(r.status_colaborador || r.status),
        status_colaborador: asStatus(r.status_colaborador || r.status),
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao consultar colaboradores.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const active = useMemo(() => rows.filter(r => r.status_colaborador === 'Ativo').length, [rows])
  const filtered = useMemo(() => rows.filter(r => {
    const haystack = [r.nome_completo, r.cpf, r.cargo, r.numero_cracha_rfid, String(r.matricula ?? '')].join(' ').toLocaleLowerCase('pt-BR')
    return haystack.includes(query.trim().toLocaleLowerCase('pt-BR')) && (statusFilter === 'Todos' || r.status_colaborador === statusFilter)
  }), [rows, query, statusFilter])
  const update = <K extends keyof ReturnType<typeof emptyEmployee>>(key: K, value: ReturnType<typeof emptyEmployee>[K]) => setForm(old => ({ ...old, [key]: value }))

  function clearForm() { setForm(emptyEmployee()); setEditingId(null); setTab('pessoais'); setNotice('') }
  function edit(row: Employee) {
    setForm({ nome: row.nome_completo, nome_completo: row.nome_completo, cpf: row.cpf, rg: row.rg, data_nascimento: row.data_nascimento,
      celular: row.celular, telefone: row.telefone, email: row.email, data_admissao: row.data_admissao, cargo: row.cargo,
      departamento: row.departamento, regime_trabalho: row.regime_trabalho, turno_trabalho: row.turno_trabalho,
      numero_cracha_rfid: row.numero_cracha_rfid, salario_nominal: row.salario_nominal, custo_hora_homem: row.custo_hora_homem,
      status: row.status_colaborador, status_colaborador: row.status_colaborador })
    setEditingId(row.id); setTab('pessoais'); setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function changeSalary(raw: string) {
    const salary = Math.max(0, Number(raw) || 0)
    setForm(old => ({ ...old, salario_nominal: salary, custo_hora_homem: costPerHour(salary) }))
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('')
    if (!profile?.empresa_id) { setError('Selecione uma empresa ativa antes de gravar.'); return }
    if (!form.nome_completo.trim() || !form.cpf.trim() || !form.data_nascimento || !form.data_admissao || !form.cargo.trim()) {
      setError('Preencha nome, CPF, nascimento, admissão e cargo antes de gravar.'); return
    }
    setSaving(true)
    try {
      const payload = {
        empresa_id: profile.empresa_id, nome: form.nome_completo.trim(), nome_completo: form.nome_completo.trim(),
        cpf: form.cpf.replace(/\D/g, ''), rg: form.rg.trim() || null, data_nascimento: form.data_nascimento,
        celular: form.celular.trim() || null, telefone: form.celular.trim() || null, email: form.email.trim() || null,
        data_admissao: form.data_admissao, cargo: form.cargo.trim(), departamento: form.departamento,
        regime_trabalho: form.regime_trabalho, turno_trabalho: form.turno_trabalho,
        numero_cracha_rfid: form.numero_cracha_rfid.trim() || null, salario_nominal: form.salario_nominal,
        custo_hora_homem: costPerHour(form.salario_nominal), status: form.status_colaborador, status_colaborador: form.status_colaborador,
      }
      const result = editingId
        ? await supabase.from('erp_funcionarios').update(payload).eq('id', editingId).eq('empresa_id', profile.empresa_id).select('id').maybeSingle()
        : await supabase.from('erp_funcionarios').insert(payload).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data?.id) throw new Error('Nenhum registro foi gravado. Verifique as permissões RLS da empresa.')
      setNotice(editingId ? 'Cadastro de colaborador atualizado.' : 'Colaborador cadastrado com sucesso.')
      clearForm()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gravar o cadastro de RH.')
    } finally { setSaving(false) }
  }

  async function remove(row: Employee) {
    if (!window.confirm(`Desligar ${row.nome_completo} do cadastro ativo? Esta ação altera o status, não apaga o histórico.`)) return
    if (!profile?.empresa_id) return
    setError(''); setNotice('')
    const { error: updateError } = await supabase.from('erp_funcionarios').update({ status: 'Desligado', status_colaborador: 'Desligado' })
      .eq('id', row.id).eq('empresa_id', profile.empresa_id)
    if (updateError) { setError(updateError.message); return }
    setNotice('Colaborador marcado como desligado; histórico preservado.')
    await load()
  }

  const tabs: { id: Tab; title: string; icon: ReactNode }[] = [
    { id: 'pessoais', title: 'Dados pessoais', icon: <UserRound size={14}/> },
    { id: 'contratuais', title: 'Contratual e cargo', icon: <BriefcaseBusiness size={14}/> },
    { id: 'fabrica', title: 'Chão de fábrica e custos', icon: <Factory size={14}/> },
  ]

  return <main className="rh-page synqra-module-shell min-w-0 space-y-4 p-3 md:p-5">
    <header className="synqra-module-header rh-head">
      <div><h1>Módulo de Recursos Humanos e Departamento Pessoal</h1><p>Prontuário do operador, alocação de turnos e custo de mão de obra para o PCP.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="synqra-button h-9"><RefreshCw size={13}/>{loading ? 'Consultando…' : 'Atualizar'}</button><button type="button" onClick={clearForm} className="synqra-button h-9"><RotateCcw size={13}/>Limpar</button></div>
    </header>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Colaboradores cadastrados', value: rows.length, icon: <Users size={16}/>, color: 'text-slate-800' },
        { label: 'Ativos', value: active, icon: <BadgeCheck size={16}/>, color: 'text-emerald-700' },
        { label: 'Afastados', value: rows.filter(r => r.status_colaborador === 'Afastado').length, icon: <AlertCircle size={16}/>, color: 'text-amber-700' },
        { label: 'Custo hora médio', value: rows.length ? money(rows.reduce((s,r)=>s+r.custo_hora_homem,0)/rows.length) : money(0), icon: <Factory size={16}/>, color: 'text-sky-800' },
      ].map(k => <article key={k.label} className="flex min-h-[88px] items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{k.label}</p><p className={`mt-1 text-lg font-extrabold tabular-nums ${k.color}`}>{k.value}</p></div><span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600">{k.icon}</span></article>)}
    </div>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={15} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{notice}</div>}
    <Panel title={editingId ? 'Editar prontuário do colaborador' : 'Cadastro de colaborador'}>
      <nav className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Abas do cadastro de RH">
        {tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition ${tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{t.icon}{t.title}</button>)}
      </nav>
      <form onSubmit={save} className="space-y-4">
        {tab === 'pessoais' && <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12"><div className="md:col-span-12"><Field label="Nome completo do colaborador" value={form.nome_completo} onChange={v=>{update('nome_completo',v);update('nome',v)}} required placeholder="Nome completo sem abreviações"/></div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-3"><Field label="CPF" value={form.cpf} onChange={v=>update('cpf',v)} required placeholder="000.000.000-00" mono/></div><div className="xl:col-span-3"><Field label="RG" value={form.rg} onChange={v=>update('rg',v)} placeholder="00.000.000-0" mono/></div><div className="xl:col-span-3 min-w-0 w-full max-w-full"><div className="w-full max-w-full min-w-0"><Field label="Data de nascimento" type="date" value={form.data_nascimento} onChange={v=>update('data_nascimento',v)} required/></div></div><div className="xl:col-span-3"><Field label="Celular / WhatsApp" value={form.celular} onChange={v=>update('celular',v)} placeholder="(11) 99999-0000"/></div></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="E-mail corporativo" type="email" value={form.email} onChange={v=>update('email',v)} placeholder="colaborador@empresa.com"/></div>
        </div>}
        {tab === 'contratuais' && <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4"><Field label="Cargo ocupacional" value={form.cargo} onChange={v=>update('cargo',v)} required placeholder="Ex.: Operador de Injetora I"/></div>
          <div className="md:col-span-3"><SelectField label="Departamento" value={form.departamento} onChange={v=>update('departamento',v)} options={departments} required/></div>
          <div className="md:col-span-2"><SelectField label="Regime contratual" value={form.regime_trabalho} onChange={v=>update('regime_trabalho',v)} options={ [['CLT','CLT'],['PJ','PJ'],['ESTAGIO','Estágio']] } required/></div>
          <div className="md:col-span-3"><Field label="Data de admissão" type="date" value={form.data_admissao} onChange={v=>update('data_admissao',v)} required/></div>
        </div>}
        {tab === 'fabrica' && <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-3"><SelectField label="Turno de trabalho" value={form.turno_trabalho} onChange={v=>update('turno_trabalho',v)} options={shifts} required/></div>
            <div className="xl:col-span-3"><Field label="Crachá / tag RFID" value={form.numero_cracha_rfid} onChange={v=>update('numero_cracha_rfid',v)} placeholder="Bipe o cartão ou digite o ID" mono/></div>
            <div className="xl:col-span-3"><Field label="Salário nominal (R$)" type="number" value={form.salario_nominal || ''} onChange={changeSalary} min="0" step="0.01" required/></div>
            <div className="xl:col-span-3"><Field label="Custo hora homem (R$)" type="number" value={form.custo_hora_homem.toFixed(4)} onChange={()=>undefined} readOnly step="0.0001"/></div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12"><div className="md:col-span-3"><Field label="Custo minuto homem (R$)" value={(form.custo_hora_homem/60).toFixed(6)} onChange={()=>undefined} readOnly/></div><div className="md:col-span-3"><SelectField label="Status do colaborador" value={form.status_colaborador} onChange={v=>{update('status_colaborador',v as Status);update('status',v as Status)}} options={ [['Ativo','🟢 Ativo'],['Afastado','🟡 Afastado / licença'],['Desligado','🔴 Desligado']] } required/></div><div className="md:col-span-6 flex items-end"><p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-[11px] leading-5 text-sky-900">Estimativa: salário × 1,80 ÷ 220 horas/mês. O fator de 80% é uma premissa inicial configurável, não um encargo legal universal. O custo pode ser consumido pela engenharia de custos/PCP após validar o apontamento.</p></div></div>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3"><p className="text-[10px] text-slate-500">Revisão RH/DP · 28/10/2026 · Padrão compacto industrial</p><div className="flex gap-2"><button type="button" onClick={clearForm} className="synqra-button h-9"><X size={13}/>Cancelar</button><button type="submit" disabled={saving || loading || !profile?.empresa_id} className="synqra-button synqra-button-primary h-9"><Save size={13}/>{saving ? 'Gravando…' : editingId ? 'Salvar alterações' : 'Gravar colaborador'}</button></div></div>
      </form>
    </Panel>
    <Panel title="Quadro de colaboradores" right={<span className="text-[10px] font-semibold text-slate-500">{filtered.length} registro(s)</span>}>
      <div className="mb-3 flex flex-wrap items-center gap-2"><label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-2"><Search size={14} className="text-slate-400"/><input aria-label="Filtrar colaboradores" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome, matrícula, CPF, cargo ou RFID" className="w-full text-xs outline-none"/></label><select aria-label="Filtrar por status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"><option>Todos</option><option>Ativo</option><option>Afastado</option><option>Desligado</option></select></div>
      <div className="synqra-table-wrap"><table className="synqra-table min-w-[1000px]"><thead><tr>{['Matrícula','Nome completo','Cargo / função','Setor','Turno','Custo/hora','Status','Ações'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
        {loading && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Consultando registros da empresa…</td></tr>}
        {!loading && filtered.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Nenhum colaborador encontrado nesta empresa.</td></tr>}
        {!loading && filtered.map(r=><tr key={r.id}><td className="font-mono font-bold">{text(r.matricula) || '—'}</td><td className="font-semibold text-slate-900">{r.nome_completo}</td><td>{r.cargo || '—'}</td><td>{departments.find(d=>d[0]===r.departamento)?.[1] || r.departamento || '—'}</td><td>{shifts.find(s=>s[0]===r.turno_trabalho)?.[1] || r.turno_trabalho || '—'}</td><td className="font-mono">{money(r.custo_hora_homem)}</td><td><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${r.status_colaborador==='Ativo'?'border-emerald-200 bg-emerald-50 text-emerald-700':r.status_colaborador==='Afastado'?'border-amber-200 bg-amber-50 text-amber-800':'border-rose-200 bg-rose-50 text-rose-700'}`}>{r.status_colaborador.toUpperCase()}</span></td><td><div className="flex gap-1"><button type="button" onClick={()=>edit(r)} title="Editar colaborador" aria-label={`Editar ${r.nome_completo}`} className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-[10px] font-bold hover:bg-slate-50"><Pencil size={12}/>Editar</button><button type="button" onClick={()=>void remove(r)} title="Marcar como desligado" aria-label={`Desligar ${r.nome_completo}`} className="inline-flex h-8 items-center rounded border border-rose-200 px-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50">Desligar</button></div></td></tr>)}
      </tbody></table></div>
      <p className="mt-2 text-[10px] text-slate-500">Consulta limitada aos 1.000 colaboradores mais recentes por nome. RLS e empresa_id são obrigatórios; registros não são excluídos fisicamente.</p>
    </Panel>
    <footer className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span>Atualizado · Padrão Premium · 28/10/2026</span><span>Os dados exibidos vêm do Supabase autenticado; sem registros demonstrativos.</span></footer>
  </main>
}
