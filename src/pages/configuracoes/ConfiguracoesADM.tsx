import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowRight, BarChart3, Bell, Building2, Check, ChevronDown,
  ClipboardList, DatabaseBackup, FileClock, KeyRound, LayoutDashboard,
  LockKeyhole, Menu, Network, Search, Settings, ShieldCheck,
  SlidersHorizontal, UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Item = { path: string; label: string; description: string; icon: LucideIcon }
type Group = { label: string; items: Item[] }

const groups: Group[] = [
  { label: 'ADMINISTRAÇÃO', items: [
    { path: '/configuracoes-adm', label: 'Visão geral', description: 'Central administrativa', icon: LayoutDashboard },
    { path: '/configuracoes-adm/empresa', label: 'Empresa e identidade', description: 'Cadastro da empresa', icon: Building2 },
    { path: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', description: 'Códigos e setores', icon: BarChart3 },
    { path: '/configuracoes-adm/perfis', label: 'Perfis de usuários', description: 'Perfis e níveis', icon: UsersRound },
    { path: '/configuracoes-adm/permissoes', label: 'Controle de permissões', description: 'Matriz de acesso', icon: ShieldCheck },
  ]},
  { label: 'CONTROLE E SEGURANÇA', items: [
    { path: '/configuracoes-adm/logs', label: 'Logs do sistema', description: 'Auditoria e rastreabilidade', icon: FileClock },
    { path: '/configuracoes-adm/backups', label: 'Backups', description: 'Continuidade operacional', icon: DatabaseBackup },
    { path: '/configuracoes-adm/usuarios', label: 'Usuários', description: 'Cadastro e situação', icon: KeyRound },
    { path: '/configuracoes-adm/seguranca', label: 'Segurança', description: 'Sessões e políticas', icon: LockKeyhole },
  ]},
  { label: 'PLATAFORMA', items: [
    { path: '/configuracoes-adm/integracoes', label: 'Integrações', description: 'Serviços e conectores', icon: Network },
    { path: '/configuracoes-adm/sistema', label: 'Sistema', description: 'Preferências gerais', icon: Settings },
  ]},
]
const allItems = groups.flatMap(group => group.items)

const inputStyle: CSSProperties = {
  boxSizing: 'border-box', width: '100%', height: 24, borderRadius: 2,
  border: '1px solid #CBD5E1', background: '#FFFFFF', padding: '0 8px',
  color: '#1E293B', fontSize: 11, fontWeight: 500, outline: 'none',
}

function Field({ label, value, onChange, placeholder, required = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean
}) {
  return <label style={{ display: 'block', width: '100%' }}>
    <span style={{ display: 'block', marginBottom: 2, fontSize: 10, fontWeight: 800, color: '#475569' }}>
      {label}{required && <span style={{ marginLeft: 4, color: '#D65B61' }}>*</span>}
    </span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
  </label>
}

function SelectField({ label, value, onChange, children }: {
  label: string; value: string; onChange: (value: string) => void; children: ReactNode
}) {
  return <label style={{ display: 'block', width: '100%' }}>
    <span style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 800, color: '#475569' }}>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>{children}</select>
  </label>
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF', boxShadow: '0 2px 10px rgba(18,59,80,.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#123B50' }}>{title}</h2>{action}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </section>
}

const grid = (min = 220): CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 16,
})
const buttonStyle: CSSProperties = {
  border: 0, borderRadius: 2, height: 24, padding: '0 8px', display: 'inline-flex',
  alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 800,
}

function Overview({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const cards: Array<[string, string, LucideIcon, string]> = [
    ['Empresa e identidade', 'Mantenha os dados cadastrais, documentos e identidade do ERP.', Building2, '/configuracoes-adm/empresa'],
    ['Perfis e permissões', 'Defina estruturas de acesso por função sem misturar módulos.', ShieldCheck, '/configuracoes-adm/perfis'],
    ['Usuários', 'Base administrativa para cadastro, situação e perfil de acesso.', UsersRound, '/configuracoes-adm/usuarios'],
    ['Segurança', 'Sessões, políticas, autenticação e proteção da plataforma.', LockKeyhole, '/configuracoes-adm/seguranca'],
    ['Logs do sistema', 'Rastreabilidade de ações administrativas e operacionais.', FileClock, '/configuracoes-adm/logs'],
    ['Integrações', 'Conectores externos organizados em um único ponto.', Network, '/configuracoes-adm/integracoes'],
  ]
  const stats: Array<[string, string, LucideIcon]> = [
    ['Módulos administrativos', '10', ClipboardList], ['Perfis estruturados', '03', UsersRound],
    ['Políticas de segurança', '08', ShieldCheck], ['Integrações', '04', Network],
  ]
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={grid(210)}>{stats.map(([label, value, Icon]) =>
      <div key={label} style={{ borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF', padding: 20, boxShadow: '0 2px 10px rgba(18,59,80,.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{label}</span><Icon size={18} color="#2D8DB8" /></div>
        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: '#123B50' }}>{value}</div>
        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Indicador visual da demonstração</div>
      </div>
    )}</div>
    <Card title="Central de configurações" action={<span style={{ borderRadius: 999, background: '#EAF7FA', padding: '4px 10px', fontSize: 10, fontWeight: 900, color: '#17445A' }}>DEMO VISUAL</span>}>
      <div style={grid(270)}>{cards.map(([label, description, Icon, path]) =>
        <button key={path} type="button" onClick={() => navigate(path)} style={{ minHeight: 150, border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 8, background: '#EAF7FA', color: '#17445A' }}><Icon size={19} /></span>
            <ArrowRight size={16} color="#CBD5E1" />
          </div>
          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 800, color: '#123B50' }}>{label}</h3>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, fontWeight: 500, color: '#64748B' }}>{description}</p>
        </button>
      )}</div>
    </Card>
  </div>
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
  return <Card title="Cadastro da empresa" action={<span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>Campos locais — nenhum dado é gravado</span>}>
    <div style={grid(220)}>
      <Field label="Razão social" value={razao} onChange={setRazao} required /><Field label="Nome fantasia" value={fantasia} onChange={setFantasia} required />
      <Field label="CNPJ" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0000-00" /><Field label="E-mail administrativo" value={email} onChange={setEmail} placeholder="administrativo@empresa.com.br" />
      <Field label="Telefone" value={telefone} onChange={setTelefone} placeholder="(00) 0000-0000" /><Field label="Cidade" value={cidade} onChange={setCidade} placeholder="Cidade" />
      <SelectField label="UF" value={uf} onChange={setUf}><option>SP</option><option>PR</option><option>SC</option><option>MG</option><option>RJ</option></SelectField>
    </div>
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Estrutura inspirada em padrões ERP: identificação, contato e localização.</span>
      <button type="button" onClick={() => setSaved(true)} style={{ ...buttonStyle, background: '#123B50', color: '#FFFFFF' }}><Check size={15} /> Validar formulário</button>
    </div>
    {saved && <div role="status" style={{ marginTop: 16, borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#065F46' }}>Formulário validado visualmente. Nenhuma alteração foi enviada ao banco.</div>}
  </Card>
}

function Usuarios() {
  const [nome, setNome] = useState(''); const [email, setEmail] = useState('')
  const [perfil, setPerfil] = useState('Administrador'); const [setor, setSetor] = useState('Administrativo')
  const [ativo, setAtivo] = useState('Ativo'); const [validated, setValidated] = useState(false)
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <Card title="Novo usuário" action={<span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>Cadastro visual</span>}>
      <div style={grid(200)}>
        <Field label="Nome completo" value={nome} onChange={setNome} placeholder="Nome do usuário" required />
        <Field label="E-mail" value={email} onChange={setEmail} placeholder="usuario@empresa.com.br" required />
        <SelectField label="Perfil" value={perfil} onChange={setPerfil}><option>Administrador</option><option>Produção</option><option>Qualidade</option><option>Financeiro</option></SelectField>
        <SelectField label="Situação" value={ativo} onChange={setAtivo}><option>Ativo</option><option>Inativo</option></SelectField>
        <SelectField label="Setor" value={setor} onChange={setSetor}><option>Administrativo</option><option>PCP</option><option>Produção</option><option>Qualidade</option><option>Manutenção</option></SelectField>
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}><button type="button" onClick={() => setValidated(true)} style={{ ...buttonStyle, background: '#2D8DB8', color: '#FFFFFF' }}><Check size={15} /> Validar cadastro</button></div>
      {validated && <div role="status" style={{ marginTop: 16, borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#065F46' }}>Cadastro validado somente no navegador. Não cria usuário nem altera Supabase.</div>}
    </Card>
    <Card title="Usuários cadastrados — modelo de tabela">
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ background: '#F8FAFC', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#64748B' }}><tr>{['Nome','Perfil','Setor','Situação'].map(x => <th key={x} style={{ padding: '12px 16px' }}>{x}</th>)}</tr></thead>
        <tbody style={{ fontSize: 12 }}>{[['Administrador do sistema','Administrador','Administrativo'],['Responsável PCP','Produção','PCP']].map(row =>
          <tr key={row[0]} style={{ borderBottom: '1px solid #F1F5F9' }}>{row.map((cell,i) => <td key={cell} style={{ padding: '12px 16px', fontWeight: i===0 ? 800 : 500, color: '#334155' }}>{cell}</td>)}<td style={{ padding: '12px 16px' }}><span style={{ borderRadius: 999, background: '#ECFDF5', padding: '4px 8px', fontWeight: 700, color: '#047857' }}>Ativo</span></td></tr>
        )}</tbody>
      </table></div>
    </Card>
  </div>
}

function GenericSection({ item }: { item: Item }) {
  const [enabled, setEnabled] = useState(true); const [saved, setSaved] = useState(false)
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <Card title={item.label} action={<span style={{ borderRadius: 999, background: '#EAF7FA', padding: '4px 10px', fontSize: 10, fontWeight: 900, color: '#17445A' }}>DEMONSTRAÇÃO</span>}>
      <div style={grid(220)}>
        <Field label="Nome da configuração" value={item.label} onChange={() => undefined} />
        <SelectField label="Situação" value={enabled ? 'Ativo' : 'Inativo'} onChange={v => setEnabled(v === 'Ativo')}><option>Ativo</option><option>Inativo</option></SelectField>
        <Field label="Código interno" value={'ADM-' + item.label.replace(/[^A-Z]/gi, '').slice(0, 8).toUpperCase()} onChange={() => undefined} />
      </div>
    </Card>
    <Card title="Estrutura da tela">
      <div style={grid(180)}>{['Cabeçalho','Filtros','Formulário','Tabela'].map(label =>
        <div key={label} style={{ borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#123B50' }}>{label}</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#64748B' }}>Componente preparado para a próxima fase.</div>
        </div>
      )}</div>
      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 8, border: '1px solid #C8E1E8', background: '#F4FBFD', padding: 16 }}>
        <div><div style={{ fontSize: 12, fontWeight: 800, color: '#123B50' }}>Salvar configuração</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#64748B' }}>Nesta etapa o botão apenas valida o estado visual.</div></div>
        <button type="button" onClick={() => setSaved(true)} style={{ ...buttonStyle, background: '#123B50', color: '#FFFFFF' }}><Check size={15} /> Validar</button>
      </div>
      {saved && <div role="status" style={{ marginTop: 16, borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#065F46' }}>Estado visual validado. Nenhuma chamada externa foi executada.</div>}
    </Card>
  </div>
}

function SectionContent({ item, navigate }: { item: Item; navigate: ReturnType<typeof useNavigate> }) {
  if (item.path === '/configuracoes-adm') return <Overview navigate={navigate} />
  if (item.path === '/configuracoes-adm/empresa') return <Empresa />
  if (item.path === '/configuracoes-adm/usuarios') return <Usuarios />
  return <GenericSection item={item} />
}

export default function ConfiguracoesADM() {
  const location = useLocation(); const navigate = useNavigate()
  const current = useMemo(() => allItems.find(item => item.path === location.pathname) ?? allItems[0], [location.pathname])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map(g => [g.label, true])))
  const [query, setQuery] = useState('')
  const filteredGroups = groups.map(g => ({ ...g, items: g.items.filter(i => !query || (i.label + ' ' + i.description).toLowerCase().includes(query.toLowerCase())) })).filter(g => g.items.length)
  const toggleGroup = (label: string) => setOpenGroups(s => ({ ...s, [label]: !s[label] }))

  const sidebar: CSSProperties = {
    width: 250, flexShrink: 0, minHeight: 'calc(100vh - 48px)', borderRight: '1px solid #E2E8F0',
    background: '#FFFFFF', display: 'flex', flexDirection: 'column',
  }
  const navLink = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, borderRadius: 8, padding: '4px 8px',
    textDecoration: 'none', color: active ? '#123B50' : '#475569',
    background: active ? '#EAF7FA' : 'transparent', border: active ? '1px solid #C8E1E8' : '1px solid transparent',
  })

  return <div style={{ minHeight: '100vh', background: '#F4FBFD', color: '#1E293B', fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
    <header style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #E2E8F0', background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(4px)' }}>
      <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <button type="button" onClick={() => setMobileOpen(v => !v)} style={{ ...buttonStyle, width: 40, padding: 0, justifyContent: 'center', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#17445A' }} aria-label="Abrir menu"><Menu size={19} /></button>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.18em', color: '#2D8DB8' }}>SYNQRA ERP & SGQ INDUSTRIAL</div><div style={{ fontSize: 14, fontWeight: 900, color: '#123B50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Administração do sistema</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'min(380px,42vw)', border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', padding: '0 12px' }}><Search size={16} color="#94A3B8" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar configuração..." style={{ height: 36, flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', fontSize: 12, fontWeight: 600 }} /></div>
        <button type="button" style={{ ...buttonStyle, width: 40, padding: 0, justifyContent: 'center', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#64748B' }} aria-label="Notificações"><Bell size={17} /></button>
        <div style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 8, background: '#123B50', color: '#FFFFFF', fontSize: 12, fontWeight: 900 }}>AD</div>
      </div>
    </header>

    {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: '64px 0 0', zIndex: 45, border: 0, background: 'rgba(18,59,80,.42)' }} />}

    <div style={{ maxWidth: 1680, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
      <aside style={{ ...sidebar, position: 'fixed', top: 48, bottom: 0, left: 0, zIndex: 50, overflowY: 'auto', transform: mobileOpen ? 'translateX(0)' : 'translateX(-105%)', transition: 'transform .2s ease' }}>
        <div style={{ borderBottom: '1px solid #E2E8F0', padding: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, background: '#123B50', padding: 16, color: '#FFFFFF' }}><div style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(255,255,255,.1)' }}><SlidersHorizontal size={19} /></div><div><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: '#8DE0EA' }}>CONFIGURAÇÃO</div><div style={{ fontSize: 14, fontWeight: 900 }}>Painel Administrativo</div></div></div></div>
        <nav aria-label="Menu administrativo" style={{ flex: 1, padding: 12 }}>
          {filteredGroups.map(group => <div key={group.label} style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => toggleGroup(group.label)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, padding: 8, border: 0, background: 'transparent', color: '#94A3B8', fontSize: 10, fontWeight: 900, letterSpacing: '.16em', cursor: 'pointer' }}>{group.label}<ChevronDown size={14} style={{ transform: openGroups[group.label] ? 'none' : 'rotate(-90deg)' }} /></button>
            {openGroups[group.label] && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{group.items.map(item => { const Icon = item.icon; const active = current.path === item.path; return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} style={navLink(active)}>
              <span style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 6, background: active ? '#FFFFFF' : '#F1F5F9', color: active ? '#2D8DB8' : '#64748B' }}><Icon size={16} /></span>
              <span style={{ minWidth: 0, flex: 1 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span><span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span></span>
              <ArrowRight size={14} color={active ? '#2D8DB8' : '#CBD5E1'} />
            </Link>})}</div>}
          </div>)}
        </nav>
        <div style={{ borderTop: '1px solid #E2E8F0', padding: 16 }}><div style={{ border: '1px solid #FDE68A', borderRadius: 8, background: '#FEF3C7', padding: 12 }}><div style={{ fontSize: 10, fontWeight: 900, color: '#B45309' }}>MODO DEMONSTRAÇÃO</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, lineHeight: 1.4, color: '#78350F' }}>Sem Supabase, Auth, API, RPC ou gravação.</div></div></div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 12, marginLeft: 250 }}>
        <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>ERP Industrial / Administração / <span style={{ color: '#475569' }}>{current.label}</span></div><h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: '#123B50' }}>{current.label}</h1><p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#64748B' }}>{current.description}</p></div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid #FDE68A', background: '#FEF3C7', padding: '6px 12px', fontSize: 10, fontWeight: 900, color: '#92400E' }}><Activity size={13} /> Visual isolado</div>
        </div>
        <SectionContent item={current} navigate={navigate} />
        <footer style={{ marginTop: 32, borderTop: '1px solid #E2E8F0', padding: '20px 0', textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>© FernandoSch_System — Todos os direitos reservados</footer>
      </main>
    </div>
  </div>
}
