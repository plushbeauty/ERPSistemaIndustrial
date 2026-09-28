import { useState } from 'react'
import {
  Settings,
  KeyRound,
  ShieldCheck,
  UsersRound,
  FileText,
  DatabaseBackup,
  ChevronRight,
} from 'lucide-react'

type ERPProfile = {
  empresa_id: string | null
  is_master: boolean
  nivel_admin?: number
  perfil?: string
  nome?: string
}

type ConfigTab = 'codificacao' | 'permissoes' | 'perfis' | 'logs' | 'backups'

const tabs: Array<{ id: ConfigTab; label: string; icon: typeof Settings }> = [
  { id: 'codificacao', label: 'Codificação e Áreas', icon: KeyRound },
  { id: 'permissoes', label: 'Controle de Permissões', icon: ShieldCheck },
  { id: 'perfis', label: 'Perfis', icon: UsersRound },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'backups', label: 'Backups', icon: DatabaseBackup },
]

export default function ConfiguracoesADM({ profile }: { profile: ERPProfile | null }) {
  const [abaAtiva, setAbaAtiva] = useState<ConfigTab>('codificacao')
  const aba = tabs.find((item) => item.id === abaAtiva) ?? tabs[0]
  const Icon = aba.icon

  return (
    <main className="min-h-[calc(100vh-104px)] bg-[#F4FBFD] p-4 text-[#123B50] md:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border-2 border-[#A7C8D4] bg-[#123B50] p-4 shadow-xl">
          <div className="mb-4 flex items-center gap-3 border-b border-white/15 pb-4">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#55B8C8] to-[#17445A] text-white shadow-[0_8px_16px_rgba(0,0,0,.3),inset_0_2px_0_rgba(255,255,255,.3)]"
              aria-hidden="true"
            >
              <Settings size={25} strokeWidth={2.4} />
            </span>
            <div>
              <span className="block text-[10px] font-black tracking-[.14em] text-[#8DE0EA]">
                ADMINISTRAÇÃO
              </span>
              <strong className="block text-lg font-black text-white">CONFIGURAÇÕES</strong>
            </div>
          </div>

          <nav className="grid gap-2" aria-label="Configurações administrativas">
            {tabs.map((item) => {
              const ItemIcon = item.icon
              const active = item.id === abaAtiva

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAbaAtiva(item.id)}
                  className={`flex min-h-[54px] items-center gap-3 rounded-xl border-2 px-3 text-left font-black transition-all ${
                    active
                      ? 'border-[#55B8C8] bg-[#17445A] text-white shadow-lg'
                      : 'border-white/10 bg-white/5 text-white hover:border-[#55B8C8]/60 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-[0_5px_10px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.25)] ${
                      active ? 'bg-[#2D8DB8] text-white' : 'bg-[#0B3042] text-[#8DE0EA]'
                    }`}
                  >
                    <ItemIcon size={19} strokeWidth={2.5} />
                  </span>
                  <span className="text-sm text-white">{item.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-white/60" />
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="min-h-[620px] rounded-2xl border-2 border-[#A7C8D4] bg-white p-5 shadow-xl md:p-7">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#D8EDF3] pb-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-[0_9px_18px_rgba(23,68,90,.28),inset_0_2px_0_rgba(255,255,255,.25)]">
                <Icon size={27} strokeWidth={2.4} />
              </span>
              <div>
                <p className="mb-1 text-[10px] font-black tracking-[.14em] text-[#176487]">
                  SGQ ERP INDUSTRIAL · CONFIGURAÇÕES
                </p>
                <h1 className="text-2xl font-black text-[#123B50]">{aba.label}</h1>
              </div>
            </div>

            <div className="rounded-xl border-2 border-[#D0E2E8] bg-[#F8FCFD] px-4 py-3 text-right">
              <span className="block text-[9px] font-black tracking-widest text-[#5C7480]">USUÁRIO</span>
              <strong className="text-sm font-black text-[#123B50]">{profile?.nome || 'Usuário ERP'}</strong>
            </div>
          </header>

          <div className="mt-6 grid min-h-[430px] place-items-center rounded-2xl border-2 border-dashed border-[#A7C8D4] bg-[#F8FCFD] p-8 text-center">
            <div className="max-w-2xl">
              <span className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[#55B8C8] to-[#17445A] text-white shadow-[0_12px_24px_rgba(23,68,90,.25),inset_0_2px_0_rgba(255,255,255,.3)]">
                <Settings size={38} strokeWidth={2.2} />
              </span>
              <h2 className="text-xl font-black text-[#123B50]">Estrutura de Configurações criada</h2>
              <p className="mt-2 font-semibold text-[#31505D]">
                Esta área foi separada do arquivo antigo e está pronta para receber as telas e os códigos definitivos que serão enviados para cada etapa.
              </p>
              <p className="mt-4 text-xs font-black uppercase tracking-[.12em] text-[#176487]">
                Nenhum registro ou contador fictício foi criado
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
