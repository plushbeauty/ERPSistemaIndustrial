import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, ChevronDown, UserRound, ChevronRight, ShieldCheck, Home, Database, ShoppingCart, Truck, Package, Wallet, FileText, Factory, Wrench, BarChart3, Settings, LogOut, Search, Menu as MenuIcon, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
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
    { label: 'Dashboard comercial', route: '/vendas' },
    { label: 'Status do pedido', route: '/vendas/status' },
    { label: 'Novo pedido', route: '/vendas/novo-pedido' },
    { label: 'PDV / venda rápida', route: '/vendas/pdv' },
    { label: 'Catálogo digital', route: '/vendas/catalogo-digital' },
    { label: 'Gestão do catálogo', route: '/vendas/catalogo-digital/gestao' },
    { label: 'Orçamentos e custos', route: '/vendas/orcamentos' },
    { label: 'Análise de custos', route: '/vendas/analise-custos' },
    { label: 'Metas', route: '/vendas/metas' },
    { label: 'Relatórios', route: '/vendas/relatorios' },
  ] },
  { label: 'Compras', route: '/compras/rfq', icon: Truck, children: [
    { label: 'Central de compras / RFQ', route: '/compras/rfq' },
    { label: 'Solicitações', route: '/compras/solicitacao-manual' },
    { label: 'Pedido de compra', route: '/compras/pedido' },
    { label: 'Recebimentos', route: '/compras/recebimentos' },
    { label: 'Relatórios', route: '/compras/relatorios' },
  ] },
  { label: 'Estoque', route: '/estoque', icon: Package },
  { label: 'Financeiro', route: '/financeiro/custo-padrao', icon: Wallet },
  { label: 'Fiscal', route: '/fiscal', icon: FileText },
  { label: 'Manufatura / PCP', route: '/pcp', icon: Factory, children: [
    { label: 'Central PCP', route: '/pcp' },
    { label: 'Ordens de produção', route: '/pcp/ordens' },
    { label: 'Capacidade / Gantt', route: '/pcp/capacidade' },
    { label: 'MRP II', route: '/pcp/mrp-ii' },
    { label: 'Agenda de máquinas', route: '/pcp/agenda-maquinas' },
    { label: 'Auditoria PCP', route: '/pcp/auditoria' },
    { label: 'PCP Tablet', route: '/pcp', action: 'pcpTablet' },
  ] },
  { label: 'Qualidade', route: '/qualidade', icon: ShieldCheck, children: [
    { label: 'Visual geral da Qualidade', route: '/qualidade' },
    { label: 'Inspeções', route: '/qualidade/inspecoes' },
    { label: 'Cadastro de documentos (GED)', route: '/qualidade/ged-documentos' },
    { label: 'Qualidade Tablet', route: '/qualidade', action: 'qualityTablet' },
  ] },
  { label: 'Manutenção', route: '/manutencao', icon: Wrench },
  { label: 'Relatórios', route: '/relatorios', icon: BarChart3 },
  { label: 'Configuração', route: '/configuracoes-adm', icon: Settings },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
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
      if (ref.current && !ref.current.contains(event.target as Node)) { setOpenMenu(null); setStartMenuOpen(false); setOpenSubMenu(null) }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const openQualityTablet = () => setTabletOpen(true)
    window.addEventListener('erp:open-quality-tablet', openQualityTablet)
    return () => window.removeEventListener('erp:open-quality-tablet', openQualityTablet)
  }, [])

  // Atualização automática por mudanças reais no banco, sem botão manual.
  // Não recarrega telas de lançamento/edição para não apagar dados ainda não gravados.
  useEffect(() => {
    let refreshTimer: number | undefined
    // Cada montagem recebe um tópico exclusivo: evita reutilizar um canal Realtime
    // ainda inscrito durante remontagens rápidas (StrictMode/navegação).
    const channel = supabase
      .channel(`erp-global-data-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (document.visibilityState !== 'visible') return
        const routeIsEditing = /\/(novo|editar|cadastro|pedido|rfq|emissao|configuracoes|configuracao|form|apontamento|recebimento|transferencia|inventario|assinatura|login)([-/]|$)/i.test(window.location.pathname)
        const active = document.activeElement
        const userIsTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable)
        if (routeIsEditing || userIsTyping) return
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => window.location.reload(), 900)
      })
      .subscribe()
    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [])

  const moduleLabel = pathname.startsWith('/cadastros') || pathname.startsWith('/cadastro-produtos') || pathname.startsWith('/produtos-vendas') ? 'Cadastros'
    : pathname.startsWith('/vendas') ? 'Vendas'
    : pathname.startsWith('/compras') ? 'Compras'
    : pathname.startsWith('/qualidade') || pathname.startsWith('/sgq') ? 'Qualidade'
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
  const visibleMenus: MenuItem[] = menus
  const normalizedSearch = moduleSearch.trim().toLocaleLowerCase('pt-BR')
  const searchedMenus = normalizedSearch ? menus.map(menu => ({ ...menu, children: menu.children?.filter(child => child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) })).filter(menu => menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.route.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || Boolean(menu.children?.length)) : menus
  useEffect(() => {
    setOpenMenu(null)
    setOpenSubMenu(null)
    setStartMenuOpen(false)
  }, [pathname])
  const openMenuItem = (item: Pick<MenuItem, 'route' | 'action'>) => {
    if (item.action === 'pcpTablet') {
      setPcpTabletOpen(true)
      setOpenMenu(null)
      setOpenSubMenu(null)
      return
    }
    if (item.action === 'qualityTablet') {
      setTabletOpen(true)
      setOpenMenu(null)
      setOpenSubMenu(null)
      
      return
    }
    go(item.route)
  }

  const moduleHeader = pathname.startsWith('/vendas')
    ? (pathname === '/vendas' ? { title: 'Dashboard Comercial', subtitle: 'Indicadores reais do módulo de vendas' } : { title: 'Módulo Vendas', subtitle: 'Pedidos, clientes e acompanhamento comercial' })
    : pathname.startsWith('/compras') ? { title: 'Gestão de Compras', subtitle: 'Solicitações, cotações, pedidos e recebimentos' }
    : pathname.startsWith('/qualidade') || pathname.startsWith('/sgq') ? { title: 'Painel de Gestão da Qualidade', subtitle: 'Indicadores calculados a partir dos registros da empresa autenticada.' }
    : pathname.startsWith('/estoque') || pathname.startsWith('/inventario') ? { title: 'Gestão de Estoque', subtitle: 'Saldos, movimentações e rastreabilidade de materiais' }
    : pathname.startsWith('/fiscal') || pathname.includes('nota-fiscal') ? { title: 'Gestão Fiscal', subtitle: 'Documentos fiscais e controles do módulo fiscal' }
    : pathname.startsWith('/pcp') ? { title: 'Planejamento e Controle da Produção', subtitle: 'Ordens, capacidade e acompanhamento da produção' }
    : pathname.startsWith('/financeiro') ? { title: 'Gestão Financeira', subtitle: 'Títulos, custos e indicadores financeiros' }
    : pathname.startsWith('/engenharia') ? { title: 'Engenharia Industrial', subtitle: 'Produtos, estruturas e dados de engenharia' }
    : pathname.startsWith('/manutencao') ? { title: 'Gestão da Manutenção', subtitle: 'Equipamentos, ordens e planos de manutenção' }
    : pathname.startsWith('/rh') ? { title: 'Recursos Humanos', subtitle: 'Cadastros e rotinas de recursos humanos' }
    : pathname.startsWith('/produtos-vendas') || pathname.startsWith('/cadastros') ? { title: 'Cadastros Mestres', subtitle: 'Dados mestres utilizados pelos módulos do ERP' }
    : pathname.startsWith('/configuracoes') ? { title: 'Configurações do ERP', subtitle: 'Parâmetros e administração do ambiente' }
    : { title: 'SGQERP INDUSTRIAL', subtitle: 'Gestão integrada da operação industrial' }

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
    setOpenSubMenu(null)
    
    navigate(route)
  }

  return (
    <div className="erp-horizontal-shell" ref={ref}>
      <header className="erp-windows-topbar">
        <div className="erp-windows-start-anchor">
          <button className={`erp-windows-start-button ${startMenuOpen ? 'is-open' : ''}`} type="button" aria-label="Abrir menu principal" aria-expanded={startMenuOpen} title="Menu principal" onClick={() => { setStartMenuOpen(value => !value); setOpenMenu(null); setOpenSubMenu(null) }}>
            <span className="erp-windows-logo">S</span>
          </button>
          {startMenuOpen && <section className="erp-windows-start-menu" aria-label="Menu principal do ERP">
            <div className="erp-windows-start-heading">
              <div><strong>SGQERP INDUSTRIAL</strong><small>Menu de módulos</small></div>
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
                      if (hasChildren) { setOpenMenu(value => value === menu.label ? null : menu.label); setOpenSubMenu(null) }
                      else { setStartMenuOpen(false); openMenuItem(menu) }
                    }}>
                      <Icon size={16} /><span>{menu.label}</span>
                    </button>
                    {hasChildren && <button type="button" className="erp-windows-menu-expand" aria-label={`Expandir ${menu.label}`} aria-expanded={expanded} onClick={() => { setOpenMenu(value => value === menu.label ? null : menu.label); setOpenSubMenu(null) }}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>}
                  </div>
                  {hasChildren && expanded && <div className="erp-windows-menu-children">
                    {menu.children?.filter(child => !normalizedSearch || child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)).map(child => <button type="button" key={child.label + child.route} className={pathname === child.route ? 'is-active' : ''} onClick={() => { setStartMenuOpen(false); if (child.action) openMenuItem(child); else go(child.route) }}>{child.label}</button>)}
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
          <strong>SGQERP INDUSTRIAL</strong><span>GESTÃO INTEGRADA · v0.1.7</span>
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

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:linear-gradient(135deg,#eaf4f8 0%,#f3f8fb 42%,#e8f1f6 100%);color:#123b50}
        .erp-global-status-row{min-height:27px;display:flex;align-items:center;gap:10px;padding:2px 12px;background:linear-gradient(90deg,#dcecf3 0%,#edf6fa 55%,#e2f0f5 100%);border-bottom:1px solid #c3d9e3;color:#315466;font-size:9px;box-sizing:border-box}
        .erp-global-status-row>span{font-weight:700;letter-spacing:.08em}
        .erp-global-status-row>small{margin-left:auto;font-size:9px}
        .erp-status-legend{position:relative;font-size:10px;color:#173b4a}
        .erp-status-legend summary{display:inline-flex;align-items:center;gap:4px;min-height:22px;cursor:pointer;list-style:none;border:1px solid #cbd8de;background:#fff;padding:0 7px;border-radius:2px;font-weight:600}
        .erp-status-legend summary::-webkit-details-marker{display:none}
        .erp-status-legend-panel{position:absolute;top:25px;left:0;z-index:1500;width:min(360px,90vw);padding:8px;background:#fff;border:1px solid #cbd8de;box-shadow:0 8px 22px rgba(18,59,80,.16);display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .erp-status-legend-item{display:flex;align-items:flex-start;gap:6px;min-width:0}
        .erp-status-legend-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;margin-top:2px}
        .erp-status-legend-item strong{display:block;font-size:10px;font-weight:700}
        .erp-status-legend-item small{display:block;font-size:9px;line-height:1.3;color:#647b85}
        .erp-status-legend-panel>p{grid-column:1/-1;margin:0;padding-top:5px;border-top:1px solid #e2e8f0;font-size:9px;color:#647b85}
        @media print{ @page{size:A4;margin:12mm} .erp-horizontal-header,.erp-horizontal-menu,.erp-global-status-row,.print-hidden,.erp-horizontal-help{display:none!important} .erp-horizontal-shell,.erp-horizontal-workspace{min-height:0!important;background:#fff!important;padding:0!important} .erp-horizontal-workspace *{box-shadow:none!important;backdrop-filter:none!important} thead{display:table-header-group} tr{break-inside:avoid} }
        .erp-windows-topbar{height:48px;min-height:48px;display:grid;grid-template-columns:auto minmax(145px,210px) minmax(220px,1fr) auto;align-items:center;gap:10px;padding:0 10px;background:#fff;border-bottom:1px solid #cbd5e1;box-sizing:border-box;position:sticky;top:0;z-index:1600;color:#111827}
        .erp-windows-start-anchor{position:relative;height:100%;display:flex;align-items:center}
        .erp-windows-start-button{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #d1d5db;border-radius:2px;background:#fff;cursor:pointer}
        .erp-windows-start-button:hover,.erp-windows-start-button.is-open{background:#eaf5f8;border-color:#2d8db8}
        .erp-windows-logo{width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:#123b50;color:#fff;font-size:17px;font-weight:800;line-height:1}
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
        .erp-windows-menu-children button{display:block;width:100%;min-height:29px;padding:5px 8px;border:0;background:#fff;text-align:left;color:#334155;font-size:10px;cursor:pointer}
        .erp-windows-menu-children button:hover,.erp-windows-menu-children button.is-active{background:#eaf5f8;color:#123b50}
        .erp-windows-no-results{margin:12px 8px;font-size:10px;color:#64748b}
        .erp-windows-start-footer{min-height:38px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:10px;color:#334155}
        .erp-windows-start-footer span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-windows-start-footer button{height:25px;display:flex;align-items:center;gap:4px;padding:0 7px;border:1px solid #cbd5e1;background:#fff;border-radius:2px;font-size:10px;cursor:pointer}
        .erp-windows-help-panel{position:absolute;right:40px;top:46px;z-index:1800;width:min(370px,90vw);max-height:75vh;overflow:auto;padding:10px 12px;border:1px solid #b9cbd3;background:#fff;box-shadow:0 6px 16px rgba(18,59,80,.16);font-size:10px;line-height:1.45;color:#173b4a}
        .erp-windows-help-panel p{margin:5px 0}.erp-windows-help-panel ol,.erp-windows-help-panel ul{margin:4px 0 8px;padding-left:17px}.erp-windows-help-panel li{margin-bottom:3px}.erp-windows-help-panel small{display:block;border-top:1px solid #e2e8f0;padding-top:7px;color:#647b85}
        .erp-windows-help-panel>button{margin-top:7px;height:28px;padding:0 9px;border:1px solid #2d8db8;background:#2d8db8;color:#fff;border-radius:2px;cursor:pointer}
        @media(max-width:900px){.erp-windows-topbar{grid-template-columns:auto minmax(110px,170px) minmax(140px,1fr) auto;gap:6px;padding:0 6px}.erp-windows-session{gap:5px}.erp-windows-session time{font-size:9px}.erp-windows-user{max-width:120px;padding-left:5px}.erp-windows-system-title strong{font-size:11px}}
        @media(max-width:650px){.erp-windows-topbar{height:48px;grid-template-columns:auto minmax(0,1fr) auto;gap:6px}.erp-windows-quick-search{display:none}.erp-windows-system-title{align-items:flex-start;text-align:left}.erp-windows-system-title strong{font-size:10px;letter-spacing:0}.erp-windows-system-title span{font-size:8px}.erp-windows-session time{display:none}.erp-windows-user{max-width:90px}.erp-windows-user span{display:none}}
        .erp-horizontal-brand strong{font-size:13px;font-weight:700;letter-spacing:.01em}
        .erp-horizontal-help{height:30px;display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:#315466;font-size:11px;cursor:pointer;padding:0 5px}
        .erp-horizontal-session{height:30px;display:flex;align-items:center;gap:5px;padding-left:8px;border-left:1px solid #dbe5e9;white-space:nowrap;font-size:11px;color:#173b4a}
        .erp-horizontal-session span{font-weight:600}
        .erp-horizontal-session time{color:#647b85;font-size:10px}
        .erp-horizontal-menu{height:36px;min-height:36px;display:flex;align-items:stretch;padding:0 6px;background:#2D8DB8;border-bottom:1px solid #17445A;box-sizing:border-box;position:sticky;top:64px;z-index:1550}

        /* Identidade visual transversal: superfícies frias, contornos nítidos e controles compactos. */
        .erp-horizontal-session{color:#000;border-left-color:#b9d4df}
        .erp-horizontal-session time{color:#000}
        .erp-horizontal-help{color:#000}
        .erp-horizontal-help:hover{background:#e2f0f5}
        .erp-horizontal-workspace{background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%)}
        .erp-horizontal-workspace .bg-white{background-color:#f8fcfe!important}
        .erp-horizontal-workspace .bg-slate-50{background-color:#edf6fa!important}
        .erp-horizontal-workspace .bg-slate-100{background-color:#e7f1f6!important}
        .erp-horizontal-workspace .border-slate-200{border-color:#c9dde5!important}
        .erp-horizontal-workspace .border-slate-300{border-color:#b9d0dc!important}
        .erp-horizontal-workspace .text-slate-900{color:#123b50!important}
        .erp-horizontal-workspace .text-slate-700{color:#315466!important}
        .erp-horizontal-workspace .rounded-xl,.erp-horizontal-workspace .rounded-2xl{border-radius:4px!important}
        .erp-horizontal-workspace .rounded-lg{border-radius:3px!important}
        .erp-horizontal-workspace table thead th{background:#dcecf2;color:#17445a;border-bottom-color:#b9d4df}
        .erp-horizontal-workspace table tbody tr:nth-child(even){background-color:#f0f7fa}
        .erp-horizontal-workspace table tbody tr:hover{background-color:#e0f1f7}
        .erp-horizontal-workspace input:focus,.erp-horizontal-workspace select:focus,.erp-horizontal-workspace textarea:focus{border-color:#2d8db8;outline-color:#2d8db8;box-shadow:0 0 0 2px rgba(45,141,184,.12)}

        .erp-horizontal-menu-item{position:relative;display:flex;align-items:stretch}
        .erp-horizontal-menu-button{height:31px;display:inline-flex;align-items:center;gap:3px;padding:0 10px;border:0;border-right:1px solid rgba(255,255,255,.18);background:#2D8DB8;color:#fff;font-size:10px;font-weight:500;cursor:pointer}
        .erp-horizontal-menu-button:hover,.erp-horizontal-menu-button.is-active{background:#17445A;color:#fff}
        .erp-horizontal-dropdown-item{position:relative;min-width:0}
        .erp-horizontal-dropdown-item>button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;text-align:left}
        .erp-horizontal-subdropdown{position:absolute;left:100%;top:0;z-index:1400;min-width:190px;padding:4px;background:#fff;border:1px solid #cbd8de;box-shadow:0 8px 22px rgba(18,59,80,.16)}
        .erp-horizontal-subdropdown button{display:flex;width:100%;min-height:30px;align-items:center;text-align:left;padding:5px 9px;border:0;background:#fff;color:#173b4a;font-size:10px;white-space:nowrap;cursor:pointer}
        .erp-horizontal-subdropdown button:hover,.erp-horizontal-subdropdown button.is-active{background:#eaf5f8;color:#123b50}
        /* Evita que estilos herdados do módulo tornem os itens do submenu brancos/invisíveis. */
        .erp-horizontal-dropdown button,.erp-horizontal-subdropdown button{color:#173b4a!important;background:#fff!important;text-shadow:none!important}
        .erp-horizontal-dropdown button:hover,.erp-horizontal-dropdown button.is-active,.erp-horizontal-subdropdown button:hover,.erp-horizontal-subdropdown button.is-active{color:#123b50!important;background:#eaf5f8!important}

        .erp-horizontal-dropdown{position:absolute;top:31px;left:0;min-width:210px;padding:4px 0;background:#fff;border:1px solid #b9cbd3;box-shadow:0 5px 14px rgba(18,59,80,.14)}
        .erp-horizontal-dropdown button{display:block;width:100%;min-height:29px;padding:5px 12px;border:0;background:#fff;color:#234d61;text-align:left;font-size:11px;cursor:pointer}
        .erp-horizontal-dropdown button:hover{background:#edf7fb;color:#1f7195}
        .erp-horizontal-workspace{min-width:0;min-height:calc(100vh - 78px);padding:8px;box-sizing:border-box}
        .erp-horizontal-workspace-compact h1{font-size:18px!important;line-height:1.2!important;font-weight:500!important}
        .erp-horizontal-workspace-compact h2{font-size:15px!important;line-height:1.25!important;font-weight:500!important}
        .erp-horizontal-workspace-compact h3{font-size:13px!important;line-height:1.3!important;font-weight:500!important}
        .erp-horizontal-workspace-compact p{font-size:10px!important;line-height:1.4!important}
        .erp-horizontal-workspace-compact table{font-size:10px!important}
        .erp-horizontal-workspace-compact tbody td{font-size:10px!important;line-height:1.25!important}
        .erp-horizontal-workspace-compact thead th{font-size:9px!important;line-height:1.2!important;font-weight:500!important}
        .erp-horizontal-workspace-compact button{font-size:10px}
        .erp-horizontal-workspace-compact label{font-size:9px}
        .erp-horizontal-workspace-compact input,.erp-horizontal-workspace-compact select,.erp-horizontal-workspace-compact textarea{font-size:10px}

        .erp-horizontal-menu{display:flex!important;position:sticky;top:64px;z-index:1550}
        .erp-horizontal-menu-button.is-active{background:#17445A;color:#fff;box-shadow:inset 0 -2px #8bd6f0}
.erp-horizontal-menu-button.erp-module-menu-button{background:#f97316;border-right-color:#ea580c;color:#fff;font-weight:800;letter-spacing:.03em;text-transform:uppercase}
.erp-horizontal-menu-button.erp-module-menu-button:hover,.erp-horizontal-menu-button.erp-module-menu-button.is-active{background:#ea580c;color:#fff;box-shadow:inset 0 -2px #fed7aa}
.erp-horizontal-logout{height:27px;display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:0 8px;border:1px solid #c5d7df;border-radius:2px;background:#f4fbfd;color:#123b50;font-size:10px;font-weight:800;white-space:nowrap;cursor:pointer}.erp-horizontal-logout:hover{background:#dcecf3}
        .erp-horizontal-dropdown button.is-active{background:#edf7fb;color:#176487;font-weight:700;border-left:2px solid #2D8DB8}
        .erp-horizontal-workspace{width:100%;max-width:100%;min-width:0}
        @media(max-width:700px){.erp-horizontal-menu{overflow-x:auto;overscroll-behavior-x:contain}.erp-horizontal-menu-item{flex:0 0 auto}.erp-horizontal-dropdown{position:fixed;top:auto;left:6px;right:6px;max-height:65vh;overflow:auto;z-index:1500}.erp-horizontal-menu-button{min-width:max-content}}
        @media(max-width:950px){.erp-horizontal-menu-button{padding:0 7px}.erp-horizontal-session time{display:none}.erp-horizontal-global-title strong{font-size:12px}.erp-horizontal-global-title span{font-size:9px}}
        @media(max-width:700px){.erp-global-status-row>small{display:none}.erp-horizontal-header{height:58px;min-height:58px;gap:5px;padding:0 6px}.erp-horizontal-brand img{width:200px;min-width:200px;height:46px}
        .erp-horizontal-global-title strong{font-size:12px}.erp-horizontal-global-title span{font-size:9px}.erp-horizontal-help{font-size:0}.erp-horizontal-session span{display:none}.erp-horizontal-menu{overflow-x:auto;top:58px}}
        @media(prefers-reduced-motion:reduce){.erp-horizontal-menu-button,.erp-horizontal-dropdown{transition:none!important}}
      `}</style>
    </div>
  )
}
