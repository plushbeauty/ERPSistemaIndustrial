import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  DatabaseBackup,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
} from 'lucide-react'

type Item = { path: string; label: string; description: string; icon: typeof Settings }
type Group = { label: string; items: Item[] }

const groups: Group[] = [
  {
    label: 'ADMINISTRAÇÃO',
    items: [
      { path: '/configuracoes-adm', label: 'Visão geral', description: 'Central administrativa', icon: LayoutDashboard },
      { path: '/configuracoes-adm/empresa', label: 'Empresa e identidade', description: 'Cadastro da empresa', icon: Building2 },
      { path: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', description: 'Códigos e setores', icon: BarChart3 },
      { path: '/configuracoes-adm/perfis', label: 'Perfis de usuários', description: 'Perfis e níveis', icon: UsersRound },
      { path: '/configuracoes-adm/permissoes', label: 'Controle de permissões', description: 'Matriz de acesso', icon: ShieldCheck },
    ],
  },
  {
    label: 'CONTROLE E SEGURANÇA',
    items: [
      { path: '/configuracoes-adm/logs', label: 'Logs do sistema', description: 'Auditoria e rastreabilidade', icon: FileClock },
      { path: '/configuracoes-adm/backups', label: 'Backups', description: 'Continuidade operacional', icon: DatabaseBackup },
      { path: '/configuracoes-adm/usuarios', label: 'Usuários', description: 'Cadastro e situação', icon: KeyRound },
      { path: '/configuracoes-adm/seguranca', label: 'Segurança', description: 'Sessões e políticas', icon: LockKeyhole },
    ],
  },
  {
    label: 'PLATAFORMA',
    items: [
      { path: '/configuracoes-adm/integracoes', label: 'Integrações', description: 'Serviços e conectores', icon: Network },
      { path: '/configuracoes-adm/sistema', label: 'Sistema', description: 'Preferências gerais', icon: Settings },
    ],
  },
]

const allItems = groups.flatMap(group => group.items)

function Field({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-slate-600">{label}{required && <span className="ml-1 text-[#D65B61]">*</span>}</span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-4 focus:ring-[#2D8DB8]/10"
      />
    </label>
  )
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-slate-600">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-4 focus:ring-[#2D8DB8]/10">
        {children}
      </select>
    </label>
  )
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(18,59,80,0.05)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-extrabold text-[#123B50]">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Overview({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const cards = [
    ['Empresa e identidade', 'Mantenha os dados cadastrais, documentos e identidade do ERP.', Building2, '/configuracoes-adm/empresa'],
    ['Perfis e permissões', 'Defina estruturas de acesso por função sem misturar módulos.', ShieldCheck, '/configuracoes-adm/perfis'],
    ['Usuários', 'Base administrativa para cadastro, situação e perfil de acesso.', UsersRound, '/configuracoes-adm/usuarios'],
    ['Segurança', 'Sessões, políticas, autenticação e proteção da plataforma.', LockKeyhole, '/configuracoes-adm/seguranca'],
    ['Logs do sistema', 'Rastreabilidade de ações administrativas e operacionais.', FileClock, '/configuracoes-adm/logs'],
    ['Integrações', 'Conectores externos organizados em um único ponto.', Network, '/configuracoes-adm/integracoes'],
  ]
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Módulos administrativos', '10', ClipboardList],
          ['Perfis estruturados', '03', UsersRound],
          ['Políticas de segurança', '08', ShieldCheck],
          ['Integrações', '04', Network],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(18,59,80,0.05)]">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon size={18} className="text-[#2D8DB8]" /></div>
            <div className="mt-2 text-2xl font-black text-[#123B50]">{value}</div>
            <div className="mt-1 text-[11px] font-semibold text-slate-400">Indicador visual da demonstração</div>
          </div>
        ))}
      </div>
      <Card title="Central de configurações" action={<span className="rounded-full bg-[#EAF7FA] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#17445A]">DEMO VISUAL</span>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, description, Icon, path]) => (
            <button key={String(path)} type="button" onClick={() => navigate(String(path))} className="group rounded-xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#7DBCCD] hover:shadow-md">
              <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#EAF7FA] text-[#17445A]"><Icon size={19} /></span><ArrowRight size={16} className="text-slate-300 group-hover:text-[#2D8DB8]" /></div>
              <h3 className="mt-4 text-sm font-extrabold text-[#123B50]">{label}</h3>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Empresa() {
  const [razao, setRazao] = useState('Plastibor Indústria')
  const [fantasia, setFantasia] = useState('Plastibor')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('SP')
  const [saved, setSaved] = useState(false)
  return (
    <Card title="Cadastro da empresa" action={<span className="text-[11px] font-bold text-slate-400">Campos locais — nenhum dado é gravado</span>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Razão social" value={razao} onChange={setRazao} required />
        <Field label="Nome fantasia" value={fantasia} onChange={setFantasia} required />
        <Field label="CNPJ" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0000-00" />
        <Field label="E-mail administrativo" value={email} onChange={setEmail} placeholder="administrativo@empresa.com.br" />
        <Field label="Telefone" value={telefone} onChange={setTelefone} placeholder="(00) 0000-0000" />
        <Field label="Cidade" value={cidade} onChange={setCidade} placeholder="Cidade" />
        <SelectField label="UF" value={uf} onChange={setUf}><option>SP</option><option>PR</option><option>SC</option><option>MG</option><option>RJ</option></SelectField>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <span className="text-xs font-semibold text-slate-400">Estrutura inspirada em padrões ERP: identificação, contato e localização.</span>
        <button type="button" onClick={() => setSaved(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123B50] px-4 text-xs font-extrabold text-white hover:bg-[#17445A]"><Check size={15} /> Validar formulário</button>
      </div>
      {saved && <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">Formulário validado visualmente. Nenhuma alteração foi enviada ao banco.</div>}
    </Card>
  )
}

function Usuarios() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [perfil, setPerfil] = useState('Administrador')
  const [setor, setSetor] = useState('Administrativo')
  const [ativo, setAtivo] = useState('Ativo')
  const [validated, setValidated] = useState(false)
  return (
    <div className="space-y-5">
      <Card title="Novo usuário" action={<span className="text-[11px] font-bold text-slate-400">Cadastro visual</span>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Nome completo" value={nome} onChange={setNome} placeholder="Nome do usuário" required />
          <Field label="E-mail" value={email} onChange={setEmail} placeholder="usuario@empresa.com.br" required />
          <SelectField label="Perfil" value={perfil} onChange={setPerfil}><option>Administrador</option><option>Produção</option><option>Qualidade</option><option>Financeiro</option></SelectField>
          <SelectField label="Situação" value={ativo} onChange={setAtivo}><option>Ativo</option><option>Inativo</option></SelectField>
          <SelectField label="Setor" value={setor} onChange={setSetor}><option>Administrativo</option><option>PCP</option><option>Produção</option><option>Qualidade</option><option>Manutenção</option></SelectField>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setValidated(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2D8DB8] px-4 text-xs font-extrabold text-white hover:bg-[#267da2]"><Check size={15} /> Validar cadastro</button></div>
        {validated && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">Cadastro validado somente no navegador. Não cria usuário nem altera Supabase.</div>}
      </Card>
      <Card title="Usuários cadastrados — modelo de tabela">
        <div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Situação</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs"><tr><td className="px-4 py-3 font-extrabold text-slate-700">Administrador do sistema</td><td className="px-4 py-3">Administrador</td><td className="px-4 py-3">Administrativo</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">Ativo</span></td></tr><tr><td className="px-4 py-3 font-extrabold text-slate-700">Responsável PCP</td><td className="px-4 py-3">Produção</td><td className="px-4 py-3">PCP</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">Ativo</span></td></tr></tbody></table></div>
      </Card>
    </div>
  )
}

function GenericSection({ item }: { item: Item }) {
  const [enabled, setEnabled] = useState(true)
  const [saved, setSaved] = useState(false)
  return (
    <div className="space-y-5">
      <Card title={item.label} action={<span className="rounded-full bg-[#EAF7FA] px-2.5 py-1 text-[10px] font-black uppercase text-[#17445A]">Demonstração</span>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome da configuração" value={item.label} onChange={() => undefined} />
          <SelectField label="Situação" value={enabled ? 'Ativo' : 'Inativo'} onChange={value => setEnabled(value === 'Ativo')}><option>Ativo</option><option>Inativo</option></SelectField>
          <Field label="Código interno" value={'ADM-' + item.label.replace(/[^A-Z]/gi, '').slice(0, 8).toUpperCase()} onChange={() => undefined} />
        </div>
      </Card>
      <Card title="Estrutura da tela">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {['Cabeçalho', 'Filtros', 'Formulário', 'Tabela'].map(label => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-extrabold text-[#123B50]">{label}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">Componente preparado para a próxima fase.</div></div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-[#C8E1E8] bg-[#F4FBFD] p-4">
          <div><div className="text-xs font-extrabold text-[#123B50]">Salvar configuração</div><div className="mt-1 text-[11px] font-semibold text-slate-500">Nesta etapa o botão apenas valida o estado visual.</div></div>
          <button type="button" onClick={() => setSaved(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123B50] px-4 text-xs font-extrabold text-white"><Check size={15} /> Validar</button>
        </div>
        {saved && <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">Estado visual validado. Nenhuma chamada externa foi executada.</div>}
      </Card>
    </div>
  )
}

function SectionContent({ item, navigate }: { item: Item; navigate: ReturnType<typeof useNavigate> }) {
  if (item.path === '/configuracoes-adm') return <Overview navigate={navigate} />
  if (item.path === '/configuracoes-adm/empresa') return <Empresa />
  if (item.path === '/configuracoes-adm/usuarios') return <Usuarios />
  return <GenericSection item={item} />
}

export default function ConfiguracoesADM() {
  const location = useLocation()
  const navigate = useNavigate()
  const current = useMemo(() => allItems.find(item => item.path === location.pathname) ?? allItems[0], [location.pathname])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map(group => [group.label, true])))
  const [query, setQuery] = useState('')

  const filteredGroups = groups.map(group => ({ ...group, items: group.items.filter(item => !query || (item.label + ' ' + item.description).toLowerCase().includes(query.toLowerCase())) })).filter(group => group.items.length)

  const toggleGroup = (label: string) => setOpenGroups(state => ({ ...state, [label]: !state[label] }))

  return (
    <div className="min-h-screen bg-[#F4FBFD] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setMobileOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-[#17445A] xl:hidden" aria-label="Abrir menu"><Menu size={19} /></button>
          <div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D8DB8]">SYSNQRA ERP & SGQ INDUSTRIAL</div><div className="truncate text-sm font-black text-[#123B50]">Administração do sistema</div></div>
          <div className="hidden w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 md:flex"><Search size={16} className="text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar configuração..." className="h-9 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-slate-400" /></div>
          <div className="hidden items-center gap-2 sm:flex"><button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="Notificações"><Bell size={17} /></button><div className="grid h-10 w-10 place-items-center rounded-lg bg-[#123B50] text-xs font-black text-white">AD</div></div>
        </div>
      </header>

      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-[#123B50]/40 xl:hidden" />}

      <div className="mx-auto flex max-w-[1680px]">
        <aside className={(mobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0') + ' fixed top-16 bottom-0 left-0 z-50 w-[310px] overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 xl:sticky xl:top-16 xl:h-[calc(100vh-64px)]'}>
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#123B50] p-4 text-white">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><SlidersHorizontal size={19} /></div>
              <div><div className="text-[10px] font-black uppercase tracking-wider text-[#8DE0EA]">CONFIGURAÇÃO</div><div className="text-sm font-black">Painel Administrativo</div></div>
            </div>
          </div>
          <nav aria-label="Menu administrativo" className="p-3">
            {filteredGroups.map(group => (
              <div key={group.label} className="mb-4">
                <button type="button" onClick={() => toggleGroup(group.label)} className="mb-1 flex w-full items-center justify-between px-2 py-2 text-[10px] font-black tracking-[0.16em] text-slate-400">
                  {group.label}<ChevronDown size={14} className={'transition-transform ' + (openGroups[group.label] ? '' : '-rotate-90')} />
                </button>
                {openGroups[group.label] && <div className="space-y-1">{group.items.map(item => {
                  const Icon = item.icon
                  const active = current.path === item.path
                  return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition ' + (active ? 'bg-[#EAF7FA] text-[#123B50] ring-1 ring-[#C8E1E8]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#123B50]')}>
                    <span className={'grid h-8 w-8 shrink-0 place-items-center rounded-md ' + (active ? 'bg-white text-[#2D8DB8]' : 'bg-slate-100 text-slate-500')}><Icon size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{item.label}</span><span className="block truncate text-[10px] font-semibold text-slate-400">{item.description}</span></span>
                    <ArrowRight size={14} className={'shrink-0 ' + (active ? 'text-[#2D8DB8]' : 'text-slate-300 group-hover:text-slate-500')} />
                  </Link>
                })}</div>}
              </div>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4"><div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-amber-700">MODO DEMONSTRAÇÃO</div><div className="mt-1 text-[11px] font-bold leading-4 text-amber-900">Sem Supabase, Auth, API, RPC ou gravação.</div></div></div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-[11px] font-bold text-slate-400">ERP Industrial / Administração / <span className="text-slate-600">{current.label}</span></div><h1 className="mt-1 text-2xl font-black tracking-tight text-[#123B50]">{current.label}</h1><p className="mt-1 text-xs font-semibold text-slate-500">{current.description}</p></div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800"><Activity size={13} /> Visual isolado</div>
          </div>
          <SectionContent item={current} navigate={navigate} />
          <footer className="mt-8 border-t border-slate-200 py-5 text-center text-[10px] font-semibold text-slate-400">© FernandoSch_System — Todos os direitos reservados</footer>
        </main>
      </div>
    </div>
  )
}
