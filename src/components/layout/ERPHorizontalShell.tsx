import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, ChevronDown, UserRound, ChevronRight, ShieldCheck, Home, Database, ShoppingCart, Truck, Package, Warehouse, Wallet, FileText, Factory, Wrench, BarChart3, Settings, LogOut, Search, X, ClipboardList, ClipboardCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { BarraWindows11 } from './BarraWindows11'
import TabletMenuModal from '../TabletMenuModal'
import PCPTabletMenuModal from '../PCPTabletMenuModal'

type MenuItem = {
  label: string
  route: string
  icon?: LucideIcon
  action?: 'qualityTablet' | 'pcpTablet'
  children?: MenuItem[]
}

const menus: MenuItem[] = [
  { label: 'Início', route: '/erp-industrial', icon: Home },
  { label: 'Cadastros', route: '/produtos-vendas', icon: Database, children: [
    { label: 'Cadastro de Produtos', route: '/produtos-vendas' },
    { label: 'Cadastro de Clientes', route: '/cadastros/clientes' },
    { label: 'Cadastro de Fornecedores', route: '/cadastros/fornecedores' },
  ] },
  { label: 'Vendas', route: '/vendas', icon: ShoppingCart, children: [
    { label: 'Dashboard comercial', route: '/vendas', icon: BarChart3 },
    { label: 'Novo pedido', route: '/vendas/novo-pedido', icon: ShoppingCart },
    { label: 'Pedidos pendentes', route: '/vendas/pedidos-pendentes', icon: ClipboardList },
    { label: 'PDV / venda rápida', route: '/vendas/pdv', icon: ShoppingCart },
    { label: 'Catálogo digital', route: '/vendas/catalogo-digital', icon: Package },
    { label: 'Gestão do catálogo', route: '/vendas/catalogo-digital/gestao', icon: Settings },
    { label: 'Orçamentos e custos', route: '/vendas/orcamentos', icon: Wallet },
    { label: 'Análise de custos', route: '/vendas/analise-custos', icon: BarChart3 },
    { label: 'Metas', route: '/vendas/metas', icon: BarChart3 },
    { label: 'Relatórios', route: '/vendas/relatorios', icon: FileText },
  ] },
  { label: 'Compras', route: '/compras/rfq', icon: Truck, children: [
    { label: 'Central de compras / RFQ', route: '/compras/rfq' },
    { label: 'Solicitações', route: '/compras/solicitacao-manual' },
    { label: 'Pedido de compra', route: '/compras/pedido' },
    { label: 'Recebimentos', route: '/compras/recebimentos' },
    { label: 'Relatórios', route: '/compras/relatorios' },
  ] },
  { label: 'Estoque', route: '/estoque', icon: Package, children: [
    { label: 'Saldos de estoque', route: '/estoque/saldos' },
    { label: 'Endereços físicos', route: '/estoque/enderecos' },
    { label: 'Movimentações', route: '/estoque/movimentacoes' },
    { label: 'Ajustes', route: '/estoque/ajustes' },
    { label: 'Separação', route: '/estoque/separacao' },
    { label: 'Recebimento de lotes', route: '/estoque/recebimento-lotes' },
  ] },
  { label: 'Almoxarifado', route: '/almoxarifado/inventario-mestre', icon: Warehouse, children: [
    { label: 'Inventário mestre / FIFO e lotes', route: '/almoxarifado/inventario-mestre' },
  ] },
  { label: 'Engenharia', route: '/engenharia', icon: Database, children: [
    { label: 'Central de Engenharia', route: '/engenharia' },
    { label: 'Catálogo de itens', route: '/engenharia/produtos' },
    { label: 'Estrutura BOM', route: '/engenharia/bom' },
    { label: 'Roteiros de fabricação', route: '/engenharia/roteiros' },
    { label: 'Revisões BOM', route: '/engenharia/revisoes-bom' },
    { label: 'Fichas de processo', route: '/engenharia/fichas-processo' },
  ] },
  { label: 'Financeiro', route: '/financeiro/custo-padrao', icon: Wallet, children: [
    { label: 'Custo padrão', route: '/financeiro/custo-padrao' },
    { label: 'Contas a pagar', route: '/financeiro/contas-pagar' },
    { label: 'Contas a receber', route: '/financeiro/contas-receber' },
    { label: 'Fluxo de caixa', route: '/financeiro/fluxo-caixa' },
    { label: 'Caixa', route: '/financeiro/caixa' },
  ] },
  { label: 'Fiscal', route: '/fiscal', icon: FileText },
  { label: 'Manufatura / PCP', route: '/pcp/ordens', icon: Factory, children: [
    { label: 'Ordens de produção', route: '/pcp/ordens', icon: ClipboardList },
    { label: 'Ordens industriais', route: '/pcp/ordens-industriais', icon: Factory },
    { label: 'Chão de Fábrica · Portal do Funcionário', route: '/pcp/portal-operador', icon: Factory },
    { label: 'Apontamentos', route: '/pcp/apontamentos', icon: ClipboardCheck },
    { label: 'Demanda', route: '/pcp/demanda', icon: Package },
    { label: 'Pedidos pendentes', route: '/pcp/pedidos-pendentes', icon: ShoppingCart },
    { label: 'Capacidade / Gantt', route: '/pcp/capacidade', icon: BarChart3 },
    { label: 'Programação Gantt', route: '/pcp/programacao-gantt', icon: BarChart3 },
    { label: 'MRP II', route: '/pcp/mrp-ii', icon: Package },
    { label: 'Agenda de máquinas', route: '/pcp/agenda-maquinas', icon: Wrench },
    { label: 'Sequenciamento', route: '/pcp/sequenciamento', icon: BarChart3 },
    { label: 'Planejamento', route: '/pcp/planejamento', icon: BarChart3 },
    { label: 'Fichas de processo', route: '/pcp/fichas-processo', icon: FileText },
    { label: 'Paradas / setup', route: '/pcp/paradas', icon: Wrench },
    { label: 'Auditoria PCP', route: '/pcp/auditoria', icon: ShieldCheck },
    { label: 'PCP Tablet', route: '/pcp', action: 'pcpTablet', icon: Factory },
  ] },
  { label: 'Qualidade', route: '/qualidade', icon: ShieldCheck, action: 'qualityTablet', children: [
    { label: 'Visual geral da Qualidade', route: '/qualidade' },
    { label: 'Inspeções de lotes', route: '/qualidade/inspecoes' },
    { label: 'Inspeção em processo', route: '/qualidade/inspecao-processo' },
    { label: 'Especificações técnicas', route: '/qualidade/especificacoes' },
    { label: 'FMEA / PFMEA', route: '/qualidade/fmea' },
    { label: 'RNC / CAPA', route: '/qualidade/rnc-capa' },
    { label: 'CEP / medições', route: '/qualidade/cep' },
    { label: 'Cadastro de documentos (GED)', route: '/qualidade/ged-documentos' },
    { label: 'Qualidade Tablet', route: '/qualidade', action: 'qualityTablet' },
  ] },
  { label: 'Manutenção', route: '/manutencao', icon: Wrench, children: [
    { label: 'Central de manutenção', route: '/manutencao' },
    { label: 'Ordens de manutenção', route: '/manutencao/ordens' },
    { label: 'Cronograma', route: '/manutencao/cronograma' },
    { label: 'Plano mestre', route: '/manutencao/plano-mestre' },
    { label: 'Indicadores', route: '/manutencao/indicadores' },
  ] },
  { label: 'Recursos Humanos', route: '/rh/funcionarios', icon: UserRound, children: [
    { label: 'Funcionários', route: '/rh/funcionarios' },
    { label: 'Turnos e escalas', route: '/rh/turnos' },
    { label: 'EPIs', route: '/rh/epis' },
    { label: 'Entregas de EPI', route: '/rh/epis/entregas' },
  ] },
  { label: 'Relatórios', route: '/relatorios', icon: BarChart3 },
  { label: 'Configuração', route: '/configuracoes-adm', icon: Settings },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [moduleSearch, setModuleSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [tabletOpen, setTabletOpen] = useState(false)
  const [pcpTabletOpen, setPcpTabletOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [sessionOperator, setSessionOperator] = useState('Usuário ERP')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (operatorName !== 'Usuário ERP') return
    void supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata
      if (typeof metadata?.nome === 'string' && metadata.nome.trim()) setSessionOperator(metadata.nome.trim())
      else if (data.user?.email) setSessionOperator(data.user.email)
    })
  }, [operatorName])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) { setOpenMenu(null); setStartMenuOpen(false);  }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const openQualityTablet = () => setTabletOpen(true)
    window.addEventListener('erp:open-quality-tablet', openQualityTablet)
    return () => window.removeEventListener('erp:open-quality-tablet', openQualityTablet)
  }, [])

  // Revisão 2026-10-23 — removido reload global por eventos Realtime.
  // O reload em qualquer alteração de tabela provocava ciclos de atualização
  // e apagava o estado das telas. Cada página mantém seus controles de refresh.

  const moduleLabel = pathname.startsWith('/cadastros') || pathname.startsWith('/cadastro-produtos') || pathname.startsWith('/produtos-vendas') ? 'Cadastros'
    : pathname.startsWith('/vendas') ? 'Vendas'
    : pathname.startsWith('/compras') ? 'Compras'
    : pathname.startsWith('/qualidade') || pathname.startsWith('/sgq') ? 'Qualidade'
    : pathname.startsWith('/almoxarifado') ? 'Almoxarifado'
    : pathname.startsWith('/estoque') || pathname.startsWith('/inventario') ? 'Estoque'
    : pathname.startsWith('/financeiro') ? 'Financeiro'
    : pathname.startsWith('/fiscal') ? 'Fiscal'
    : pathname.startsWith('/pcp') ? 'Manufatura / PCP'
    : pathname.startsWith('/manutencao') ? 'Manutenção'
    : pathname.startsWith('/produtos-vendas') || pathname.startsWith('/cadastros') ? 'Cadastros'
    : pathname.startsWith('/configuracoes') ? 'Configuração'
    : null
  const currentModuleMenu = moduleLabel
    ? menus.find(menu => menu.label === moduleLabel) ?? { label: moduleLabel, route: '/' + pathname.split('/')[1], icon: Home }
    : undefined
  const current = currentModuleMenu ?? menus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
  const normalizedSearch = moduleSearch.trim().toLocaleLowerCase('pt-BR')
  const searchedMenus = normalizedSearch ? menus.map(menu => ({ ...menu, children: menu.children?.filter(child => child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) })).filter(menu => menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.route.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || Boolean(menu.children?.length)) : menus
  useEffect(() => {
    setOpenMenu(null)
    setStartMenuOpen(false)
  }, [pathname])
  const openMenuItem = (item: Pick<MenuItem, 'route' | 'action'>) => {
    if (item.action === 'pcpTablet') {
      setPcpTabletOpen(true)
      setOpenMenu(null)
      return
    }
    if (item.action === 'qualityTablet') {
      // REVISÃO 2026-10-19: o menu Qualidade deve abrir a Central SGQ Tablet atual,
      // não o modal legado TabletMenuModal.
      setTabletOpen(false)
      setOpenMenu(null)
      setStartMenuOpen(false)
      navigate('/qualidade/tablet')
      return
    }
    go(item.route)
  }

  const moduleHeader = pathname.startsWith('/vendas')
    ? (pathname === '/vendas' ? { title: 'Dashboard Comercial', subtitle: 'Indicadores reais do módulo de vendas' } : { title: 'Módulo Vendas', subtitle: 'Pedidos, clientes e acompanhamento comercial' })
    : pathname.startsWith('/compras') ? { title: 'Gestão de Compras', subtitle: 'Solicitações, cotações, pedidos e recebimentos' }
    : pathname.startsWith('/qualidade') || pathname.startsWith('/sgq') ? { title: 'Painel de Gestão da Qualidade', subtitle: 'Indicadores calculados a partir dos registros da empresa autenticada.' }
    : pathname.startsWith('/almoxarifado') ? { title: 'Almoxarifado', subtitle: 'Inventário mestre, FIFO e rastreabilidade de lotes' }
    : pathname.startsWith('/estoque') || pathname.startsWith('/inventario') ? { title: 'Gestão de Estoque', subtitle: 'Saldos, movimentações e rastreabilidade de materiais' }
    : pathname.startsWith('/fiscal') || pathname.includes('nota-fiscal') ? { title: 'Gestão Fiscal', subtitle: 'Documentos fiscais e controles do módulo fiscal' }
    : pathname.startsWith('/pcp') ? { title: 'Planejamento e Controle da Produção', subtitle: 'Ordens, capacidade e acompanhamento da produção' }
    : pathname.startsWith('/financeiro') ? { title: 'Gestão Financeira', subtitle: 'Títulos, custos e indicadores financeiros' }
    : pathname.startsWith('/engenharia') ? { title: 'Engenharia Industrial', subtitle: 'Produtos, estruturas e dados de engenharia' }
    : pathname.startsWith('/manutencao') ? { title: 'Gestão da Manutenção', subtitle: 'Equipamentos, ordens e planos de manutenção' }
    : pathname.startsWith('/rh') ? { title: 'Recursos Humanos', subtitle: 'Cadastros e rotinas de recursos humanos' }
    : pathname.startsWith('/produtos-vendas') || pathname.startsWith('/cadastros') ? { title: 'Cadastros Mestres', subtitle: 'Dados mestres utilizados pelos módulos do ERP' }
    : pathname.startsWith('/configuracoes') ? { title: 'Configurações do ERP', subtitle: 'Parâmetros e administração do ambiente' }
    : { title: 'SYSNQRA ERP & SGQ INDUSTRIAL', subtitle: 'Gestão integrada da operação industrial' }

  const contextualHelp = pathname.startsWith('/pcp/mrp-ii')
    ? { title: 'MRP II — Planejamento de materiais', purpose: 'Calcular necessidades de materiais a partir da demanda, estrutura dos produtos, estoque e ordens existentes. Esta tela não é a agenda de máquinas.', steps: ['Confirme que produtos, fichas técnicas/estruturas e saldos de estoque estão atualizados.', 'Execute o cálculo MRP e confira as necessidades líquidas por componente.', 'Revise as sugestões de comprar ou produzir antes de gerar ordens planejadas.'], fields: ['Produto/demanda: item acabado e quantidade a planejar.', 'Horizonte/data: período considerado no planejamento.', 'Necessidade líquida: quantidade que falta após estoque e reservas.', 'Sugestão: comprar ou produzir; confira antes de confirmar.'] }
    : pathname.startsWith('/pcp/agenda-maquinas')
    ? { title: 'Agenda de máquinas', purpose: 'Distribuir ordens de produção por máquina e horário, respeitando jornada e conflitos de programação.', steps: ['Escolha a semana e a máquina.', 'Selecione uma célula do calendário para abrir a programação.', 'Informe OP, quantidade e início/fim dentro da jornada configurada.', 'Salve e confira o bloco da OP no calendário.'], fields: ['Ordem de produção: selecione uma OP aberta real.', 'Molde: escolha o ferramental cadastrado quando aplicável.', 'Quantidade programada: peças previstas para este intervalo.', 'Início/fim: horários dentro do mesmo dia e da jornada.', 'Calendário: dias e horários habituais da empresa.'] }
    : pathname.startsWith('/pcp/capacidade')
    ? { title: 'Capacidade / Gantt', purpose: 'Analisar carga e capacidade por centro de trabalho e período.', steps: ['Selecione a OP e o centro de trabalho.', 'Informe início e fim planejados.', 'Revise sobreposições e carga antes de gravar.'], fields: ['OP: ordem a alocar.', 'Centro de trabalho: máquina ou recurso produtivo.', 'Início/fim: janela prevista da operação.', 'Quantidade/tempo: base para avaliar capacidade.'] }
    : pathname.startsWith('/pcp')
    ? { title: 'PCP — Planejamento e controle da produção', purpose: 'Transformar demanda em ordens, acompanhar execução, apontamentos e necessidades de materiais.', steps: ['Consulte demanda e ordens abertas.', 'Confira materiais e capacidade.', 'Programe e libere somente ordens válidas.', 'Registre quantidades boas, refugo, setup e paradas na execução.'], fields: ['Produto e quantidade: definem o que fabricar.', 'Data prevista/prioridade: orientam a fila.', 'Máquina/centro: recurso responsável.', 'Status: etapa real da ordem; altere apenas após a operação correspondente.'] }
    : pathname.startsWith('/vendas/novo-pedido')
    ? { title: 'Novo pedido de venda', purpose: 'Registrar a solicitação comercial e os itens do cliente com valores e prazo conferidos.', steps: ['Selecione o cliente cadastrado.', 'Adicione produtos e quantidades.', 'Confira preço, desconto, total e entrega.', 'Salve e acompanhe o status do pedido.'], fields: ['Cliente: cadastro da empresa compradora.', 'Produto: item cadastrado e vendável.', 'Quantidade: volume solicitado.', 'Preço/desconto: valores autorizados comercialmente.', 'Entrega: data prometida acordada com o cliente.'] }
    : pathname.startsWith('/vendas')
    ? { title: 'Vendas', purpose: 'Consultar pedidos, clientes, prazos e andamento comercial.', steps: ['Use a pesquisa para localizar pedido ou cliente.', 'Aplique filtros de status e período.', 'Abra o pedido para conferir itens e histórico.'], fields: ['Pesquisa: número do pedido ou nome/código.', 'Status: etapa atual do fluxo.', 'Período: intervalo usado no relatório.', 'Cliente: referência ao cadastro comercial.'] }
    : pathname.startsWith('/compras')
    ? { title: 'Compras', purpose: 'Gerir solicitações, cotações, pedidos, aprovações e recebimentos.', steps: ['Confira fornecedor e especificação.', 'Informe itens, quantidades, preços e prazo.', 'Envie para aprovação conforme permissão.', 'Acompanhe recebimento e conferência fiscal.'], fields: ['Fornecedor: parceiro cadastrado.', 'Item/quantidade/unidade: o que será comprado.', 'Preço e condição: termos negociados.', 'Prazo: entrega acordada.', 'Centro de custo/local: destino da compra.'] }
    : pathname.startsWith('/qualidade')
    ? { title: 'Qualidade', purpose: 'Registrar não conformidades, evidências, causa raiz, ações corretivas e validação.', steps: ['Identifique produto, lote, processo e ocorrência.', 'Descreva o problema e a contenção imediata.', 'Registre causa raiz e plano de ação.', 'Anexe evidências e conclua após validar eficácia.'], fields: ['RPNC: registro da não conformidade.', 'Lote/produto: rastreabilidade afetada.', 'Causa raiz: causa comprovada, não apenas o sintoma.', 'Ação/responsável/prazo: plano verificável.', 'Evidência: documento ou registro que comprova a eficácia.'] }
    : { title: 'Ajuda da tela atual', purpose: 'Use esta ajuda para entender a finalidade da tela e o preenchimento dos campos mais comuns.', steps: ['Leia a finalidade antes de alterar dados.', 'Preencha campos obrigatórios com registros existentes.', 'Revise os dados e salve; confirme a mensagem de resultado.', 'Use a Central de Ajuda para consultar procedimentos do módulo.'], fields: ['Pesquisa: localiza registros existentes.', 'Filtros: limitam os resultados exibidos.', 'Status: indica a etapa do processo.', 'Salvar: grava dados reais; se houver erro, corrija a mensagem apresentada.'] }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const go = (route: string) => {
    setOpenMenu(null)
    
    
    navigate(route)
  }

  return (
    <div className="erp-horizontal-shell" ref={ref}>
      <header className="erp-windows-topbar">
        <div className="erp-windows-start-anchor">
          <button className={`erp-windows-start-button ${startMenuOpen ? 'is-open' : ''}`} type="button" aria-label="Abrir menu principal" aria-expanded={startMenuOpen} title="Menu principal" onClick={() => { setStartMenuOpen(value => !value); setOpenMenu(null) }}>
            <span className="erp-windows-logo" aria-hidden="true"><i /><i /><i /><i /></span><span className="erp-windows-start-label">Menu</span>
          </button>
          {startMenuOpen && <section className="erp-windows-start-menu" aria-label="Menu principal do ERP">
            <div className="erp-windows-start-heading">
              <div><strong>SYSNQRA ERP & SGQ INDUSTRIAL</strong><small>Menu de módulos</small></div>
              <button type="button" aria-label="Fechar menu" onClick={() => setStartMenuOpen(false)}><X size={14} /></button>
            </div>
            <label className="erp-windows-menu-search">
              <Search size={14} />
              <input value={moduleSearch} onChange={event => setModuleSearch(event.target.value)} placeholder="Pesquisar módulo ou rotina..." aria-label="Pesquisar módulo ou rotina" />
              {moduleSearch && <button type="button" aria-label="Limpar pesquisa" onClick={() => setModuleSearch('')}><X size={12} /></button>}
            </label>
            <div className="erp-windows-menu-list">
              {searchedMenus.map(menu => {
                const Icon = menu.icon ?? Home
                const hasChildren = Boolean(menu.children?.length)
                const expanded = openMenu === menu.label || Boolean(normalizedSearch && menu.children?.length)
                return <div className="erp-windows-menu-group" key={menu.label}>
                  <div className={`erp-windows-menu-row ${current?.label === menu.label ? 'is-active' : ''}`}>
                    <button type="button" className="erp-windows-menu-main" onClick={() => {
                      if (menu.action === 'qualityTablet' || menu.action === 'pcpTablet') { setStartMenuOpen(false); openMenuItem(menu) }
                      else if (hasChildren) { setOpenMenu(value => value === menu.label ? null : menu.label);  }
                      else { setStartMenuOpen(false); openMenuItem(menu) }
                    }}>
                      <Icon size={16} /><span>{menu.label}</span>
                    </button>
                    {hasChildren && <button type="button" className="erp-windows-menu-expand" aria-label={`Expandir ${menu.label}`} aria-expanded={expanded} onClick={() => { setOpenMenu(value => value === menu.label ? null : menu.label);  }}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>}
                  </div>
                  {hasChildren && expanded && <div className="erp-windows-menu-children">
                    {menu.children?.filter(child => !normalizedSearch || child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)).map(child => { const ChildIcon = child.icon; return <button type="button" key={child.label + child.route} className={pathname === child.route ? 'is-active' : ''} onClick={() => { setStartMenuOpen(false); if (child.action) openMenuItem(child); else go(child.route) }}>{ChildIcon && <ChildIcon size={13} aria-hidden="true" />}<span>{child.label}</span></button> })}
                  </div>}
                </div>
              })}
              {searchedMenus.length === 0 && <p className="erp-windows-no-results">Nenhum módulo ou rotina encontrado.</p>}
            </div>
            <div className="erp-windows-start-footer"><UserRound size={13} /><span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span><button type="button" title="Sair da sessão" onClick={() => void logout()}><LogOut size={13} /> Sair</button></div>
          </section>}
        </div>
        <label className="erp-windows-quick-search">
          <Search size={14} />
          <input value={moduleSearch} onChange={event => { setModuleSearch(event.target.value); setStartMenuOpen(true) }} onFocus={() => { if (moduleSearch) setStartMenuOpen(true) }} placeholder="Pesquisar módulo..." aria-label="Pesquisar módulo" />
          {moduleSearch && <button type="button" aria-label="Limpar pesquisa" onClick={() => setModuleSearch('')}><X size={12} /></button>}
        </label>
        <div className="erp-windows-system-title" aria-live="polite">
          <strong>SYSNQRA ERP & SGQ INDUSTRIAL</strong><span>GESTÃO INTEGRADA · v0.1.7</span>
        </div>
        <div className="erp-windows-session">
          <time dateTime={now.toISOString()}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)} <span>·</span> {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' }).format(now)}</time>
          <div className="erp-windows-user"><UserRound size={14} /><span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span></div>
          <button type="button" className="erp-windows-help" title="Ajuda da tela atual" aria-expanded={helpOpen} onClick={() => setHelpOpen(value => !value)}><CircleHelp size={15} /></button>
          <button type="button" className="erp-windows-logout" onClick={() => void logout()} title="Sair da sessão"><LogOut size={13} /></button>
        </div>
        {helpOpen && <div className="erp-windows-help-panel" role="dialog" aria-label="Ajuda contextual da tela">
          <strong>{contextualHelp.title}</strong><p>{contextualHelp.purpose}</p><strong>Como usar</strong>
          <ol>{contextualHelp.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><strong>Campos e preenchimento</strong>
          <ul>{contextualHelp.fields.map((field, index) => <li key={index}>{field}</li>)}</ul>
          <small>Tela atual: {pathname}</small><button type="button" onClick={() => { setHelpOpen(false); navigate('/ajuda') }}>Abrir Central de Ajuda</button>
        </div>}
      </header>
      <main className={`erp-horizontal-workspace${pathname.startsWith('/fiscal') || pathname.includes('/nfe') || pathname.startsWith('/vendas/fiscal') || pathname.includes('nota-fiscal') ? ' erp-horizontal-workspace-fiscal' : ' erp-horizontal-workspace-compact'}`}>
        {children}
      </main>
      <TabletMenuModal isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={(route) => { setTabletOpen(false); go(route) }} />
      <PCPTabletMenuModal isOpen={pcpTabletOpen} onClose={() => setPcpTabletOpen(false)} onNavigate={(route) => { setPcpTabletOpen(false); go(route) }} />
      <BarraWindows11
        ativo={pathname.startsWith('/pcp') ? 'pcp' : pathname.startsWith('/estoque') ? 'est' : pathname.startsWith('/manutencao') ? 'man' : pathname.startsWith('/usuarios') ? 'usu' : pathname.startsWith('/configuracoes') ? 'cfg' : ''}
        onAbrir={(id) => {
          const routes: Record<string, string> = {
            pcp: '/pcp/programacao-gantt',
            maq: '/pcp/agenda-maquinas',
            est: '/estoque/saldos',
            op: '/pcp/ordens',
            man: '/manutencao',
            ind: '/pcp/capacidade',
            usu: '/usuarios',
            cfg: '/configuracoes-adm',
          }
          go(routes[id] ?? '/erp-industrial')
        }}
      />

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%);color:#123b50}
        .erp-windows-topbar{height:48px;min-height:48px;display:grid;grid-template-columns:auto minmax(145px,210px) minmax(220px,1fr) auto;align-items:center;gap:10px;padding:0 10px;background:#fff;border-bottom:1px solid #cbd5e1;box-sizing:border-box;position:sticky;top:0;z-index:1600;color:#111827}
        .erp-windows-start-anchor{position:relative;height:100%;display:flex;align-items:center}
        .erp-windows-start-button{min-width:76px;height:34px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 8px;border:1px solid #d1d5db;border-radius:2px;background:#fff;cursor:pointer}
        .erp-windows-start-button:hover,.erp-windows-start-button.is-open{background:#eaf5f8;border-color:#2d8db8}
        .erp-windows-logo{width:17px;height:17px;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:2px;flex:0 0 17px;transform:skewY(-4deg)}.erp-windows-logo i{display:block;background:#2d8db8}.erp-windows-logo i:nth-child(2),.erp-windows-logo i:nth-child(3){background:#48b7c7}.erp-windows-start-label{font-size:11px;font-weight:700;color:#123b50}
        .erp-windows-quick-search,.erp-windows-menu-search{height:30px;display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid #cbd5e1;background:#fff;color:#475569;box-sizing:border-box}
        .erp-windows-quick-search:focus-within,.erp-windows-menu-search:focus-within{border-color:#2d8db8;box-shadow:0 0 0 1px rgba(45,141,184,.15)}
        .erp-windows-quick-search input,.erp-windows-menu-search input{width:100%;min-width:0;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;font-size:11px!important;color:#111827}
        .erp-windows-quick-search button,.erp-windows-menu-search button{border:0;background:transparent;display:flex;align-items:center;justify-content:center;padding:2px;cursor:pointer}
        .erp-windows-system-title{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;line-height:1.15;text-align:center}
        .erp-windows-system-title strong{font-size:13px;font-weight:800;letter-spacing:.06em;color:#123b50;white-space:nowrap}
        .erp-windows-system-title span{font-size:9px;font-weight:600;color:#64748b;letter-spacing:.06em;white-space:nowrap}
        .erp-windows-session{display:flex;align-items:center;justify-content:flex-end;gap:9px;min-width:0;font-size:10px;color:#111827}
        .erp-windows-session time{white-space:nowrap;font-variant-numeric:tabular-nums}
        .erp-windows-session time span{color:#94a3b8;padding:0 2px}
        .erp-windows-user{display:flex;align-items:center;gap:5px;max-width:190px;min-width:0;padding-left:9px;border-left:1px solid #e2e8f0}
        .erp-windows-user span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
        .erp-windows-help,.erp-windows-logout{width:27px;height:27px;display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;background:#fff;color:#334155;border-radius:2px;cursor:pointer}
        .erp-windows-help:hover,.erp-windows-logout:hover{background:#eaf5f8;border-color:#b9d4df}
        .erp-windows-start-menu{position:absolute;top:47px;left:0;width:min(340px,calc(100vw - 16px));max-height:min(72vh,620px);display:flex;flex-direction:column;background:#fff;border:1px solid #cbd5e1;box-shadow:0 12px 32px rgba(15,23,42,.2);z-index:1800}
        .erp-windows-start-heading{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
        .erp-windows-start-heading div{display:flex;flex-direction:column;gap:2px}.erp-windows-start-heading strong{font-size:11px;color:#123b50}.erp-windows-start-heading small{font-size:9px;color:#64748b}
        .erp-windows-start-heading>button{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;cursor:pointer}
        .erp-windows-menu-search{margin:9px 10px 7px;flex:0 0 30px}
        .erp-windows-menu-list{padding:0 6px 8px;overflow:auto;min-height:0}
        .erp-windows-menu-row{min-height:34px;display:flex;align-items:center;border:1px solid transparent}
        .erp-windows-menu-row.is-active{background:#edf6fa;border-color:#d5e8ef}
        .erp-windows-menu-main{flex:1;min-width:0;min-height:32px;display:flex;align-items:center;gap:9px;padding:0 8px;border:0;background:transparent;text-align:left;color:#1e293b;font-size:11px;cursor:pointer}
        .erp-windows-menu-main span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-windows-menu-main:hover,.erp-windows-menu-expand:hover{background:#f1f5f9}
        .erp-windows-menu-expand{width:30px;align-self:stretch;display:flex;align-items:center;justify-content:center;border:0;background:transparent;cursor:pointer;color:#475569}
        .erp-windows-menu-children{margin:0 0 4px 24px;padding:2px 0 2px 8px;border-left:1px solid #cbd5e1}
        .erp-windows-menu-children button{display:flex;align-items:center;gap:7px;width:100%;min-height:29px;padding:5px 8px;border:0;background:#fff;text-align:left;color:#334155;font-size:10px;cursor:pointer}.erp-windows-menu-children button svg{flex:0 0 auto;color:#2d8db8}
        .erp-windows-menu-children button:hover,.erp-windows-menu-children button.is-active{background:#eaf5f8;color:#123b50}
        .erp-windows-no-results{margin:12px 8px;font-size:10px;color:#64748b}
        .erp-windows-start-footer{min-height:38px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:10px;color:#334155}
        .erp-windows-start-footer span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-windows-start-footer button{height:25px;display:flex;align-items:center;gap:4px;padding:0 7px;border:1px solid #cbd5e1;background:#fff;border-radius:2px;font-size:10px;cursor:pointer}
        .erp-windows-help-panel{position:absolute;right:40px;top:46px;z-index:1800;width:min(370px,90vw);max-height:75vh;overflow:auto;padding:10px 12px;border:1px solid #b9cbd3;background:#fff;box-shadow:0 6px 16px rgba(18,59,80,.16);font-size:10px;line-height:1.45;color:#173b4a}
        .erp-windows-help-panel p{margin:5px 0}.erp-windows-help-panel ol,.erp-windows-help-panel ul{margin:4px 0 8px;padding-left:17px}.erp-windows-help-panel li{margin-bottom:3px}.erp-windows-help-panel small{display:block;border-top:1px solid #e2e8f0;padding-top:7px;color:#647b85}
        .erp-windows-help-panel>button{margin-top:7px;height:28px;padding:0 9px;border:1px solid #2d8db8;background:#2d8db8;color:#fff;border-radius:2px;cursor:pointer}
        .erp-horizontal-workspace{width:100%;max-width:100%;min-width:0;min-height:calc(100vh - 48px);padding:8px;box-sizing:border-box;background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%)}
        .erp-horizontal-workspace .bg-white{background-color:#f8fcfe!important}.erp-horizontal-workspace .bg-slate-50{background-color:#edf6fa!important}.erp-horizontal-workspace .bg-slate-100{background-color:#e7f1f6!important}
        .erp-horizontal-workspace .border-slate-200{border-color:#c9dde5!important}.erp-horizontal-workspace .border-slate-300{border-color:#b9d0dc!important}.erp-horizontal-workspace .text-slate-900{color:#123b50!important}.erp-horizontal-workspace .text-slate-700{color:#315466!important}
        .erp-horizontal-workspace .rounded-xl,.erp-horizontal-workspace .rounded-2xl{border-radius:4px!important}.erp-horizontal-workspace .rounded-lg{border-radius:3px!important}
        .erp-horizontal-workspace table thead th{background:#dcecf2;color:#17445a;border-bottom-color:#b9d4df}.erp-horizontal-workspace table tbody tr:nth-child(even){background-color:#f0f7fa}.erp-horizontal-workspace table tbody tr:hover{background-color:#e0f1f7}
        .erp-horizontal-workspace input:focus,.erp-horizontal-workspace select:focus,.erp-horizontal-workspace textarea:focus{border-color:#2d8db8;outline-color:#2d8db8;box-shadow:0 0 0 2px rgba(45,141,184,.12)}
        .erp-horizontal-workspace-compact h1{font-size:18px!important;line-height:1.2!important;font-weight:500!important}.erp-horizontal-workspace-compact h2{font-size:15px!important;line-height:1.25!important;font-weight:500!important}.erp-horizontal-workspace-compact h3{font-size:13px!important;line-height:1.3!important;font-weight:500!important}
        .erp-horizontal-workspace-compact p{font-size:10px!important;line-height:1.4!important}.erp-horizontal-workspace-compact table{font-size:10px!important}.erp-horizontal-workspace-compact tbody td{font-size:10px!important;line-height:1.25!important}.erp-horizontal-workspace-compact thead th{font-size:9px!important;line-height:1.2!important;font-weight:500!important}.erp-horizontal-workspace-compact button{font-size:10px}.erp-horizontal-workspace-compact label{font-size:9px}.erp-horizontal-workspace-compact input,.erp-horizontal-workspace-compact select,.erp-horizontal-workspace-compact textarea{font-size:10px}
        @media print{@page{size:A4;margin:12mm}.erp-windows-topbar,.print-hidden{display:none!important}.erp-horizontal-shell,.erp-horizontal-workspace{min-height:0!important;background:#fff!important;padding:0!important}.erp-horizontal-workspace *{box-shadow:none!important;backdrop-filter:none!important}thead{display:table-header-group}tr{break-inside:avoid}}
        @media(max-width:900px){.erp-windows-topbar{grid-template-columns:auto minmax(110px,170px) minmax(140px,1fr) auto;gap:6px;padding:0 6px}.erp-windows-session{gap:5px}.erp-windows-session time{font-size:9px}.erp-windows-user{max-width:120px;padding-left:5px}.erp-windows-system-title strong{font-size:11px}}
        @media(max-width:650px){.erp-windows-topbar{height:48px;grid-template-columns:auto minmax(0,1fr) auto;gap:6px}.erp-windows-quick-search{display:none}.erp-windows-system-title{align-items:flex-start;text-align:left}.erp-windows-system-title strong{font-size:10px;letter-spacing:0}.erp-windows-system-title span{font-size:8px}.erp-windows-session time{display:none}.erp-windows-user{max-width:90px}.erp-windows-user span{display:none}}
        @media(prefers-reduced-motion:reduce){.erp-windows-start-menu{transition:none!important}}
      `}</style>
    </div>
  )
}
