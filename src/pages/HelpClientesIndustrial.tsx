/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO: POP-COM-011
 * @STATUS_APROVACAO: POP-AJUDA-CLIENTES-INDUSTRIAL-OK
 */
import { Link } from 'react-router-dom'
import { ArrowLeft, CreditCard, ShieldCheck, Users, AlertTriangle } from 'lucide-react'

export default function HelpClientesIndustrial() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50]">
      <article className="mx-auto max-w-3xl space-y-4 border border-slate-200 bg-white p-5 shadow-sm">
        <header className="border-b-2 border-[#123B50] pb-3">
          <span className="block text-[9px] font-black uppercase tracking-widest text-teal-700">Comercial • Instrução operacional</span>
          <h1 className="mt-1 text-sm font-black uppercase">POP-COM-011: Parametrização comercial de clientes</h1>
          <p className="mt-1 text-[10px] text-slate-500">Revisão 2026-10-18 • Cadastro mestre de parceiros</p>
        </header>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><CreditCard size={14} /> 1. Tabela de preços e descontos</h2>
          <p className="pl-5 text-[10px] text-slate-600">Vincule a tabela comercial aprovada em <code>erp_tabelas_preco</code>. O desconto padrão é armazenado como parâmetro cadastral; a aplicação efetiva no pedido e no faturamento depende das regras comerciais implementadas nesses módulos e deve ser validada antes da emissão fiscal.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><Users size={14} /> 2. Dados cadastrais</h2>
          <p className="pl-5 text-[10px] text-slate-600">Informe razão social, CPF/CNPJ, e-mail de faturamento, telefone e segmentação. Confirme os dados com a documentação do parceiro. Use o status inativo para impedir que o registro continue sendo tratado como cadastro ativo pelas telas que respeitam esse campo.</p>
        </section>
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><ShieldCheck size={14} /> 3. Isolamento por empresa</h2>
          <p className="pl-5 text-[10px] text-slate-600">A tela identifica a empresa ativa pela RPC <code>erp_current_empresa_id</code> e aplica <code>empresa_id</code> nas consultas, alterações e exclusões. Se a empresa da sessão não for identificada ou o Supabase retornar erro, a operação deve ser interrompida e o erro corrigido antes de considerar a gravação concluída.</p>
        </section>
        <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><p><strong>Controle operacional:</strong> não presuma que o cadastro valida automaticamente documentos fiscais ou que o desconto é aplicado em todas as rotinas. Confirme as regras do pedido, tabela de preços e faturamento.</p></div>
        <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-400">
          <span>SYSNQRA • Governança comercial industrial</span>
          <Link to="/cadastros/clientes" className="inline-flex items-center gap-1 font-black text-sky-800"><ArrowLeft size={12} /> Voltar aos clientes</Link>
        </footer>
      </article>
    </main>
  )
}
