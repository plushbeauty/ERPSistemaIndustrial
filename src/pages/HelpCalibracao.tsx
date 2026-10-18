/**
 * REV-MET-HELP-001 | 2026-10-18
 * POP-QUAL-014 — orientação de uso da gestão metrológica.
 * Esta página é informativa; autorização, status e gravações continuam no fluxo
 * existente de Qualidade/Supabase e nas políticas RLS do projeto.
 */
import { HeartPulse, MapPin, ShieldCheck, Wrench } from 'lucide-react'

const sections = [
  {
    title: 'Matriz de status metrológico',
    icon: HeartPulse,
    items: [
      ['Verde — apto', 'Instrumento com status APROVADO e próxima calibração válida. Confirme também o certificado e os critérios técnicos antes do uso.'],
      ['Vermelho — vencido', 'A data de próxima calibração é anterior à data atual. Retire o instrumento de uso e encaminhe para avaliação.'],
      ['Laranja — a vencer', 'Quando estiver dentro da janela de alerta definida pela rotina, planeje a calibração antes do vencimento.'],
      ['Azul — manutenção', 'Instrumento indisponível para uso até a conclusão e registro da manutenção.'],
      ['Cinza — desativado', 'Instrumento retirado de operação; preserve o histórico para rastreabilidade.'],
    ],
  },
  {
    title: 'Rastreabilidade e armazenamento',
    icon: MapPin,
    items: [
      ['Setor responsável', 'Registre o setor que mantém a custódia do instrumento.'],
      ['Local físico', 'Registre armário, gaveta ou local de guarda no cadastro quando o campo estiver disponível no esquema implantado. Não invente localização quando desconhecida.'],
      ['Histórico', 'Consulte certificados, datas, resultados, revisões e laboratório. Registros históricos devem manter o vínculo com o instrumento e a empresa.'],
    ],
  },
  {
    title: 'Registro seguro de calibração',
    icon: ShieldCheck,
    items: [
      ['Dados obrigatórios', 'Informe certificado e data da calibração; a próxima data não pode anteceder a calibração atual.'],
      ['Resultado', 'Registre o resultado real do laudo. Resultado reprovado exige bloqueio conforme o procedimento da qualidade.'],
      ['Persistência', 'Use a ação de registro já existente. Se a gravação falhar, não considere a calibração concluída; confira a mensagem e o histórico antes de tentar novamente.'],
    ],
  },
]

export default function HelpCalibracao() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 text-[#123B50]">
      <div className="mx-auto max-w-4xl space-y-3">
        <header className="border-b-2 border-[#123B50] pb-3">
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#2D8DB8]">SGQ • Manual de treinamento metrológico</p>
          <h1 className="mt-1 text-base font-black uppercase">POP-QUAL-014 — Gestão e calibração de instrumentos</h1>
          <p className="mt-1 text-xs text-slate-600">Orientação operacional para paquímetros, micrômetros e demais instrumentos de medição.</p>
        </header>
        {sections.map(section => {
          const Icon = section.icon
          return (
            <section key={section.title} className="border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase text-slate-800">
                <Icon size={15} aria-hidden="true" /> {section.title}
              </h2>
              <div className="divide-y divide-slate-100">
                {section.items.map(([title, description]) => (
                  <div key={title} className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
                    <p className="text-[10px] font-bold">{title}</p>
                    <p className="text-[11px] leading-relaxed text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
        <footer className="flex items-center gap-2 border-t border-slate-200 pt-2 text-[9px] text-slate-500">
          <Wrench size={13} aria-hidden="true" />
          Procedimento de apoio. Em caso de divergência, prevalecem o certificado de calibração, o procedimento interno vigente e os registros autorizados do SGQ.
        </footer>
      </div>
    </main>
  )
}
