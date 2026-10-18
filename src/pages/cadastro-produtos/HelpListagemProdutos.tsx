/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: POP-AJUDA-LISTAGEM-PRODUTOS-OK
 * POP-ENG-005 — consulta e emissão do catálogo mestre.
 */
import { ArrowLeft, Box, Filter, Printer, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HelpListagemProdutos() {
  return <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50] antialiased">
    <article className="mx-auto max-w-3xl space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-3"><div><span className="block text-[8px] font-black uppercase tracking-widest text-teal-700">SGQ · Governança de cadastros core</span><h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-ENG-005: Consulta e emissão do catálogo técnico</h1><p className="mt-1 text-[10px] text-slate-500">Revisão de 18/10/2026 · Procedimento operacional</p></div><Link to="/cadastro-produtos" className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-3 text-[10px] font-bold uppercase hover:bg-slate-50"><ArrowLeft size={12}/> Voltar ao cadastro</Link></header>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Filter size={12} className="text-teal-700"/> 1. Pesquisa e filtros</h2><p className="pl-4 font-medium text-slate-600">Pesquise por SKU ou descrição e combine os filtros de categoria, unidade base e mercado/cliente. Use “Limpar filtros” para restaurar a listagem completa dentro do conjunto carregado.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><ShieldCheck size={12} className="text-emerald-700"/> 2. Segurança e integridade</h2><p className="pl-4 font-medium text-slate-600">A tela consulta o Supabase usando a sessão ativa e filtra pela empresa vinculada ao usuário. As políticas RLS do banco são a proteção de autorização efetiva. A consulta está limitada a 2.000 registros por carregamento; bases maiores exigem paginação para cobertura integral.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Printer size={12} className="text-sky-700"/> 3. Impressão do catálogo</h2><p className="pl-4 font-medium text-slate-600">Use “Imprimir catálogo” para abrir a impressão do navegador e escolher impressora ou PDF. Os controles e ações de edição são ocultados no papel. Confira a prévia, orientação e escala antes de confirmar.</p></section>
      <section className="space-y-1.5"><h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Box size={12} className="text-sky-700"/> 4. Abertura da ficha</h2><p className="pl-4 font-medium text-slate-600">O botão “Abrir” envia o identificador do produto à ficha técnica. Confirme SKU e descrição antes de editar para evitar alterações no item incorreto.</p></section>
      <footer className="border-t pt-2 text-center text-[8px] font-mono uppercase tracking-widest text-slate-400">SYNQRA · Padrões de Engenharia · POP-ENG-005</footer>
    </article>
  </main>
}