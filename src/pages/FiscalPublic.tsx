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
import { ArrowRight, FileCheck2, FileText, ReceiptText, ShieldCheck, Upload } from 'lucide-react'

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
  { numero: '01', titulo: 'Rascunho', descricao: 'A tela de NF-e modelo 55 grava cabeçalho e itens no ERP por RPC transacional.' },
  { numero: '02', titulo: 'Parametrização', descricao: 'A transmissão exige configuração fiscal por empresa e regra única compatível com os itens.' },
  { numero: '03', titulo: 'Integrador', descricao: 'A solicitação usa a Edge Function fiscal e o provedor configurado; homologação externa não foi comprovada nesta página.' },
  { numero: '04', titulo: 'Confirmação', descricao: 'O ERP só informa Autorizada após validar retorno, chave, protocolo e XML compatíveis; respostas ambíguas ficam Processando.' },
  { numero: '05', titulo: 'Documentos', descricao: 'XML autorizado e DANFE são consultáveis apenas quando os arquivos retornados pelo integrador foram persistidos.' },
  { numero: '06', titulo: 'Entrada XML', descricao: 'O recebimento de materiais aceita conferência e gravação da entrada; isso não atesta assinatura ou autenticidade fiscal do XML.' }
]

const features: FiscalFeature[] = [
  { icon: FileText, titulo: 'NF-e modelo 55', descricao: 'Cadastro e persistência de rascunhos disponíveis; emissão real depende da configuração fiscal e do provedor.' },
  { icon: ReceiptText, titulo: 'Regras tributárias', descricao: 'Regras por empresa podem ser cadastradas; não há cálculo tributário completo por item comprovado.' },
  { icon: Upload, titulo: 'Recebimento XML', descricao: 'Conferência e confirmação de entrada física disponíveis; validação criptográfica do XML não demonstrada.' },
  { icon: ShieldCheck, titulo: 'Retorno do provedor', descricao: 'Falhas e respostas ambíguas não são convertidas em autorização; casos pendentes exigem reconciliação.' },
  { icon: FileCheck2, titulo: 'XML e DANFE', descricao: 'Consulta depende dos arquivos reais retornados e gravados pelo integrador fiscal.' }
]

export default function FiscalPublic() {
  return (
    <div className="fiscal-public bg-[#f8fafc] min-h-screen text-[#0f172a] font-sans">
      <header className="fiscal-public-nav flex justify-between items-center p-4 border-b border-[#C9E1E8] bg-white shadow-sm">
        <a href="/" className="fiscal-logo">
          <img src="/logo/sgq-erp.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL" className="h-8" />
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
            <span className="bg-blue-50 text-[#2563eb] text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider">SYSNQRA ERP & SGQ INDUSTRIAL • MÓDULO FISCAL</span>
            <h1 className="text-4xl lg:text-5xl font-black text-[#0f172a] leading-tight">Módulo Fiscal do ERP, com limites claramente identificados.</h1>
            <p className="text-lg text-slate-600 leading-relaxed">A emissão de NF-e modelo 55, a configuração tributária e o recebimento de XML dependem dos dados persistidos, permissões e provedor configurados em cada empresa. Os fluxos incompletos são identificados como pendentes.</p>
            <div className="fiscal-actions flex flex-wrap gap-4">
              <a className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg text-base shadow-sm transition-all flex items-center gap-2" href="/login">
                Entrar no módulo Fiscal <ArrowRight size={18} />
              </a>
              <a className="bg-white border border-[#C9E1E8] text-[#0f172a] hover:bg-slate-50 px-6 py-3 rounded-lg text-base font-semibold transition-all" href="/#recursos">
                Conhecer o ERP
              </a>
            </div>
            <div className="fiscal-trust flex flex-wrap gap-4 text-sm font-semibold text-slate-600 pt-2 border-t border-slate-100">
              <span>NF-e 55: fluxo parcial</span>
              <span>NFC-e: não comprovada</span>
              <span>SEFAZ: provedor externo</span>
            </div>
          </div>
          
          <div className="fiscal-visual flex justify-center">
            <section role="status" className="w-full max-w-md border border-amber-300 bg-amber-50 p-6 text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide">Visualização fiscal</p>
              <h2 className="mt-2 text-xl font-semibold">Prévia de documentos indisponível</h2>
              <p className="mt-3 text-sm leading-relaxed">
                Esta página pública não consulta documentos, valores, estoque ou respostas do provedor.
                Nenhuma NF-e, autorização ou integração operacional é simulada aqui.
              </p>
            </section>
          </div>
        </section>

        <section className="fiscal-intro space-y-8">
          <div className="section-heading text-center max-w-2xl mx-auto space-y-2">
            <span className="bg-blue-50 text-[#2563eb] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">FLUXOS E LIMITES OBSERVADOS</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#0f172a]">Recursos fiscais existentes e suas dependências.</h2>
            <p className="text-base text-slate-500">As etapas abaixo descrevem capacidades presentes no código e destacam os pontos que ainda dependem de configuração, confirmação ou validação externa.</p>
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

        <section id="recursos" className="fiscal-features space-y-8">
          <div className="section-heading mx-auto max-w-2xl space-y-2 text-center">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#2563eb]">RECURSOS OBSERVADOS NO CÓDIGO</span>
            <h2 className="text-2xl font-bold text-[#0f172a] lg:text-3xl">Operações disponíveis com limitações explícitas.</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <article key={feature.titulo} className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#2563eb]"><IconComponent size={22} /></div>
                  <h3 className="text-lg font-bold text-[#0f172a]">{feature.titulo}</h3>
                  <p className="text-base leading-relaxed text-slate-500">{feature.descricao}</p>
                </article>
              )
            })}
          </div>
        </section>
        <footer className="border-t border-slate-200 py-8 text-center text-sm font-medium text-slate-500">
          FernandoSch. • SYSNQRA ERP & SGQ INDUSTRIAL <span className="mx-2">•</span>
          <a className="text-[#2563eb] hover:underline" href="/">Voltar à Home Principal</a>
        </footer>
      </main>
    </div>
  )
}
