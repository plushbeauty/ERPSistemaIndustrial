/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: POP-COM-011-R2
 * @STATUS_APROVACAO: AJUDA-CNPJ-CLIENTES-IMPLEMENTADA-PENDENTE-CI
 * @ESCOPO: consulta pública de CNPJ, conferência humana, cadastro comercial e isolamento por empresa.
 */
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, CreditCard, ShieldCheck, Users, AlertTriangle, SearchCode } from 'lucide-react'

export default function HelpClientesIndustrial() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50]">
      <article className="mx-auto max-w-3xl space-y-4 border border-slate-200 bg-white p-5 shadow-sm">
        <header className="flex items-start justify-between gap-3 border-b-2 border-[#123B50] pb-3">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-teal-700">Comercial • Instrução operacional</span>
            <h1 className="mt-1 text-sm font-black uppercase">POP-COM-011: Cadastro mestre e consulta de CNPJ</h1>
            <p className="mt-1 text-[10px] text-slate-500">Revisão 2026-10-18 • Consulta externa não substitui validação documental</p>
          </div>
          <Link to="/clientes" className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[2px] border border-slate-300 px-2 text-[10px] font-bold"><ArrowLeft size={12} /> CLIENTES</Link>
        </header>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><SearchCode size={14} /> 1. Consulta pública de CNPJ</h2>
          <p className="pl-5 text-[10px] text-slate-600">No painel lateral, informe os 14 dígitos do CNPJ e acione “Buscar CNPJ na BrasilAPI”. A tela consulta o endpoint público da BrasilAPI e pode preencher razão social, nome fantasia, e-mail, telefone e um código sugerido. A disponibilidade e a atualidade dependem do serviço externo.</p>
          <p className="pl-5 text-[10px] text-slate-600">Antes de salvar, confira todos os campos com os documentos recebidos do cliente. A consulta não comprova identidade do solicitante, poderes de representação, situação fiscal atual nem autorização para conceder crédito.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><Building2 size={14} /> 2. Conferência e manutenção da ficha</h2>
          <p className="pl-5 text-[10px] text-slate-600">A razão social é obrigatória. Revise o nome fantasia, o documento, os canais de contato, a segmentação e a situação do cadastro. Se a consulta estiver indisponível, os dados podem ser informados manualmente e revisados antes da gravação.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><CreditCard size={14} /> 3. Política comercial</h2>
          <p className="pl-5 text-[10px] text-slate-600">A tabela de preços e o desconto padrão ficam vinculados ao cadastro do cliente. O desconto precisa permanecer entre 0% e 100%. A concessão comercial deve respeitar as alçadas internas e não substitui a validação de preço e margem no pedido.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><ShieldCheck size={14} /> 4. Isolamento e segurança</h2>
          <p className="pl-5 text-[10px] text-slate-600">A tela resolve a empresa a partir da sessão autenticada usando a RPC erp_current_empresa_id e restringe consultas, alterações e exclusões por empresa_id. As políticas RLS do banco continuam sendo a barreira de segurança efetiva; não compartilhe credenciais nem dados de clientes fora dos canais autorizados.</p>
        </section>
        <aside className="flex gap-2 border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>A BrasilAPI é um serviço externo. Não dependa dela como fonte única para decisões fiscais, crédito ou contratação. Confirme as informações com a documentação oficial e os procedimentos internos.</p>
        </aside>
        <footer className="flex items-center gap-2 border-t border-slate-200 pt-3 text-[9px] font-mono uppercase tracking-wide text-slate-400"><Users size={12} /> ERP Industrial • POP comercial • Revisão 2</footer>
      </article>
    </main>
  )
}
