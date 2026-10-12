import { Link } from 'react-router-dom'
import { Gauge } from 'lucide-react'
import { qualityModules } from '../features/qualidade/qualityModules'

export { qualityModules } from '../features/qualidade/qualityModules'

export default function QualidadeCentralTablet() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] px-3 py-3 text-[#123B50] sm:px-4">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C8E3EE] bg-white p-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2D8DB8]">ERP INDUSTRIAL · SGQ</p>
            <h1 className="mt-1 text-[19px] font-bold leading-tight">Central da Qualidade</h1>
            <p className="mt-1 text-[11px] text-slate-600">Acesse os processos do Sistema de Gestão da Qualidade em um único painel.</p>
          </div>
          <div className="flex h-[30px] items-center gap-2 border border-[#B9DDEB] bg-white px-3 text-[10px] font-semibold text-[#17445A]">
            <Gauge size={14} className="text-[#2D8DB8]" /> Ambiente operacional do SGQ
          </div>
        </header>
        <section className="border border-[#C8E3EE] bg-white p-3">
          <h2 className="mb-1 text-[12px] font-bold">Módulos da Qualidade</h2>
          <p className="mb-3 text-[10px] text-slate-500">Selecione um módulo para abrir sua tela operacional.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {qualityModules.map(({ label, description, route, icon: Icon }) => (
              <Link key={route} to={route} className="group flex min-h-[76px] min-w-0 items-center gap-3 border border-slate-200 bg-white p-3 transition-colors hover:border-[#2D8DB8] hover:bg-[#F0F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]">
                <span className="grid h-[36px] w-[36px] shrink-0 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal text-[10px] font-bold leading-[1.35] text-[#17445A]">{label}</span>
                  <span className="mt-1 block whitespace-normal break-words text-[9px] leading-[1.4] text-slate-500">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#C8E3EE] pt-2 text-[9px] text-slate-500">
          <span>ERP Industrial · Central Tablet SGQ</span>
          <span>O acesso aos registros respeita a sessão, a empresa e as permissões do ERP.</span>
        </footer>
      </div>
    </main>
  )
}
