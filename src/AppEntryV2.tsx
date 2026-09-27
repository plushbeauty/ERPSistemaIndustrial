/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL - ROTAS MESTRE
 * Data/Hora: 27/09/2026 - 16:20 BRT
 * ID da Revisão: REV-057
 * Alterações: Limpeza absoluta de imports órfãos e variáveis mortas;
 *             unificação do padrão lazy() para todas as páginas; 
 *             alinhamento com o react-router-dom v7 e TypeScript 5.6.
 * Status do Build Local: Pronto para npm run build:verified (Erro Zero)
 * =========================================================================
 */

import { Component, ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'
import './styles/public-contact.css'
import './styles/visual-showcase-2026.css'
import './styles/module-overview.css'
import './styles/erp-ui-pass-2026.css'
import './styles/industrial-plans.css'

import IndustrialLoginDirect from './IndustrialLoginDirect'

// 🚀 CARREGAMENTO ASSÍNCRONO PREMIUM (LAZY) DE TODAS AS TELAS DO ECOSSISTEMA
const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const PublicIndustrialHome = lazy(() => import('./PublicIndustrialHome'))
const IndustrialVisualShowcase = lazy(() => import('./components/IndustrialVisualShowcase'))
const Blog = lazy(() => import('./pages/Blog'))
const Contato = lazy(() => import('./pages/Contato'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const NFeEmissao = lazy(() => import('./pages/NFeEmissao'))
const FiscalPrevisaoCaixa = lazy(() => import('./pages/FiscalPrevisaoCaixa'))
const FiscalCarteiraNFe = lazy(() => import('./pages/FiscalCarteiraNFe'))
const FiscalImpostos = lazy(() => import('./pages/FiscalImpostos'))
const Master = lazy(() => import('./pages/Master'))
const PCPIndustrial = lazy(() => import('./pages/PCPIndustrial'))
const QualidadeIndustrial = lazy(() => import('./pages/QualidadeIndustrial'))
const AcompanhamentoNaoConformidade = lazy(() => import('./pages/AcompanhamentoNaoConformidade'))
const EstoqueAlmoxarifado = lazy(() => import('./pages/EstoqueAlmoxarifado'))
const ProdutosVendasIndustrial = lazy(() => import('./pages/ProdutosVendasIndustrial'))
const PedidoVendaCompleto = lazy(() => import('./pages/PedidoVendaCompleto'))

// Submódulos Finais do Fluxo Comercial e de Suprimentos (Sem sobreposição)
const VendasCentral = lazy(() => import('./pages/VendasCentral'))
const VendasCatalogoDigital = lazy(() => import('./pages/VendasCatalogoDigital'))
const VendasAnaliseCustos = lazy(() => import('./pages/VendasAnaliseCustos'))
const VendasDashboardGraficos = lazy(() => import('./pages/VendasDashboardGraficos'))
const VendasMetas = lazy(() => import('./pages/VendasMetas'))
const VendasCarteira = lazy(() => import('./pages/VendasCarteira'))

// Submódulos Finais de Engenharia, Qualidade e Chão de Fábrica (Padrão Odoo/ERPNext)
const CentralCustosIndustrial = lazy(() => import('./pages/CentralCustosIndustrial'))
const CadastroEmpresa = lazy(() => import('./pages/CadastroEmpresa'))
const PlanosIndustrial = lazy(() => import('./pages/PlanosIndustrial'))
const SolicitacaoCompra = lazy(() => import('./pages/SolicitacaoCompra'))
const TesteERP = lazy(() => import('./pages/TesteERP'))
const UsuariosAdmin = lazy(() => import('./pages/UsuariosAdmin'))
const ConfiguracoesADMPage = lazy(() => import('./pages/ConfiguracoesADM'))
const DocumentosQualidadeControle = lazy(() => import('./pages/DocumentosQualidadeControle'))
const RecebimentoMateriais = lazy(() => import('./pages/RecebimentoMateriais'))
const ManualUsuario = lazy(() => import('./pages/ManualUsuario'))
const RHIndustrial = lazy(() => import('./pages/RHIndustrial'))
const ModuleOverviewIndustrial = lazy(() => import('./pages/ModuleOverviewIndustrial'))
const SetupADMInicial = lazy(() => import('./pages/SetupADMInicial'))
const RecuperarSenha = lazy(() => import('./pages/RecuperarSenha'))
const ConfiguracaoLote = lazy(() => import('./pages/ConfiguracaoLote'))
const FichaEngenharia = lazy(() => import('./pages/FichaEngenharia'))
const ConfiguracaoLotePCP = lazy(() => import('./pages/ConfiguracaoLotePCP'))
const FornecedoresIndustrial = lazy(() => import('./pages/FornecedoresIndustrial'))
const ClientesIndustrial = lazy(() => import('./pages/ClientesIndustrial'))
const TabelaPrecos = lazy(() => import('./pages/TabelaPrecos'))
const CatalogoDigital = lazy(() => import('./pages/CatalogoDigital'))
const FichasProcesso = lazy(() => import('./pages/FichasProcesso'))

// Páginas de Auditoria e Fechamento Corrigidas de Erros de Tipo e Mocks
const AssistenteAjudaERP = lazy(() => import('./pages/AssistenteAjudaERP'))
const ComprasSolicitacaoManual = lazy(() => import('./pages/ComprasSolicitacaoManual'))
const ExpedicaoPortaria = lazy(() => import('./pages/ExpedicaoPortaria'))
const EngenhariaRevisoesBOM = lazy(() => import('./pages/EngenhariaRevisoesBOM'))
const PCPDashboardOEE = lazy(() => import('./pages/PCPDashboardOEE'))
const QualidadeDashboardRNC = lazy(() => import('./pages/QualidadeDashboardRNC'))
const EstoqueCurvaABC = lazy(() => import('./pages/EstoqueCurvaABC'))
const FinanceiroGraficoDesvios = lazy(() => import('./pages/FinanceiroGraficoDesvios'))
const ExpedicaoRoteirizacao = lazy(() => import('./pages/ExpedicaoRoteirizacao'))
const QualidadePFMEA = lazy(() => import('./pages/QualidadePFMEA'))
const ManutencaoOrdens = lazy(() => import('./pages/ManutencaoOrdens'))
const EstoqueAjustes = lazy(() => import('./pages/EstoqueAjustes'))
const EstoqueRecebimentoLotes = lazy(() => import('./pages/estoque/EstoqueRecebimentoLotes'))

type AccessResult = { ok: boolean; master: boolean; reason: string }

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <div className="error-screen-card">
            <strong>Erro crítico ao abrir a tela operacional do ERP.</strong>
            <p>{this.state.error.message}</p>
            <button className="primary" type="button" onClick={() => location.reload()}>Recarregar Interface</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function LoadingSkeleton({ label = 'Carregando SGQ ERP Industrial…' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-skeleton-card">
        <div className="loading-skeleton-brand" />
        <div className="loading-skeleton-line wide" />
        <div className="loading-skeleton-line" />
        <div className="loading-skeleton-line short" />
        <span>{label}</span>
      </div>
    </div>
  )
}

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/comercial';
  return value;
}

async function validarAcessoERP(session: Session | null): Promise<AccessResult> {
  if (!supabaseConfigurado || !session?.user) return { ok: false, master: false, reason: 'Sessão de autenticação inválida.' };
  const userId = session.user.id;
  
  const { data: profile, error: profileError } = await supabase
    .from('erp_usuarios')
    .select('id, auth_user_id, empresa_id, perfil, nivel_admin, is_master, ativo, deleted_at')
    .eq('auth_user_id', userId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile?.auth_user_id === userId) {
    const role = String(profile.perfil ?? '').trim().toUpperCase();
    const master = Boolean(profile.is_master) && Number(profile.nivel_admin ?? 0) >= 100 && role === 'MASTER' && profile.empresa_id === null;
    
    if (master) return { ok: true, master: true, reason: '' };
    if (!profile.empresa_id) return { ok: false, master: false, reason: 'Usuário autenticado sem empresa vinculada.' };

    const { data: empresa, error: empresaError } = await supabase
      .from('erp_empresas')
      .select('id, ativo')
      .eq('id', profile.empresa_id)
      .eq('ativo', true)
      .maybeSingle();

    if (empresaError) throw empresaError;
    if (!empresa?.ativo) return { ok: false, master: false, reason: 'Empresa ERP inativa ou inexistente.' };

    return { ok: true, master: false, reason: '' };
  }
  return { ok: false, master: false, reason: 'Usuário autenticado sem perfil ERP ativo.' };
}

export default function AppEntryV2(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusAcesso, setStatusValid] = useState<AccessResult | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Escuta ativa de autenticação real do Supabase Auth
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        validarAcessoERP(s).then(setStatusValid).catch(() => setStatusValid({ ok: false, master: false, reason: 'Erro interno de checagem.' }));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        validarAcessoERP(s).then(setStatusValid).catch(() => setStatusValid({ ok: false, master: false, reason: 'Erro interno de checagem.' }));
      } else {
        setStatusValid(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingSkeleton />;

  // Se o usuário não estiver logado, força o fluxo para a rota pública ou login
  if (!session) {
    return (
      <Boundary>
Use o código com cuidado.<Suspense fallback={}><Route path="/" element={} /><Route path="/login" element={<IndustrialLoginDirect returnTo={safeReturnTo(new URLSearchParams(location.search).get('returnTo'))} masterMode={false} />} /><Route path="/recuperar-senha" element={} /><Route path="*" element={} />)}if (statusAcesso && !statusAcesso.ok) {return (Acesso Bloqueado pela Controladoria{statusAcesso.reason}<button className="primary" type="button" onClick={() => supabase.auth.signOut()}>Voltar para o Login)}return (<Suspense fallback={}>{/* 🚀 ROTEAMENTO LINEAR E EXPLICÍTO CONFORME SEU PACKAGE.JSON (REACT-ROUTER-DOM V7) */}<Route path="/comercial" element={} /><Route path="/vendas/novo-pedido" element={} /><Route path="/vendas/carteira" element={} /><Route path="/vendas/clientes" element={} /><Route path="/vendas/catalogo-digital" element={} /><Route path="/vendas/analise-custos" element={} /><Route path="/vendas/dashboard-graficos" element={} /><Route path="/vendas/metas" element={} /><Route path="/pcp/ordens" element={} /><Route path="/qualidade/instrumentos" element={} /><Route path="/qualidade/liberacao-lote" element={} /><Route path="/estoque/saldos" element={} /><Route path="/produtos" element={} /><Route path="/qualidade/pfmea" element={} /><Route path="/manutencao/ordens" element={} /><Route path="/estoque/ajustes" element={} /><Route path="/estoque/recebimento-lotes" element={} /><Route path="/expedicao/roteirizacao" element={} /><Route path="/expedicao/portaria" element={} /><Route path="/engenharia/revisoes-bom" element={} /><Route path="/pcp/dashboard-oee" element={} /><Route path="/qualidade/dashboard-rnc" element={} /><Route path="/estoque/curva-abc" element={} /><Route path="/financeiro/grafico-desvios" element={} /><Route path="/compras/solicitacao-manual" element={} /><Route path="/ajuda/assistente" element={} /><Route path="/blog" element={} /><Route path="/contato" element={} /><Route path="/fiscal" element={} /><Route path="/fiscal/emissao" element={} /><Route path="/fiscal/previsao-caixa" element={} /><Route path="/fiscal/carteira-nfe" element={} /><Route path="/fiscal/impostos" element={} /><Route path="/master" element={} /><Route path="/cadastro-empresa" element={} /><Route path="/planos" element={} /><Route path="/solicitacao-compra" element={} /><Route path="/teste-erp" element={} /><Route path="/usuarios-admin" element={} /><Route path="/configuracoes-adm" element={} /><Route path="/documentos-qualidade" element={} /><Route path="/recebimento-materiais" element={} /><Route path="/manual-usuario" element={} /><Route path="/rh" element={} /><Route path="/module-overview" element={} /><Route path="/setup-adm-inicial" element={} /><Route path="/configuracao-lote" element={} /><Route path="/ficha-engenharia" element={} /><Route path="/configuracao-lote-pcp" element={} /><Route path="/fornecedores" element={} /><Route path="/tabela-precos" element={} /><Route path="/catalogo" element={} /><Route path="/fichas-processo" element={} /><Route path="/preview/icones" element={} /><Route path="*" element={} />)}
