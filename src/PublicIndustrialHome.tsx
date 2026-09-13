// src/PublicIndustrialHome.tsx
import React, { useState, FormEvent } from 'react'
import { 
  ArrowRight, 
  Check, 
  ChevronDown, 
  FileText, 
  Factory, 
  Mail, 
  Package, 
  ShieldCheck, 
  Smartphone, 
  Wrench, 
  X,
  Building2,
  Users,
  Lock,
  Sparkles
} from 'lucide-react'
import { supabase } from './lib/supabaseClient'

type ResourceGroup = { title: string; items: Array<[string, string, string]> }
type ResourceCard = [string, string, string, string[]]
type Plan = { name: string; price: string; tag: string; yes: string[]; no: string[] }
type Reason = [string, string]

const plans: Plan[] = [
  { name: 'Essencial', price: 'R$ 199', tag: 'Para organizar a operação', yes: ['Dashboard executivo', 'Estoque e materiais', 'Compras e fornecedores', 'Produção / OP', 'Clientes e cadastros'], no: ['MRP e planejamento avançado', 'PCP e agenda de máquinas', 'Qualidade / RPNC', 'Manutenção / CMMS', 'OEE e indicadores avançados', 'Emissão fiscal integrada', 'Outlook + IA/OCR', 'Faturamento automático'] },
  { name: 'Profissional', price: 'R$ 349', tag: 'Para ganhar escala', yes: ['Tudo do Essencial', 'MRP / planejamento', 'PCP / máquinas', 'Qualidade / RPNC', 'Manutenção', 'OEE', 'Pedidos recebidos por e-mail', 'Fluxo de aprovação'], no: ['Painel Master', 'Auditoria ampliada', 'Fiscal NF-e / NFC-e completo', 'Outlook + IA/OCR completo', 'Pedido → faturamento automático', 'Recursos avançados de gestão'] },
  { name: 'Diamante', price: 'R$ 549', tag: 'Para operação completa', yes: ['Tudo do Profissional', 'Painel Master', 'Auditoria ampliada', 'Fiscal NF-e modelo 55', 'Fiscal NFC-e modelo 65', 'Importação XML e chave de acesso', 'Outlook + IA/OCR', 'Pedidos → aprovação → faturamento', 'Visão integrada da fábrica'], no: [] }
]

const resourceGroups: ResourceGroup[] = [
  { title: 'Operação industrial', items: [['Produção / OP', 'Ordens, etapas, apontamentos e acompanhamento.', '#recurso-producao'], ['Estoque / WMS', 'Saldos, materiais, inventário e rastreabilidade.', '#recurso-estoque'], ['MRP / PCP', 'Planejamento de materiais, capacidade e produção.', '#recurso-mrp'], ['Qualidade / RPNC', 'Inspeções, não conformidades e ações.', '#recurso-qualidade'], ['Manutenção / CMMS', 'Máquinas, planos e manutenção preventiva.', '#recurso-manutencao']] },
  { title: 'Comercial e gestão', items: [['Vendas / CRM', 'Clientes, oportunidades, pedidos e histórico.', '#recurso-vendas'], ['Compras / fornecedores', 'Cotações, pedidos e acompanhamento de fornecedores.', '#recurso-compras'], ['Financeiro', 'Contas, caixa, bancos, conciliação e DRE.', '#recurso-financeiro'], ['Fiscal NF-e / NFC-e', 'Documentos fiscais, XML, DANFE e integrações.', '#recurso-fiscal'], ['Relatórios e BI', 'Indicadores, análises e visão executiva.', '#recurso-bi']] },
  { title: 'Automação e controle', items: [['Outlook + IA/OCR', 'Captura de pedidos por e-mail e leitura automática.', '#recurso-automacao'], ['Painel Master', 'Controle administrativo, empresas, usuários e auditoria.', '#recurso-master'], ['Integrações', 'Supabase, fiscal, e-mail e serviços externos.', '#recurso-integracoes'], ['Mobile / PWA', 'Acesso responsivo no computador, tablet e celular.', '#recurso-mobile'], ['Segurança', 'Perfis, empresa, permissões e rastreabilidade.', '#recurso-seguranca']] }
]

const resourceCards: ResourceCard[] = [
  ['recurso-producao', 'Produção / OP', 'Do pedido à ordem de produção, com etapas, apontamentos, setores, máquinas e histórico.', ['OPs', 'Apontamento', 'Setores', 'Máquinas']],
  ['recurso-estoque', 'Estoque / WMS', 'Controle de matérias-primas e produtos, saldos, movimentações, inventário e rastreabilidade.', ['Saldos', 'Inventário', 'Lotes', 'Movimentações']],
  ['recurso-mrp', 'MRP / PCP', 'Planeje necessidades de materiais, ordens e capacidade antes que a falta de insumo pare a fábrica.', ['MRP', 'PCP', 'Necessidades', 'Capacidade']],
  ['recurso-qualidade', 'Qualidade / RPNC', 'Registre inspeções, não conformidades, causas, ações corretivas e indicadores de qualidade.', ['Inspeções', 'RPNC', 'Ações', 'Indicadores']],
  ['recurso-manutencao', 'Manutenção / CMMS', 'Organize máquinas e planos de manutenção para reduzir paradas e aumentar disponibilidade.', ['Preventiva', 'Corretiva', 'Máquinas', 'Histórico']],
  ['recurso-vendas', 'Vendas / CRM', 'Centralize clientes, oportunidades, pedidos e histórico comercial conectado ao restante do ERP.', ['Clientes', 'Pedidos', 'CRM', 'Histórico']],
  ['recurso-compras', 'Compras / fornecedores', 'Conecte compras ao estoque e à produção, acompanhando pedidos, prazos e desempenho de fornecedores.', ['Cotações', 'Pedidos', 'Fornecedores', 'Prazos']],
  ['recurso-financeiro', 'Financeiro', 'Una contas a pagar e receber, caixa, bancos, conciliação, custos e visão de resultado.', ['Pagar', 'Receber', 'Bancos', 'DRE']],
  ['recurso-fiscal', 'Fiscal NF-e / NFC-e', 'Prepare documentos fiscais, séries, itens, impostos, XML, chave de acesso e retorno do integrador SEFAZ.', ['NF-e 55', 'NFC-e 65', 'XML', 'DANFE']],
  ['recurso-bi', 'Relatórios e BI', 'Transforme os dados da operação em indicadores para diretoria, gestores e equipes.', ['KPIs', 'Dashboards', 'ABC', 'Margens']],
  ['recurso-automacao', 'Outlook + IA/OCR', 'Capture pedidos por e-mail, leia PDF/imagem/texto e envie dados para revisão antes da produção.', ['Outlook', 'OCR', 'IA', 'Aprovação']],
  ['recurso-master', 'Painel Master', 'Administre empresas, usuários, acessos, auditoria e visão global da plataforma.', ['Empresas', 'Usuários', 'Auditoria', 'Controle']],
  ['recurso-integracoes', 'Integrações', 'Arquitetura preparada para Supabase, integradores fiscais, Microsoft Graph e futuras APIs.', ['Supabase', 'Fiscal', 'Graph', 'APIs']],
  ['recurso-mobile', 'Mobile / PWA', 'Acesse os processos do ERP em telas responsivas, sem depender de um computador específico.', ['Celular', 'Tablet', 'PWA', 'Responsivo']],
  ['recurso-seguranca', 'Segurança', 'Separação por empresa, perfis de acesso, autenticação e trilha de auditoria para operações críticas.', ['Login', 'Perfis', 'Empresa', 'Auditoria']]
]

const reasons: Reason[] = [
  ['Visão ponta a ponta', 'Pedido, compra, estoque, produção, qualidade, expedição, fiscal e financeiro trabalhando sobre os mesmos dados.'],
  ['Menos retrabalho', 'Reduza planilhas paralelas, redigitação e informações desencontradas entre departamentos.'],
  ['Decisão em tempo real', 'Dashboards e indicadores mostram o que está acontecendo na fábrica e onde existe desvio.'],
  ['Controle de custos', 'Conecte consumo, produção, compras e financeiro para entender margem, desperdício e rentabilidade.'],
  ['Rastreabilidade', 'Histórico por empresa, pedido, produto, lote, ordem, qualidade e documento fiscal.'],
  ['Indústria preparada para crescer', 'Arquitetura modular para adicionar automações, IA, integrações e novos processos sem trocar de sistema.']
]

export default function PublicIndustrialHome() {
  const [help, setHelp] = useState(false)
  const [resources, setResources] = useState(false)
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
      // Disparo direto da RPC pública canônica imune a bloqueios de rede CORS
      const { data, error } = await supabase.rpc('erp_autenticar_usuario_v2', {
        p_empresa: empresa.trim(),
        p_identificador: identificador.trim(),
        p_senha: senha
      })

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Credenciais inválidas.')
      }

      // Salva os dados de perfil no LocalStorage e redireciona para a dashboard de produção
      localStorage.setItem('erp_profile', JSON.stringify(data.profile))
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error(err)
      setErroLogin(err.message || 'Erro interno na validação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-industrial home-v2 bg-[#fbfaf7] min-h-screen text-[#17313a] font-sans antialiased">
      {/* NAVBAR DO SITE */}
      <header className="public-nav sticky top-0 z-40 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
        <a href="/" className="public-brand flex items-center gap-2 text-white font-black text-decoration-none">
          <Sparkles className="text-[#f0d49a]" size={22} />
          <strong>SGQ ERP</strong>
        </a>
        <nav className="hidden md:flex gap-6 text-sm font-bold text-slate-300">
          <div className="nav-menu relative">
            <button type="button" className={`nav-menu-trigger bg-transparent border-0 text-slate-300 font-bold text-sm cursor-pointer flex items-center gap-1 ${resources ? 'open' : ''}`} onClick={() => setResources(!resources)}>
              Recursos <ChevronDown size={14}/>
            </button>
            {resources && (
              <div className="mega-menu absolute top-full left-0 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl grid grid-cols-3 gap-6 w-[700px] mt-2">
                {resourceGroups.map(g => (
                  <div className="mega-column space-y-2" key={g.title}>
                    <div className="mega-title text-xs font-black text-slate-400 uppercase tracking-wider">{g.title}</div>
                    {g.items.map(([name, desc, href]) => (
                      <a className="mega-link block p-2 hover:bg-slate-50 rounded-xl text-decoration-none" href={href} key={name} onClick={() => setResources(false)}>
