/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: POP-FIN-034
 * @STATUS: AJUDA-OPERACIONAL
 */
import { Link } from 'react-router-dom'
import { PieChart, DollarSign, AlertTriangle, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function HelpCentralCustos() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 text-[#123B50]">
      <article className="mx-auto max-w-3xl space-y-4 border border-slate-200 bg-white p-5 shadow-sm">
        <header className="border-b-2 border-[#123B50] pb-3">
          <span className="block text-[9px] font-black uppercase tracking-widest text-teal-700">Financeiro • Governança de custos</span>
          <h1 className="mt-1 text-sm font-black uppercase">POP-FIN-034: Formação de custos e markup</h1>
          <p className="mt-1 text-[10px] text-slate-500">Revisão 2026-10-18 • Central de Custos Industriais</p>
        </header>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><PieChart size={14} /> 1. Base de materiais (BOM)</h2>
          <p className="pl-5 text-[10px] leading-relaxed text-slate-600">A tela consulta os registros de <code>erp_custos_produtos</code> da empresa autenticada e usa o registro mais recente por produto, dividindo <code>materiais</code> por <code>quantidade_base</code> quando a quantidade é maior que zero. Confira a ficha técnica e a base do lote antes de considerar o valor homologado.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><DollarSign size={14} /> 2. Custos fixos e rateio</h2>
          <p className="pl-5 text-[10px] leading-relaxed text-slate-600">Os custos fixos ativos são lidos de <code>erp_custos_fixos</code> e ponderados pelo percentual de rateio para compor o indicador mensal. Esse indicador não equivale, por si só, ao custo por peça. A distribuição por produto/lote depende de um direcionador contábil aprovado, como volume produzido ou horas de máquina.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><ShieldCheck size={14} /> 3. Isolamento e gravação</h2>
          <p className="pl-5 text-[10px] leading-relaxed text-slate-600">As consultas e gravações usam o identificador retornado por <code>erp_current_empresa_id</code> e aplicam <code>empresa_id</code>. Se a empresa não for identificada, a tela deve interromper a operação. Erros do Supabase devem ser corrigidos antes de tratar qualquer registro como salvo.</p>
        </section>
        <section className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><p><strong>Atenção:</strong> o preço sugerido é uma simulação de custo planejado com markup. Não substitui validação fiscal, comercial, engenharia, nem a aprovação formal da política de rateio fixo.</p></section>
        <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-400"><span>SYSNQRA • Governança financeira industrial</span><Link to="/central-custos-industrial" className="inline-flex items-center gap-1 font-black text-sky-800"><ArrowLeft size={12} /> Voltar à central</Link></footer>
      </article>
    </main>
  )
}
