/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: src/AppIndustrialV7.tsx
- Status Atual: Revisão 3 (Compras, Comercial e Qualidade Conectados)
- Total de Linhas Gerado: 233
- Assinatura de Entrada (Primeiros 3 Imports): import { FormEvent, useEffect, useMemo, useState } from 'react' | import { motion, AnimatePresence } from 'motion/react' | import { Activity, ArrowUpRight, Boxes, CalendarDays, CheckCircle2, ClipboardCheck, Factory, FileText, LayoutGrid, MonitorPlay, Package, Search, Settings, ShoppingCart, Store, Sun, Moon, Truck, Users, Wrench, X } from 'lucide-react'
- Regra de Negócio Incorporada: Navegação real para clientes, fornecedores ISO 9001 e tabelas de preços por cliente.
*/
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Activity, ArrowUpRight, Boxes, CalendarDays, CheckCircle2, ClipboardCheck, Factory, FileText, LayoutGrid, MonitorPlay, Package, Search, Settings, ShoppingCart, Store, Sun, Moon, Truck, Users, Wrench, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import IndustrialModuleWorkspace from './components/IndustrialModuleWorkspace'
import IndustrialCommandDashboard from './components/IndustrialCommandDashboard'
import CompanySettings from './components/CompanySettings'
import TabletLaunchpad from './components/TabletLaunchpad'
import MoldesFerramentaria from './pages/MoldesFerramentaria'
import ComercialSuprimentos from './pages/ComercialSuprimentos'
import ConfiguracoesADM from './pages/ConfiguracoesADM'

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
  M('PCP', 'PCP', 'Planejamento mestre, capacidade, sequenciamento e programação.', CalendarDays),
  M('MRP', 'MRP', 'Necessidades de materiais, compras planejadas e disponibilidade.', Activity),
  M('Ordens de Produção', 'Ordens de produção', 'OPs, quantidades, datas, status e execução.', Factory, 'erp_ordens_producao', [F('numero_op', 'Número da OP', true), F('produto_id', 'Produto ID', true), F('quantidade', 'Quantidade', true, 'number'), F('status', 'Status', true), F('data_prevista', 'Data prevista', false, 'date'), F('observacoes', 'Observações')]),
  M('Apontamentos', 'Apontamento de produção', 'Produção boa, refugo, tempos e paradas do chão de fábrica.', Activity),
  M('Setup', 'Setup e troca', 'Tempos de setup, troca de molde, preparação e perdas.', CalendarDays),
  M('Refugo', 'Refugo e perdas', 'Apuração de perdas por máquina, produto, turno, causa e lote.', ClipboardCheck),
  M('OEE', 'OEE e indicadores', 'Disponibilidade, performance, qualidade e eficiência global.', Activity),
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
  const [launcher, setLauncher] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(new Date())
  const [language, setLanguage] = useState(localStorage.getItem('erp-lang') === 'en-US' ? 'en-US' : 'pt-BR')
  useEffect(() => { const id = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(id) }, [])
  const [theme, setTheme] = useState<UiTheme>(() => {
    const saved = localStorage.getItem('erp-theme')
    return saved === 'light' || saved === 'windows' || saved === 'dark' ? saved : 'dark'
  })
  const current = segments.find(s => s.name === segment) ?? segments[0]
  const module = current.modules.find(m => m.name === active)
  useEffect(() => { localStorage.setItem('erp-theme', theme) }, [theme])
  const cycleTheme = () => setTheme(value => value === 'dark' ? 'light' : value === 'light' ? 'windows' : 'dark')
  const themeLabel = theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Windows'

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
        if (data && data.auth_user_id === auth.user.id && (master || Boolean(data.empresa_id)) && alive) setProfile(data)
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
  const choose = (s: Segment, m: string) => { setSegment(s.name); setActive(m); setLauncher(false) }
  const moduleRoutes: Record<string,string> = { 'Moldes e Ferramentas':'/moldes-injecao', Qualidade:'/qualidade', Fiscal:'/fiscal', PCP:'/pcp', Produtos:'/produtos-vendas', Clientes:'/clientes', Fornecedores:'/fornecedores', 'Tabelas de preços':'/tabelas-preco', 'Moldes e Ferramentas':'/moldes-injecao', Apontamentos:'/operacao-industrial', Compras:'/compras-solicitacao', Engenharia:'/ficha-engenharia', Processos:'/ficha-engenharia' }
  const openModule = (m: Module) => { const route = moduleRoutes[m.name]; if (route) { location.href = route; return }; setActive(m.name); setLauncher(false) }

  return <motion.div className={`v7-shell theme-${theme}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
    <header className="v7-topbar">
      <button className="v7-top-brand" type="button" onClick={() => setLauncher(true)} aria-label="Abrir Tablet">
        <img src="/logo-industrial.svg" alt="SGQ ERP" />
        <span><strong>SGQ ERP</strong><small>ERP Industrial</small></span>
      </button>
      <div className="v7-top-context"><span>SISTEMA</span><b>{segment}</b></div>
      <div className="v7-top-search"><Search size={17}/><input placeholder="Pesquisar módulos, clientes, produtos, pedidos..." aria-label="Pesquisa global" /></div>
      <div className="v7-top-actions">
        <span className="v7-top-date">{clock.toLocaleDateString(language === 'en-US' ? 'en-US' : 'pt-BR')} • {clock.toLocaleTimeString(language === 'en-US' ? 'en-US' : 'pt-BR')}</span><button className="v7-top-lang" type="button" onClick={()=>{const n=language==='pt-BR'?'en-US':'pt-BR';setLanguage(n);localStorage.setItem('erp-lang',n)}}>{language==='pt-BR'?'PT':'EN'}</button>
        <button className="v7-top-lang v7-theme-toggle" type="button" onClick={cycleTheme} aria-label={`Tema atual: ${themeLabel}. Clique para alternar`} title={`Tema: ${themeLabel}`}>
          {theme === 'dark' ? <Moon size={15}/> : <Sun size={15}/>} <span>{themeLabel}</span>
        </button>
        
        <button className="v7-top-user" type="button" onClick={() => setLauncher(true)}><Users size={16}/><span>{profile.nome}</span></button>
        <button className="v7-top-exit" type="button" onClick={() => void supabase.auth.signOut().then(() => { location.href = '/login' })}>Sair</button>
      </div>
    </header>

    <main className="v7-main v7-main-full">
      <section className="v7-header v7-page-header">
        <div><span>SGQ ERP • {segment.toUpperCase()}</span><h1>{active === 'Dashboard' ? `Dashboard — ${segment}` : module?.title ?? active}</h1><p>{active === 'Dashboard' ? current.description : module?.description}</p></div>
        <div className="v7-user"><b>{profile.nome}</b><small>Empresa isolada por tenant</small></div>
      </section>
      <section className="v7-content"><AnimatePresence mode="wait" initial={false}><motion.div key={active} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.2}}>{active === 'Dashboard' ? <IndustrialCommandDashboard profileName={profile.nome} isMaster={profile.is_master} onNavigate={(route) => { if (route === '/erp-industrial') { setActive('Dashboard'); setLauncher(false); return }; location.href = route }} /> : active === 'Configurações' ? <CompanySettings profile={profile}/> : location.pathname === '/moldes-injecao' ? <MoldesFerramentaria/> : location.pathname === '/comercial' ? <ComercialSuprimentos/> : location.pathname === '/configuracoes-adm' ? <ConfiguracoesADM profile={profile}/> : module ? <IndustrialModuleWorkspace module={module} profile={profile} onBack={() => setActive('Dashboard')}/> : <Feature title={active} description="Módulo não encontrado." icon={LayoutGrid}/>}</motion.div></AnimatePresence></section>
      <footer>FernandoSch_System • SGQ ERP • {segment} • Ambiente isolado por empresa</footer>

    </main>
    <TabletLaunchpad isOpen={launcher} onClose={() => setLauncher(false)} onNavigate={(route) => { setLauncher(false); if (route === '/erp-industrial') { setActive('Dashboard'); return } location.href = route }} />
  </motion.div>
}

function Nav({ module, active, setActive }: { module: Module; active: string; setActive: (value: string) => void }) { const Icon = module.icon; return <button className={active === module.name ? 'v7-nav active' : 'v7-nav'} onClick={() => setActive(module.name)}><Icon size={17}/>{module.title}</button> }
function Dashboard({ segment, setActive }: { segment: Segment; setActive: (value: string) => void }) {
  const [metrics,setMetrics] = useState({ops:'—',rpnc:'—',purchases:'—',shipments:'—',receivables:'—',stock:'—',machines:'—',quality:'—'})
  const [loading,setLoading] = useState(true)
  useEffect(() => {
    let alive=true
    void (async()=>{
      setLoading(true)
      const empresaId = await supabase.rpc('erp_current_empresa_id')
      if (empresaId.error || !empresaId.data) { if(alive)setLoading(false); return }
      const id=String(empresaId.data)
      const count=async(table:string, filter?:{column:string;values:string[]})=>{
        let q=supabase.from(table).select('*',{count:'exact',head:true}).eq('empresa_id',id)
        if(filter) q=q.not(filter.column,'in',`(${filter.values.join(',')})`)
        const r=await q
        return r.error?null:r.count
      }
      const [ops,rpnc,purchases,shipments,receivables,stock,machines,inspections]=await Promise.all([
        count('erp_ordens_producao',{column:'status',values:['concluida','concluído','cancelada','cancelado']}),
        count('erp_rpnc',{column:'status',values:['encerrada','fechada','concluida','concluído']}),
        count('erp_pedidos_compra',{column:'status',values:['concluido','concluída','cancelado','cancelada']}),
        count('erp_expedicoes',{column:'status',values:['entregue','concluido','concluída','cancelado']}),
        count('erp_contas_receber',{column:'status',values:['recebido','pago','quitado']}),
        count('erp_produtos'),
        count('erp_maquinas'),
        count('erp_inspecoes')
      ])
      if(alive)setMetrics({ops:ops==null?'—':String(ops),rpnc:rpnc==null?'—':String(rpnc),purchases:purchases==null?'—':String(purchases),shipments:shipments==null?'—':String(shipments),receivables:receivables==null?'—':String(receivables),stock:stock==null?'—':String(stock),machines:machines==null?'—':String(machines),quality:inspections==null?'—':String(inspections)})
      if(alive)setLoading(false)
    })()
    return()=>{alive=false}
  },[])
  const cards=[['OPs abertas',metrics.ops,'Ordens de produção'],['RPNC abertas',metrics.rpnc,'Não conformidades'],['Pedidos de compra',metrics.purchases,'Compras em aberto'],['Pedidos para expedir',metrics.shipments,'Expedições pendentes'],['Contas a receber',metrics.receivables,'Títulos em aberto'],['Produtos cadastrados',metrics.stock,'Cadastro mestre'],['Máquinas',metrics.machines,'Recursos produtivos'],['Inspeções',metrics.quality,'Registros de qualidade']]
  const actions=[['Clientes','Cadastro de clientes e política comercial'],['Fornecedores','Cadastro e qualificação ISO 9001'],['Tabelas de preços','Preços por tipo de cliente'],['Produtos','Cadastro de produtos'],['PCP','Planejamento e programação'],['Qualidade','RPNC, inspeções e auditorias'],['Fiscal','NF-e, XML e parâmetros'],['Financeiro','Contas e fluxo de caixa']]
  return <div className="v7-dashboard-pro">
    <div className="v7-executive-kpis">{cards.map(([label,value,helper])=><article key={label}><span>{label}</span><b>{loading?'…':value}</b><small>{helper}</small></article>)}</div>
    <div className="v7-executive-grid">
      <section className="v7-executive-panel"><header><div><span>CONTROLE OPERACIONAL</span><h2>Visão da fábrica</h2></div><Activity size={19}/></header><div className="v7-executive-bars">{[['Produção',metrics.ops],['Qualidade',metrics.rpnc],['Compras',metrics.purchases],['Expedição',metrics.shipments],['Financeiro',metrics.receivables]].map(([name,value])=><div key={name}><div><b>{name}</b><span>{value}</span></div><i><em style={{width:value==='—'?'0%':`${Math.min(100,Math.max(8,Number(value)||0)*7)}%`}}/></i></div>)}</div></section>
      <section className="v7-executive-panel"><header><div><span>ATALHOS</span><h2>Entrar diretamente no setor</h2></div><LayoutGrid size={19}/></header><div className="v7-executive-actions">{actions.map(([name,description])=><button key={name} onClick={()=>{const m=segment.modules.find(x=>x.name===name);if(m){const route=({Qualidade:'/qualidade',Fiscal:'/fiscal',PCP:'/pcp',Produtos:'/produtos-vendas',Clientes:'/clientes',Fornecedores:'/fornecedores','Tabelas de preços':'/tabelas-preco'} as Record<string,string | undefined>)[m.name];if(route){location.href=route}else setActive(m.name)}}}><span>{name}</span><small>{description}</small><ArrowUpRight size={15}/></button>)}</div></section>
    </div>
    <section className="v7-sector-strip"><div><span>TABLET INDUSTRIAL</span><h2>Todos os setores em um único acesso</h2><p>Abra PCP, Qualidade, Fiscal, Engenharia, Estoque, Compras, Manutenção e os demais módulos sem voltar ao início.</p></div><button className="menu-green" onClick={()=>setActive('Dashboard')}>Ver módulos no Tablet <LayoutGrid size={16}/></button></section>
  </div>
}

function Feature({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) { return <div className="v7-feature"><span className="v7-icon-box"><Icon size={28}/></span><h2>{title}</h2><p>{description}</p><small>Este módulo permanece integrado ao mesmo tenant ERP e às políticas de segurança do banco.</small></div> }
function Crud({ module, profile }: { module: Module; profile: Profile }) {
  const fields = module.fields ?? []; const searchable = useMemo(() => fields.filter(f => f.type === 'text' || f.type === 'email').slice(0, 8), [fields]); const [rows, setRows] = useState<Row[]>([]); const [form, setForm] = useState<Record<string, string>>({}); const [editing, setEditing] = useState<string | null>(null); const [query, setQuery] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  async function load(search = query) { if (!module.table) return; setBusy(true); setMsg(''); try { let request = supabase.from(module.table).select('*').eq('empresa_id', profile.empresa_id).order('created_at', { ascending: false }).limit(100); const term = search.trim(); if (term && searchable.length) { const safe = escapeIlike(term); request = request.or(searchable.map(f => `${f.key}.ilike.%${safe}%`).join(',')) } const { data, error } = await request; if (error) throw error; setRows((data ?? []) as Row[]) } catch (error) { console.error('[ERP CRUD select]', error); setRows([]); setMsg(error instanceof Error ? error.message : 'Não foi possível carregar os registros.') } finally { setBusy(false) } }
  useEffect(() => { void load('') }, [module.table, profile.empresa_id])
  async function save(event: FormEvent) { event.preventDefault(); if (!module.table) return; setBusy(true); setMsg(''); try { const payload = makePayload(fields, form); payload.empresa_id = profile.empresa_id; for (const field of fields) if (field.key.endsWith('_id') && (payload[field.key] === '' || payload[field.key] == null)) payload[field.key] = null; if (editing) { const { error } = await supabase.from(module.table).update(payload).eq('id', editing).eq('empresa_id', profile.empresa_id); if (error) throw error; setMsg('Registro atualizado com segurança no tenant atual.') } else { const { error } = await supabase.from(module.table).insert(payload); if (error) throw error; setMsg('Registro gravado com segurança no tenant atual.') } setForm({}); setEditing(null); await load(query) } catch (error) { console.error('[ERP CRUD save]', error); setMsg(error instanceof Error ? error.message : 'Não foi possível salvar o registro.') } finally { setBusy(false) } }
  async function remove(id: string) { if (!module.table || !window.confirm('Excluir este registro?')) return; setBusy(true); setMsg(''); try { const { error } = await supabase.from(module.table).delete().eq('id', id).eq('empresa_id', profile.empresa_id); if (error) throw error; setMsg('Registro excluído.'); await load(query) } catch (error) { console.error('[ERP CRUD delete]', error); setMsg(error instanceof Error ? error.message : 'Não foi possível excluir o registro.') } finally { setBusy(false) } }
  return <div className="v7-crud"><div className="v7-crud-toolbar"><div><h2>{module.title}</h2><p>CRUD real • empresa isolada</p></div><div className="v7-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load() }} placeholder="Pesquisar no banco…"/><button onClick={() => void load()} disabled={busy}>Pesquisar</button></div></div><form className="v7-form" onSubmit={save}>{fields.map(field => <label key={field.key}><span>{field.label}{field.required ? ' *' : ''}</span><input type={field.type ?? 'text'} value={form[field.key] ?? ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.key.endsWith('_id') ? 'UUID ou deixe vazio' : field.label}/></label>)}<div className="v7-form-actions"><button className="primary" disabled={busy} type="submit">{busy ? 'Salvando…' : editing ? 'Salvar alteração' : 'Gravar'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm({}) }}>Cancelar</button>}</div></form>{msg && <div className="v7-message" role="status">{msg}</div>}<div className="v7-table-wrap"><table><thead><tr>{fields.map(f => <th key={f.key}>{f.label}</th>)}<th>Ações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{fields.map(f => <td key={f.key}>{value(row[f.key]) || '—'}</td>)}<td><button onClick={() => { setEditing(row.id); setForm(Object.fromEntries(fields.map(f => [f.key, value(row[f.key])])) ) }}>Editar</button><button onClick={() => void remove(row.id)}>Excluir</button></td></tr>)}{!rows.length && <tr><td colSpan={fields.length + 1}>{busy ? 'Consultando Supabase…' : 'Nenhum registro encontrado para esta empresa.'}</td></tr>}</tbody></table></div></div>
}
/* Revisão 3 registrada após validação estrutural do arquivo. */