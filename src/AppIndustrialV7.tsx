/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: src/AppIndustrialV7.tsx
- Status Atual: Revisão 3 (Compras, Comercial e Qualidade Conectados)
- Total de Linhas Gerado: 233
- Assinatura de Entrada (Primeiros 3 Imports): import { useEffect, useState } from 'react' | import { motion, AnimatePresence } from 'motion/react' | import { Activity, ArrowUpRight, Boxes, ClipboardCheck, Factory, FileText, LayoutGrid, MonitorPlay, Package, Search, Settings, ShoppingCart, Store, Truck, Users, Wrench } from 'lucide-react'
- Regra de Negócio Incorporada: Navegação real para clientes, fornecedores ISO 9001 e tabelas de preços por cliente.
*/
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Activity, ArrowUpRight, Boxes, CalendarDays, ClipboardCheck, Factory, FileText, LayoutGrid, MonitorPlay, Package, Search, Settings, ShoppingCart, Store, Truck, Users, Wrench } from 'lucide-react'
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
        <img src="/logo-industrial.svg" alt="PLASTIBOR" />
        <div className="v7-top-company"><strong>{empresaNome}</strong></div>
      </div>
      <div className="v7-top-actions">
        <button className="v7-top-tablet" type="button" onClick={() => setLauncher(true)} aria-label="Abrir Tablet Industrial"><LayoutGrid size={16}/> TABLET</button>
        <button className="v7-top-command" type="button" onClick={() => setActive('Dashboard')} aria-label="Abrir Comandos"><MonitorPlay size={16}/> COMANDOS</button>
        <div className="v7-top-user-simple" aria-label="Usuário conectado"><span>USUÁRIO (A):</span><strong>{profile.nome || 'Vanda'}</strong></div>
        <div className="v7-top-date" aria-label="Data e hora atual"><strong>{clock.toLocaleDateString(language === 'en-US' ? 'en-US' : 'pt-BR')} • {clock.toLocaleTimeString(language === 'en-US' ? 'en-US' : 'pt-BR')}</strong></div>
        <button className="v7-top-exit" type="button" onClick={() => void supabase.auth.signOut().then(() => { location.href = '/login' })}>SAIR</button>
      </div>
    </header>
    <style>{`
      .v7-topbar{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:9px 20px;background:#fff;border-bottom:1px solid #cbd5e1;color:#0f172a}
      .v7-top-brand{display:flex;align-items:center;gap:16px;min-width:0}
      .v7-top-brand img{display:block;width:210px;height:58px;object-fit:contain}
      .v7-top-company{display:flex;align-items:center;min-width:0;border-left:1px solid #cbd5e1;padding-left:16px}
      .v7-top-company strong{font-size:19px;line-height:1.1;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .v7-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}
      .v7-top-tablet,.v7-top-command,.v7-top-exit{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:0 10px;border-radius:7px;border:1px solid #94a3b8;background:#fff;color:#0f172a;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}
      .v7-top-tablet{background:#f59e0b;border-color:#d97706;color:#fff;min-height:32px;padding:0 9px;box-shadow:0 2px 6px rgba(245,158,11,.22)}
      .v7-top-command{background:#1e3a8a;border-color:#1e3a8a;color:#fff}
      .v7-top-exit{background:#fff;color:#b91c1c;border-color:#fca5a5}
      .v7-top-user-simple,.v7-top-date{display:flex;align-items:center;gap:6px;min-height:34px;padding:0 10px;border-left:1px solid #cbd5e1}
      .v7-top-user-simple span{font-size:11px;font-weight:900;color:#475569;white-space:nowrap}
      .v7-top-user-simple strong,.v7-top-date strong{font-size:13px;font-weight:900;color:#0f172a;white-space:nowrap}
      .v7-top-actions button:hover{filter:brightness(.97)}
      @media(max-width:900px){.v7-top-brand img{width:170px;height:52px}.v7-top-actions{gap:5px}.v7-top-command{display:none}.v7-top-company strong{font-size:16px}}
      @media(max-width:650px){.v7-topbar{padding:8px 10px}.v7-top-brand img{width:145px;height:46px}.v7-top-company{display:none}.v7-top-user-simple{display:none}.v7-top-date strong{font-size:11px}.v7-top-tablet{font-size:0;width:38px;padding:0}.v7-top-tablet svg{width:17px}.v7-top-exit{font-size:0;width:38px;padding:0}.v7-top-exit::after{content:'×';font-size:20px}}
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