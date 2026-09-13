// src/PublicIndustrialHome.tsx
import React, { useState, useMemo, FormEvent } from 'react'
import { 
  ArrowRight, 
  BarChart3, 
  Check, 
  ChevronRight, 
  Clock3, 
  CreditCard, 
  Facebook, 
  Instagram, 
  MessageCircle, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  Users, 
  WalletCards, 
  X, 
  Youtube,
  Factory,
  Package,
  ClipboardCheck,
  ShoppingCart,
  FileText,
  Wrench,
  LockKeyhole,
  Zap,
  Building2,
  Lock
} from 'lucide-react'
import { supabase } from './lib/supabaseClient'

type Screen = { title: string; icon: React.ComponentType<any>; kpis: string[]; rows: string[] }
type Segment = { name: string; description: string; status: 'ATIVO' | 'PARCIALMENTE ATENDIDO' | 'EM DESENVOLVIMENTO' }
type PlanFeature = { name: string; value: string; included: boolean }

const segments: Segment[] = [
  { name: 'Plásticos / Injetados / Prensados / Estampados', description: 'Núcleo mais completo: PCP, OP, matéria-prima, moldes, estoque, qualidade, RPNC, manutenção, custos e rastreabilidade.', status: 'ATIVO' },
  { name: 'Metalúrgica', description: 'Cadastros, estoque, compras, clientes e gestão estão disponíveis; processos metalúrgicos especializados seguem em evolução.', status: 'PARCIALMENTE ATENDIDO' },
  { name: 'Usinagem', description: 'Base administrativa e de estoque disponível; recursos avançados de CNC, ferramentas e roteiros específicos estão em evolução.', status: 'PARCIALMENTE ATENDIDO' },
  { name: 'Ferramentaria', description: 'Base de gestão disponível; engenharia e controles especializados de projetos e ferramentaria estão em evolução.', status: 'PARCIALMENTE ATENDIDO' },
  { name: 'Química', description: 'Segmento previsto, mas formulações e controles regulatórios específicos ainda não estão completos.', status: 'EM DESENVOLVIMENTO' },
  { name: 'Autopeças', description: 'Base industrial aplicável, porém requisitos específicos de cadeia automotiva e rastreabilidade avançada ainda evoluem.', status: 'EM DESENVOLVIMENTO' },
  { name: 'Móveis', description: 'Gestão comercial e estoque podem ser aproveitados, mas produção moveleira específica ainda está em evolução.', status: 'EM DESENVOLVIMENTO' },
  { name: 'Atacado / Distribuição', description: 'Operação comercial e estoque são aplicáveis; WMS e distribuição avançada ainda estão em evolução.', status: 'EM DESENVOLVIMENTO' },
  { name: 'Lojas / Varejo', description: 'Base comercial disponível, mas PDV e operação multi-loja específica ainda está em evolução.', status: 'EM DESENVOLVIMENTO' },
  { name: 'Serviços', description: 'CRM e gestão podem ser aproveitados; agenda e ordens de serviço especializadas ainda estão em evolução.', status: 'EM DESENVOLVIMENTO' }
]

const screens: Screen[] = [
  { title: 'Dashboard executivo', icon: BarChart3, kpis: ['OPs 24', 'OEE 87%', 'Estoque R$ 184 mil', 'RPNC 03'], rows: ['Produção do dia • 92% do planejado', 'Pedidos em aberto • 18', 'Estoque crítico • 7 itens'] },
  { title: 'PCP / Produção', icon: Factory, kpis: ['OPs 24', 'Atrasadas 02', 'Capacidade 86%', 'Refugo 1,8%'], rows: ['OP-00482 • Injeção • 78%', 'OP-00483 • Usinagem • 41%', 'OP-00484 • Montagem • Aguardando'] },
  { title: 'Estoque / WMS', icon: Package, kpis: ['Itens 1.284', 'Lotes 318', 'Críticos 07', 'Valor R$ 1,2 mi'], rows: ['PP-00041 • Matéria-prima • 820 kg', 'MP-00218 • Polímero • 240 kg', 'PA-00991 • Produto acabado • 94 un'] },
  { title: 'Qualidade / RPNC', icon: ClipboardCheck, kpis: ['Inspeções 42', 'RPNC 03', 'Ações 07', 'Risco alto 01'], rows: ['RPNC-0012 • Dimensional • Em análise', 'RPNC-0013 • Visual • Ação corretiva', 'Lote L-2026-091 • Liberado'] },
  { title: 'Custos industriais', icon: BarChart3, kpis: ['Material 58%', 'Mão de obra 17%', 'Máquinas 12%', 'Margem 23%'], rows: ['Produto A • Custo R$ 42,80 • Venda R$ 68,00', 'Produto B • Custo R$ 18,40 • Venda R$ 31,90', 'Perdas • R$ 4.820 no período'] },
  { title: 'Financeiro', icon: ShoppingCart, kpis: ['A receber R$ 328 mil', 'A pagar R$ 214 mil', 'Caixa R$ 96 mil', 'Margem 21%'], rows: ['Hoje • 12 títulos a vencer', 'Semana • 8 pagamentos programados', 'Mês • DRE em acompanhamento'] },
  { title: 'Fiscal', icon: FileText, kpis: ['NF-e 128', 'Autorizadas 126', 'Rejeitadas 02', 'XML 100%'], rows: ['NF-e 000128 • Autorizada', 'NF-e 000127 • Autorizada', 'NF-e 000126 • Rejeitada • corrigir'] },
  { title: 'Manutenção', icon: Wrench, kpis: ['Máquinas 42', 'Preventivas 11', 'Corretivas 03', 'Disponibilidade 94%'], rows: ['INJ-04 • Preventiva • amanhã', 'TOR-02 • Corretiva • em execução', 'CNC-08 • Disponível'] }
]

const planFeatureNames = ['Dashboard e gestão', 'Usuários e empresas', 'Cadastros mestres', 'Estoque e inventário', 'Clientes e fornecedores', 'Compras e recebimento', 'Ordens de produção', 'PCP / MRP / capacidade', 'Qualidade / RPNC / CAPA', 'Manutenção industrial', 'Indicadores avançados / OEE', 'Financeiro integrado', 'Fiscal / NF-e / XML', 'Automação + IA', 'Auditoria e rastreabilidade ampliada']

const plans = [
  { name: 'Essencial', price: 'R$ 199', desc: 'Para pequenas operações que precisam sair das planilhas e organizar a base da fábrica em um único ambiente.', tag: 'BASE INDUSTRIAL', features: planFeatureNames.map((name, i) => ({ name, value: ['Completo', 'Completo', 'Completo', 'Completo', 'Completo', 'Completo', 'Básico', 'Não inclui', 'Não inclui', 'Não inclui', 'Básico', 'Básico', 'Não inclui', 'Não inclui', 'Básico'][i], included: [0, 1, 2, 3, 4, 5, 6, 10, 11, 14].includes(i) } as PlanFeature)) },
  { name: 'Profissional', price: 'R$ 349', desc: 'Para indústrias em crescimento que precisam conectar planejamento, qualidade, manutenção e gestão de desempenho.', tag: 'MAIS ESCOLHIDO', features: planFeatureNames.map((name, i) => ({ name, value: i === 13 ? 'Não inclui' : 'Completo', included: i !== 12 && i !== 13 } as PlanFeature)) },
  { name: 'Diamante', price: 'R$ 549', desc: 'Para operações que querem a visão integrada da fábrica, fiscal, auditoria e automação assistida por IA.', tag: 'GESTÃO INTEGRADA', features: planFeatureNames.map(name => ({ name, value: 'Completo', included: true } as PlanFeature)) }
]

const infrastructure = [
  { icon: LockKeyhole, title: 'Dados isolados por empresa', text: 'Seus dados ficam separados por tenant. RLS no PostgreSQL restringe o acesso por empresa antes da aplicação liberar a informação.', badge: 'RLS + PostgreSQL' },
  { icon: ShieldCheck, title: 'Operação sem conflito', text: 'Restrições transacionais impedem sobreposição de horários em agenda e programação de recursos quando a regra de negócio estiver configurada no banco.', badge: 'Anti-double booking' },
  { icon: Zap, title: 'Infraestrutura de alta performance', text: 'Frontend distribuído na Vercel e backend Supabase com Edge Functions para autenticação e integrações server-side.', badge: 'Vercel + Supabase' },
  { icon: Smartphone, title: 'Instalação como aplicativo', text: 'PWA permite instalar o ERP no desktop, tablet ou celular sem depender de uma aba permanente do navegador.', badge: 'PWA standalone' },
  { icon: Factory, title: 'PCP + SGQ rastreáveis', text: 'Produção, lote, refugo, RPNC, CAPA e indicadores são conectados para preservar a genealogia operacional.', badge: 'OEE + genealogia' }
]

export default function PublicIndustrialHomeV3() {
  const [modalLogin, setModalLogin] = useState(false)
  const [empresa, setEmpresa] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erroLogin, setErroLogin] = useState('')

  const handleLoginReal = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErroLogin('')

    try {
      // Injeção da chamada RPC segura que aniquila o bloqueio de CORS
      const { data, error } = await supabase.rpc('erp_autenticar_usuario_v2', {
        p_empresa: empresa.trim(),
        p_identificador: identificador.trim(),
        p_senha: senha
      })

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Credenciais ou empresa inválidas.')
      }

      // Sincroniza a sessão e despacha o usuário para dentro do ERP
      localStorage.setItem('erp_profile', JSON.stringify(data.profile))
      localStorage.setItem('erp_session', JSON.stringify(data.session))
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error(err)
      setErroLogin(err.message || 'Erro interno na validação de acesso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-industrial bg-[#fbfaf7] font-sans antialiased text-[#17313a] min-h-screen">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <a className="flex items-center gap-2 text-xl font-black text-emerald-800 tracking-tight text-decoration-none" href="/">
          <Sparkles className="text-emerald-600" size={24} />
          <span>SGQ<span className="text-emerald-600">ERP</span></span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
          <a href="#solucoes" className="hover:text-emerald-700 text-decoration-none">Soluções</a>
          <a href="#segmentos" className="hover:text-emerald-700 text-decoration-none">Segmentos</a>
          <a href="#infraextra" className="hover:text-emerald-700 text-decoration-none">Infraestrutura</a>
          <a href="#planos" className="hover:text-emerald-700 text-decoration-none">Planos</a>
        </nav>
        <div>
          <button type="button" onClick={() => setModalLogin(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md">
            Acessar Sistema
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
