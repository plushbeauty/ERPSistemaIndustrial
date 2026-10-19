/**
 * REV-COM-027 | 2026-10-18
 * STATUS: POP DE SUPORTE — CATÁLOGO DIGITAL DO CLIENTE
 */
import { CheckCircle2, FileText, Image, MessageCircle, ShieldCheck, ShoppingBag } from 'lucide-react'

export default function HelpCatalogoDigitalCliente() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 text-[#123B50] antialiased">
      <article className="mx-auto max-w-3xl space-y-4 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
        <header className="border-b-2 border-[#123B50] pb-3">
          <span className="text-[8px] font-black uppercase tracking-[.18em] text-teal-700">COMERCIAL • INSTRUÇÃO DE SUPORTE AO COMPRADOR</span>
          <h1 className="mt-1 text-base font-black uppercase">POP-COM-025 — Operação da vitrine de produtos web</h1>
          <p className="mt-1 text-[10px] text-slate-500">Revisão 00 · 18/10/2026 · Documento de orientação operacional</p>
        </header>
        <section className="space-y-1">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><Image size={14}/> 1. Fotos e cadastro do produto</h2>
          <p className="pl-6 text-[10px] leading-relaxed text-slate-600">A vitrine consulta produtos ativos e publicados no catálogo da empresa autenticada. A imagem é lida do campo foto_url do cadastro de produtos. Se a foto não aparecer, confira se ela está cadastrada, se a URL é acessível pela sessão e se o produto está ativo e publicado. Não crie imagens fictícias para preencher a ficha.</p>
        </section>
        <section className="space-y-1">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><ShoppingBag size={14}/> 2. Seleção e solicitação de cotação</h2>
          <p className="pl-6 text-[10px] leading-relaxed text-slate-600">O usuário pode adicionar itens à sacola, ajustar quantidades e conferir um subtotal estimado. A ação final prepara uma mensagem com código, descrição e quantidade para o contato comercial cadastrado. O envio depende do telefone configurado e do acesso ao WhatsApp; confira o destinatário antes de concluir a conversa.</p>
        </section>
        <section className="space-y-1">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><ShieldCheck size={14}/> 3. Acesso, empresa e dados internos</h2>
          <p className="pl-6 text-[10px] leading-relaxed text-slate-600">Esta rota usa a sessão ERP e a empresa retornada por erp_current_empresa_id, com filtros por empresa e políticas RLS. Portanto, não é um portal público anônimo nem um link de acesso externo independente. Antes de oferecer acesso direto a compradores externos, é necessário implementar autenticação/convite de cliente e políticas RLS próprias para o portal.</p>
          <p className="pl-6 text-[10px] leading-relaxed text-slate-600">A ficha pode mostrar a estrutura técnica retornada pelo banco. Custos internos da BOM não são consultados nem exibidos. Confirme com Engenharia e Comercial se componentes e saldos físicos podem ser compartilhados com o público pretendido.</p>
        </section>
        <section className="space-y-1">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase"><MessageCircle size={14}/> 4. Falhas de envio</h2>
          <p className="pl-6 text-[10px] leading-relaxed text-slate-600">Se o telefone não estiver cadastrado, a tela tenta copiar a solicitação. Oriente o responsável a manter os dados comerciais atualizados. O subtotal é apenas referência e não cria pedido de venda no ERP nem reserva estoque.</p>
        </section>
        <footer className="flex items-start gap-2 border-t border-slate-200 pt-3 text-[9px] text-slate-500"><CheckCircle2 size={13} className="mt-0.5 shrink-0"/> Documento de suporte. Não substitui aprovação comercial, regra fiscal, análise de crédito ou confirmação formal de pedido.</footer>
        <div className="flex items-start gap-2 rounded-sm bg-slate-50 p-3 text-[9px] text-slate-500"><FileText size={13} className="mt-0.5 shrink-0"/> Revisão técnica: 2026-10-18. Mudanças limitadas ao catálogo digital e sua ajuda; telas congeladas permanecem intactas.</div>
      </article>
    </main>
  )
}
