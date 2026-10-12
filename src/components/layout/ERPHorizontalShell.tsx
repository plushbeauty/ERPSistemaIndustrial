import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, ChevronDown, Search, UserRound, ChevronRight, CalendarRange, FileSliders, ShieldCheck, FolderGit2, LineChart, Home, Database, ShoppingCart, Truck, Package, Wallet, FileText, Factory, Wrench, BarChart3, Settings, ClipboardCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type MenuItem = {
  label: string
  route: string
  icon?: LucideIcon
  children?: MenuItem[]
}

const menus: MenuItem[] = [
  { label: 'Início', route: '/erp-industrial', icon: Home },
  { label: 'Cadastros', route: '/produtos-vendas', icon: Database, children: [
    { label: 'Produtos', route: '/produtos-vendas' },
    { label: 'Clientes', route: '/vendas/clientes' },
    { label: 'Fornecedores', route: '/compras/fornecedores' },
  ] },
  { label: 'Vendas', route: '/vendas', icon: ShoppingCart, children: [
    { label: 'Dashboard comercial', route: '/vendas' },
    { label: 'Status do pedido', route: '/vendas/status' },
    { label: 'Novo pedido', route: '/vendas/novo-pedido' },
    { label: 'PDV / venda rápida', route: '/vendas/pdv' },
    { label: 'Catálogo digital', route: '/vendas/catalogo-digital' },
    { label: 'Gestão do catálogo', route: '/vendas/catalogo-digital/gestao' },
    { label: 'Clientes', route: '/vendas/clientes' },
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
    { label: 'Fornecedores', route: '/compras/fornecedores' },
    { label: 'Relatórios', route: '/compras/relatorios' },
  ] },
  { label: 'Estoque', route: '/estoque', icon: Package },
  { label: 'Financeiro', route: '/financeiro/custo-padrao', icon: Wallet },
  { label: 'Fiscal', route: '/fiscal', icon: FileText },
  { label: 'Manufatura / PCP', route: '/pcp', icon: Factory, children: [
    { label: 'Visão geral do PCP', route: '/pcp' },
    { label: 'Ordens de produção', route: '/pcp/ordens-industriais' },
    { label: 'Agenda de Máquinas', route: '/pcp/agenda-maquinas', icon: CalendarRange },
    { label: 'Capacidade / Gantt', route: '/pcp/capacidade' },
    { label: 'Sequenciamento', route: '/pcp/sequenciamento' },
    { label: 'MRP II', route: '/pcp/mrp-ii' },
    { label: 'Fichas de Processo', route: '/pcp/fichas-processo', icon: FileSliders, children: [
      { label: 'Prensados', route: '/pcp/fichas-processo?tipo=PRENSADOS' },
      { label: 'Injetados', route: '/pcp/fichas-processo?tipo=INJETADOS' },
      { label: 'Estampos', route: '/pcp/fichas-processo?tipo=ESTAMPARIA' },
      { label: 'Corte e Vinco', route: '/pcp/fichas-processo?tipo=CORTE_VINCO' },
      { label: 'Mecânica', route: '/pcp/fichas-processo?tipo=MECANICA' },
      { label: 'Tratamento superficial', route: '/pcp/fichas-processo?tipo=TRATAMENTO_SUPERFICIAL' },
      { label: 'Pintura / Química', route: '/pcp/fichas-processo?tipo=PINTURA_QUIMICA' },
    ] },
  ] },
  { label: 'Gestão da Qualidade', route: '/qualidade', icon: ShieldCheck },
  { label: 'Manutenção', route: '/manutencao', icon: Wrench },
  { label: 'Relatórios', route: '/relatorios', icon: BarChart3 },
  { label: 'Configuração', route: '/configuracoes-adm', icon: Settings },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [sessionOperator, setSessionOperator] = useState(operatorName)
  const [sessionEmail, setSessionEmail] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active || error || !data.user) return
      const metadata = data.user.user_metadata
      const metadataName = [metadata?.nome, metadata?.name, metadata?.full_name].find(value => typeof value === 'string' && value.trim())
      let resolvedName = typeof metadataName === 'string' ? metadataName.trim() : data.user.email || 'Usuário autenticado'
      if (operatorName !== 'Usuário ERP' && operatorName.trim()) resolvedName = operatorName.trim()
      else {
        const { data: profile } = await supabase
          .from('erp_usuarios')
          .select('nome')
          .eq('auth_user_id', data.user.id)
          .is('deleted_at', null)
          .maybeSingle()
        if (active && typeof profile?.nome === 'string' && profile.nome.trim()) resolvedName = profile.nome.trim()
      }
      if (active) {
        setSessionOperator(resolvedName)
        setSessionEmail(data.user.email || '')
      }
    })
    return () => { active = false }
  }, [operatorName])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = menus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
  useEffect(() => {
    setOpenMenu(null)
  }, [pathname])
  const flattenMenu = (items: MenuItem[], prefix = ''): Array<{ label: string; route: string }> => items.flatMap(item => [
    { label: prefix ? `${prefix} / ${item.label}` : item.label, route: item.route },
    ...(item.children ? flattenMenu(item.children, prefix ? `${prefix} / ${item.label}` : item.label) : []),
  ])
  const filtered = search.trim()
    ? flattenMenu(menus).filter(item => item.label.toLowerCase().includes(search.trim().toLowerCase()))
    : []

  const routeItems = flattenMenu(menus).sort((a, b) => b.route.split('?')[0].length - a.route.split('?')[0].length)
  const activePage = routeItems.find(item => pathname === item.route.split('?')[0] || pathname.startsWith(item.route.split('?')[0] + '/'))
  const pageLabel = activePage?.label.split(' / ').slice(-1)[0] || current?.label || 'Área de trabalho'
  const pageDescription = pathname.startsWith('/qualidade')
    ? 'Acompanhe indicadores, inspeções, não conformidades e documentos do Sistema de Gestão da Qualidade da empresa autenticada.'
    : pathname.startsWith('/vendas')
      ? 'Consulte pedidos, acompanhe prazos e status comerciais e registre operações de venda com os dados reais da empresa.'
      : pathname.startsWith('/compras')
        ? 'Consulte solicitações, fornecedores, pedidos de compra e recebimentos para acompanhar o abastecimento da operação.'
        : pathname.startsWith('/estoque')
          ? 'Consulte saldos e movimentações e registre operações de estoque respeitando os dados e permissões da empresa.'
          : pathname.startsWith('/financeiro')
            ? 'Consulte e acompanhe os registros financeiros da empresa, com filtros e ações disponíveis para seu perfil.'
            : pathname.startsWith('/fiscal') || pathname.includes('/nfe')
              ? 'Consulte documentos e operações fiscais da empresa e acompanhe seus estados de processamento.'
              : pathname.startsWith('/pcp')
                ? 'Planeje e acompanhe ordens, capacidade, sequenciamento e apontamentos da produção industrial.'
                : pathname.startsWith('/manutencao')
                  ? 'Consulte ativos, programação e registros de manutenção para acompanhar a disponibilidade operacional.'
                  : pathname.startsWith('/engenharia')
                    ? 'Consulte cadastros técnicos, estruturas e roteiros usados nos processos industriais.'
                    : pathname.startsWith('/rh')
                      ? 'Consulte os cadastros e rotinas de pessoal autorizados para a empresa autenticada.'
                      : pathname.startsWith('/config')
                        ? 'Consulte e mantenha as configurações disponíveis para seu perfil e para a empresa autenticada.'
                        : 'Consulte e acompanhe as informações operacionais deste módulo usando os registros reais da empresa autenticada.'

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

  const go = (route: string) => {
    setOpenMenu(null)
    setOpenSubMenu(null)
    setSearch('')
    navigate(route)
  }

  return (
    <div className="erp-horizontal-shell" ref={ref}>
      <header className="erp-horizontal-header">
        <button className="erp-horizontal-brand" type="button" onClick={() => go('/erp-industrial')} title="Início">
          <img src="/logo/sgq-erp.png" alt="Logotipo SGQERP Industrial" />
          <span className="erp-horizontal-brand-copy"><strong>SGQERP INDUSTRIAL</strong><small>SISTEMA DE GESTÃO INDUSTRIAL</small></span>
        </button>

        <div className="erp-horizontal-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Pesquisar módulos..."
            aria-label="Pesquisar módulos"
          />
          {filtered.length > 0 && (
            <div className="erp-horizontal-search-results">
              {filtered.slice(0, 8).map(item => (
                <button key={item.route} type="button" onClick={() => go(item.route)}>{item.label}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{position:"relative"}}><button type="button" className="erp-horizontal-help" title="Ajuda" onClick={()=>setHelpOpen(v=>!v)} aria-expanded={helpOpen}><CircleHelp size={15} /> Ajuda</button>{helpOpen&&<div role="dialog" aria-label="Ajuda contextual da tela" style={{position:"absolute",right:0,top:34,zIndex:1200,width:"min(370px,90vw)",maxHeight:"75vh",overflowY:"auto",padding:"10px 12px",border:"1px solid #b9cbd3",borderRadius:2,background:"#fff",boxShadow:"0 6px 16px rgba(18,59,80,.16)",fontSize:10,lineHeight:1.45,color:"#173b4a"}}><strong>{contextualHelp.title}</strong><p style={{margin:"5px 0"}}>{contextualHelp.purpose}</p><strong>Como usar</strong><ol style={{margin:"4px 0 7px",paddingLeft:17}}>{contextualHelp.steps.map((step,index)=><li key={index} style={{marginBottom:3}}>{step}</li>)}</ol><strong>Campos e preenchimento</strong><ul style={{margin:"4px 0 8px",paddingLeft:15}}>{contextualHelp.fields.map((field,index)=><li key={index} style={{marginBottom:3}}>{field}</li>)}</ul><div style={{borderTop:"1px solid #e2e8f0",paddingTop:7,color:"#647b85"}}>Tela atual: {pathname}</div><button type="button" onClick={()=>{setHelpOpen(false);navigate("/ajuda")}} style={{marginTop:7,height:28,padding:"0 9px",border:"1px solid #2D8DB8",background:"#2D8DB8",color:"#fff",borderRadius:2,cursor:"pointer"}}>Abrir Central de Ajuda</button></div>}</div>

        <div className="erp-horizontal-session" aria-label="Sessão autenticada">
          <UserRound size={18} aria-hidden="true" />
          <div className="erp-horizontal-session-identity">
            <strong title={sessionOperator}>{sessionOperator || 'Usuário autenticado'}</strong>
            <span title={sessionEmail}>{sessionEmail || 'Sessão autenticada'}</span>
          </div>
          <time dateTime={now.toISOString()}>
            <span>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)}</span>
            <strong>{new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(now)}</strong>
          </time>
        </div>
      </header>

      <nav className="erp-horizontal-menu" aria-label="Menu principal do ERP">
        {menus.map(menu => {
          const hasChildren = Boolean(menu.children?.length)
          const active = current?.label === menu.label
          const expanded = openMenu === menu.label
          return <div className="erp-horizontal-menu-item" key={menu.label}>
            <button
              type="button"
              className={`erp-horizontal-menu-button ${active ? 'is-active' : ''}`}
              onClick={() => hasChildren ? setOpenMenu(value => value === menu.label ? null : menu.label) : go(menu.route)}
              aria-expanded={hasChildren ? expanded : undefined}
            >
              {menu.icon && <menu.icon size={16} />}{menu.label}
              {hasChildren && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
            </button>
            {hasChildren && expanded && <div className="erp-horizontal-dropdown">
              {menu.children?.map(child => {
                const childActive = pathname === child.route || pathname.startsWith(child.route + '/')
                const childHasChildren = Boolean(child.children?.length)
                const childExpanded = openSubMenu === child.label
                return <div className="erp-horizontal-dropdown-item" key={child.label}>
                  <button
                    type="button"
                    className={childActive ? 'is-active' : ''}
                    aria-expanded={childHasChildren ? childExpanded : undefined}
                    onClick={() => childHasChildren ? setOpenSubMenu(value => value === child.label ? null : child.label) : go(child.route)}
                  >{child.icon && <child.icon size={12} />}{child.label}{childHasChildren && <ChevronRight size={12} />}</button>
                  {childHasChildren && childExpanded && <div className="erp-horizontal-subdropdown">
                    {child.children?.map(sub => <button type="button" key={sub.route} className={pathname === sub.route.split('?')[0] && window.location.search === (sub.route.includes('?') ? `?${sub.route.split('?')[1]}` : '') ? 'is-active' : ''} onClick={() => go(sub.route)}>{sub.label}</button>)}
                  </div>}
                </div>
              })}
            </div>}
          </div>
        })}
      </nav>
      <section className="erp-global-page-description" aria-label="Descrição da tela">
        <span>{pageLabel.toLocaleUpperCase('pt-BR')}</span>
        <p>{pageDescription}</p>
      </section>
      <main className={`erp-horizontal-workspace${pathname.startsWith('/fiscal') || pathname.includes('/nfe') || pathname.startsWith('/vendas/fiscal') || pathname.includes('nota-fiscal') ? ' erp-horizontal-workspace-fiscal' : ' erp-horizontal-workspace-compact'}`}>
        {children}
      </main>

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:linear-gradient(135deg,#eaf4f8 0%,#f3f8fb 42%,#e8f1f6 100%);color:#123b50}
        .erp-horizontal-brand{min-width:245px!important;gap:12px!important;padding:0 10px!important}
        .erp-horizontal-brand img{width:64px!important;height:56px!important;max-width:100%;object-fit:contain;flex:0 0 auto}
        .erp-horizontal-brand strong{font-size:13px!important;letter-spacing:.035em;white-space:nowrap}
        .erp-global-page-description{display:flex;align-items:center;gap:10px;min-height:34px;padding:5px 12px;border-bottom:1px solid #c3d9e3;background:linear-gradient(90deg,#dcecf3 0%,#edf6fa 55%,#e2f0f5 100%);color:#315466;box-sizing:border-box}
        .erp-global-page-description>span{flex:0 0 auto;color:#17445a;font-size:9px;font-weight:700;letter-spacing:.08em}
        .erp-global-page-description>p{margin:0;font-size:10px;line-height:1.35;color:#315466}
        @media(max-width:950px){.erp-horizontal-brand{min-width:0!important;gap:6px!important;padding:0 4px!important}.erp-horizontal-brand img{width:54px!important;height:48px!important}.erp-horizontal-brand strong{font-size:11px!important}}
        @media(max-width:700px){.erp-global-page-description{align-items:flex-start;flex-direction:column;gap:2px;padding:5px 8px}.erp-global-page-description>p{font-size:9px}.erp-horizontal-brand img{width:48px!important;height:44px!important}}

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
        .erp-horizontal-header{height:72px;min-height:72px;display:flex;align-items:center;gap:14px;padding:5px 14px;background:linear-gradient(90deg,#123b50 0%,#17445a 45%,#236f93 100%);border-bottom:2px solid #2D8DB8;box-sizing:border-box}
        .erp-horizontal-brand{height:60px;min-width:300px;display:flex;align-items:center;gap:12px;border:0;background:transparent;color:#fff;cursor:pointer;padding:0 6px;white-space:nowrap;flex:0 0 auto}
        .erp-horizontal-brand img{display:block!important;height:58px!important;width:168px!important;min-width:168px;max-width:168px!important;object-fit:contain;object-position:left center;flex:0 0 168px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.16))}
        .erp-horizontal-brand-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
        .erp-horizontal-brand strong{display:block;font-size:14px;font-weight:800;letter-spacing:.035em;color:#fff;line-height:1.15}
        .erp-horizontal-brand small{display:block;color:#d7edf6;font-size:8px;font-weight:700;letter-spacing:.09em;line-height:1.2}
        .erp-horizontal-search{position:relative;display:flex;align-items:center;gap:6px;width:min(390px,34vw);height:30px;margin-left:auto;min-width:220px;border:1px solid #b9cbd3;background:#fff;border-radius:2px;padding:0 8px;box-sizing:border-box}
        .erp-horizontal-search input{border:0;outline:0;min-width:0;max-width:100%;width:100%;height:28px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#173b4a;background:transparent}
        .erp-horizontal-search-results{position:absolute;top:31px;left:0;right:0;z-index:1000;background:#fff;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(18,59,80,.12)}
        .erp-horizontal-search-results button{display:block;width:100%;min-height:28px;padding:5px 8px;border:0;background:#fff;text-align:left;font-size:11px;color:#173b4a;cursor:pointer}
        .erp-horizontal-search-results button:hover{background:#edf7fb}
        .erp-horizontal-help{height:30px;display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:#315466;font-size:11px;cursor:pointer;padding:0 5px}
        .erp-horizontal-session{height:52px;display:flex;align-items:center;gap:9px;padding:0 10px;border:1px solid rgba(255,255,255,.35);border-radius:3px;background:rgba(7,35,49,.52);white-space:nowrap;font-size:11px;color:#fff;flex:0 1 auto;min-width:190px;max-width:330px;box-sizing:border-box}
        .erp-horizontal-session-identity{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
        .erp-horizontal-session-identity strong{display:block;max-width:180px;overflow:hidden;text-overflow:ellipsis;color:#fff;font-size:12px;line-height:1.2;font-weight:800}
        .erp-horizontal-session-identity span{display:block;max-width:180px;overflow:hidden;text-overflow:ellipsis;color:#d8edf5;font-size:9px;line-height:1.2}
        .erp-horizontal-session time{display:flex;flex-direction:column;gap:3px;padding-left:9px;border-left:1px solid rgba(255,255,255,.24);color:#d8edf5;font-size:10px;text-align:right}
        .erp-horizontal-session time span{font-size:9px;color:#d8edf5}
        .erp-horizontal-session time strong{font-size:11px;color:#fff;font-weight:800}
        .erp-horizontal-menu{height:32px;display:flex;align-items:stretch;padding:0 6px;background:#2D8DB8;border-bottom:1px solid #17445A;box-sizing:border-box;position:relative;z-index:900}

        /* Identidade visual transversal: superfícies frias, contornos nítidos e controles compactos. */
        .erp-horizontal-session{color:#f2f8fb;border-left-color:rgba(255,255,255,.24)}
        .erp-horizontal-session time{color:#d2e7ef}
        .erp-horizontal-help{color:#f2f8fb}
        .erp-horizontal-help:hover{background:rgba(255,255,255,.12)}
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
        @media(max-width:1100px){.erp-horizontal-header{gap:8px;padding:5px 8px}.erp-horizontal-brand{min-width:250px;gap:7px}.erp-horizontal-brand img{width:132px!important;min-width:132px;max-width:132px!important;flex-basis:132px}.erp-horizontal-brand strong{font-size:12px}.erp-horizontal-brand small{font-size:7px}.erp-horizontal-search{min-width:150px;width:25vw}.erp-horizontal-session{min-width:165px;max-width:230px;padding:0 6px;gap:6px}.erp-horizontal-session-identity strong,.erp-horizontal-session-identity span{max-width:125px}}
        @media(max-width:950px){.erp-horizontal-brand{min-width:0}.erp-horizontal-brand img{width:118px!important;min-width:118px;max-width:118px!important;flex-basis:118px;height:54px!important}.erp-horizontal-brand-copy small{display:none}.erp-horizontal-search{width:30vw}.erp-horizontal-menu-button{padding:0 7px}.erp-horizontal-session time{display:none}}
        @media(max-width:700px){.erp-global-status-row>small{display:none}.erp-horizontal-header{height:auto;min-height:64px;flex-wrap:wrap;gap:5px;padding:5px 7px}.erp-horizontal-brand{height:48px;flex:1 1 45%;gap:6px}.erp-horizontal-brand img{width:96px!important;min-width:96px;max-width:96px!important;flex-basis:96px;height:44px!important}.erp-horizontal-brand strong{font-size:10px}.erp-horizontal-brand-copy small{display:none}.erp-horizontal-help{font-size:0}.erp-horizontal-search{order:3;flex:1 1 48%;width:auto;min-width:120px}.erp-horizontal-session{height:42px;min-width:0;max-width:52%;flex:0 1 52%;margin-left:auto}.erp-horizontal-session-identity strong{max-width:120px;font-size:10px}.erp-horizontal-session-identity span{display:block;max-width:120px;font-size:8px}.erp-horizontal-session time{display:none}.erp-horizontal-menu{overflow-x:auto}}

        .erp-horizontal-menu{display:flex!important;position:relative;z-index:900}
        .erp-horizontal-menu-button.is-active{background:#17445A;color:#fff;box-shadow:inset 0 -2px #8bd6f0}
        .erp-horizontal-dropdown button.is-active{background:#edf7fb;color:#176487;font-weight:700;border-left:2px solid #2D8DB8}
        .erp-horizontal-workspace{width:100%;max-width:100%;min-width:0}
        @media(max-width:700px){.erp-horizontal-menu{overflow-x:auto;overscroll-behavior-x:contain}.erp-horizontal-menu-item{flex:0 0 auto}.erp-horizontal-dropdown{position:fixed;top:auto;left:6px;right:6px;max-height:65vh;overflow:auto;z-index:1500}.erp-horizontal-menu-button{min-width:max-content}}
        @media(prefers-reduced-motion:reduce){.erp-horizontal-menu-button,.erp-horizontal-dropdown{transition:none!important}}
      `}</style>
    </div>
  )
}
