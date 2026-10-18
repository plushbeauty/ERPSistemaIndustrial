/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: POP-AJUDA-FICHA-PCP-OK
 * POP-PCP-044 — apoio operacional para parâmetros térmicos e inspeção de ferramental.
 */
import { ArrowRight, ImageIcon, ShieldCheck, Thermometer } from 'lucide-react'
import { Link } from 'react-router-dom'

const sectionTitle = 'flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[#123B50]'

export default function HelpPCPFichas() {
  return <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50] antialiased">
    <article className="mx-auto max-w-3xl space-y-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="border-b-2 border-[#123B50] pb-3">
        <span className="block text-[8px] font-black uppercase tracking-[.18em] text-teal-700">SGQ · Diretrizes de engenharia de fabricação</span>
        <h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-PCP-044 · Parametrização térmica e inspeção visual de ferramentais</h1>
        <p className="mt-1 text-[10px] text-slate-500">Instrução operacional para consulta antes do setup e da liberação da máquina.</p>
      </header>
      <section className="space-y-2">
        <h2 className={sectionTitle}><Thermometer size={14} className="text-rose-600"/> 1. Perfil térmico em sequência</h2>
        <p className="pl-5 text-slate-600">As quatro células do canhão representam Zona 01 (traseira), Zona 02 (intermediária), Zona 03 (frontal) e Bico/Injeção. Os campos têm altura compacta de 32 px e seguem a ordem física do fluxo. Os valores devem vir da receita homologada para o polímero, máquina e molde em uso.</p>
        <div className="ml-5 grid grid-cols-4 gap-1">{['Zona 01','Zona 02','Zona 03','Bico'].map((x,i)=><div key={x} className="border border-slate-700 bg-[#142633] p-2 text-center text-[9px] font-black text-white"><span className="block text-slate-400">0{i+1}</span>{x}</div>)}</div>
        <p className="pl-5 text-slate-600">Não copie valores genéricos como parâmetro de produção. Confirme faixa permitida, setpoint versus medição real, tempo de residência, secagem e sinais de degradação antes de iniciar o lote.</p>
      </section>
      <section className="space-y-2">
        <h2 className={sectionTitle}><ImageIcon size={14} className="text-teal-700"/> 2. Dossiê de quatro vistas do molde</h2>
        <p className="pl-5 text-slate-600">Selecione o molde cadastrado e anexe as imagens na ordem fixa das abas: (1) Cavidade, (2) Extrator, (3) Lado fixo e (4) Lado móvel. O sistema grava os anexos no Storage privado e vincula-os ao cadastro de molde pela tabela de anexos existente. Confira código do molde, cavidades e condição física; uma foto não substitui inspeção presencial nem checklist de segurança.</p>
        <div className="ml-5 grid grid-cols-2 gap-1 sm:grid-cols-4">{['Cavidade','Extrator','Lado fixo','Lado móvel'].map((x,i)=><div key={x} className="border border-slate-200 bg-slate-50 p-2"><span className="block text-[8px] font-black text-sky-700">VISTA 0{i+1}</span><span className="text-[9px] font-bold">{x}</span></div>)}</div>
      </section>
      <section className="space-y-2">
        <h2 className={sectionTitle}><ShieldCheck size={14} className="text-emerald-700"/> 3. Homologação, segurança e rastreabilidade</h2>
        <p className="pl-5 text-slate-600">Preencha ficha, produto, ferramenta, máquina, revisão e os parâmetros obrigatórios. A data de homologação exige assinatura técnica. Salvar a ficha não significa que a máquina foi automaticamente liberada: aplique o procedimento de primeira peça, inspeção da qualidade, proteções, bloqueio/etiquetagem e aprovação responsável.</p>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[8px] font-mono uppercase tracking-widest text-slate-400">
        <span>SYSNQRA · PCP / Engenharia · POP-PCP-044</span>
        <Link to="/pcp/fichas-processo" className="inline-flex h-8 items-center gap-1 border border-slate-300 px-2 font-sans font-bold tracking-normal text-[#123B50] hover:bg-slate-50">Voltar à ficha <ArrowRight size={12}/></Link>
      </footer>
    </article>
  </main>
}
