import { Settings, ShieldCheck, Database, FileText, UsersRound } from 'lucide-react'

export default function ConfiguracoesADM() {
  const cards = [
    { icon: Settings, title: 'Codificação de Áreas', text: 'Estrutura visual para códigos, grupos e áreas.' },
    { icon: ShieldCheck, title: 'Controle de Permissões', text: 'Matriz visual de acesso por perfil.' },
    { icon: UsersRound, title: 'Perfis de Usuários', text: 'Estrutura visual de perfis e níveis.' },
    { icon: FileText, title: 'Logs do Sistema', text: 'Estrutura visual de auditoria.' },
    { icon: Database, title: 'Backups da Base', text: 'Estrutura visual de continuidade.' },
  ]

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#F4FBFD] p-5 text-[#123B50]">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-5 rounded-2xl border border-[#C5DEE6] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#123B50] text-white shadow-lg">
              <Settings size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#2D8DB8]">ADMINISTRAÇÃO</span>
              <h1 className="text-2xl font-black">Configurações ADM</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Prévia visual — esta tela não consulta nem grava dados.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-[#C5DEE6] bg-white p-5 shadow-sm">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white">
                <Icon size={21} />
              </div>
              <h2 className="text-base font-black">{title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{text}</p>
              <div className="mt-5 rounded-xl border border-dashed border-[#B8D5DE] bg-[#F8FCFD] p-3 text-xs font-bold text-slate-500">
                Somente layout nesta etapa
              </div>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-cyan-100 bg-[#EAF7FA] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#2D8DB8]" size={20} />
            <div>
              <h2 className="font-black">Modo de teste visual</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Nenhum Supabase, CRUD, permissão, log ou backup é executado aqui. Primeiro validamos o visual; a integração real será feita depois da aprovação.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
