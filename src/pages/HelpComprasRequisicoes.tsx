/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @HORA_REVISAO: 19:20 America/Sao_Paulo
 * @REVISAO: POP-SUP-039-R1
 * @STATUS_APROVACAO: POP-AJUDA-REQUISICOES-COMPRA-OK
 */
import { ShoppingCart, ShieldCheck, CalendarClock } from 'lucide-react'

export default function HelpComprasRequisicoes() {
  return <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50] antialiased">
    <article className="mx-auto max-w-2xl space-y-4 border border-slate-200 bg-white p-6 shadow-sm">
      <header className="border-b-2 border-slate-800 pb-2"><span className="block text-[8px] font-black uppercase tracking-widest text-teal-700">SGQ • Gerenciamento de requisitos MRP</span><h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-SUP-039: Requisições de compra e fila de cotações</h1><p className="mt-1 text-[9px] text-slate-500">Revisão R1 · 18/10/2026 · 19:20 (America/Sao_Paulo)</p></header>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><ShieldCheck size={13}/>1. Sessão, permissões e autorização</h2><p className="pl-4 font-medium text-slate-600">A consulta identifica a empresa pela RPC erp_current_empresa_id e restringe as leituras por empresa_id. A autorização de encaminhamento depende da RPC erp_compras_encaminhar_requisicoes e das regras de autorização e RLS configuradas no banco. A presença do botão na interface, isoladamente, não constitui prova de alçada; a função do banco deve validar sessão, perfil, empresa e status elegível.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><ShoppingCart size={13}/>2. Encaminhamento para cotação</h2><p className="pl-4 font-medium text-slate-600">Selecione somente requisições em status AGUARDANDO_COTACAO e utilize Autorizar e Encaminhar. Em caso de erro da RPC, não presuma que houve alteração: atualize a tela e confira o status persistido no banco.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><CalendarClock size={13}/>3. Prazo de entrega e integração PCP</h2><p className="pl-4 font-medium text-slate-600">A tela atual lista requisições e permite encaminhá-las para cotação. Não registra, por si só, data prometida de entrega nem comprova sincronização com a linha do tempo do PCP. Esses passos dependem do fluxo de pedido de compra e das rotinas transacionais implementadas no banco; valide os campos e eventos efetivamente existentes antes de tratar o prazo como confirmado.</p></section>
      <footer className="border-t pt-2 text-center text-[8px] font-mono uppercase tracking-widest text-slate-400">SYSNQRA Supply Chain Quality Assurance · Revisão R1 · 2026</footer>
    </article>
  </main>
}
