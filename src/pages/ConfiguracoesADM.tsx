import { useEffect, useMemo, useState } from 'react'
import {
  Building2, Boxes, Check, FileText, LayoutDashboard, RefreshCw, Save,
  Search, Settings2, ShieldCheck, UserPlus, Users, X, KeyRound
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ConfiguracaoCodificacaoAreas from './configuracoes/ConfiguracaoCodificacaoAreas'

type Profile = {
  empresa_id: string | null
  is_master: boolean
  nivel_admin?: number
  perfil?: string
  nome?: string
}
type User = {
  id: string
  nome: string
  email: string | null
  ativo: boolean
  setor_id: string | null
  matricula: string | null
  role: string | null
  nivel_admin: number
}
type Sector = { id: string; codigo: string; nome: string; ativo: boolean }
type Form = {
  nome: string
  email: string
  setor_id: string
  matricula: string
  perfil: string
  password: string
}
type Permission = Record<string, boolean>
type Aba = 'codificacao' | 'usuarios' | 'setores' | 'permissoes' | 'parametros' | 'logs'

const modules = [
  'Dashboard','Clientes','Fornecedores','Produtos','Engenharia','Máquinas',
  'Moldes e Ferramentas','Processos','PCP','MRP','Ordens de Produção',
  'Apontamentos','Setup','Refugo','OEE','Matéria-prima','Estoque',
  'Almoxarifado','Compras','Qualidade','RPNC','Rastreabilidade','Manutenção',
  'Custos','Expedição','Vendas','Financeiro','Fiscal','RH','Relatórios',
  'Documentos','Auditorias','Configurações'
]

const emptyForm: Form = {
  nome: '', email: '', setor_id: '', matricula: '', perfil: 'OPERATOR', password: ''
}

const isAdmin = (p: Profile) =>
  p.is_master === true ||
  Number(p.nivel_admin || 0) >= 8 ||
  ['ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'].includes(String(p.perfil || '').toUpperCase())

const menu: Array<{ id: Aba; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'codificacao', label: 'Codificação e Áreas', icon: Boxes },
  { id: 'usuarios', label: 'Funcionários / Usuários', icon: Users },
  { id: 'setores', label: 'Departamentos / Setores', icon: Building2 },
  { id: 'permissoes', label: 'Módulos e Permissões', icon: ShieldCheck },
  { id: 'parametros', label: 'Parâmetros', icon: Settings2 },
  { id: 'logs', label: 'Logs do Sistema', icon: FileText }
]

export default function ConfiguracoesADM({ profile }: { profile: Profile | null }) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('codificacao')
  const [users, setUsers] = useState<User[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [permissions, setPermissions] = useState<Permission>({})
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [query, setQuery] = useState('')
  const [sectorName, setSectorName] = useState('')
  const [sectorCode, setSectorCode] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    if (!profile?.empresa_id) {
      setUsers([])
      setSectors([])
      return
    }
    setBusy(true)
    setError('')
    try {
      const [u, s] = await Promise.all([
        supabase.from('erp_usuarios')
          .select('id,nome,email,ativo,setor_id,matricula,role,nivel_admin')
          .eq('empresa_id', profile.empresa_id)
          .is('deleted_at', null)
          .order('nome'),
        supabase.from('erp_setores')
          .select('id,codigo,nome,ativo')
          .eq('empresa_id', profile.empresa_id)
          .eq('ativo', true)
          .order('nome')
      ])
      if (u.error) throw u.error
      if (s.error) throw s.error
      setUsers((u.data || []) as User[])
      setSectors((s.data || []) as Sector[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os dados.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [profile?.empresa_id])

  const visibleUsers = useMemo(
    () => users.filter(u => JSON.stringify(u).toLowerCase().includes(query.toLowerCase())),
    [users, query]
  )

  const loadUserPermissions = async (u: User) => {
    if (!profile?.empresa_id) return
    setSelected(u)
    setError('')
    const { data, error: readError } = await supabase
      .from('erp_tablet_acl')
      .select('modulo,permitido')
      .eq('empresa_id', profile.empresa_id)
      .eq('usuario_id', u.id)
    if (readError) {
      setError(readError.message)
      return
    }
    const next: Permission = {}
    for (const row of data || []) next[u.id + '|' + row.modulo] = Boolean(row.permitido)
    setPermissions(next)
    setAbaAtiva('permissoes')
  }

  const togglePermission = (module: string) => {
    if (!selected) return
    const key = selected.id + '|' + module
    setPermissions(current => ({ ...current, [key]: !(current[key] ?? false) }))
  }

  const savePermissions = async () => {
    if (!profile?.empresa_id || !selected) return
    setBusy(true)
    setError('')
    try {
      for (const modulo of modules) {
        const { error: writeError } = await supabase
          .from('erp_tablet_acl')
          .upsert({
            empresa_id: profile.empresa_id,
            usuario_id: selected.id,
            modulo,
            permitido: permissions[selected.id + '|' + modulo] ?? false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'empresa_id,usuario_id,modulo' })
        if (writeError) throw writeError
      }
      setMessage('Permissões salvas no Supabase.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar as permissões.')
    } finally {
      setBusy(false)
    }
  }

  const createSector = async () => {
    if (!profile?.empresa_id || !sectorName.trim()) return
    setBusy(true)
    setError('')
    try {
      const codigo = (sectorCode.trim() || sectorName.trim()
        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()).slice(0, 30)
      const { error: writeError } = await supabase.from('erp_setores').insert({
        empresa_id: profile.empresa_id, codigo, nome: sectorName.trim(), ativo: true
      })
      if (writeError) throw writeError
      setSectorName('')
      setSectorCode('')
      setMessage('Setor cadastrado no Supabase.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível cadastrar o setor.')
    } finally {
      setBusy(false)
    }
  }

  const createUser = async () => {
    if (!form.nome.trim() || !form.email.trim() || !form.setor_id) {
      setError('Preencha nome, e-mail e setor.')
      return
    }
    if (form.password && form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-user-admin', {
        body: {
          action: 'create_user',
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          setor_id: form.setor_id,
          matricula: form.matricula.trim() || undefined,
          nivel_admin: 1,
          password: form.password || undefined
        }
      })
      if (fnError) throw fnError
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível criar o usuário.')
      setMessage(data.temporary_password
        ? 'Funcionário criado. Senha inicial: ' + data.temporary_password
        : 'Funcionário criado com a senha informada.')
      setShowNew(false)
      setForm(emptyForm)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o funcionário.')
    } finally {
      setBusy(false)
    }
  }

  if (!profile || !isAdmin(profile)) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F4FBFD] p-8">
        <section className="rounded-2xl bg-white border border-[#D8E5EA] p-8 max-w-xl shadow-sm">
          <ShieldCheck size={30} className="text-[#2D8DB8]" />
          <h1 className="mt-3 text-2xl font-black text-[#123B50]">Acesso restrito</h1>
          <p className="mt-2 text-slate-500">
            Somente o Administrador da empresa ou o Master Universal pode administrar estas configurações.
          </p>
        </section>
      </main>
    )
  }

  const active = menu.find(item => item.id === abaAtiva)

  return (
    <div className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
      <style>{`
        .cfg-sidebar{position:fixed;left:0;top:0;bottom:0;width:256px;background:#123B50;color:#fff;z-index:40}
        .cfg-content{margin-left:256px;min-height:100vh}
        .cfg-nav-item{width:100%;height:42px;display:flex;align-items:center;gap:10px;padding:0 13px;border-radius:10px;color:#BFD5DF;font-size:12px;font-weight:800;text-align:left;transition:.15s}
        .cfg-nav-item:hover{background:#17445A;color:#fff}
        .cfg-nav-item.active{background:rgba(45,141,184,.16);color:#55B8C8;box-shadow:inset 3px 0 #48B7C7}
        .cfg-card{background:#fff;border:1px solid #D8E5EA;border-radius:16px;box-shadow:0 8px 24px rgba(18,59,80,.06)}
        .cfg-input{width:100%;margin-top:5px;border:1px solid #C9DCE2;border-radius:10px;padding:10px 12px;background:#fff;color:#123B50;font-weight:700;outline:none}
        .cfg-input:focus{border-color:#2D8DB8;box-shadow:0 0 0 3px rgba(45,141,184,.12)}
        .cfg-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:10px;padding:9px 13px;font-size:12px;font-weight:900;border:1px solid transparent}
        .cfg-primary{background:#123B50;color:#fff}.cfg-blue{background:#2D8DB8;color:#fff}.cfg-secondary{background:#fff;color:#123B50;border-color:#C9DCE2}
        .cfg-table th{padding:11px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;background:#F4FBFD}
        .cfg-table td{padding:11px 12px;border-top:1px solid #EDF2F4;font-size:12px;color:#334155}
        .cfg-table td b{color:#123B50}
        .embedded-coding>div>aside{display:none!important}
        .embedded-coding>div>main{width:100%!important;height:auto!important;min-height:0!important;overflow:visible!important}
        .embedded-coding>div>main>div{max-width:none!important;padding:0!important}
        .embedded-coding header{display:none!important}
        @media(max-width:760px){.cfg-sidebar{width:72px}.cfg-sidebar .cfg-brand-text,.cfg-sidebar .cfg-nav-text{display:none}.cfg-content{margin-left:72px}.cfg-nav-item{justify-content:center;padding:0}.cfg-nav-item svg{margin:0}}
      `}</style>

      <aside className="cfg-sidebar">
        <div className="h-[78px] px-4 flex items-center border-b border-white/10">
          <div className="h-10 w-10 rounded-xl bg-[#17445A] text-[#55B8C8] grid place-items-center shrink-0">
            <Settings2 size={20} />
          </div>
          <div className="ml-3 cfg-brand-text min-w-0">
            <div className="text-[9px] font-black tracking-[.18em] text-[#55B8C8]">SGQ ERP INDUSTRIAL</div>
            <div className="text-base font-black truncate">CONFIGURAÇÕES</div>
          </div>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 128px)' }}>
          <div className="px-2 pt-2 pb-2 text-[9px] font-black uppercase tracking-[.16em] text-white/40 cfg-nav-text">
            Administração
          </div>
          {menu.map(item => {
            const Icon = item.icon
            const isActive = item.id === abaAtiva
            return (
              <button
                key={item.id}
                type="button"
                className={'cfg-nav-item' + (isActive ? ' active' : '')}
                onClick={() => setAbaAtiva(item.id)}
              >
                <Icon size={17} />
                <span className="cfg-nav-text flex-1">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3 text-[9px] font-bold text-white/45 cfg-nav-text">
          ACESSO ADMINISTRATIVO PROTEGIDO
        </div>
      </aside>

      <main className="cfg-content">
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          <header className="mb-6 flex items-end justify-between gap-4 border-b border-[#D8E5EA] pb-5">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-[#2D8DB8]">Administração / Configurações</div>
              <h1 className="mt-1 text-[27px] font-black tracking-tight">{active?.label}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Painel único do ERP. O menu lateral troca o conteúdo central sem empilhar páginas.
              </p>
            </div>
            <button className="cfg-btn cfg-secondary" onClick={() => void load()} disabled={busy}>
              <RefreshCw size={14} /> Atualizar
            </button>
          </header>

          {(message || error) && (
            <div className={'mb-5 rounded-xl border px-4 py-3 text-sm font-bold ' +
              (error ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#BFE3EA] bg-[#F0FAFC] text-[#123B50]')}>
              {error || message}
            </div>
          )}

          {abaAtiva === 'codificacao' && (
            <div className="embedded-coding">
              <ConfiguracaoCodificacaoAreas />
            </div>
          )}

          {abaAtiva === 'usuarios' && (
            <section className="cfg-card p-5">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2"><Users size={20} className="text-[#2D8DB8]" /> Funcionários / Usuários</h2>
                  <p className="mt-1 text-xs text-slate-500">Dados reais da empresa conectados ao Supabase.</p>
                </div>
                <button className="cfg-btn cfg-blue" onClick={() => setShowNew(true)} disabled={busy}>
                  <UserPlus size={14} /> NOVO FUNCIONÁRIO
                </button>
              </div>
              <div className="mt-4 relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input className="cfg-input pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar funcionário, e-mail ou matrícula" />
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-[#D8E5EA]">
                <table className="cfg-table w-full">
                  <thead><tr><th>Funcionário</th><th>E-mail</th><th>Setor</th><th>Perfil</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {visibleUsers.map(u => (
                      <tr key={u.id}>
                        <td><b>{u.nome}</b><div className="text-[10px] text-slate-400">{u.matricula || 'Sem matrícula'}</div></td>
                        <td>{u.email || '—'}</td>
                        <td>{sectors.find(s => s.id === u.setor_id)?.nome || 'Sem setor'}</td>
                        <td>{u.role || 'OPERADOR'}</td>
                        <td className={u.ativo ? 'text-[#087A58] font-black' : 'text-red-600 font-black'}>{u.ativo ? 'ATIVO' : 'INATIVO'}</td>
                        <td><button className="cfg-btn cfg-secondary" onClick={() => void loadUserPermissions(u)}><ShieldCheck size={14} /> ACESSOS</button></td>
                      </tr>
                    ))}
                    {!visibleUsers.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum funcionário encontrado nos dados da empresa.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {abaAtiva === 'setores' && (
            <section className="cfg-card p-5">
              <h2 className="text-lg font-black flex items-center gap-2"><Building2 size={20} className="text-[#2D8DB8]" /> Departamentos / Setores</h2>
              <p className="mt-1 text-xs text-slate-500">Cadastro real de setores da empresa.</p>
              <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-3 mt-5">
                <input className="cfg-input" value={sectorCode} onChange={e => setSectorCode(e.target.value)} placeholder="Código (opcional)" />
                <input className="cfg-input" value={sectorName} onChange={e => setSectorName(e.target.value)} placeholder="Nome do setor" />
                <button className="cfg-btn cfg-primary" onClick={() => void createSector()} disabled={busy}><Save size={14} /> SALVAR SETOR</button>
              </div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sectors.map(s => (
                  <div key={s.id} className="rounded-xl border border-[#D8E5EA] bg-white p-4">
                    <div className="text-[10px] font-black text-[#2D8DB8]">{s.codigo}</div>
                    <div className="mt-1 font-black">{s.nome}</div>
                    <div className="mt-2 text-[10px] font-bold text-[#087A58]">ATIVO</div>
                  </div>
                ))}
                {!sectors.length && <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-[#BFD5DC] p-8 text-center text-sm text-slate-400">Nenhum setor cadastrado para esta empresa.</div>}
              </div>
            </section>
          )}

          {abaAtiva === 'permissoes' && (
            <section className="cfg-card p-5">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2"><ShieldCheck size={20} className="text-[#2D8DB8]" /> Módulos e Permissões</h2>
                  <p className="mt-1 text-xs text-slate-500">Matriz real de acesso por funcionário.</p>
                </div>
                {selected && <span className="text-xs font-black text-[#2D8DB8]">{selected.nome}</span>}
              </div>
              {!selected ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#BFD5DC] p-10 text-center text-sm font-bold text-slate-500">
                  Abra a aba Funcionários / Usuários e clique em ACESSOS.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-5">
                    {modules.map(modulo => {
                      const key = selected.id + '|' + modulo
                      const permitido = permissions[key] ?? false
                      return (
                        <button key={modulo} type="button" onClick={() => togglePermission(modulo)}
                          className="text-left rounded-xl border border-[#C9DCE2] bg-white p-3 hover:bg-[#F4FBFD]">
                          <span className="flex items-center gap-2">
                            <span className={'w-6 h-6 rounded-md border grid place-items-center ' +
                              (permitido ? 'bg-[#EAF6F1] border-[#3A9D78] text-[#087A58]' : 'border-[#9DB7BF]')}>
                              {permitido && <Check size={14} />}
                            </span>
                            <b className="text-xs">{modulo}</b>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex justify-end mt-5">
                    <button className="cfg-btn cfg-primary" onClick={() => void savePermissions()} disabled={busy}><Save size={14} /> SALVAR PERMISSÕES</button>
                  </div>
                </>
              )}
            </section>
          )}

          {abaAtiva === 'parametros' && (
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="cfg-card p-5"><div className="text-[10px] font-black uppercase text-slate-400">Empresa</div><div className="mt-2 text-lg font-black">{profile.nome || 'Empresa atual'}</div></div>
              <div className="cfg-card p-5"><div className="text-[10px] font-black uppercase text-slate-400">Empresa ID</div><div className="mt-2 text-xs font-mono break-all">{profile.empresa_id || 'MASTER'}</div></div>
              <div className="cfg-card p-5"><div className="text-[10px] font-black uppercase text-slate-400">Acesso</div><div className="mt-2 font-black text-[#087A58]">ADMINISTRATIVO ATIVO</div></div>
            </section>
          )}

          {abaAtiva === 'logs' && (
            <section className="cfg-card p-6">
              <h2 className="text-lg font-black flex items-center gap-2"><FileText size={20} className="text-[#2D8DB8]" /> Logs do Sistema</h2>
              <p className="mt-2 text-sm text-slate-500">
                Esta tela não cria registros falsos. Quando a tabela de auditoria disponível para esta empresa estiver conectada ao painel, os eventos reais serão exibidos aqui.
              </p>
            </section>
          )}
        </div>
      </main>

      {showNew && (
        <div className="fixed inset-0 z-[100] bg-[#082028]/70 grid place-items-center p-5">
          <section className="cfg-card w-[min(760px,100%)] max-h-[92vh] overflow-auto p-6">
            <div className="flex justify-between items-center">
              <div><div className="text-[9px] font-black tracking-[.18em] text-[#2D8DB8]">NOVO ACESSO</div><h2 className="mt-1 text-xl font-black">Cadastro do funcionário</h2></div>
              <button onClick={() => setShowNew(false)} className="p-2"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <label className="text-xs font-black uppercase text-slate-500">Nome<input className="cfg-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
              <label className="text-xs font-black uppercase text-slate-500">E-mail<input className="cfg-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
              <label className="text-xs font-black uppercase text-slate-500">Matrícula<input className="cfg-input" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} /></label>
              <label className="text-xs font-black uppercase text-slate-500">Setor<select className="cfg-input" value={form.setor_id} onChange={e => setForm({ ...form, setor_id: e.target.value })}><option value="">Selecione</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
              <label className="text-xs font-black uppercase text-slate-500">Perfil<select className="cfg-input" value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}><option value="OPERATOR">Operador</option><option value="SUPERVISOR">Supervisor</option><option value="ANALYST">Analista</option></select></label>
              <label className="text-xs font-black uppercase text-slate-500">Senha inicial<input className="cfg-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="cfg-btn cfg-secondary" onClick={() => setShowNew(false)}>CANCELAR</button>
              <button className="cfg-btn cfg-blue" onClick={() => void createUser()} disabled={busy}><KeyRound size={14} /> {busy ? 'CRIANDO...' : 'CRIAR ACESSO'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
