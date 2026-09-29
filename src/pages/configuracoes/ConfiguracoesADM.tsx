import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Code2,
  DatabaseBackup,
  FileClock,
  KeyRound,
  LayoutDashboard,
  RefreshCw,
  Settings,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import CompanySettings from '../../components/CompanySettings'
import ConfiguracaoCodificacaoAreas from './ConfiguracaoCodificacaoAreas'
import ConfiguracaoPermissoes from './ConfiguracaoPermissoes'
import ConfiguracaoPerfis from './ConfiguracaoPerfis'
import ConfiguracaoLogs from './ConfiguracaoLogs'
import ConfiguracaoBackups from './ConfiguracaoBackups'

type Profile = {
  nome: string
  empresa_id: string | null
  nivel_admin: number
  is_master: boolean
  perfil: string
}

type Item = {
  path: string
  label: string
  description: string
  icon: LucideIcon
}

const items: Item[] = [
  {
    path: '/configuracoes-adm',
    label: 'Visão geral',
    description: 'Central de administração',
    icon: LayoutDashboard,
  },
  {
    path: '/configuracoes-adm/empresa',
    label: 'Empresa e identidade',
    description: 'Dados, logos e relatórios',
    icon: Building2,
  },
  {
    path: '/configuracoes-adm/codificacao',
    label: 'Codificação e áreas',
    description: 'Códigos, grupos e sequências',
    icon: Code2,
  },
  {
    path: '/configuracoes-adm/perfis',
    label: 'Perfis de usuários',
    description: 'Perfis reais do RBAC',
    icon: UsersRound,
  },
  {
    path: '/configuracoes-adm/permissoes',
    label: 'Controle de permissões',
    description: 'Matriz por perfil',
    icon: ShieldCheck,
  },
  {
    path: '/configuracoes-adm/logs',
    label: 'Logs do sistema',
    description: 'Auditoria operacional',
    icon: FileClock,
  },
  {
    path: '/configuracoes-adm/backups',
    label: 'Backups',
    description: 'Continuidade da infraestrutura',
    icon: DatabaseBackup,
  },
  {
    path: '/configuracoes-adm/usuarios',
    label: 'Usuários',
    description: 'Cadastro e administração',
    icon: KeyRound,
  },
]

function normalize(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/configuracoes-adm'
}

function Notice({ children, tone = 'info' }: { children: string; tone?: 'info' | 'error' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800'
          : 'rounded-xl border border-[#C8E1E8] bg-[#F4FBFD] px-4 py-3 text-sm font-semibold text-[#17445A]'
      }
    >
      {children}
    </div>
  )
}

function Overview({ profile }: { profile: Profile }) {
  const cards = items.filter(item => item.path !== '/configuracoes-adm').map(item => {
    const Icon = item.icon
    return (
      <Link
        key={item.path}
        to={item.path}
        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8CC8D8] hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EAF7FA] text-[#17445A]">
            <Icon size={21} />
          </span>
          <ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#2D8DB8]" />
        </div>
        <h2 className="mt-4 text-base font-black text-slate-900">{item.label}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{item.description}</p>
      </Link>
    )
  })

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D8DB8]">Administração do ERP</span>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#123B50]">Configurações</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Central única para as configurações que já existem no ERP. Cada área abre sua implementação real, sem dados fictícios.
            </p>
          </div>
          <div className="rounded-xl border border-[#C8E1E8] bg-[#F4FBFD] px-4 py-3 text-sm">
            <div className="font-black text-[#123B50]">{profile.nome || 'Usuário'}</div>
            <div className="mt-1 font-semibold text-slate-500">
              {profile.is_master ? 'Master do ecossistema' : profile.empresa_id ? 'Usuário vinculado à empresa' : 'Sem empresa vinculada'}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-[#2D8DB8]" size={20} />
          <div>
            <h2 className="font-black text-[#123B50]">Integrações existentes</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              O ERP já possui telas próprias para usuários, Outlook e configurações específicas de PCP. Elas permanecem em suas rotas reais para não duplicar regras.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/usuarios" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-[#17445A] hover:bg-slate-50">
                Abrir usuários
              </Link>
              <Link to="/outlook/configuracao" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-[#17445A] hover:bg-slate-50">
                Configurar Outlook
              </Link>
              <Link to="/configuracao-lote-pcp" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-[#17445A] hover:bg-slate-50">
                Configuração de lote PCP
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function ConfiguracoesADM() {
  const location = useLocation()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentPath = normalize(location.pathname)

  useEffect(() => {
    let alive = true

    void (async () => {
      setLoading(true)
      setError('')
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Sessão autenticada não encontrada.')

        const { data, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('nome,empresa_id,nivel_admin,is_master,perfil')
          .eq('auth_user_id', auth.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()

        if (profileError) throw profileError
        if (!data) throw new Error('Usuário ERP ativo não encontrado para a sessão atual.')

        if (alive) {
          setProfile({
            nome: String(data.nome ?? ''),
            empresa_id: data.empresa_id ? String(data.empresa_id) : null,
            nivel_admin: Number(data.nivel_admin ?? 0),
            is_master: Boolean(data.is_master),
            perfil: String(data.perfil ?? ''),
          })
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o perfil administrativo.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const active = useMemo(
    () => items.find(item => currentPath === item.path)?.path ?? '/configuracoes-adm',
    [currentPath],
  )

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-[#F4FBFD] p-6">
        <div className="mx-auto flex min-h-[420px] max-w-[1500px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-[#17445A]">
            <RefreshCw className="animate-spin" size={19} />
            Carregando configurações reais do ERP…
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-[#F4FBFD] p-6">
        <div className="mx-auto max-w-[900px]">
          <Notice tone="error">{error || 'Perfil administrativo indisponível.'}</Notice>
        </div>
      </div>
    )
  }

  const content =
    currentPath === '/configuracoes-adm' ? <Overview profile={profile} /> :
    currentPath === '/configuracoes-adm/empresa' ? <CompanySettings profile={profile} /> :
    currentPath === '/configuracoes-adm/codificacao' ? <ConfiguracaoCodificacaoAreas profile={profile} /> :
    currentPath === '/configuracoes-adm/perfis' ? <ConfiguracaoPerfis /> :
    currentPath === '/configuracoes-adm/permissoes' ? <ConfiguracaoPermissoes /> :
    currentPath === '/configuracoes-adm/logs' ? <ConfiguracaoLogs /> :
    currentPath === '/configuracoes-adm/backups' ? <ConfiguracaoBackups /> :
    currentPath === '/configuracoes-adm/usuarios' ? (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-[#123B50]">Usuários</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">A administração de usuários já possui uma tela própria no ERP.</p>
        <Link to="/usuarios" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17445A] px-4 py-3 text-sm font-black text-white">
          Abrir usuários
          <ArrowRight size={16} />
        </Link>
      </section>
    ) : <Overview profile={profile} />

  return (
    <div className="min-h-[calc(100vh-104px)] bg-[#F4FBFD] text-slate-800">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-5 p-4 sm:p-6 xl:flex-row">
        <aside className="w-full shrink-0 xl:sticky xl:top-5 xl:h-[calc(100vh-136px)] xl:w-[300px]">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#123B50] shadow-lg">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white">
                  <Settings size={21} />
                </span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8DE0EA]">Administração</div>
                  <h2 className="text-lg font-black text-white">Configurações</h2>
                </div>
              </div>
            </div>

            <nav aria-label="Seções de configurações" className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {items.map(item => {
                  const Icon = item.icon
                  const selected = active === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={selected ? 'page' : undefined}
                      className={
                        'flex items-center gap-3 rounded-xl px-3 py-3 transition ' +
                        (selected
                          ? 'bg-white text-[#123B50] shadow-sm'
                          : 'text-white/75 hover:bg-white/10 hover:text-white')
                      }
                    >
                      <Icon size={18} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className={selected ? 'block text-[11px] font-semibold text-slate-500' : 'block text-[11px] font-semibold text-white/45'}>
                          {item.description}
                        </span>
                      </span>
                      <ArrowRight size={15} className={selected ? 'text-[#2D8DB8]' : 'text-white/30'} />
                    </Link>
                  )
                })}
              </div>
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="rounded-xl bg-white/5 p-3 text-xs">
                <div className="font-black text-white">{profile.nome || 'Usuário ERP'}</div>
                <div className="mt-1 font-semibold text-white/55">
                  {profile.is_master ? 'MASTER' : profile.perfil || 'PERFIL ERP'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-bold text-slate-400">
              ERP Industrial <span className="px-1">/</span> <span className="text-[#17445A]">{items.find(item => item.path === active)?.label ?? 'Configurações'}</span>
            </div>
            <span className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-700 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sessão autenticada
            </span>
          </div>
          {content}
        </main>
      </div>
    </div>
  )
}
