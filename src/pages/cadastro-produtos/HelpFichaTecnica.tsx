/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: POP-AJUDA-FICHA-TECNICA-OK
 * POP-ENG-002 — procedimento de abertura e validação de fichas técnicas.
 */
import { ArrowLeft, Cpu, ShieldCheck, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HelpFichaTecnica() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50] antialiased">
      <article className="mx-auto max-w-3xl space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-3">
          <div>
            <span className="block text-[8px] font-black uppercase tracking-widest text-teal-700">SGQ · Governança de Engenharia</span>
            <h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-ENG-002: Abertura e validação de fichas técnicas</h1>
            <p className="mt-1 text-[10px] text-slate-500">Revisão de 18/10/2026 · Procedimento operacional</p>
          </div>
          <Link to="/cadastro-produtos" className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-3 text-[10px] font-bold uppercase hover:bg-slate-50"><ArrowLeft size={12} /> Voltar ao cadastro</Link>
        </header>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Tag size={12} className="text-teal-700" /> 1. Chave estrutural SKU e prefixos</h2>
          <p className="pl-4 font-medium text-slate-600">Selecione o tipo de item e uma regra cadastrada em Regras do Código. A geração do SKU é solicitada à rotina de banco <code>erp_gerar_codigo_produto</code>; não digite nem altere manualmente a chave mestre. Em edições, o SKU existente permanece somente para leitura para preservar rastreabilidade.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><ShieldCheck size={12} className="text-emerald-700" /> 2. Empresa, acesso e persistência</h2>
          <p className="pl-4 font-medium text-slate-600">O cadastro usa a sessão autenticada e a empresa vinculada ao usuário. A autorização efetiva deve continuar garantida pelas políticas RLS e pelas permissões do banco; a interface não substitui essas proteções. Confira mensagens de erro antes de repetir uma gravação.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Cpu size={12} className="text-sky-700" /> 3. Nome, categoria e unidade de medida</h2>
          <p className="pl-4 font-medium text-slate-600">Informe o nome descritivo e a unidade base. O formulário replica a unidade informada para compra e venda. Antes de alterar unidades de produtos já movimentados, valide a regra de conversão e os impactos no estoque e no PCP.</p>
        </section>
        <ol className="list-decimal space-y-1 pl-8 text-slate-600">
          <li>Confirme a empresa e escolha o tipo de produto.</li>
          <li>Revise a regra de numeração e os campos obrigatórios.</li>
          <li>Acione “Gerar SKU e Salvar” e aguarde a confirmação.</li>
          <li>Se houver erro, não considere o registro concluído; encaminhe a mensagem para suporte.</li>
        </ol>
        <footer className="border-t pt-2 text-center text-[8px] font-mono uppercase tracking-widest text-slate-400">SYNQRA · Padrões de Engenharia · POP-ENG-002</footer>
      </article>
    </main>
  )
}
