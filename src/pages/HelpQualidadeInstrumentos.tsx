/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @STATUS_APROVACAO: POP-AJUDA-INSTRUMENTOS-METROLOGIA-EM-REVISAO
 * @SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 */
import { BookOpen, CheckCircle2, Clock3, Scale, ShieldCheck } from 'lucide-react'
import VendasLayout from './VendasLayout'

const sections = [
  {
    title: '1. Cadastro e identificação',
    icon: Scale,
    items: [
      'Use um Código/TAG único e uma descrição que identifique o instrumento sem ambiguidade.',
      'Registre fabricante, modelo, número de série, faixa de medição, resolução e unidade quando aplicáveis.',
      'Informe setor, responsável e rastreabilidade do padrão para facilitar a localização e a auditoria.',
    ],
  },
  {
    title: '2. Plano de calibração',
    icon: Clock3,
    items: [
      'Informe a última calibração e o intervalo em dias definido pelo plano metrológico aprovado.',
      'A prévia calcula a próxima data a partir da última calibração e do intervalo; uma data manual informada prevalece na gravação.',
      'A próxima calibração não pode anteceder a última calibração. Confirme também a validade do certificado.',
    ],
  },
  {
    title: '3. Liberação para uso',
    icon: ShieldCheck,
    items: [
      'Instrumentos vencidos, bloqueados ou sem validade confirmada não devem ser usados para liberar produto.',
      'Use o status APROVADO somente após verificar certificado, rastreabilidade e critérios técnicos aplicáveis.',
      'Se houver dúvida, bloqueie o instrumento e encaminhe para o responsável da Qualidade/Metrologia.',
    ],
  },
  {
    title: '4. Gravação e rastreabilidade',
    icon: CheckCircle2,
    items: [
      'Os registros são consultados e gravados no Supabase, vinculados à empresa da sessão autenticada.',
      'A alteração de um cadastro atualiza o registro existente; bloquear preserva o registro para rastreabilidade.',
      'Após salvar, confirme a mensagem de retorno e verifique a linha atualizada na grade.',
    ],
  },
]

export default function HelpQualidadeInstrumentos() {
  return (
    <VendasLayout title="POP • Ajuda de Metrologia" subtitle="Orientação operacional para cadastro, calibração e rastreabilidade">
      <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] antialiased md:p-4">
        <div className="mx-auto max-w-5xl border border-[#C8E3EE] bg-white shadow-sm">
          <header className="border-b-2 border-[#123B50] bg-[#E8F4F9] p-4">
            <span className="block text-[9px] font-black uppercase tracking-[.16em] text-teal-800">SGQ • GOVERNANÇA METROLÓGICA INDUSTRIAL</span>
            <h1 className="mt-1 text-base font-black uppercase text-[#123B50]">POP-CQ-088: Calibração e rastreabilidade de instrumentos</h1>
            <p className="mt-1 text-[11px] text-slate-600">Guia operacional para paquímetros, micrômetros, balanças e demais instrumentos de medição.</p>
          </header>
          <div className="grid gap-3 p-3 md:grid-cols-2">
            {sections.map(section => {
              const Icon = section.icon
              return <section key={section.title} className="border border-[#C8E3EE] p-3">
                <h2 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase text-[#123B50]"><Icon size={14} className="text-teal-700"/>{section.title}</h2>
                <ul className="list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-slate-600">
                  {section.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </section>
            })}
          </div>
          <footer className="border-t border-[#C8E3EE] px-3 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-widest text-slate-400">
            MOLDPLÁS ERP INDUSTRIAL • METROLOGIA E ENGENHARIA DA QUALIDADE • REVISÃO 19/10/2026
          </footer>
        </div>
      </main>
    </VendasLayout>
  )
}
