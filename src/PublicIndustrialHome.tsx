import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ClipboardCheck,
  Factory,
  FileText,
  Gauge,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'

type EcosystemQuadrant = {
  title: string
  eyebrow: string
  icon: typeof Factory
  items: Array<{ title: string; description: string; route: string }>
}

const quadrants: EcosystemQuadrant[] = [
  {
    eyebrow: '01 · CORE COMERCIAL',
    title: 'Comercial conectado',
    icon: Receipt,
    items: [
      { title: 'Robô Leitor de XML do Outlook', description: 'Entrada documental conectada ao fluxo comercial e fiscal.', route: '/recebimento-materiais' },
      { title: 'Carteira Geral em linhas touch', description: 'Pedidos e compromissos comerciais em grade operacional de alta densidade.', route: '/vendas/carteira' },
      { title: 'Matriz de Vínculos De-Para', description: 'Relacionamento controlado entre clientes, códigos e referências internas.', route: '/clientes' },
    ],
  },
  {
    eyebrow: '02 · MOTOR PCP CENTRAL',
    title: 'Planejamento e produção',
    icon: Factory,
    items: [
      { title: 'Explosão de Receitas Técnicas (BOM)', description: 'Estruturas e componentes para transformar engenharia em necessidade produtiva.', route: '/engenharia/revisoes-bom' },
      { title: 'Capacidade para Prensa Dupla', description: 'Visão de capacidade e operação sincronizada para planejamento industrial.', route: '/pcp' },
      { title: 'Sequenciamento Linear Gantt', description: 'Programação operacional orientada a capacidade, máquina e ordem.', route: '/pcp' },
    ],
  },
  {
    eyebrow: '03 · SGQ AVANÇADO',
    title: 'Qualidade e rastreabilidade',
    icon: ClipboardCheck,
    items: [
      { title: 'Travas de Calibração RBC', description: 'Instrumentos vencidos ou não aprovados impedem apontamentos críticos.', route: '/qualidade/instrumentos' },
      { title: 'Editor de ITs e Obsoletos', description: 'Revisões controladas, assinatura e histórico de documentos.', route: '/qualidade/editor-it' },
      { title: 'Laudo de Embalagem com bloqueio fiscal', description: 'Conferência operacional conectada às regras de expedição e fiscal.', route: '/qualidade/liberacao-lote' },
    ],
  },
  {
    eyebrow: '04 · MANUTENÇÃO INDUSTRIAL TPM',
    title: 'Ativos e confiabilidade',
    icon: Wrench,
    items: [
      { title: 'O.S. reativa direto do tablet', description: 'Abertura de ocorrência de quebra a partir do chão de fábrica.', route: '/manutencao/ordens' },
      { title: 'Estoque de peças', description: 'Disponibilidade de componentes para intervenções e manutenção.', route: '/estoque' },
      { title: 'MTTR / MTBF', description: 'Indicadores de manutenção para acompanhar confiabilidade e recuperação.', route: '/manutencao/ordens' },
    ],
  },
]

const proofCards = [
  { title: 'PCP', value: 'Planejar → Programar → Produzir', icon: Factory },
  { title: 'SGQ', value: 'Medir → Inspecionar → Liberar', icon: ShieldCheck },
  { title: 'Estoque', value: 'Receber → Rastrear → Expedir', icon: Boxes },
  { title: 'Indicadores', value: 'OEE → MTTR → MTBF', icon: BarChart3 },
]

export default function PublicIndustrialHome() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .industrial-public * { box-sizing: border-box; }
        .industrial-public a { text-decoration: none; }
        .industrial-public .touch { min-height: 54px; }
        .industrial-public .quadrant-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .industrial-public .quadrant-card:hover { transform: translateY(-3px); box-shadow: 0 22px 55px rgba(15,23,42,.10); border-color: #94a3b8; }
      `}</style>

      <div className="industrial-public">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <a href="/" className="flex items-center gap-3" aria-label="SGQ ERP Industrial">
              <img src="/logo-industrial.svg" alt="SGQ ERP Industrial" className="h-11 w-auto max-w-[170px] object-contain" />
              <span className="hidden border-l border-slate-200 pl-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 lg:block">
                ERP Industrial
              </span>
            </a>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação pública">
              <a className="touch inline-flex items-center rounded-lg px-4 text-sm font-bold text-slate-700 hover:bg-slate-100" href="#ecossistema">Ecossistema</a>
              <a className="touch inline-flex items-center rounded-lg px-4 text-sm font-bold text-slate-700 hover:bg-slate-100" href="#fluxo">Fluxo</a>
              <a className="touch inline-flex items-center rounded-lg px-4 text-sm font-bold text-slate-700 hover:bg-slate-100" href="#planos">Planos</a>
              <a className="touch inline-flex items-center rounded-lg px-4 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/contato">Contato</a>
            </nav>

            <div className="flex items-center gap-2">
              <a href="/login" className="touch inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 hover:bg-slate-50">
                Entrar
              </a>
              <a href="/cadastro-empresa" className="touch hidden items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-700 sm:inline-flex">
                Começar agora <ArrowRight className="ml-2" size={16} />
              </a>
            </div>
          </div>
        </header>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
            <div className="flex flex-col justify-center">
              <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-800">
                SGQ ERP INDUSTRIAL · ECOSSISTEMA COMPLETO
              </span>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Controle industrial do planejamento ao resultado.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                Uma arquitetura única para comercial, PCP, chão de fábrica, qualidade, estoque, expedição e manutenção.
                Dados operacionais reais alimentam a gestão sem depender de telas demonstrativas ou indicadores inventados.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="/cadastro-empresa" className="touch inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 font-black text-white shadow-lg shadow-blue-900/10 hover:bg-blue-700">
                  Conhecer o ERP <ArrowRight className="ml-2" size={18} />
                </a>
                <a href="#ecossistema" className="touch inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 font-black text-slate-900 hover:bg-slate-50">
                  Ver os 4 motores
                </a>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {proofCards.map(({ title, value, icon: Icon }) => (
                  <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
                        <Icon size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-3 shadow-2xl shadow-slate-900/10">
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">VISÃO OPERACIONAL</p>
                    <h2 className="mt-1 text-xl font-black text-white">Uma cadeia, vários controles.</h2>
                  </div>
                  <Gauge className="text-sky-400" size={26} />
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    ['ENGENHARIA', 'BOM + revisão + ficha de processo'],
                    ['PCP', 'Capacidade + Gantt + ordens'],
                    ['CHÃO DE FÁBRICA', 'Produção + refugo + instrumentos'],
                    ['SGQ', 'RNC + documentos + calibração'],
                    ['EXPEDIÇÃO', 'Carga + portaria + rastreabilidade'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex min-h-[54px] items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4">
                      <span className="text-xs font-black text-slate-400">{label}</span>
                      <span className="text-right text-sm font-bold text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ecossistema" className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">ECOSSISTEMA INDUSTRIAL</span>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Quatro motores que trabalham sobre a mesma operação.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                Cada quadrante abaixo aponta para a tela operacional correspondente. A navegação leva para o módulo real do ERP.
              </p>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-2">
              {quadrants.map(({ eyebrow, title, icon: Icon, items }) => (
                <article key={title} className="quadrant-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{eyebrow}</span>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">{title}</h3>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-blue-700">
                      <Icon size={24} />
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {items.map((item) => (
                      <a key={item.title} href={item.route} className="touch group rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-300 hover:bg-blue-50">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-black text-slate-900">{item.title}</h4>
                            <p className="mt-1 text-sm leading-6 text-slate-700">{item.description}</p>
                          </div>
                          <ArrowRight className="shrink-0 text-slate-400 group-hover:text-blue-700" size={18} />
                        </div>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fluxo" className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-3">
              {[
                ['01', 'Planejar', 'Engenharia, BOM, capacidade e programação formam a base da execução.', Factory],
                ['02', 'Executar', 'O operador registra produção, perdas, instrumento e evidências no chão de fábrica.', PackageCheck],
                ['03', 'Controlar', 'Qualidade, manutenção, estoque, fiscal e indicadores recebem os mesmos eventos.', ShieldCheck],
              ].map(([number, title, description, Icon]) => {
                const FlowIcon = Icon as typeof Factory
                return (
                  <article key={String(number)} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <span className="text-sm font-black text-blue-700">{number}</span>
                    <FlowIcon className="mt-5 text-slate-700" size={25} />
                    <h3 className="mt-3 text-xl font-black text-slate-950">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{String(description)}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="planos" className="bg-slate-900 py-16 text-white">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">COMERCIAL</span>
              <h2 className="mt-2 text-3xl font-black">Compare os planos industriais no catálogo real.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">A tela de planos consulta o catálogo ativo do ERP, sem preços ou módulos fictícios.</p>
            </div>
            <a href="/planos" className="touch inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-6 font-black text-white hover:bg-blue-700">
              Abrir planos <ArrowRight className="ml-2" size={18} />
            </a>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex items-center gap-3">
              <img src="/logo-industrial.svg" alt="SGQ ERP Industrial" className="h-9 w-auto" />
              <span className="text-xs font-bold text-slate-600">Operação industrial conectada.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
              <a href="/contato" className="hover:text-slate-950">Contato</a>
              <a href="/blog" className="hover:text-slate-950">Blog</a>
              <a href="/login" className="hover:text-slate-950">Entrar</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
