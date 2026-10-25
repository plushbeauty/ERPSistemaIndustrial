/**
 * REV-CENTRAIS-032 | 2026-10-18
 * STATUS: POP DE APOIO — CENTRAIS INDUSTRIAIS
 */
import { AlertTriangle, ClipboardCheck, DollarSign, ShieldCheck, Truck } from 'lucide-react'

export default function HelpCentraisIndustriais() {
  return <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50]">
    <article className="mx-auto max-w-3xl space-y-4 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
      <header className="border-b-2 border-[#123B50] pb-3"><span className="block text-[9px] font-black uppercase tracking-widest text-teal-700">SGQ • MANUAL OPERACIONAL MULTISSETOR</span><h1 className="mt-1 text-base font-black uppercase text-slate-900">POP-IND-090 — Operação das Centrais Industriais</h1><p className="mt-1 text-[10px] text-slate-500">Revisão 00 · 18/10/2026</p></header>
      <section className="space-y-1"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><AlertTriangle size={14} className="text-red-600"/> 1. Refugo e retrabalho: rastreabilidade</h2><p className="pl-6 text-[10px] text-slate-600">Os registros de refugo são consultados na empresa autorizada pela sessão. O produto é resolvido por uma consulta separada ao cadastro mestre, filtrada pela empresa, para não depender de um relacionamento PostgREST que talvez não exista. Quando o produto não estiver vinculado, a tela apresenta a OP e sinaliza a ausência do vínculo; não inventa SKU nem descrição.</p></section>
      <section className="space-y-1"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><DollarSign size={14} className="text-teal-700"/> 2. Custos e indicadores</h2><p className="pl-6 text-[10px] text-slate-600">Os valores e quantidades exibidos são os registrados no banco. O KPI não recalcula custo industrial nem substitui a análise de Engenharia, PCP ou Controladoria. Confira unidade, quantidade, motivo e regra de custo antes de usar o dado em decisões.</p></section>
      <section className="space-y-1"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><Truck size={14}/> 3. Expedição e financeiro</h2><p className="pl-6 text-[10px] text-slate-600">Novas contas e expedições são gravadas somente para o perfil com empresa identificada e dependem das permissões RLS do banco. A tela não deve contornar bloqueios de política nem tratar falha de gravação como sucesso.</p></section>
      <section className="space-y-1"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><ClipboardCheck size={14}/> 4. Módulo Materiais</h2><p className="pl-6 text-[10px] text-slate-600">A origem correta da tabela de estoque precisa ser confirmada antes de habilitar a consulta. Enquanto não houver contrato de dados validado, a central informa o bloqueio em vez de mostrar dados de auditoria como se fossem materiais.</p></section>
      <footer className="flex gap-2 border-t border-slate-200 pt-3 text-[10px] text-slate-500"><ShieldCheck size={14} className="shrink-0"/> Revisão técnica: 2026-10-18. Não substitui instruções controladas, autorização de acesso nem validação de dados do SGQ.</footer>
    </article>
  </main>
}
