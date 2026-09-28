import { useEffect, useMemo, useState } from 'react'
import { Settings, Users, ChevronRight, UserPlus, Search, ShieldCheck, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ConfiguracaoCodificacaoAreas from './configuracoes/ConfiguracaoCodificacaoAreas'

type Profile = {
  empresa_id: string | null
  is_master: boolean
  nivel_admin?: number
  perfil?: string
  nome?: string
}

type UsuarioIndustria = {
  id: string
  nome: string
  email: string | null
  ativo: boolean
  setor_id: string | null
  matricula: string | null
  role: string | null
  nivel_admin: number
}

type Setor = {
  id: string
  nome: string
  codigo: string
}

type Form = {
  nome: string
  email: string
  setor_id: string
  matricula: string
  perfil: string
  password: string
}

const emptyForm: Form = {
  nome: '',
  email: '',
  setor_id: '',
  matricula: '',
  perfil: 'OPERATOR',
  password: ''
}

const isAdmin = (profile: Profile) =>
  profile.is_master === true ||
  Number(profile.nivel_admin || 0) >= 8 ||
  ['ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'].includes(String(profile.perfil || '').toUpperCase())

export default function ConfiguracoesADM({ profile }: { profile: Profile | null }) {
  const [abaAtiva, setAbaAtiva] = useState<'codificacao' | 'usuarios'>('codificacao')
  const [clock, setClock] = useState(new Date())
  const [usuarios, setUsuarios] = useState<UsuarioIndustria[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [form, setForm] = useState<Form>(emptyForm)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadUsuarios = async () => {
    if (!profile?.empresa_id) {
      setUsuarios([])
      setSetores([])
      return
    }

    setBusy(true)
    setError('')

    try {
      const [usuariosResult, setoresResult] = await Promise.all([
        supabase
          .from('erp_usuarios')
          .select('id,nome,email,ativo,setor_id,matricula,role,nivel_admin')
          .eq('empresa_id', profile.empresa_id)
          .is('deleted_at', null)
          .order('nome'),
        supabase
          .from('erp_setores')
          .select('id,nome,codigo')
          .eq('empresa_id', profile.empresa_id)
          .eq('ativo', true)
          .order('nome')
      ])

      if (usuariosResult.error) throw usuariosResult.error
      if (setoresResult.error) throw setoresResult.error

      setUsuarios((usuariosResult.data || []) as UsuarioIndustria[])
      setSetores((setoresResult.data || []) as Setor[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os dados da empresa.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void loadUsuarios()
  }, [profile?.empresa_id])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const usuariosVisiveis = useMemo(() => {
    const termo = query.trim().toLowerCase()
    if (!termo) return usuarios

    return usuarios.filter(usuario =>
      [usuario.nome, usuario.email, usuario.matricula, usuario.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(termo)
    )
  }, [usuarios, query])

  const criarUsuario = async (event: React.FormEvent) => {
    event.preventDefault()

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
      const { data, error: functionError } = await supabase.functions.invoke('erp-user-admin', {
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

      if (functionError) throw functionError
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível criar o usuário.')

      setMessage(
        data.temporary_password
          ? 'Funcionário criado. Senha inicial gerada pelo sistema.'
          : 'Funcionário criado com a senha informada.'
      )
      setForm(emptyForm)
      await loadUsuarios()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o funcionário.')
    } finally {
      setBusy(false)
    }
  }

  if (!profile || !isAdmin(profile)) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F4F7FE] p-8">
        <section className="rounded-2xl bg-white border border-slate-200 p-8 max-w-xl shadow-sm">
          <ShieldCheck size={30} className="text-blue-600" />
          <h1 className="mt-3 text-2xl font-black text-slate-900">Acesso restrito</h1>
          <p className="mt-2 text-slate-500">
            Somente o Administrador da empresa ou o Master Universal pode administrar estas configurações.
          </p>
        </section>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] text-slate-800 font-sans antialiased">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full border-r border-slate-800 z-30 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-900 rounded-xl flex items-center justify-center text-white font-black text-sm">
            SQ
          </div>
          <div>
            <span className="text-base font-black text-white block tracking-tight">SGQ ERP</span>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block -mt-1">Industrial</span>
          </div>
        </div>

        <div className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-6 pt-6">
          Administração da Empresa
        </div>

        <nav className="px-4 flex-1 space-y-1">
          <button
            type="button"
            onClick={() => setAbaAtiva('codificacao')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-sm ${
              abaAtiva === 'codificacao'
                ? 'bg-blue-600/10 text-cyan-400 border border-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Settings className="w-4 h-4" />
              <span>Codificação e Áreas</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('usuarios')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-sm ${
              abaAtiva === 'usuarios'
                ? 'bg-blue-600/10 text-cyan-400 border border-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4" />
              <span>Funcionários / Usuários</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between pl-6">
          <span>SUPABASE CONNECTED</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
        <header className="sticky top-0 z-20 min-h-[78px] bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-6 shadow-sm">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">SGQ ERP INDUSTRIAL</span>
            <h1 className="text-xl font-black text-slate-900 mt-1">Configurações / Administração da Empresa</h1>
            <p className="text-xs text-slate-500 mt-1">Módulo ativo: Configurações • Dados reais do tenant</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right border-l border-slate-200 pl-4">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Logado</span>
              <strong className="block text-xs font-black text-slate-800">{profile.nome || 'Usuário'}</strong>
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <strong className="block text-xs font-black text-slate-800">{clock.toLocaleDateString('pt-BR')}</strong>
              <span className="block text-[11px] font-bold text-slate-500">{clock.toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>
        </header>
        <div className="p-8">
        {abaAtiva === 'codificacao' && (
          <div className="space-y-6">
            <header className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                Configurações / Administração
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Codificação e Áreas</h1>
            </header>

            <ConfiguracaoCodificacaoAreas />
          </div>
        )}

        {abaAtiva === 'usuarios' && (
          <div className="space-y-6">
            <header className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                Segurança Interna
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Funcionários / Usuários</h1>
            </header>

            {(message || error) && (
              <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                error
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}>
                {error || message}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <section className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Registrar Usuário
                </h3>

                <form onSubmit={criarUsuario} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome completo</label>
                    <input
                      type="text"
                      required
                      value={form.nome}
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                      placeholder="Nome completo"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="usuario@empresa.com"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Departamento</label>
                    <select
                      required
                      value={form.setor_id}
                      onChange={e => setForm({ ...form, setor_id: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-medium"
                    >
                      <option value="">Selecione</option>
                      {setores.map(setor => (
                        <option key={setor.id} value={setor.id}>{setor.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Perfil</label>
                    <select
                      value={form.perfil}
                      onChange={e => setForm({ ...form, perfil: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-medium"
                    >
                      <option value="OPERATOR">Operador</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="ANALYST">Analista</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Matrícula</label>
                    <input
                      type="text"
                      value={form.matricula}
                      onChange={e => setForm({ ...form, matricula: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Senha inicial</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Opcional"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{busy ? 'Processando...' : 'Inserir Colaborador'}</span>
                  </button>
                </form>
              </section>

              <section className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Colaboradores Ativos no Supabase
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Somente registros reais da empresa atual.
                    </p>
                  </div>

                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Pesquisar funcionário, e-mail ou matrícula"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-9 pr-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-4 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-left text-[10px] uppercase text-slate-500">Nome</th>
                        <th className="p-3 text-left text-[10px] uppercase text-slate-500">E-mail</th>
                        <th className="p-3 text-left text-[10px] uppercase text-slate-500">Setor</th>
                        <th className="p-3 text-left text-[10px] uppercase text-slate-500">Permissão</th>
                        <th className="p-3 text-left text-[10px] uppercase text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosVisiveis.map(usuario => (
                        <tr key={usuario.id} className="border-t border-slate-100">
                          <td className="p-3 font-bold text-slate-900">{usuario.nome}</td>
                          <td className="p-3">{usuario.email || '—'}</td>
                          <td className="p-3">
                            {setores.find(setor => setor.id === usuario.setor_id)?.nome || '—'}
                          </td>
                          <td className="p-3">{usuario.role || 'OPERADOR'}</td>
                          <td className="p-3 font-bold">
                            <span className={usuario.ativo ? 'text-emerald-700' : 'text-red-600'}>
                              {usuario.ativo ? 'ATIVO' : 'INATIVO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!usuariosVisiveis.length && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            Nenhum funcionário encontrado nos dados reais da empresa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
