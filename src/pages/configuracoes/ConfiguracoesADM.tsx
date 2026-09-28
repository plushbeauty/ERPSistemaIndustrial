import { useState } from 'react'
import { Settings, KeyRound, ShieldCheck, UsersRound, FileText, DatabaseBackup } from 'lucide-react'
import ConfiguracaoCodificacaoAreas from './ConfiguracaoCodificacaoAreas'

type Profile = { nome?: string }
type ConfigSection = 'codificacao' | 'permissoes' | 'perfis' | 'logs' | 'backups'

const sections: Array<{ id: ConfigSection; label: string; icon: typeof Settings }> = [
  { id: 'codificacao', label: 'Codificação e Áreas', icon: KeyRound },
  { id: 'permissoes', label: 'Controle de Permissões', icon: ShieldCheck },
  { id: 'perfis', label: 'Perfis', icon: UsersRound },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'backups', label: 'Backups', icon: DatabaseBackup },
]

export default function ConfiguracoesADM({ profile }: { profile: Profile | null }) {
  const [section, setSection] = useState<ConfigSection>('codificacao')
  const current = sections.find(item => item.id === section) ?? sections[0]
  const CurrentIcon = current.icon

  return (
    <div className="min-h-full bg-[#F4FBFD] p-4 md:p-6">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-[#123B50] p-4 shadow-[0_12px_30px_rgba(18,59,80,.25)]">
          <div className="mb-5 flex items-center gap-3 border-b border-white/15 pb-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#55B8C8] to-[#17445A] text-white shadow-[0_8px_16px_rgba(0,0,0,.3),inset_0_2px_0_rgba(255,255,255,.3)]">
              <Settings size={25} strokeWidth={2.5} />
            </div>
            <div><span className="block text-[9px] font-black tracking-[.16em] text-[#8DE0EA]">ADMINISTRAÇÃO</span><strong className="block text-base font-black text-white">CONFIGURAÇÕES</strong></div>
          </div>
          <nav className="space-y-2" aria-label="Menu de configurações">
            {sections.map(item => {
              const Icon = item.icon
              const active = item.id === section
              return <button key={item.id} type="button" onClick={() => setSection(item.id)} className={['flex min-h-[54px] w-full items-center gap-3 rounded-xl border px-3 text-left transition-all',active?'border-[#55B8C8] bg-[#17445A] shadow-lg':'border-white/10 bg-white/5 hover:border-[#55B8C8]/50 hover:bg-white/10'].join(' ')}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-[0_6px_12px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.3)]"><Icon size={18} strokeWidth={2.5}/></span>
                <span className="text-sm font-black text-white">{item.label}</span>
              </button>
            })}
          </nav>
        </aside>
        <section className="min-h-[620px] rounded-2xl border border-[#C5DEE6] bg-white shadow-[0_12px_30px_rgba(18,59,80,.12)]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D7EAF0] p-5 md:p-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-[0_9px_18px_rgba(23,68,90,.28),inset_0_2px_0_rgba(255,255,255,.3)]"><CurrentIcon size={27} strokeWidth={2.4}/></div>
              <div><span className="block text-[10px] font-black tracking-[.15em] text-[#176487]">SGQ ERP INDUSTRIAL</span><h1 className="text-2xl font-black text-[#123B50]">{current.label}</h1></div>
            </div>
            <div className="rounded-xl border border-[#C5DEE6] bg-[#F8FCFD] px-4 py-3"><span className="block text-[9px] font-black tracking-[.14em] text-[#5C7480]">USUÁRIO CONECTADO</span><strong className="text-sm font-black text-[#123B50]">{profile?.nome || 'Usuário ERP'}</strong></div>
          </header>
          <div className="p-6 md:p-8">
            {section === 'codificacao'
              ? <ConfiguracaoCodificacaoAreas profile={profile} />
              : <div className="rounded-2xl border-2 border-dashed border-[#B8D5DE] bg-[#F8FCFD] p-10 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[#55B8C8] to-[#17445A] text-white shadow-[0_12px_24px_rgba(23,68,90,.28),inset_0_2px_0_rgba(255,255,255,.3)]"><CurrentIcon size={38} strokeWidth={2.2}/></div><h2 className="mt-5 text-xl font-black text-[#123B50]">{current.label}</h2><p className="mx-auto mt-2 max-w-xl font-semibold text-[#31505D]">Esta seção será implementada na próxima etapa, sem dados ou conteúdo fictício.</p></div>}
          </div>
        </section>
      </div>
    </div>
  )
}
