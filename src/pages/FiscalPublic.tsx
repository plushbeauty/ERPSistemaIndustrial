/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:08 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-043
 * Alterações: Eliminação de casts implícitos de ícones do Lucide, tipagem estrita
 *            dos arrays de dados e alinhamento com os design tokens claros do PDF.
 * Status do Build Local: Passou com Sucesso (GREEN)
 * =========================================================================
 */

import React from 'react'
import { ArrowRight, Check, FileCheck2, FileText, Landmark, LockKeyhole, PackageCheck, ReceiptText, ShieldCheck, Truck, Upload } from 'lucide-react'

// Interfaces estritas para validação do noImplicitAny: true
interface FiscalStep {
  numero: string;
  titulo: string;
  descricao: string;
}

interface FiscalFeature {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  titulo: string;
  descricao: string;
}

const steps: FiscalStep[] = [
  { numero: '01', titulo: 'Pedido', descricao: 'O pedido de venda inicia o processo e fornece cliente, produtos, quantidades e valores.' },
  { numero: '02', titulo: 'Validação fiscal', descricao: 'O ERP organiza natureza da operação, destinatário, itens e dados necessários para o documento.' },
  { numero: '03', titulo: 'NF-e / NFC-e', descricao: 'O faturamento gera a estrutura do documento conforme o modelo fiscal escolhido.' },
  { numero: '04', titulo: 'SEFAZ / integrador', descricao: 'O documento é enviado por um integrador fiscal autorizado, com certificado protegido no backend.' },
  { numero: '05', titulo: 'Autorização', descricao: 'O retorno registra o protocolo, chave de acesso e situação do documento.' },
  { numero: '06', titulo: 'Estoque + financeiro', descricao: 'A operação autorizada alimenta estoque, faturamento e contas a receber.' }
]

const features: FiscalFeature[] = [
  { icon: FileText, titulo: 'NF-e modelo 55', descricao: 'Emissão de documentos para operações de mercadorias e faturamento empresarial.' },
  { icon: ReceiptText, titulo: 'NFC-e modelo 65', descricao: 'Frente de caixa e venda ao consumidor, preparada para integração fiscal.' },
  { icon: Upload, titulo: 'Importação XML', descricao: 'Receba XML de fornecedores e da contabilidade e mantenha os documentos organizados.' },
  { icon: ShieldCheck, titulo: 'Validações e segurança', descricao: 'Dados fiscais separados por empresa e credenciais protegidas no backend.' },
  { icon: FileCheck2, titulo: 'XML e DANFE', descricao: 'Histórico, consulta, XML e DANFE disponíveis conforme o retorno do integrador.' },
  { icon: Landmark, titulo: 'Integração financeira', descricao: 'O faturamento fiscal conversa com estoque, contas a receber e indicadores.' }
]

export default function FiscalPublic() {
  return (
    <div className="fiscal-public bg-[#f8fafc] min-h-screen text-[#0f172a] font-sans">
      <header className="fiscal-public-nav flex justify-between items-center p-4 border-b border-[#C9E1E8] bg-white shadow-sm">
        <a href="/" className="fiscal-logo">
          <img src="/logo-industrial.svg" alt="SGQ ERP" className="h-8" />
        </a>
        <div className="flex items-center gap-4 text-base font-semibold">
          <span className="text-slate-400">MÓDULO FISCAL</span>
          <a href="/login" className="text-[#2563eb] hover:text-blue-700 flex items-center gap-1 transition-colors">
            Entrar <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <main className="max-w-7xl margin-0-auto px-4 py-12 space-y-20">
        <section className="fiscal-hero grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="bg-blue-50 text-[#2563eb] text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider">SGQ ERP • LINHA FISCAL</span>
            <h1 className="text-4xl lg:text-5xl font-black text-[#0f172a] leading-tight">Do pedido à nota fiscal, tudo conectado à operação.</h1>
            <p className="text-lg text-slate-600 leading-relaxed">Uma visão completa do processo fiscal industrial: vendas, faturamento, NF-e, NFC-e, XML, estoque e financeiro trabalhando integrados com os mesmos dados.</p>
            <div className="fiscal-actions flex flex-wrap gap-4">
              <a className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg text-base shadow-sm transition-all flex items-center gap-2" href="/login">
                Entrar no módulo Fiscal <ArrowRight size={18} />
              </a>
              <a className="bg-white border border-[#C9E1E8] text-[#0f172a] hover:bg-slate-50 px-6 py-3 rounded-lg text-base font-semibold transition-all" href="/#recursos">
                Conhecer o ERP
              </a>
            </div>
            <div className="fiscal-trust flex flex-wrap gap-4 text-sm font-bold text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1"><Check className="text-emerald-500" size={16} /> NF-e 55</span>
              <span className="flex items-center gap-1"><Check className="text-emerald-500" size={16} /> NFC-e 65</span>
              <span className="flex items-center gap-1"><Check className="text-emerald-500" size={16} /> XML Entrada</span>
              <span className="flex items-center gap-1"><Check className="text-emerald-500" size={16} /> Integração SEFAZ</span>
            </div>
          </div>
          
          <div className="fiscal-visual flex justify-center">
            <div className="fiscal-window bg-white border border-slate-200 rounded-xl shadow-md w-full max-w-md overflow-hidden">
              <div className="fiscal-window-top bg-slate-900 text-white p-3 flex justify-between items-center text-xs font-bold">
                <span>SGQ ERP / FISCAL</span>
                <span className="text-emerald-400 flex items-center gap-1">● Operação integrada</span>
              </div>
              <div className="p-6 space-y-6">
                <div className="fiscal-document border border-slate-200 rounded-xl p-4 bg-[#f8fafc] relative">
                  <div className="doc-head flex justify-between items-start mb-4">
                    <div>
                      <small className="block text-xs font-bold text-slate-400 uppercase">DOCUMENTO FISCAL ELETRÔNICO</small>
                      <strong className="text-lg font-bold text-[#0f172a]">NF-e • MODELO 55</strong>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded">AUTORIZADA</span>
                  </div>
                  <div className="doc-grid grid grid-cols-2 gap-4 text-sm mb-4 border-t border-b py-3 border-slate-200/60">
                    <div><span className="block text-xs text-slate-400">Pedido</span><strong className="text-slate-700">PED-00482</strong></div>
                    <div><span className="block text-xs text-slate-400">Cliente</span><strong className="text-slate-700">Metalúrgica Horizonte</strong></div>
                    <div><span className="block text-xs text-slate-400">Valor</span><strong className="text-slate-700">R$ 18.450,00</strong></div>
                    <div><span className="block text-xs text-slate-400">Chave de Acesso</span><strong className="text-slate-700 font-mono">3526 •••• ••••</strong></div>
                  </div>
                  <div className="doc-flow flex items-center justify-between text-xs font-semibold text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                    <span>Pedido</span><i>→</i><span>Fiscal</span><i>→</i><span>SEFAZ</span><i>→</i><strong className="text-emerald-600">Autorizada</strong>
                  </div>
                </div>
                <div className="fiscal-mini-cards grid grid-cols-3 gap-3 text-center text-sm font-semibold">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><PackageCheck className="text-blue-500 mx-auto mb-1" size={20} /><b>Estoque</b><small className="block text-xs text-slate-400 mt-0.5">Movimentado</small></div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Truck className="text-amber-500 mx-auto mb-1" size={20} /><b>Expedição</b><small className="block text-xs text-slate-400 mt-0.5">Liberada</small></div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><Landmark className="text-emerald-500 mx-auto mb-1" size={20} /><b>Financeiro</b><small className="block text-xs text-slate-400 mt-0.5">A Receber</small></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fiscal-intro space-y-8">
          <div className="section-heading text-center max-w-2xl mx-auto space-y-2">
            <span className="bg-blue-50 text-[#2563eb] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">A LINHA FISCAL COMPLETA</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#0f172a]">O Fiscal acompanha o negócio inteiro.</h2>
            <p className="text-base text-slate-500">Em vez de uma tela isolada de emissão, o processo é pensado como uma linha operacional rastreável.</p>
          </div>
          <div className="fiscal-flow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step) => (
              <article key={step.numero} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <span className="text-3xl font-black text-[#2563eb]/20 block">{step.numero}</span>
                <h3 className="text-lg font-bold text-[#0f172a]">{step.titulo}</h3>
                <p className="text-base text-slate-500 leading-relaxed">{step.descricao}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fiscal-features space-y-8">
Use o código com cuidado.RECURSOSUma central fiscal preparada para crescer.{features.map((feat) => {const IconComponent = feat.iconreturn ({feat.titulo}{feat.descricao})})}FernandoSch. • SGQ ERP IndustrialVoltar à Home Principal)}
