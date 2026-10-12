import { Link } from 'react-router-dom'
import { Gauge } from 'lucide-react'
import { qualityModules } from '../features/qualidade/qualityModules'

export { qualityModules } from '../features/qualidade/qualityModules'

export default function QualidadeCentralTablet() {
  return (
    <main className="quality-central-tablet min-h-screen bg-[#EAF3F7] px-3 py-3 text-[#123B50] sm:px-4">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#48B7C7] bg-gradient-to-r from-[#123B50] via-[#175B78] to-[#2D8DB8] p-4 text-white shadow-sm">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9CE8EE]">ERP INDUSTRIAL · SGQ</p>
            <h1 className="mt-1 text-[20px] font-extrabold leading-tight">Central da Qualidade</h1>
            <p className="mt-1 text-[11px] text-[#E3F4F8]">Acesse os processos do Sistema de Gestão da Qualidade em um único painel.</p>
          </div>
          <div className="flex h-[30px] items-center gap-2 border border-[#74C8D8] bg-[#0D3448]/60 px-3 text-[10px] font-bold text-white">
            <Gauge size={14} className="text-[#9CE8EE]" /> AMBIENTE OPERACIONAL DO SGQ
          </div>
        </header>
        <section className="border border-[#B8D5E1] bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-l-4 border-[#2D8DB8] bg-[#E7F4F8] px-3 py-2">
            <div>
              <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-[#123B50]">Módulos da Qualidade</h2>
              <p className="mt-1 text-[10px] text-[#426579]">Selecione um módulo para abrir sua tela operacional.</p>
            </div>
            <span className="border border-[#2D8DB8] bg-[#2D8DB8] px-2 py-1 text-[9px] font-bold text-white">{qualityModules.length} PROCESSOS</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {qualityModules.map(({ label, description, route, icon: Icon }, index) => {
              const tones = [
                { edge: 'border-l-[#2D8DB8]', icon: 'border-[#B7DDEB] bg-[#EAF5FA] text-[#17688A]' },
                { edge: 'border-l-[#087F8C]', icon: 'border-[#B6E4DF] bg-[#E4F6F4] text-[#087F8C]' },
                { edge: 'border-l-[#3A9D78]', icon: 'border-[#BDE5CD] bg-[#E9F7EF] text-[#247A5B]' },
                { edge: 'border-l-[#E6A34A]', icon: 'border-[#F0D6A8] bg-[#FFF4E3] text-[#925A0B]' },
                { edge: 'border-l-[#8B6BC1]', icon: 'border-[#D9C9F1] bg-[#F2EDFB] text-[#6946A4]' },
                { edge: 'border-l-[#D65B61]', icon: 'border-[#F0C4C7] bg-[#FCEDEE] text-[#B33F48]' },
              ][index % 6]
              return (
                <Link key={route} to={route} className={'group flex min-h-[82px] min-w-0 items-center gap-3 border border-[#D2E0E7] border-l-[4px] ' + tones.edge + ' bg-white p-3 shadow-sm transition-all hover:-translate-y-px hover:border-[#2D8DB8] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]'}>
                  <span className={'grid h-[38px] w-[38px] shrink-0 place-items-center border ' + tones.icon}>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal text-[10px] font-extrabold leading-[1.35] text-[#17445A]">{label}</span>
                    <span className="mt-1 block whitespace-normal break-words text-[9px] leading-[1.4] text-slate-600">{description}</span>
                    <span className="mt-2 block text-[8px] font-bold uppercase tracking-wider text-[#2D8DB8]">Abrir módulo →</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#48B7C7] bg-[#123B50] px-3 py-2 text-[9px] text-[#E3F4F8]">
          <span>ERP Industrial · Central Tablet SGQ</span>
          <span>O acesso aos registros respeita a sessão, a empresa e as permissões do ERP.</span>
        </footer>
      </div>
    </main>
  )
}
