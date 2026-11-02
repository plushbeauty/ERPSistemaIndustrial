import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, ChevronDown, UserRound, UserCog, ChevronRight, Home, FileText, Factory, LogOut, Search, X, Ruler, ClipboardList, ShoppingCart, Settings, FilePlus2, Users, Wallet, FolderOpen, Warehouse, Percent, Scale, ShieldCheck, BookOpen, Landmark, Calculator, RotateCcw, Archive, FileWarning, Route, Monitor, BarChart3, Boxes, Barcode } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import PCPTabletMenuModal from '../PCPTabletMenuModal'
import PageIntroCard from './PageIntroCard'
import { fallbackPageIntro, hasNativeIntroCard, resolvePageIntro } from './pageIntroCatalog'

type MenuItem = {
  label: string
  route: string
  icon?: LucideIcon
  isNew?: boolean
  isUpdated?: boolean
  action?: 'pcpTablet'
  minNivel?: number
  children?: MenuItem[]
}

const menus: MenuItem[] = [
  { label: 'Financeiro', route: '/pageprincipal/financeiro', icon: Landmark, children: [
    { label: 'Central Financeira', route: '/pageprincipal/financeiro', icon: Wallet, isUpdated: true },
    { label: 'Conciliação Bancária', route: '/pageprincipal/financeiro/conciliacao-bancaria', icon: ClipboardList },
    { label: 'Importar Extratos', route: '/pageprincipal/financeiro/importar-extratos', icon: FileText, isUpdated: true },
    { label: 'Lista de Preços por Cliente', route: '/pageprincipal/financeiro/lista-precos-cliente', icon: ShoppingCart, isUpdated: true },
    { label: 'Retificação de Pedido', route: '/pageprincipal/financeiro/retificacao', icon: RotateCcw, isUpdated: true },
    { label: 'Notas de Débito', route: '/pageprincipal/financeiro/notas-debito', icon: FileWarning, isUpdated: true },
    { label: 'Configurações de Notas de Débito', route: '/pageprincipal/financeiro/notas-debito/configuracoes', icon: Settings, isUpdated: true },
  ] },
  { label: 'Comissões', route: '/pageprincipal/comissoes', icon: Calculator, isUpdated: true, children: [
    { label: 'Regras de Comissão', route: '/pageprincipal/comissoes/regras', icon: ClipboardList, isUpdated: true },
    { label: 'Cálculo de Comissão', route: '/pageprincipal/comissoes/calculo', icon: Calculator, isUpdated: true },
    { label: 'Perfil do Vendedor', route: '/pageprincipal/comissoes/perfil', icon: UserRound, isUpdated: true },
  ] },
  { label: 'Controladoria', route: '/pageprincipal/controladoria', icon: BookOpen, isUpdated: true, children: [
    { label: 'Lucratividade e Margens', route: '/pageprincipal/controladoria/lucratividade', icon: ClipboardList, isUpdated: true },
    { label: 'Razão Geral', route: '/pageprincipal/controladoria/razao-geral', icon: Landmark, isUpdated: true },
    { label: 'Cadastro de Decimais', route: '/pageprincipal/controladoria/cadastro-decimais', icon: Settings, isUpdated: true },
    { label: 'Estorno Documental', route: '/pageprincipal/controladoria/retificacao-assistente', icon: FileText, isUpdated: true },
    { label: 'Auditoria de Comissões', route: '/pageprincipal/controladoria/auditoria-comissoes', icon: Calculator, isUpdated: true },
  ] },
  { label: 'Principal', route: '/pageprincipal', icon: Home },
  { label: 'Cadastros Mestres', route: '/pageprincipal/cadastros/produtos', icon: Boxes, children: [
    { label: 'Cadastro de Produtos', route: '/pageprincipal/cadastros/produtos', icon: Boxes, isUpdated: true },
    { label: 'Ficha Técnica e Etiquetas', route: '/pageprincipal/cadastros/produtos/ficha-tecnica', icon: FileText, isUpdated: true },
    { label: 'Parâmetros de Código', route: '/pageprincipal/cadastros/produtos/parametros-codigo', icon: Barcode, isUpdated: true },
  ] },
  { label: 'RH / Departamento Pessoal', route: '/pageprincipal/rh', icon: Users, isUpdated: true },
  { label: 'Engenharia e PCP', route: '/pageprincipal/pcp', icon: Factory, children: [
    { label: 'Central PCP', route: '/pageprincipal/pcp', icon: ClipboardList },
    { label: 'Fichas de Processo', route: '/pageprincipal/pcp/fichas-processo', icon: ClipboardList, isUpdated: true },
    { label: 'Roteiro de Operações', route: '/pageprincipal/pcp/roteiros', icon: Route, isUpdated: true },
    { label: 'Carga e Capacidade', route: '/pageprincipal/pcp/capacidade', icon: BarChart3, isUpdated: true },
  ] },
  { label: 'Chão de Fábrica', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor, isUpdated: true, children: [
    { label: 'Portal do Operador', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor, isUpdated: true },
    { label: 'Postos de Trabalho', route: '/pageprincipal/chao-de-fabrica/postos', icon: ClipboardList, isUpdated: true },
  ] },
  { label: 'Estoque e Almoxarifado', route: '/pageprincipal/estoque/auditoria-saldos', icon: Warehouse, isUpdated: true, children: [
    { label: 'Auditoria de Saldos', route: '/pageprincipal/estoque/auditoria-saldos', icon: Scale, isUpdated: true },
    { label: 'Balanço de Estoque', route: '/pageprincipal/estoque/balanco', icon: Archive, isUpdated: true },
    { label: 'Regras de Depreciação', route: '/pageprincipal/estoque/depreciacao', icon: Percent, isUpdated: true },
  ] },
  { label: 'Qualidade / Paquímetro', route: '/pageprincipal/paquimetro', icon: Ruler, children: [
    { label: 'Paquímetro Digital', route: '/pageprincipal/paquimetro', icon: Ruler },
    { label: 'RPNC', route: '/pageprincipal/qualidade/rpnc', icon: ClipboardList, isUpdated: true },
    { label: 'Formulário RPNC (Ishikawa / 5 Porquês / CAPA)', route: '/pageprincipal/qualidade/rpnc-formulario', icon: FileText, isUpdated: true },
    { label: 'Auditorias da Qualidade', route: '/pageprincipal/qualidade/auditorias', icon: ShieldCheck, isUpdated: true },
    { label: 'GED / Documentos da Qualidade', route: '/pageprincipal/qualidade/ged', icon: FolderOpen, isUpdated: true },
  ] },
  { label: 'Compras', route: '/pageprincipal/compras', icon: ShoppingCart, isUpdated: true, children: [
    { label: 'Central de Compras', route: '/pageprincipal/compras', icon: ShoppingCart, isUpdated: true },
    { label: 'Solicitação de Compra', route: '/pageprincipal/compras/solicitacao', icon: FilePlus2, isUpdated: true },
    { label: 'Requisições de Compra', route: '/pageprincipal/compras/requisicoes', icon: ClipboardList, isUpdated: true },
  ] },
  { label: 'Configurações', route: '/pageprincipal/administracao-configuracoes', icon: Settings },
  { label: 'Configurações de Usuário', route: '/pageprincipal/configuracoes-usuario', icon: UserCog, isUpdated: true, minNivel: 8 },
  { label: 'Fiscal', route: '/pageprincipal/fiscal', icon: FileText, isUpdated: true, children: [
    { label: 'Central Fiscal', route: '/pageprincipal/fiscal', icon: FileText },
    { label: 'Ano Fiscal', route: '/pageprincipal/fiscal/ano', icon: BookOpen, isUpdated: true },
    { label: 'Classificação Fiscal', route: '/pageprincipal/fiscal/classificacao', icon: Landmark, isUpdated: true },
    { label: 'Auditoria Documental', route: '/pageprincipal/fiscal/auditoria-documental', icon: ShieldCheck, isUpdated: true },
    { label: 'Estorno de Lançamentos', route: '/pageprincipal/fiscal/estorno', icon: RotateCcw, isUpdated: true },
    { label: 'Painel Razão Geral', route: '/pageprincipal/fiscal/razao', icon: Scale, isUpdated: true },
  ] },
  { label: 'Central de Ajuda', route: '/pageprincipal/ajuda', icon: CircleHelp },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [moduleSearch, setModuleSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [pcpTabletOpen, setPcpTabletOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [sessionOperator, setSessionOperator] = useState('Usuário ERP')
  const [dataEpoch, setDataEpoch] = useState(0)
  const [sessionNivel, setSessionNivel] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (operatorName !== 'Usuário ERP') return
    void supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata
      if (typeof metadata?.nome === 'string' && metadata.nome.trim()) setSessionOperator(metadata.nome.trim())
      else if (data.user?.email) setSessionOperator(data.user.email)
    })
  }, [operatorName])

  // Nível administrativo da sessão: restringe itens do menu (ex.: Configurações de Usuário, nível 8/9).
  // É apenas sinalização visual; a concessão real continua no RLS e nas RPCs security definer.
  useEffect(() => {
    let ativo = true
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const usuario = await supabase
        .from('erp_usuarios')
        .select('nivel_admin')
        .eq('auth_user_id', data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle<{ nivel_admin: number }>()
      if (ativo) setSessionNivel(Number(usuario.data?.nivel_admin ?? 0))
    })()
    return () => { ativo = false }
  }, [])

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

  // Atualização automática por mudanças reais no banco, sem botão manual.
  // A mudança de dados remonta apenas a área de trabalho (recarrega as consultas da tela);
  // o navegador não é recarregado, para não perder a sessão nem o estado do shell.
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
        refreshTimer = window.setTimeout(() => setDataEpoch(value => value + 1), 900)
      })
      .subscribe()
    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [])

  const moduleLabel = pathname.startsWith('/pageprincipal/cadastros') ? 'Cadastros Mestres'
    : pathname.startsWith('/pageprincipal/comissoes') || pathname.startsWith('/comissoes') ? 'Comissões'
    : pathname.startsWith('/pageprincipal/controladoria') || pathname.startsWith('/controladoria') ? 'Controladoria'
    : pathname.startsWith('/pageprincipal/pcp') || pathname.startsWith('/pcp') ? 'Engenharia e PCP'
    : pathname.startsWith('/pageprincipal/chao-de-fabrica') ? 'Chão de Fábrica'
    : pathname.startsWith('/pageprincipal/estoque') ? 'Estoque e Almoxarifado'
    : pathname.startsWith('/pageprincipal/qualidade') ? 'Qualidade / Paquímetro'
    : pathname.startsWith('/pageprincipal/rh') || pathname.startsWith('/rh') ? 'RH / Departamento Pessoal'
    : pathname.startsWith('/pageprincipal/paquimetro') ? 'Qualidade / Paquímetro'
    : pathname.startsWith('/pageprincipal/compras') || pathname.startsWith('/compras') ? 'Compras'
    : pathname.startsWith('/pageprincipal/administracao-configuracoes') || pathname.startsWith('/configuracoes-adm') || pathname.startsWith('/administracao-configuracoes') ? 'Configurações'
    : pathname.startsWith('/pageprincipal/financeiro') || pathname.startsWith('/financeiro') ? 'Financeiro'
    : pathname.startsWith('/pageprincipal/fiscal') || pathname.startsWith('/fiscal') ? 'Fiscal'
    : null
  const visibleMenus: MenuItem[] = menus.filter(menu => menu.minNivel === undefined || sessionNivel >= menu.minNivel)
    .map(menu => (menu.children ? { ...menu, children: menu.children.filter(child => child.minNivel === undefined || sessionNivel >= child.minNivel) } : menu))
  const currentModuleMenu = moduleLabel
    ? visibleMenus.find(menu => menu.label === moduleLabel) ?? { label: moduleLabel, route: '/' + pathname.split('/')[1], icon: Home }
    : undefined
  const current = currentModuleMenu ?? visibleMenus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
  const normalizedSearch = moduleSearch.trim().toLocaleLowerCase('pt-BR')
  const searchedMenus = normalizedSearch ? visibleMenus.map(menu => ({ ...menu, children: menu.children?.filter(child => child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) })).filter(menu => menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.route.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || Boolean(menu.children?.length)) : visibleMenus
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
    go(item.route)
  }

  const contextualHelp = pathname.startsWith('/pcp/mrp-ii')
    ? { title: 'MRP II — Planejamento de materiais', purpose: 'Calcular necessidades de materiais a partir da demanda, estrutura dos produtos, estoque e ordens existentes. Esta tela não é a agenda de máquinas.', steps: ['Confirme que produtos, fichas técnicas/estruturas e saldos de estoque estão atualizados.', 'Execute o cálculo MRP e confira as necessidades líquidas por componente.', 'Revise as sugestões de comprar ou produzir antes de gerar ordens planejadas.'], fields: ['Produto/demanda: item acabado e quantidade a planejar.', 'Horizonte/data: período considerado no planejamento.', 'Necessidade líquida: quantidade que falta após estoque e reservas.', 'Sugestão: comprar ou produzir; confira antes de confirmar.'] }
    : pathname.startsWith('/pcp/agenda-maquinas')
    ? { title: 'Agenda de máquinas', purpose: 'Distribuir ordens de produção por máquina e horário, respeitando jornada e conflitos de programação.', steps: ['Escolha a semana e a máquina.', 'Selecione uma célula do calendário para abrir a programação.', 'Informe OP, quantidade e início/fim dentro da jornada configurada.', 'Salve e confira o bloco da OP no calendário.'], fields: ['Ordem de produção: selecione uma OP aberta real.', 'Molde: escolha o ferramental cadastrado quando aplicável.', 'Quantidade programada: peças previstas para este intervalo.', 'Início/fim: horários dentro do mesmo dia e da jornada.', 'Calendário: dias e horários habituais da empresa.'] }
    : pathname.startsWith('/pcp/capacidade') || pathname.endsWith('/pcp/capacidade')
    ? { title: 'Carga de máquina e capacidade', purpose: 'Comparar a capacidade semanal cadastrada por equipamento com a carga real das OPs abertas da empresa autenticada.', steps: ['Confira horas por dia e dias por semana de cada máquina ativa.', 'Grave a capacidade por equipamento e valide a capacidade semanal calculada.', 'Compare a carga das OPs abertas e a ocupação antes de replanejar a agenda.', 'Exporte a auditoria em CSV quando precisar do registro do levantamento.'], fields: ['Horas/dia: horas produtivas planejadas por dia (0,01 a 24).', 'Dias/semana: dias planejados por semana (1 a 7).', 'Capacidade semanal: horas/dia × dias/semana.', 'Carga: soma do tempo estimado das OPs abertas vinculadas à máquina.', 'Ocupação: carga ÷ capacidade semanal; âmbar a partir de 85% e vermelho acima de 100%.'] }
    : pathname.startsWith('/pcp')
    ? { title: 'PCP — Planejamento e controle da produção', purpose: 'Transformar demanda em ordens, acompanhar execução, apontamentos e necessidades de materiais.', steps: ['Consulte demanda e ordens abertas.', 'Confira materiais e capacidade.', 'Programe e libere somente ordens válidas.', 'Registre quantidades boas, refugo, setup e paradas na execução.'], fields: ['Produto e quantidade: definem o que fabricar.', 'Data prevista/prioridade: orientam a fila.', 'Máquina/centro: recurso responsável.', 'Status: etapa real da ordem; altere apenas após a operação correspondente.'] }
    : pathname.startsWith('/vendas/novo-pedido')
    ? { title: 'Novo pedido de venda', purpose: 'Registrar a solicitação comercial e os itens do cliente com valores e prazo conferidos.', steps: ['Selecione o cliente cadastrado.', 'Adicione produtos e quantidades.', 'Confira preço, desconto, total e entrega.', 'Salve e acompanhe o status do pedido.'], fields: ['Cliente: cadastro da empresa compradora.', 'Produto: item cadastrado e vendável.', 'Quantidade: volume solicitado.', 'Preço/desconto: valores autorizados comercialmente.', 'Entrega: data prometida acordada com o cliente.'] }
    : pathname.startsWith('/vendas')
    ? { title: 'Vendas', purpose: 'Consultar pedidos, clientes, prazos e andamento comercial.', steps: ['Use a pesquisa para localizar pedido ou cliente.', 'Aplique filtros de status e período.', 'Abra o pedido para conferir itens e histórico.'], fields: ['Pesquisa: número do pedido ou nome/código.', 'Status: etapa atual do fluxo.', 'Período: intervalo usado no relatório.', 'Cliente: referência ao cadastro comercial.'] }
    : pathname.startsWith('/compras')
    ? { title: 'Compras', purpose: 'Gerir solicitações, cotações, pedidos, aprovações e recebimentos.', steps: ['Confira fornecedor e especificação.', 'Informe itens, quantidades, preços e prazo.', 'Envie para aprovação conforme permissão.', 'Acompanhe recebimento e conferência fiscal.'], fields: ['Fornecedor: parceiro cadastrado.', 'Item/quantidade/unidade: o que será comprado.', 'Preço e condição: termos negociados.', 'Prazo: entrega acordada.', 'Centro de custo/local: destino da compra.'] }
    : pathname.includes('/cadastros')
    ? { title: 'Cadastro mestre de produtos', purpose: 'Manter identificação, dados fiscais, estoque, dimensional e produção do produto, sempre isolados pela empresa autenticada.', steps: ['Pesquise o produto por código, nome ou referência.', 'Selecione o registro e ative a edição antes de alterar campos.', 'Preencha os campos com valores já cadastrados nas fontes oficiais (grupo, unidade, NCM, máquina).', 'Grave e confirme a mensagem de resultado; use IMPRIMIR FICHA TÉCNICA para o documento em A4.'], fields: ['Código/nome: identificação do produto na empresa.', 'Unidade de compra/venda: como o item entra e sai do estoque.', 'NCM, CEST, CST/CSOSN e CFOP: classificação usada pelo módulo Fiscal.', 'Estoque atual, ponto de reposição e máximo: saldos e gatilhos de compra.', 'Peso e dimensões: base para logística e custo de transporte.'] }
    : pathname.startsWith('/qualidade')
    ? { title: 'Qualidade', purpose: 'Registrar não conformidades, evidências, causa raiz, ações corretivas e validação.', steps: ['Identifique produto, lote, processo e ocorrência.', 'Descreva o problema e a contenção imediata.', 'Registre causa raiz e plano de ação.', 'Anexe evidências e conclua após validar eficácia.'], fields: ['RPNC: registro da não conformidade.', 'Lote/produto: rastreabilidade afetada.', 'Causa raiz: causa comprovada, não apenas o sintoma.', 'Ação/responsável/prazo: plano verificável.', 'Evidência: documento ou registro que comprova a eficácia.'] }
    : { title: 'Ajuda da tela atual', purpose: 'Use esta ajuda para entender a finalidade da tela e o preenchimento dos campos mais comuns.', steps: ['Leia a finalidade antes de alterar dados.', 'Preencha campos obrigatórios com registros existentes.', 'Revise os dados e salve; confirme a mensagem de resultado.', 'Use a Central de Ajuda para consultar procedimentos do módulo.'], fields: ['Pesquisa: localiza registros existentes.', 'Filtros: limitam os resultados exibidos.', 'Status: indica a etapa do processo.', 'Salvar: grava dados reais; se houver erro, corrija a mensagem apresentada.'] }

  // Card de abertura obrigatório de toda tela: catálogo curado primeiro e,
  // para telas de menu ainda sem verbete, o rótulo do menu + a finalidade da ajuda.
  const menuLeafLabel = current?.children?.find(child => child.route === pathname)?.label ?? current?.label
  const contextualPurpose = contextualHelp.title === 'Ajuda da tela atual' ? undefined : contextualHelp.purpose
  const pageIntro = hasNativeIntroCard(pathname)
    ? null
    : resolvePageIntro(pathname) ?? fallbackPageIntro({ module: current?.label, label: menuLeafLabel, purpose: contextualPurpose })

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
                const hasNewItems = Boolean(menu.isNew || menu.children?.some(child => child.isNew))
                const expanded = openMenu === menu.label || Boolean(normalizedSearch && menu.children?.length)
                return <div className="erp-windows-menu-group" key={menu.label}>
                  <div className={`erp-windows-menu-row ${current?.label === menu.label ? 'is-active' : ''} ${hasNewItems ? 'has-new' : ''} ${menu.isUpdated ? 'is-updated-orange' : ''}`}>
                    <button type="button" className="erp-windows-menu-main" title={hasNewItems ? 'Este módulo contém telas novas' : undefined} onClick={() => {
                      if (menu.action === 'pcpTablet') { setStartMenuOpen(false); openMenuItem(menu) }
                      else if (hasChildren) { setOpenMenu(value => value === menu.label ? null : menu.label);  }
                      else { setStartMenuOpen(false); openMenuItem(menu) }
                    }}>
                      <Icon size={16} className={menu.isUpdated ? 'is-updated-orange-icon' : hasNewItems ? 'is-new-icon' : undefined} /><span>{menu.label}</span>
                    </button>
                    {hasChildren && <button type="button" className="erp-windows-menu-expand" aria-label={`Expandir ${menu.label}`} aria-expanded={expanded} onClick={() => { setOpenMenu(value => value === menu.label ? null : menu.label);  }}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>}
                  </div>
                  {hasChildren && expanded && <div className="erp-windows-menu-children">
                    {menu.children?.filter(child => !normalizedSearch || child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)).map(child => { const ChildIcon = child.icon; const active = pathname === child.route; return <button type="button" key={child.label + child.route} className={`${active ? (child.route === '/compras/rfq' ? 'is-active is-rfq-active' : 'is-active') : ''}${child.isNew ? ' is-new' : ''}${child.isUpdated ? ' is-updated-orange' : ''}`} onClick={() => { setStartMenuOpen(false); if (child.action) openMenuItem(child); else go(child.route) }} title={child.isNew ? 'Tela nova' : undefined}>{ChildIcon && <ChildIcon size={14} className={child.isNew ? 'is-new-icon' : undefined} />}<span>{child.label}</span></button> })}
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
      <aside className={`erp-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`} aria-label="Navegação principal">
        <div className="erp-sidebar-brand">
          <span className="erp-sidebar-mark" aria-hidden="true">S</span>
          {!sidebarCollapsed && <span><strong>SYSNQRA</strong><small>ERP INDUSTRIAL</small></span>}
          <button type="button" className="erp-sidebar-collapse" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>{sidebarCollapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}</button>
        </div>
        {!sidebarCollapsed && <label className="erp-sidebar-search"><Search size={14}/><input value={moduleSearch} onChange={event => setModuleSearch(event.target.value)} placeholder="Buscar módulo..." aria-label="Buscar módulo"/>{moduleSearch && <button type="button" onClick={() => setModuleSearch('')} aria-label="Limpar busca"><X size={12}/></button>}</label>}
        <nav className="erp-sidebar-nav">
          {searchedMenus.map(menu => {
            const Icon = menu.icon ?? Home;
            const expanded = openMenu === menu.label || Boolean(normalizedSearch && menu.children?.length);
            const active = current?.label === menu.label || pathname === menu.route || pathname.startsWith(menu.route + '/');
            return <div className="erp-sidebar-group" key={menu.label}>
              <div className={`erp-sidebar-item ${active ? 'is-active' : ''} ${menu.isUpdated ? 'is-updated' : ''}`}>
                <button type="button" className="erp-sidebar-main" title={sidebarCollapsed ? menu.label : undefined} onClick={() => {
                  if (menu.children?.length && !sidebarCollapsed) setOpenMenu(value => value === menu.label ? null : menu.label);
                  else if (menu.children?.length) { setSidebarCollapsed(false); setOpenMenu(menu.label); }
                  else { setOpenMenu(null); openMenuItem(menu); }
                }}>
                  <Icon size={18}/>{!sidebarCollapsed && <span>{menu.label}</span>}
                  {!sidebarCollapsed && menu.isUpdated && <i className="erp-sidebar-update-dot" aria-label="Módulo atualizado"/>}
                </button>
                {!sidebarCollapsed && menu.children?.length ? <button type="button" className="erp-sidebar-expand" aria-label={`Expandir ${menu.label}`} aria-expanded={expanded} onClick={() => setOpenMenu(value => value === menu.label ? null : menu.label)}>{expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button> : null}
              </div>
              {!sidebarCollapsed && menu.children?.length && expanded && <div className="erp-sidebar-children">
                {menu.children.map(child => { const ChildIcon = child.icon; const childActive = pathname === child.route; return <button type="button" key={child.label + child.route} className={`erp-sidebar-child ${childActive ? 'is-active' : ''} ${child.isUpdated ? 'is-updated' : ''}`} onClick={() => openMenuItem(child)}>{ChildIcon && <ChildIcon size={14}/>}<span>{child.label}</span></button>; })}
              </div>}
            </div>;
          })}
          {searchedMenus.length === 0 && !sidebarCollapsed && <p className="erp-sidebar-empty">Nenhum módulo encontrado.</p>}
        </nav>
        <div className="erp-sidebar-footer">
          <button type="button" onClick={() => { setHelpOpen(true); }} title="Ajuda contextual"><CircleHelp size={17}/>{!sidebarCollapsed && <span>Ajuda da tela</span>}</button>
          <button type="button" onClick={() => navigate('/pageprincipal/administracao-configuracoes')} title="Configurações"><Settings size={17}/>{!sidebarCollapsed && <span>Configurações</span>}</button>
          <div className="erp-sidebar-user"><UserRound size={17}/>{!sidebarCollapsed && <span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span>}</div>
          <button type="button" onClick={() => void logout()} title="Sair"><LogOut size={17}/>{!sidebarCollapsed && <span>Sair</span>}</button>
        </div>
      </aside>
      <main key={`erp-workspace-${dataEpoch}`} className={`erp-horizontal-workspace${pathname.startsWith('/fiscal') || pathname.includes('/nfe') || pathname.startsWith('/vendas/fiscal') || pathname.includes('nota-fiscal') ? ' erp-horizontal-workspace-fiscal' : ' erp-horizontal-workspace-compact'}`}>
        {pageIntro && <PageIntroCard {...pageIntro} />}
        {children}
      </main>
      <PCPTabletMenuModal isOpen={pcpTabletOpen} onClose={() => setPcpTabletOpen(false)} onNavigate={(route) => { setPcpTabletOpen(false); go(route) }} />


      <style>{`
        .erp-horizontal-shell{display:grid;grid-template-columns:248px minmax(0,1fr);grid-template-rows:48px minmax(0,1fr);min-height:100vh;background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%);color:#123b50}
        .erp-windows-topbar{grid-column:1/-1;grid-row:1;position:sticky;top:0}
        .erp-sidebar{grid-column:1;grid-row:2;position:sticky;top:48px;height:calc(100vh - 48px);min-height:480px;display:flex;flex-direction:column;overflow:hidden;background:#123b50;color:#f8fafc;border-right:1px solid #0b2c3d;z-index:1200;transition:width .18s ease}
        .erp-sidebar.is-collapsed{width:72px}
        .erp-sidebar-brand{height:62px;min-height:62px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.12)}
        .erp-sidebar-mark{width:34px;height:34px;display:grid;place-items:center;flex:0 0 34px;border-radius:8px;background:#2d8db8;color:white;font-size:19px;font-weight:900}
        .erp-sidebar-brand>span:nth-child(2){display:flex;min-width:0;flex:1;flex-direction:column;line-height:1.15}.erp-sidebar-brand strong{font-size:12px;letter-spacing:.08em}.erp-sidebar-brand small{margin-top:3px;font-size:8px;letter-spacing:.12em;color:#b8d7e4}
        .erp-sidebar-collapse{width:27px;height:27px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:transparent;color:#fff;cursor:pointer}
        .erp-sidebar-search{height:34px;min-height:34px;margin:10px 9px;display:flex;align-items:center;gap:7px;padding:0 9px;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:rgba(255,255,255,.08);color:#c7e2ed}
        .erp-sidebar-search input{width:100%;min-width:0;border:0!important;outline:0!important;background:transparent!important;color:white!important;font-size:10px!important;box-shadow:none!important}.erp-sidebar-search input::placeholder{color:#b8d0dc}
        .erp-sidebar-search button{border:0;background:transparent;color:white;cursor:pointer}
        .erp-sidebar-nav{flex:1;min-height:0;overflow:auto;padding:4px 7px 12px;scrollbar-width:thin;scrollbar-color:#4d7c91 transparent}
        .erp-sidebar-item{min-height:39px;display:flex;align-items:center;margin:2px 0;border:1px solid transparent;border-radius:5px}
        .erp-sidebar-item.is-active{background:rgba(72,183,199,.17);border-color:rgba(72,183,199,.35)}
        .erp-sidebar-item.is-updated{border-left:3px solid #f97316;background:rgba(249,115,22,.09)}
        .erp-sidebar-main{flex:1;min-width:0;height:37px;display:flex;align-items:center;gap:10px;padding:0 9px;border:0;background:transparent;color:#e9f4f8;text-align:left;font-size:11px;cursor:pointer}
        .erp-sidebar-main>svg{flex:0 0 auto;color:#9ed7e5}.erp-sidebar-main span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-sidebar-item.is-active .erp-sidebar-main{color:#fff;font-weight:800}.erp-sidebar-item.is-active .erp-sidebar-main>svg{color:#48b7c7}
        .erp-sidebar-item.is-updated .erp-sidebar-main>svg{color:#fb923c}.erp-sidebar-update-dot{width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:#f97316}
        .erp-sidebar-expand{width:27px;height:34px;display:grid;place-items:center;border:0;background:transparent;color:#c5dce5;cursor:pointer}
        .erp-sidebar-children{margin:1px 0 5px 20px;padding:3px 0 3px 9px;border-left:1px solid rgba(157,205,220,.35)}
        .erp-sidebar-child{width:100%;min-height:31px;display:flex;align-items:center;gap:8px;padding:5px 7px;border:0;border-radius:4px;background:transparent;color:#c8dce4;text-align:left;font-size:10px;cursor:pointer}
        .erp-sidebar-child span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.erp-sidebar-child>svg{flex:0 0 auto}
        .erp-sidebar-child:hover,.erp-sidebar-child.is-active{background:rgba(72,183,199,.18);color:#fff}.erp-sidebar-child.is-updated{color:#fdba74}
        .erp-sidebar-footer{display:flex;flex-direction:column;gap:3px;padding:8px 7px;border-top:1px solid rgba(255,255,255,.12)}
        .erp-sidebar-footer>button,.erp-sidebar-user{min-height:35px;display:flex;align-items:center;gap:10px;padding:0 10px;border:0;border-radius:5px;background:transparent;color:#e4f0f4;text-align:left;font-size:10px;cursor:pointer}
        .erp-sidebar-footer>button:hover{background:rgba(255,255,255,.1)}.erp-sidebar-footer span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.erp-sidebar-user{color:#a9cbd8;border-top:1px solid rgba(255,255,255,.1);border-radius:0}
        .erp-horizontal-workspace{grid-column:2;grid-row:2;width:100%;max-width:100%;min-width:0;min-height:calc(100vh - 48px);padding:8px;box-sizing:border-box;background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%)}
        @media(max-width:900px){.erp-horizontal-shell{grid-template-columns:210px minmax(0,1fr)}.erp-sidebar-brand{padding:0 8px}}
        @media(max-width:650px){.erp-horizontal-shell{grid-template-columns:54px minmax(0,1fr)}.erp-sidebar{width:54px;position:sticky}.erp-sidebar:not(.is-collapsed){position:fixed;left:0;top:48px;width:min(248px,86vw);height:calc(100vh - 48px);z-index:2000;box-shadow:8px 0 24px rgba(15,23,42,.24)}.erp-sidebar.is-collapsed{width:54px}.erp-sidebar:not(.is-collapsed) .erp-sidebar-brand{justify-content:flex-start;padding:0 8px}.erp-sidebar:not(.is-collapsed) .erp-sidebar-brand>span:nth-child(2),.erp-sidebar:not(.is-collapsed) .erp-sidebar-collapse,.erp-sidebar:not(.is-collapsed) .erp-sidebar-search,.erp-sidebar:not(.is-collapsed) .erp-sidebar-footer span{display:flex}.erp-sidebar:not(.is-collapsed) .erp-sidebar-search{display:flex}.erp-sidebar:not(.is-collapsed) .erp-sidebar-main{justify-content:flex-start;padding:0 9px}.erp-sidebar:not(.is-collapsed) .erp-sidebar-expand,.erp-sidebar:not(.is-collapsed) .erp-sidebar-children{display:flex}.erp-sidebar:not(.is-collapsed) .erp-sidebar-children{display:block}.erp-sidebar:not(.is-collapsed) .erp-sidebar-footer>button,.erp-sidebar:not(.is-collapsed) .erp-sidebar-user{justify-content:flex-start;padding:0 10px}.erp-sidebar.is-collapsed .erp-sidebar-brand{justify-content:center;padding:0 5px}.erp-sidebar.is-collapsed .erp-sidebar-brand>span:nth-child(2),.erp-sidebar.is-collapsed .erp-sidebar-collapse,.erp-sidebar.is-collapsed .erp-sidebar-search,.erp-sidebar.is-collapsed .erp-sidebar-footer span{display:none}.erp-sidebar.is-collapsed .erp-sidebar-main{justify-content:center;padding:0 5px}.erp-sidebar.is-collapsed .erp-sidebar-expand,.erp-sidebar.is-collapsed .erp-sidebar-children{display:none}.erp-sidebar.is-collapsed .erp-sidebar-footer>button,.erp-sidebar.is-collapsed .erp-sidebar-user{justify-content:center;padding:0}.erp-sidebar-item{min-height:40px}.erp-horizontal-workspace{padding:6px}}
        @media print{.erp-sidebar{display:none!important}.erp-horizontal-shell{display:block!important}.erp-horizontal-workspace{min-height:0!important}}

      `}</style>
    </div>
  )
}
