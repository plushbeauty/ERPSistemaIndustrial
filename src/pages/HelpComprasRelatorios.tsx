/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @HORA_REVISAO: 19:20 America/Sao_Paulo
 * @REVISAO: POP-SUP-098-R1
 * @STATUS_APROVACAO: POP-AJUDA-RELATORIOS-COMPRAS-OK
 */
import { BarChart3, ShieldCheck, DollarSign } from 'lucide-react'

export default function HelpComprasRelatorios() {
  return <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50] antialiased">
    <article className="mx-auto max-w-2xl space-y-4 border border-slate-200 bg-white p-6 shadow-sm">
      <header className="border-b-2 border-slate-800 pb-2"><span className="block text-[8px] font-black uppercase tracking-widest text-teal-700">SGQ • Governança de compras</span><h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-SUP-098: Escalas e filtros de gráficos de suprimentos</h1><p className="mt-1 text-[9px] text-slate-500">Revisão R1 · 18/10/2026 · 19:20 (America/Sao_Paulo)</p></header>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><BarChart3 size={13}/>1. Escalas dos gráficos</h2><p className="pl-4 font-medium text-slate-600">Os gráficos devem manter eixos legíveis em telas menores. Valores financeiros podem ser abreviados no eixo em milhares (k), enquanto a dica de ferramenta apresenta o valor integral em reais. Os dados agregados respeitam a empresa identificada pela sessão autenticada.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><ShieldCheck size={13}/>2. Auditoria fiscal</h2><p className="pl-4 font-medium text-slate-600">O indicador de bloqueios contabiliza pedidos cujo campo fiscal_status tem o valor BLOQUEADO. Esse indicador é uma sinalização operacional; não substitui a validação documental pelo setor fiscal nem presume que outros status representem conformidade.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><DollarSign size={13}/>3. Leitura dos totais</h2><p className="pl-4 font-medium text-slate-600">O total exibido considera os pedidos que permanecem após o filtro de pesquisa. Para auditoria, compare o período, o status e o fornecedor antes de exportar ou imprimir a visão.</p></section>
      <footer className="border-t pt-2 text-center text-[8px] font-mono uppercase tracking-widest text-slate-400">SYSNQRA Procurement BI · Revisão R1 · 2026</footer>
    </article>
  </main>
}
