import { Box, ClipboardList, PackageCheck, Scissors, ShieldCheck, Sparkles, Wrench } from 'lucide-react'

const equipment = [
  { name: 'Tesoura de corte', area: 'Acabamento', tempo: '8 min', status: 'Pronta', icon: Scissors },
  { name: 'Estilete industrial', area: 'Acabamento', tempo: '6 min', status: 'Em uso', icon: Wrench },
  { name: 'Ponta de tesoura', area: 'Ferramenta', tempo: '5 min', status: 'OK', icon: Sparkles },
  { name: 'Embalagem primária', area: 'Embalagem', tempo: '3 min', status: 'Pronta', icon: PackageCheck },
  { name: 'Proteção / etiquetas', area: 'Embalagem', tempo: '2 min', status: 'OK', icon: ShieldCheck },
  { name: 'Inspeção final', area: 'Qualidade', tempo: '4 min', status: 'A confirmar', icon: ClipboardList },
]

const summary = [
  { label: 'Tempo total', value: '28 min', tone: 'bg-sky-50 text-sky-700' },
  { label: 'Ciclo do processo', value: '3.2 min/peça', tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'Equipamentos', value: '6 itens', tone: 'bg-amber-50 text-amber-700' },
  { label: 'Conformidade', value: '97%', tone: 'bg-violet-50 text-violet-700' },
]

export default function AcabamentoEmbalagem() {
  return (
    <main className="min-h-full bg-transparent p-1 text-slate-800">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-700">PCP • Embalagem e acabamento</p>
              <h1 className="mt-1 text-[28px] font-black tracking-[-0.06em] text-slate-900">Acabamento / embalagem da peça</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase text-slate-700">
              <Box size={12} /> Processo ativo
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${item.tone}`}>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-75">{item.label}</div>
              <div className="mt-3 text-[24px] font-black tracking-[-0.05em]">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-black tracking-[-0.05em] text-slate-900">Tipos de equipamento por etapa</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">6 ferramentas</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {equipment.map(({ name, area, tempo, status, icon: Icon }) => (
              <article key={name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-sky-700 shadow-sm">
                    <Icon size={18} />
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                    {status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{area}</div>
                  <h3 className="mt-2 text-[18px] font-black tracking-[-0.05em] text-slate-900">{name}</h3>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm">
                  <span>Tempo estimado</span>
                  <span className="font-black text-slate-900">{tempo}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-[18px] font-black tracking-[-0.05em] text-slate-900">Fluxo operacional</h2>

            <div className="mt-4 space-y-3">
              {[
                ['1', 'Preparação da peça', 'Verificação da matéria-prima, limpeza e alinhamento da peça.'],
                ['2', 'Acabamento', 'Corte, ajuste, rebarba e acabamento conforme desenho técnico.'],
                ['3', 'Embalagem', 'Proteção, embalagem primária e etiquetagem final.'],
                ['4', 'Inspeção final', 'Validação visual e conformidade do produto para expedição.'],
              ].map(([step, title, description]) => (
                <div key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-600 text-[11px] font-black text-white">{step}</div>
                  <div>
                    <div className="text-[12px] font-black text-slate-900">{title}</div>
                    <div className="mt-1 text-[10px] text-slate-600">{description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-[18px] font-black tracking-[-0.05em] text-slate-900">Controle de qualidade</h2>
            <div className="mt-4 space-y-3">
              {[
                ['Aferição visual', 'OK'],
                ['Dimensão final', 'OK'],
                ['Acabamento superficial', 'Revisar'],
                ['Embalagem final', 'OK'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-[11px] font-bold text-slate-700">{label}</span>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${value === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
