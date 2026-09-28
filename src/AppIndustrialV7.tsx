/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: src/AppIndustrialV7.tsx
- Status Atual: Revisão 3 (Compras, Comercial e Qualidade Conectados)
- Total de Linhas Gerado: 233
- Assinatura de Entrada (Primeiros 3 Imports): import { useEffect, useState } from 'react' | import { motion, AnimatePresence } from 'motion/react' | import { Activity, ArrowUpRight, Boxes, ClipboardCheck, Factory, FileText, LayoutGrid, Package, Search, Settings, ShoppingCart, Store, Truck, Users, Wrench } from 'lucide-react'
- Regra de Negócio Incorporada: Navegação real para clientes, fornecedores ISO 9001 e tabelas de preços por cliente.
*/
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Activity, ArrowUpRight, Boxes, CalendarDays, ClipboardCheck, Factory, FileText, LayoutGrid, Package, Search, Settings, ShoppingCart, Store, Truck, Users, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import IndustrialModuleWorkspace from './components/IndustrialModuleWorkspace'
import IndustrialCommandDashboard from './components/IndustrialCommandDashboard'
import CompanySettings from './components/CompanySettings'
import TabletLaunchpad from './components/TabletLaunchpad'
import MoldesFerramentaria from './pages/MoldesFerramentaria'
import ComercialSuprimentos from './pages/ComercialSuprimentos'
import ConfiguracoesADM from './pages/ConfiguracoesADM'
import CalibracaoIndustrial from './pages/CalibracaoIndustrial'
import VendasClientesPage from './pages/VendasClientes'
import FinanceiroCustoPadrao from './pages/FinanceiroCustoPadrao'
import AdminLogs from './pages/AdminLogs'
import OutlookConfiguracao from './pages/OutlookConfiguracao'
import FornecedoresIndustrial from './pages/FornecedoresIndustrial'

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'email'; required?: boolean }
type Module = { name: string; title: string; description: string; icon: LucideIcon; table?: string; fields?: Field[] }
type Segment = { name: string; description: string; icon: LucideIcon; modules: Module[] }
type Row = Record<string, unknown> & { id: string }
type Profile = { nome: string; empresa_id: string | null; nivel_admin: number; is_master: boolean; perfil: string }
type UiTheme = 'dark' | 'light' | 'windows'

const F = (key: string, label: string, required = false, type: Field['type'] = 'text'): Field => ({ key, label, required, type })
const M = (name: string, title: string, description: string, icon: LucideIcon, table?: string, fields: Field[] = []): Module => ({ name, title, description, icon, table, fields })

const industrialModules: Module[] = [
  M('Dashboard', 'Dashboard industrial', 'Indicadores de produção, estoque, qualidade, custos e financeiro.', Activity),
  M('Clientes', 'Clientes', 'Clientes industriais, contatos, documentos e política comercial.', Users, 'erp_clientes', [F('nome', 'Nome / Razão social', true), F('documento', 'CPF / CNPJ'), F('email', 'E-mail', false, 'email'), F('telefone', 'Telefone'), F('tipo_cliente', 'Tipo de cliente'), F('tabela_preco_id', 'Tabela de preço ID'), F('desconto_padrao_percentual', 'Desconto padrão (%)', false, 'number')]),
  M('Fornecedores', 'Fornecedores', 'Cadastro, qualificação, certificado ISO 9001 e documentos de compras.', Truck),
  M('Tabelas de preços', 'Tabelas de preços', 'Preços por tipo de cliente e valores específicos por produto.', ShoppingCart),
  M('Produtos', 'Produtos e materiais', 'Produtos acabados, componentes, matérias-primas e insumos.', Package, 'erp_produtos', [F('codigo', 'Código', true), F('nome', 'Nome', true), F('unidade', 'Unidade'), F('tipo', 'Tipo'), F('estoque_minimo', 'Estoque mínimo', false, 'number'), F('custo_medio', 'Custo médio', false, 'number'), F('preco_venda', 'Preço de venda', false, 'number')]),
  M('Engenharia', 'Engenharia / BOM', 'Fichas técnicas, versões, estruturas e roteiro de fabricação.', Boxes, 'erp_fichas_tecnicas', [F('produto_id', 'Produto ID', true), F('versao', 'Versão', true, 'number'), F('rendimento', 'Rendimento', false, 'number'), F('unidade_rendimento', 'Unidade'), F('observacoes', 'Observações')]),
  M('Moldes e Ferramentas', 'Moldes e ferramentas', 'Controle de moldes, dispositivos, cavidades, vida útil e localização.', Wrench, 'erp_moldes', [F('codigo', 'Código', true), F('nome', 'Nome', true), F('tipo', 'Tipo'), F('status', 'Status'), F('cavidades', 'Cavidades', false, 'number')]),
  M('Máquinas', 'Máquinas e equipamentos', 'Injetoras, prensas, estampadoras e demais recursos produtivos.', Wrench, 'erp_maquinas', [F('codigo', 'Código', true), F('nome', 'Nome', true), F('tipo', 'Tipo', true), F('fabricante', 'Fabricante'), F('modelo', 'Modelo'), F('status', 'Status')]),
  M('Processos', 'Processos produtivos', 'Operações, tempos padrão, recursos e sequência de fabricação.', Activity),
    M('MRP', 'MRP', 'Necessidades de materiais, compras planejadas e disponibilidade.', Activity),
          M('Matéria-prima', 'Matéria-prima', 'Consumo, reservas, lotes e saldo de materiais.', Package),
  M('Estoque', 'Estoque', 'Entradas, saídas, transferências, inventário e saldo.', Package, 'erp_estoque_movimentos', [F('produto_id', 'Produto ID', true), F('tipo', 'Tipo', true), F('quantidade', 'Quantidade', true, 'number'), F('origem', 'Origem'), F('documento', 'Documento'), F('ordem_producao_id', 'OP ID'), F('observacao', 'Observação')]),
  M('Compras', 'Compras', 'Solicitações, pedidos, fornecedores, recebimento e aprovação.', ShoppingCart, 'erp_pedidos_compra', [F('fornecedor_id', 'Fornecedor ID'), F('status', 'Status', true), F('data_prevista', 'Data prevista', false, 'date'), F('observacoes', 'Observações')]),
  M('Qualidade', 'Qualidade', 'Plano de inspeção, recebimento, processo, produto e liberação.', ClipboardCheck),
  M('RPNC', 'RPNC / Não conformidades', 'Desvios, causa raiz, ações corretivas, prazos e eficácia.', ClipboardCheck),
  M('Rastreabilidade', 'Rastreabilidade', 'Lote de matéria-prima → produção → produto acabado → expedição.', FileText),
  M('Manutenção', 'Manutenção', 'Preventiva, corretiva, peças, horas, máquinas e histórico.', Wrench, 'erp_manutencao', [F('maquina', 'Máquina'), F('tipo', 'Tipo', true), F('status', 'Status', true), F('descricao', 'Descrição')]),
  M('Custos', 'Custos industriais', 'Materiais + mão de obra + máquinas + indiretos + perdas + margem.', Activity),
  M('Expedição', 'Expedição', 'Separação, conferência, embalagem, romaneio e entrega.', Truck),
  M('Financeiro', 'Financeiro', 'Contas a pagar, receber, caixa, conciliação e fluxo.', ShoppingCart),
  M('Fiscal', 'Fiscal', 'Documentos fiscais, tributos, XML e acompanhamento de emissão.', FileText),
  M('Relatórios', 'Relatórios industriais', 'Indicadores operacionais, financeiros e históricos.', FileText),
  M('Configurações', 'Configurações', 'Empresa, identidade visual, relatórios, permissões e infraestrutura.', Settings),
]

const commonModules: Module[] = [
  M('Clientes', 'Clientes', 'Cadastro e relacionamento com clientes.', Users, 'erp_clientes', [F('nome', 'Nome / Razão social', true), F('documento', 'CPF / CNPJ'), F('email', 'E-mail', false, 'email'), F('telefone', 'Telefone')]),
  M('Produtos', 'Produtos', 'Catálogo, preços e itens.', Package, 'erp_produtos', [F('codigo', 'Código', true), F('nome', 'Nome', true), F('unidade', 'Unidade')]),
  M('Estoque', 'Estoque', 'Saldo, inventário e movimentações.', Package),
  M('Compras', 'Compras', 'Fornecedores, cotações e pedidos.', ShoppingCart),
  M('Vendas', 'Vendas', 'Orçamentos, pedidos e faturamento.', ShoppingCart),
  M('Financeiro', 'Financeiro', 'Contas, caixa e fluxo financeiro.', Activity),
  M('Fiscal', 'Fiscal', 'Documentos e obrigações fiscais.', FileText),
  M('CRM', 'CRM', 'Leads, oportunidades e relacionamento.', Users),
  M('Relatórios', 'Relatórios', 'Indicadores e análises.', Activity),
]

const segments: Segment[] = [
  { name: 'Injetados / Prensados / Estampados', description: 'Indústria de transformação com máquinas, moldes, matéria-prima, PCP, qualidade, refugo, custos e rastreabilidade.', icon: Factory, modules: industrialModules },
  { name: 'Metalúrgica', description: 'Corte, dobra, solda, usinagem, produção, qualidade, estoque e custos.', icon: Factory, modules: commonModules },
  { name: 'Usinagem', description: 'CNC, tornos, fresas, roteiros, tempos, ferramentas e custos por operação.', icon: Wrench, modules: commonModules },
  { name: 'Química', description: 'Formulações, lotes, matérias-primas, rastreabilidade, qualidade e segurança.', icon: Boxes, modules: commonModules },
  { name: 'Autopeças', description: 'Produção, lotes, rastreabilidade, qualidade, entregas e requisitos de clientes.', icon: Truck, modules: commonModules },
  { name: 'Ferramentaria', description: 'Projetos, moldes, ferramentas, horas, manutenção e custos de fabricação.', icon: Wrench, modules: commonModules },
  { name: 'Móveis', description: 'Projetos, ficha técnica, corte, montagem, estoque e entrega.', icon: Boxes, modules: commonModules },
  { name: 'Atacado / Distribuição', description: 'Compras, vendas, estoque, WMS, preços, representantes, rotas e expedição.', icon: Truck, modules: commonModules },
  { name: 'Varejo / Lojas', description: 'Lojas, PDV, estoque por filial, vendas, caixa, clientes e fiscal.', icon: Store, modules: commonModules },
  { name: 'Automotivo / Oficina', description: 'Clientes, veículos, orçamentos, ordens de serviço, peças, mecânicos e financeiro.', icon: Wrench, modules: commonModules },
  { name: 'Transportadora / Logística', description: 'Frota, motoristas, cargas, rotas, entregas, manutenção e custos.', icon: Truck, modules: commonModules },
  { name: 'Serviços', description: 'Clientes, propostas, agenda, ordens de serviço, técnicos, contratos e cobrança.', icon: Wrench, modules: commonModules },
  { name: 'Agronegócio', description: 'Compras, estoque, produção, custos, vendas e gestão operacional.', icon: Boxes, modules: commonModules },
  { name: 'Saúde', description: 'Atendimento, clientes, estoque, compras, financeiro e gestão administrativa.', icon: ClipboardCheck, modules: commonModules },
  { name: 'Restaurantes / Alimentação', description: 'Produtos, fichas, compras, estoque, vendas, caixa e custos.', icon: ShoppingCart, modules: commonModules },
  { name: 'Tecnologia', description: 'Clientes, contratos, projetos, serviços, financeiro e indicadores.', icon: Activity, modules: commonModules },
  { name: 'Educação', description: 'Clientes/alunos, contratos, cobrança, serviços e gestão administrativa.', icon: Users, modules: commonModules },
  { name: 'Representação Comercial', description: 'Leads, clientes, oportunidades, propostas, pedidos e comissões.', icon: Users, modules: commonModules },
]

const value = (v: unknown) => v == null ? '' : String(v)
const escapeIlike = (v: string) => v.replace(/[\\%_]/g, m => `\\${m}`).replace(/[(),]/g, m => `\\${m}`)

function makePayload(fields: Field[], form: Record<string, string>) {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = (form[field.key] ?? '').trim()
    if (!raw) {
      if (field.required) throw new Error(`Informe ${field.label}.`)
      out[field.key] = null
      continue
    }
    if (field.type === 'number') {
      const n = Number(raw)
      if (!Number.isFinite(n)) throw new Error(`${field.label} deve ser numérico.`)
      out[field.key] = n
    } else out[field.key] = raw
  }
  return out
}

export default function AppIndustrialV7() {
  const [segment, setSegment] = useState(segments[0].name)
  const [active, setActive] = useState('Dashboard')
  const [launcher, setLauncher] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [empresaNome, setEmpresaNome] = useState('Empresa industrial')
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(new Date())
  const [language] = useState(localStorage.getItem('erp-lang') === 'en-US' ? 'en-US' : 'pt-BR')
  useEffect(() => { const id = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(id) }, [])
  const [theme] = useState<UiTheme>('light')
  const current = segments.find(s => s.name === segment) ?? segments[0]
  const module = current.modules.find(m => m.name === active)
  const specialPath = location.pathname
  useEffect(() => { localStorage.setItem('erp-theme', theme) }, [theme])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) return
        const { data, error } = await supabase.from('erp_usuarios').select('nome,empresa_id,nivel_admin,auth_user_id,ativo,deleted_at,is_master,perfil').eq('auth_user_id', auth.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (error) throw error
        const master = data?.auth_user_id === auth.user.id && data?.is_master === true && Number(data?.nivel_admin ?? 0) === 100 && String(data?.perfil ?? '').trim().toUpperCase() === 'MASTER' && data?.empresa_id === null
        if (data && data.auth_user_id === auth.user.id && (master || Boolean(data.empresa_id)) && alive) { setProfile(data); if (data.empresa_id) { const company = await supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', data.empresa_id).eq('ativo', true).maybeSingle(); if (!company.error && alive) setEmpresaNome(String(company.data?.nome_fantasia ?? company.data?.razao_social ?? 'Empresa industrial')) } else if (master && alive) setEmpresaNome('Visão Master do Ecossistema') }
      } catch (error) {
        console.error('[ERP profile]', error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) return <div className="loading-screen">Carregando SGQ ERP…</div>
  if (!profile) return <div className="error-screen"><div className="error-screen-card"><strong>Perfil ERP não encontrado.</strong><p>A sessão autenticada não possui um usuário ERP ativo vinculado à empresa.</p><button className="primary" type="button" onClick={() => { void supabase.auth.signOut(); location.replace('/login') }}>Voltar ao login</button></div></div>

  return <motion.div className={`v7-shell theme-${theme}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
    <header className="v7-topbar" aria-label="Barra superior do ERP">
      <div className="v7-top-brand">
        <div className="v7-logo-frame">
          <img src="/logo-industrial.svg" alt="SGQERP" />
        </div>
        <div className="v7-top-title">
          <strong>SGQERP INDUSTRIAL</strong>
          <span>CENTRAL DE CONTROLE</span>
        </div>
      </div>
      <div className="v7-top-actions">
        <button className="v7-top-tablet" type="button" onClick={() => setLauncher(true)} aria-label="Abrir central de módulos">
          MÓDULOS TABLET
        </button>
        <div className="v7-top-user-simple" aria-label="Usuário conectado"><span>OPERADOR</span><strong>{profile.nome || 'Usuário'}</strong></div>
        <div className="v7-top-date" aria-label="Data e hora atual">
          <strong>{clock.toLocaleDateString(language === 'en-US' ? 'en-US' : 'pt-BR')}</strong>
          <span>{clock.toLocaleTimeString(language === 'en-US' ? 'en-US' : 'pt-BR')}</span>
        </div>
        <span className="v7-top-data">DADOS: SUPABASE</span>
        <button className="v7-top-exit" type="button" onClick={() => void supabase.auth.signOut().then(() => { location.href = '/login' })}>SAIR</button>
      </div>
    </header>
    <style>{`
      .v7-topbar{position:relative;z-index:20;width:100%;min-height:104px;display:flex!important;align-items:center;justify-content:space-between;gap:20px;padding:10px 24px!important;background:#ffffff!important;border-bottom:1px solid #cbd5e1!important;color:#1e293b!important;box-sizing:border-box}
      .v7-top-brand{display:flex!important;align-items:center;gap:18px;min-width:0}
      .v7-logo-frame{height:80px;width:auto;min-width:210px;display:flex;align-items:center;justify-content:flex-start;background:#ffffff;box-sizing:border-box}
      .v7-logo-frame img{display:block!important;height:100%!important;width:auto!important;max-height:none!important;object-fit:contain!important;padding:0!important}
      .v7-top-title{display:flex;flex-direction:column;justify-content:center;border-left:1px solid #cbd5e1;padding-left:18px;line-height:1.1}
      .v7-top-title strong{color:#1e293b!important;font-size:20px!important;font-weight:950!important;letter-spacing:-.02em;white-space:nowrap}
      .v7-top-title span{color:#475569!important;font-size:10px!important;font-weight:900!important;letter-spacing:.14em;margin-top:5px}
      .v7-top-actions{display:flex!important;align-items:center!important;justify-content:flex-end;gap:10px;min-width:0;flex-wrap:nowrap}
      .v7-top-tablet,.v7-top-exit{display:inline-flex!important;align-items:center!important;justify-content:center;min-height:42px;padding:0 16px!important;border-radius:8px!important;font-size:12px!important;font-weight:950!important;cursor:pointer;white-space:nowrap;box-sizing:border-box}
      .v7-top-tablet{background:#ea580c!important;border:1px solid #c2410c!important;color:#ffffff!important;box-shadow:0 4px 12px rgba(234,88,12,.2)}
      .v7-top-exit{background:#ffffff!important;border:1px solid #fecaca!important;color:#991b1b!important}
      .v7-top-user-simple{display:flex!important;flex-direction:column;justify-content:center;gap:3px;min-height:42px;padding:0 12px;border-left:1px solid #e2e8f0!important;white-space:nowrap}
      .v7-top-user-simple span{color:#64748b!important;font-size:9px!important;font-weight:950!important;letter-spacing:.08em}
      .v7-top-user-simple strong{color:#1e293b!important;font-size:12px!important;font-weight:950!important}
      .v7-top-date{display:flex!important;flex-direction:column;justify-content:center;align-items:flex-start;gap:2px;min-height:42px;padding:0 12px;border-left:1px solid #e2e8f0!important;white-space:nowrap}
      .v7-top-date strong{color:#1e293b!important;font-size:11px!important;font-weight:950!important}
      .v7-top-date span{color:#475569!important;font-size:11px!important;font-weight:800!important}
      .v7-top-data{display:inline-flex!important;align-items:center;min-height:34px;padding:0 10px;background:#ecfdf5!important;border:1px solid #a7f3d0!important;border-radius:7px!important;color:#065f46!important;font-size:9px!important;font-weight:950!important;white-space:nowrap}
      .v7-top-actions button:hover{filter:brightness(.97)}
      @media(max-width:1180px){.v7-logo-frame{height:72px;min-width:185px}.v7-top-title strong{font-size:18px!important}.v7-top-title{display:none!important}.v7-top-brand{min-width:0}}
      @media(max-width:900px){.v7-top-date{display:none!important}.v7-top-data{display:none!important}.v7-logo-frame{height:64px;min-width:165px}}
      @media(max-width:650px){.v7-topbar{padding:7px 10px!important;min-height:72px}.v7-logo-frame{height:54px;min-width:135px}.v7-top-user-simple{display:none!important}.v7-top-tablet,.v7-top-exit{min-height:36px;padding:0 9px!important;font-size:10px!important}.v7-top-tablet{font-size:0!important}.v7-top-tablet::after{content:'TABLET';font-size:10px}}
    `}</style>
    <main className="v7-main v7-main-full">
      <section className="v7-content"><AnimatePresence mode="wait" initial={false}><motion.div key={specialPath+active} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.2}}>{specialPath === '/vendas/clientes' ? <VendasClientesPage/> : specialPath === '/financeiro/custo-padrao' ? <FinanceiroCustoPadrao/> : specialPath === '/admin/logs' ? <AdminLogs/> : specialPath === '/outlook/configuracao' ? <OutlookConfiguracao/> : specialPath === '/compras/fornecedores' ? <FornecedoresIndustrial/> : active === 'Dashboard' ? <IndustrialCommandDashboard onNavigate={(route) => { if (route === '/erp-industrial') { setActive('Dashboard'); setLauncher(false); return }; location.href = route }} /> : active === 'Configurações' ? <CompanySettings profile={profile}/> : location.pathname === '/qualidade/calibracao' ? <CalibracaoIndustrial/> : location.pathname === '/moldes-injecao' ? <MoldesFerramentaria/> : location.pathname === '/comercial' ? <ComercialSuprimentos/> : location.pathname === '/configuracoes-adm' ? <ConfiguracoesADM profile={profile}/> : module ? <IndustrialModuleWorkspace module={module} profile={profile} onBack={() => setActive('Dashboard')}/> : <Feature title={active} description="Módulo não encontrado." icon={LayoutGrid}/>}</motion.div></AnimatePresence></section>
      <footer>FernandoSch_System • SGQ ERP • {segment} • Ambiente isolado por empresa</footer>

    </main>
    <TabletLaunchpad isOpen={launcher} onClose={() => setLauncher(false)} onNavigate={(route) => { setLauncher(false); if (route === '/erp-industrial') { setActive('Dashboard'); return } location.href = route }} />
  </motion.div>
}

function Feature({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) { return <div className="v7-feature"><span className="v7-icon-box"><Icon size={28}/></span><h2>{title}</h2><p>{description}</p><small>Este módulo permanece integrado ao mesmo tenant ERP e às políticas de segurança do banco.</small></div>}

/* Revisão 3 registrada após validação estrutural do arquivo. */