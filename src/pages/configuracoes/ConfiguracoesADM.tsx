import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  DatabaseBackup,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Network,
  Settings,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

type DemoSection = {
  path: string
  label: string
  description: string
  icon: typeof Settings
}

const sections: DemoSection[] = [
  { path: '/configuracoes-adm', label: 'Visão geral', description: 'Central administrativa do ERP', icon: LayoutDashboard },
  { path: '/configuracoes-adm/empresa', label: 'Empresa e identidade', description: 'Identidade, documentos e parâmetros', icon: Building2 },
  { path: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', description: 'Códigos, áreas e sequências', icon: BarChart3 },
  { path: '/configuracoes-adm/perfis', label: 'Perfis de usuários', description: 'Perfis e níveis de acesso', icon: UsersRound },
  { path: '/configuracoes-adm/permissoes', label: 'Controle de permissões', description: 'Matriz de permissões', icon: ShieldCheck },
  { path: '/configuracoes-adm/logs', label: 'Logs do sistema', description: 'Auditoria e rastreabilidade', icon: FileClock },
  { path: '/configuracoes-adm/backups', label: 'Backups', description: 'Rotina e continuidade', icon: DatabaseBackup },
  { path: '/configuracoes-adm/usuarios', label: 'Usuários', description: 'Administração de usuários', icon: KeyRound },
  { path: '/configuracoes-adm/integracoes', label: 'Integrações', description: 'Conectores e serviços externos', icon: Network },
  { path: '/configuracoes-adm/seguranca', label: 'Segurança', description: 'Sessões, políticas e proteção', icon: LockKeyhole },
  { path: '/configuracoes-adm/sistema', label: 'Sistema', description: 'Preferências gerais do ERP', icon: Settings },
]

const sampleRows = [
  ['ADMINISTRADOR', 'Administrador da empresa', 'Ativo'],
  ['PRODUÇÃO', 'Operação industrial', 'Ativo'],
  ['QUALIDADE', 'Qualidade e SGQ', 'Ativo'],
]

function VisualContent({ section }: { section: DemoSection }) {
  const isOverview = section.path === '/configuracoes-adm'
  const rows = isOverview
    ? [
        ['Empresa', 'Plastibor Indústria', 'Configurado'],
        ['Perfis', '03 estruturas', 'Configurado'],
        ['Permissões', 'Matriz administrativa', 'Revisão visual'],
        ['Integrações', 'Serviços externos', 'Isolado nesta demo'],
      ]
    : sampleRows

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D8DB8]">SYSNQRA ERP & SGQ INDUSTRIAL</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#123B50]">{section.label}</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{section.description}. Esta etapa valida somente a arquitetura visual e a navegação.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Modo demonstração</div>
            <div className="mt-1 text-sm font-bold text-amber-900">Sem leitura ou gravação no banco</div>
          </div>
        </div>
      </section>

      {isOverview ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.slice(1).map(item => {
            const Icon = item.icon
            return (
              <Link key={item.path} to={item.path} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#7DBCCD] hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EAF7FA] text-[#17445A]"><Icon size={20} /></span>
                  <ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#2D8DB8]" />
                </div>
                <h2 className="mt-4 text-base font-black text-[#123B50]">{item.label}</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{item.description}</p>
              </Link>
            )
          })}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-black text-[#123B50]">Estrutura visual da área</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Conteúdo ilustrativo local. Nenhum registro abaixo representa dado real.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr><th className="px-6 py-3">Item</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3">Status visual</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map(row => <tr key={row[0]}><td className="px-6 py-4 font-black text-slate-800">{row[0]}</td><td className="px-6 py-4 font-medium text-slate-500">{row[1]}</td><td className="px-6 py-4"><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">{row[2]}</span></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 border-t border-slate-200 p-6 md:grid-cols-3">
            <div className="rounded-xl bg-[#F4FBFD] p-4"><div className="text-xs font-black text-[#17445A]">Formulários</div><div className="mt-1 text-sm font-medium text-slate-500">Campos, validações e ações representados visualmente.</div></div>
            <div className="rounded-xl bg-[#F4FBFD] p-4"><div className="text-xs font-black text-[#17445A]">Estados</div><div className="mt-1 text-sm font-medium text-slate-500">Loading, vazio, sucesso e erro previstos no desenho.</div></div>
            <div className="rounded-xl bg-[#F4FBFD] p-4"><div className="text-xs font-black text-[#17445A]">Integração</div><div className="mt-1 text-sm font-medium text-slate-500">Supabase será reconectado somente após aprovação visual.</div></div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#C8E1E8] bg-[#EAF7FA] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-[#2D8DB8]" size={20} />
          <div>
            <h2 className="font-black text-[#123B50]">Ambiente visual isolado</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-600">Esta tela não importa Supabase, não consulta banco, não executa CRUD, não chama RPC/Edge Function e não grava qualquer informação.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function ConfiguracoesADM() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = useMemo(() => sections.find(item => item.path === location.pathname) ?? sections[0], [location.pathname])

  return (
    <div className="min-h-screen bg-[#F4FBFD] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-5 p-4 sm:p-6">
        <aside className={(mobileOpen ? 'fixed inset-4 z-50 flex ' : 'hidden xl:flex ') + 'w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#123B50] shadow-xl xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]'}>
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white"><Settings size={21} /></div>
              <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8DE0EA]">ADMINISTRAÇÃO</div><div className="text-lg font-black text-white">Configurações</div></div>
            </div>
          </div>
          <nav aria-label="Menu de configurações" className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {sections.map(item => {
                const Icon = item.icon
                const selected = current.path === item.path
                return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={selected ? 'page' : undefined} className={'flex items-center gap-3 rounded-xl px-3 py-3 transition ' + (selected ? 'bg-white text-[#123B50] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
                  <Icon size={18} />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-black">{item.label}</span><span className={selected ? 'block text-[11px] font-semibold text-slate-500' : 'block text-[11px] font-semibold text-white/45'}>{item.description}</span></span>
                  <ArrowRight size={15} className={selected ? 'text-[#2D8DB8]' : 'text-white/30'} />
                </Link>
              })}
            </div>
          </nav>
          <div className="border-t border-white/10 p-4"><div className="rounded-xl bg-white/5 p-3"><div className="text-xs font-black text-white">DEMO VISUAL</div><div className="mt-1 text-[11px] font-semibold text-white/55">Banco e integrações isolados</div></div></div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-400">ERP Industrial <span className="px-1">/</span> Configurações ADM</div>
            <button type="button" onClick={() => setMobileOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#17445A] shadow-sm xl:hidden" aria-expanded={mobileOpen}>Menu</button>
          </div>
          <VisualContent section={current} />
        </main>
      </div>
    </div>
  )
}
