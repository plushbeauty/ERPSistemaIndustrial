import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, ChevronDown, Search, UserRound, Home, Database, ShoppingCart, ShoppingBasket, Package, Wallet, ReceiptText, Factory, ShieldCheck, Wrench, BarChart3, Settings, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type MenuItem = {
  label: string
  route: string
  children?: Array<{ label: string; route: string }>
}

const menus: MenuItem[] = [
  { label: 'Início', route: '/erp-industrial' },
  { label: 'Cadastros', route: '/produtos-vendas', children: [
    { label: 'Produtos', route: '/produtos-vendas' },
    { label: 'Clientes', route: '/vendas/clientes' },
    { label: 'Fornecedores', route: '/compras/fornecedores' },
  ] },
  { label: 'Vendas', route: '/vendas', children: [
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
  { label: 'Compras', route: '/compras/rfq', children: [
    { label: 'Central de compras / RFQ', route: '/compras/rfq' },
    { label: 'Solicitações', route: '/compras/solicitacao-manual' },
    { label: 'Pedido de compra', route: '/compras/pedido' },
    { label: 'Recebimentos', route: '/compras/recebimentos' },
    { label: 'Fornecedores', route: '/compras/fornecedores' },
    { label: 'Relatórios', route: '/compras/relatorios' },
  ] },
  { label: 'Estoque', route: '/estoque' },
  { label: 'Financeiro', route: '/financeiro/custo-padrao' },
  { label: 'Fiscal', route: '/fiscal' },
  { label: 'Manufatura / PCP', route: '/pcp', children: [
    { label: 'Visão geral do PCP', route: '/pcp' },
    { label: 'Ordens de produção', route: '/pcp/ordens-industriais' },
    { label: 'Agenda de Máquinas', route: '/pcp/agenda-maquinas' },
    { label: 'Capacidade / Gantt', route: '/pcp/capacidade' },
    { label: 'Sequenciamento', route: '/pcp/sequenciamento' },
    { label: 'MRP II', route: '/pcp/mrp-ii' },
  ] },
  { label: 'Qualidade', route: '/qualidade' },
  { label: 'Manutenção', route: '/manutencao' },
  { label: 'Relatórios', route: '/relatorios' },
  { label: 'Configuração', route: '/configuracoes-adm' },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
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
      if (ref.current && !ref.current.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = menus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
  useEffect(() => {
    const activeMenu = menus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
    setOpenMenu(activeMenu?.children?.length ? activeMenu.label : null)
  }, [pathname])
  const filtered = search.trim()
    ? menus.flatMap(menu => [
        { label: menu.label, route: menu.route },
        ...(menu.children ?? []).map(child => ({ label: `${menu.label} / ${child.label}`, route: child.route })),
      ]).filter(item => item.label.toLowerCase().includes(search.trim().toLowerCase()))
    : []

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
    setSearch('')
    navigate(route)
  }

  return (
    <div className="erp-horizontal-shell" ref={ref}>
      <header className="erp-horizontal-header">
        <button className="erp-horizontal-brand" type="button" onClick={() => go('/erp-industrial')} title="Início">
          <img src="/logo/sgq-erp.png" alt="SGQERP Industrial" />
          <strong>SGQERP INDUSTRIAL</strong>
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

        <div className="erp-horizontal-session">
          <UserRound size={15} />
          <span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span>
          <time dateTime={now.toISOString()}>
            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)} {' '}
            {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date())}
          </time>
        </div>
      </header>

      <div className="erp-premium-shell-body">
        <aside className="erp-premium-sidebar" aria-label="Navegação de módulos">
          <div className="erp-premium-sidebar-heading">MÓDULOS OPERACIONAIS</div>
          {menus.map(menu => {
            const active = current?.label === menu.label
            const hasChildren = Boolean(menu.children?.length)
            const expanded = openMenu === menu.label
            const Icon = menu.label === 'Início' ? Home : menu.label === 'Cadastros' ? Database : menu.label === 'Vendas' ? ShoppingCart : menu.label === 'Compras' ? ShoppingBasket : menu.label === 'Estoque' ? Package : menu.label === 'Financeiro' ? Wallet : menu.label === 'Fiscal' ? ReceiptText : menu.label === 'Manufatura / PCP' ? Factory : menu.label === 'Qualidade' ? ShieldCheck : menu.label === 'Manutenção' ? Wrench : menu.label === 'Relatórios' ? BarChart3 : Settings
            return <section className="erp-premium-sidebar-section" key={menu.label}>
              <button type="button" className={`erp-premium-sidebar-parent ${active ? 'is-active' : ''}`} onClick={() => hasChildren ? setOpenMenu(value => value === menu.label ? null : menu.label) : go(menu.route)} aria-expanded={hasChildren ? expanded : undefined}>
                <Icon size={16} strokeWidth={1.8}/><span>{menu.label}</span>{hasChildren && (expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>)}
              </button>
              {hasChildren && expanded && <div className="erp-premium-sidebar-children">{menu.children?.map(child => {
                const childActive = pathname === child.route || pathname.startsWith(child.route + '/')
                return <button type="button" key={child.route} className={`erp-premium-sidebar-child ${childActive ? 'is-active' : ''}`} onClick={() => go(child.route)}><span className="erp-premium-sidebar-child-dot"/><span>{child.label}</span></button>
              })}</div>}
            </section>
          })}
          <div className="erp-premium-sidebar-footer"><span className="erp-status-dot" data-status="andamento"/><span>Conexão de sessão ativa</span></div>
        </aside>
      <main className={`erp-horizontal-workspace${pathname.startsWith('/fiscal') || pathname.includes('/nfe') || pathname.startsWith('/vendas/fiscal') || pathname.includes('nota-fiscal') ? ' erp-horizontal-workspace-fiscal' : ' erp-horizontal-workspace-compact'}`}>
        {children}
      </main>
      </div>

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:#f4f8fa;color:#173b4a}
        .erp-global-status-row{min-height:27px;display:flex;align-items:center;gap:10px;padding:2px 12px;background:#f8fbfc;border-bottom:1px solid #dbe5e9;color:#536b77;font-size:9px;box-sizing:border-box}
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
        .erp-horizontal-header{height:46px;display:flex;align-items:center;gap:12px;padding:0 10px;background:#fff;border-bottom:1px solid #d6e2e7;box-sizing:border-box}
        .erp-horizontal-brand{height:34px;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#123b50;cursor:pointer;padding:0 6px;white-space:nowrap}
        .erp-horizontal-brand img{height:30px;width:auto;object-fit:contain}
        .erp-horizontal-brand strong{font-size:13px;font-weight:700;letter-spacing:.01em}
        .erp-horizontal-search{position:relative;display:flex;align-items:center;gap:6px;width:min(390px,34vw);height:30px;margin-left:auto;min-width:220px;border:1px solid #b9cbd3;background:#fff;border-radius:2px;padding:0 8px;box-sizing:border-box}
        .erp-horizontal-search input{border:0;outline:0;min-width:0;max-width:100%;width:100%;height:28px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#173b4a;background:transparent}
        .erp-horizontal-search-results{position:absolute;top:31px;left:0;right:0;z-index:1000;background:#fff;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(18,59,80,.12)}
        .erp-horizontal-search-results button{display:block;width:100%;min-height:28px;padding:5px 8px;border:0;background:#fff;text-align:left;font-size:11px;color:#173b4a;cursor:pointer}
        .erp-horizontal-search-results button:hover{background:#edf7fb}
        .erp-horizontal-help{height:30px;display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:#315466;font-size:11px;cursor:pointer;padding:0 5px}
        .erp-horizontal-session{height:30px;display:flex;align-items:center;gap:5px;padding-left:8px;border-left:1px solid #dbe5e9;white-space:nowrap;font-size:11px;color:#173b4a}
        .erp-horizontal-session span{font-weight:600}
        .erp-horizontal-session time{color:#647b85;font-size:10px}
        .erp-horizontal-menu{height:32px;display:flex;align-items:stretch;padding:0 6px;background:#2D8DB8;border-bottom:1px solid #17445A;box-sizing:border-box;position:relative;z-index:900}
        .erp-horizontal-menu-item{position:relative;display:flex;align-items:stretch}
        .erp-horizontal-menu-button{height:31px;display:inline-flex;align-items:center;gap:3px;padding:0 10px;border:0;border-right:1px solid rgba(255,255,255,.18);background:#2D8DB8;color:#fff;font-size:10px;font-weight:500;cursor:pointer}
        .erp-horizontal-menu-button:hover,.erp-horizontal-menu-button.is-active{background:#17445A;color:#fff}
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
        @media(max-width:950px){.erp-horizontal-brand strong{display:none}.erp-horizontal-search{width:36vw}.erp-horizontal-menu-button{padding:0 7px}.erp-horizontal-session time{display:none}}
        @media(max-width:700px){.erp-global-status-row>small{display:none}.erp-horizontal-header{gap:5px}.erp-horizontal-help{font-size:0}.erp-horizontal-search{width:42vw;min-width:160px}.erp-horizontal-session span{display:none}.erp-horizontal-menu{overflow-x:auto}}

        .erp-premium-shell-body{display:flex;align-items:stretch;min-height:calc(100vh - 44px)}
        .erp-premium-sidebar{position:sticky;top:44px;align-self:flex-start;display:flex;flex-direction:column;gap:2px;width:240px;min-width:240px;max-height:calc(100vh - 44px);overflow:auto;padding:10px 8px 12px;background:rgba(255,255,255,.78);backdrop-filter:blur(14px);border-right:1px solid rgba(203,213,225,.65);color:#475569}
        .erp-premium-sidebar-heading{padding:5px 8px 9px;font-size:9px;font-weight:800;letter-spacing:.12em;color:#94a3b8}
        .erp-premium-sidebar-section{display:grid;gap:2px}
        .erp-premium-sidebar-parent{display:flex;align-items:center;gap:9px;width:100%;height:36px;min-height:36px;padding:0 9px;border:1px solid transparent;border-radius:3px;background:transparent;color:#475569;text-align:left;font-size:11px;font-weight:500;letter-spacing:-.01em;transition:background-color .15s,color .15s,border-color .15s}
        .erp-premium-sidebar-parent>span{flex:1}
        .erp-premium-sidebar-parent:hover{background:rgba(59,130,246,.045);color:#1d4ed8}
        .erp-premium-sidebar-parent.is-active{border-left:2px solid #2563eb;background:rgba(59,130,246,.07);color:#1d4ed8;font-weight:700}
        .erp-premium-sidebar-children{display:grid;gap:1px;margin:0 0 5px 19px;padding:2px 0 2px 8px;border-left:1px solid #e2e8f0;animation:erpSidebarReveal .16s ease-out}
        .erp-premium-sidebar-child{display:flex;align-items:center;gap:7px;width:100%;height:30px;min-height:30px;padding:0 7px;border:1px solid transparent;border-radius:2px;background:transparent;color:#64748b;text-align:left;font-size:10px;font-weight:500;transition:background-color .12s,color .12s}
        .erp-premium-sidebar-child-dot{width:4px;height:4px;flex:0 0 4px;border-radius:50%;background:#cbd5e1}
        .erp-premium-sidebar-child:hover{background:rgba(59,130,246,.05);color:#1d4ed8}
        .erp-premium-sidebar-child.is-active{border-left:2px solid #2563eb;background:rgba(59,130,246,.07);color:#1d4ed8;font-weight:700}
        .erp-premium-sidebar-child.is-active .erp-premium-sidebar-child-dot{background:#2563eb}
        .erp-premium-sidebar-footer{display:flex;align-items:center;gap:7px;margin-top:auto;padding:12px 8px 2px;color:#94a3b8;font-size:9px;border-top:1px solid rgba(226,232,240,.7)}
        .erp-premium-shell-body>.erp-horizontal-workspace{flex:1;width:calc(100% - 240px);min-width:0}
        .erp-horizontal-menu{display:none!important}
        @keyframes erpSidebarReveal{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:850px){.erp-premium-sidebar{width:210px;min-width:210px}.erp-premium-shell-body>.erp-horizontal-workspace{width:calc(100% - 210px)}}
        @media(max-width:640px){.erp-premium-shell-body{min-height:calc(100vh - 44px)}.erp-premium-sidebar{width:54px;min-width:54px;padding:8px 4px}.erp-premium-sidebar-heading,.erp-premium-sidebar-parent>span,.erp-premium-sidebar-parent>svg:last-child,.erp-premium-sidebar-children,.erp-premium-sidebar-footer{display:none!important}.erp-premium-sidebar-parent{justify-content:center;padding:0}.erp-premium-sidebar-parent.is-active{border-left-width:2px}.erp-premium-shell-body>.erp-horizontal-workspace{width:calc(100% - 54px);padding:5px}.erp-premium-sidebar-section{position:relative}.erp-premium-sidebar-section:focus-within .erp-premium-sidebar-children{display:grid!important;position:absolute;left:44px;top:0;z-index:1200;width:210px;margin:0;padding:6px;border:1px solid #dbe3ec;border-radius:3px;background:rgba(255,255,255,.97);box-shadow:0 12px 30px rgba(15,23,42,.12);backdrop-filter:blur(14px)}}
        @media(prefers-reduced-motion:reduce){.erp-premium-sidebar-children,.erp-premium-sidebar-parent,.erp-premium-sidebar-child{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  )
}
