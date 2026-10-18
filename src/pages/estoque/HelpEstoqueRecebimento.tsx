/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: POP-EST-012-01
 * @STATUS: AJUDA_OPERACIONAL_RECEBIMENTO
 * @ESCOPO: procedimento operacional para recebimento de insumos e rastreabilidade de laudos.
 */
import { ArrowLeft, FileCheck, Inbox, Scale, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HelpEstoqueRecebimento() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] md:p-5">
      <article className="mx-auto max-w-3xl space-y-4 border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-3">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-teal-700">SGQ · Manual de recebimento do Almoxarifado</span>
            <h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-EST-012: Conferência e entrada de lotes</h1>
            <p className="mt-1 text-[10px] text-slate-500">Procedimento operacional de recebimento, conferência documental e rastreabilidade.</p>
          </div>
          <Link to="/estoque/recebimento-lotes" className="inline-flex h-8 items-center gap-1 border border-slate-300 px-2.5 text-[10px] font-bold hover:bg-slate-50"><ArrowLeft size={13} /> Voltar ao recebimento</Link>
        </header>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase"><Inbox size={14} className="text-teal-700" /> 1. Conferência de identificação</h2>
          <p className="pl-5 text-xs leading-relaxed text-slate-600">Confirme o produto pelo cadastro mestre, informe a NF-e de entrada e registre exatamente o identificador do lote informado pelo fornecedor. A quantidade deve ser positiva e coerente com a unidade de medida cadastrada.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase"><FileCheck size={14} className="text-teal-700" /> 2. Certificado de análise</h2>
          <p className="pl-5 text-xs leading-relaxed text-slate-600">Anexe o certificado em PDF com até 25 MB. Confira se o documento corresponde ao produto e ao lote recebido antes de efetivar a operação. O caminho de armazenamento é organizado pelo identificador da empresa autenticada.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase"><ShieldAlert size={14} className="text-rose-700" /> 3. Tratamento de laudo reprovado</h2>
          <p className="pl-5 text-xs leading-relaxed text-slate-600">Um laudo reprovado deve permanecer retido e não pode ser integrado ao saldo ativo por este fluxo. Siga o procedimento interno de segregação e abra o registro de não conformidade conforme as regras do SGQ. A validação de interface não substitui a validação obrigatória no banco de dados.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase"><Scale size={14} className="text-teal-700" /> 4. Efetivação e conferência</h2>
          <p className="pl-5 text-xs leading-relaxed text-slate-600">A integração depende da RPC transacional <code>fn_receber_lote_almoxarifado</code>. Se houver erro, não repita a operação sem verificar o estado do lote, o registro no estoque e o anexo no Storage. Encaminhe falhas persistentes ao responsável técnico.</p>
        </section>
        <footer className="border-t border-slate-200 pt-3 text-[9px] font-mono uppercase tracking-wide text-slate-400">ERP Industrial · POP-EST-012 · Revisão 2026-10-18</footer>
      </article>
    </main>
  )
}
