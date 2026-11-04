/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-VITRINE-PUBLICA-20261104-02 — botão de teste grátis no azul do login e barra de indicadores do carrossel removida
 * @STATUS_APROVACAO: REESCRITA AUTORIZADA PELO PROPRIETARIO EM 2026-11-01; ajustes de 2026-11-04 ordenados pelo proprietário
 *
 * Ordem do proprietario em 2026-11-04, print com seta no botão do topo ("MUDAR A COR DEIXAR AZUL QUE
 * NEM DO BOTÃO DO LOGIN AZUL") e caixa sobre os quadradinhos do carrossel ("TIRAR"): o .ph-solid passou
 * a usar o gradiente azul do botão do login e a barra de indicadores + contador saiu do JSX.
 *
 * Ordem do proprietario em 2026-11-04: "as letras do top nao estao do mesmo padrao, deixar elas no mesmo
 * tamanho; a imagem do fundo deixar um pouco mais clara; deixar elas como carrossel mudando automatico e
 * tirar os botoes de mudanca de pagina, ocultar elas". O carrossel ja trocava sozinho a cada 7s (continua);
 * as setas laterais saem do JSX e o tamanho do topo e corrigido no CSS da vitrine.
 *
 * Ordem do proprietario em 2026-11-03: "tirar do carrossel da tela principal aquelas das imagens
 * pequenas, so deixar as imagens grandes de traz". A moldura de navegador com a replica DOM sai do
 * slide e o texto passa a ocupar a largura inteira sobre a foto grande. A secao "Telas" do meio da
 * pagina permanece como estava.
 *
 * Ordem do proprietario em 2026-11-01: as fotos que vao entrar no carrossel sao capturas do proprio
 * sistema, tiradas por ele. O encaixe esta pronto em capturasReais — basta soltar o arquivo em
 * public/images/telas/<chave>.png (chaves: pcp, qualidade, estoque, chao-de-fabrica) e registrar o
 * caminho ali. Sem o arquivo, a moldura continua mostrando a replica DOM daquela rota.
 *
 * Ordem recebida em 2026-11-01: manter o fundo branco e a tipografia padrão do menu, mas
 * trazer de volta o carrossel do topo — imagem industrial de ponta a ponta, camada escura
 * para o texto branco ficar legível, setas discretas nas laterais, barras na base indicando
 * a quantidade de slides e um botão de ação em cada slide levando ao módulo correspondente.
 * Na mesma ordem: a vitrine só pode anunciar tela que existe. As quatro molduras abaixo são
 * réplicas montadas com o vocabulário visual do próprio sistema (TelaVitrine), cada uma com
 * a rota real na barra do navegador, em vez de arte desenhada à parte.
 */
import { ArrowRight, BarChart3, Boxes, Bot, Check, ChevronDown, ClipboardCheck, Factory, FileText, PackageCheck, Receipt, Settings, ShieldCheck, Truck, Users, Wrench, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { telasVitrine, TelaVitrineReplica, type TelaVitrine } from './components/marketing/TelaVitrine'
import './styles/public-home-premium-20261101.css'

type Module = { key: string; title: string; description: string; Icon: LucideIcon }
type Screen = { key: TelaVitrine['key']; eyebrow: string; title: string; description: string; highlights: string[] }

const screens: Screen[] = [
  {
    key: 'pcp', eyebrow: 'PCP E PRODUÇÃO',
    title: 'Dashboard do PCP: a fábrica programada em uma tela só',
    description: 'A programação por máquina no calendário, as ordens abertas com avanço real e a carga de cada equipamento juntos. O planejador vê o dia, a semana e o mês sem abrir cinco relatórios, e clica na ordem para ver as peças boas, o refugo e as paradas daquele lote.',
    highlights: ['Gantt por máquina', 'Ordens e avanço', 'Eficiência e refugo', 'Carga de capacidade'],
  },
  {
    key: 'qualidade', eyebrow: 'QUALIDADE E SGQ',
    title: 'Qualidade com evidência: da não conformidade ao plano de ação',
    description: 'A abertura da RPNC registra a ocorrência, a causa raiz com Ishikawa e 5 Porquês, e o plano de ação CAPA com responsável e prazo. O sistema alerta quando a mesma peça ou lote volta a falhar e o relatório sai pronto para a auditoria.',
    highlights: ['RPNC e triagem', 'Causa raiz', 'CAPA com prazo', 'Auditorias e evidências'],
  },
  {
    key: 'estoque', eyebrow: 'ESTOQUE E ALMOXARIFADO',
    title: 'Almoxarifado: saldo, lote e endereço no mesmo lançamento',
    description: 'Cada item aparece com o lote, o endereço de armazenagem, o que está reservado e o que está realmente disponível. O mapa de endereços mostra onde o material está, e o leitor de código de barras registra a movimentação sem digitar nada.',
    highlights: ['Posição de estoque', 'Reservado × disponível', 'Mapa de endereços', 'Coleta por código'],
  },
  {
    key: 'chao-de-fabrica', eyebrow: 'CHÃO DE FÁBRICA',
    title: 'Posto de apontamento que o operador usa com luva',
    description: 'Botão grande, contador de peças e status da máquina na tela do tablet ao lado do equipamento. O operador inicia a produção, registra parada com motivo, marca refugo e setup — e o apontamento entra na ordem na hora, com usuário e turno.',
    highlights: ['Contador de produção', 'Parada com motivo', 'Refugo e setup', 'Turno e operador'],
  },
]

type HeroSlide = {
  key: string
  eyebrow: string
  titleLead: string
  titleAccent: string
  titleTail: string
  description: string
  background: string
  shot: Screen
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
  assurances?: string[]
}

const heroSlides: HeroSlide[] = [
  {
    key: 'capa',
    eyebrow: 'ERP & SGQ industrial integrado',
    titleLead: 'A sua fábrica inteira em', titleAccent: 'uma única base', titleTail: ', do pedido ao custo.',
    description: 'PCP, chão de fábrica, qualidade com SGQ, estoque, compras, fiscal e controladoria gravando na mesma base, separada por empresa. Sem planilha paralela, sem retrabalho de digitação e sem número inventado em relatório.',
    background: '/images/cena-celula-injecao.webp',
    shot: screens[0],
    primary: { label: 'Ativar teste grátis de 15 dias', href: '/cadastro-empresa' },
    secondary: { label: 'Ver as telas do sistema', href: '#telas' },
    assurances: ['Dados isolados por empresa', 'Telas feitas para uso no chão de fábrica', 'Trilha de auditoria nos registros'],
  },
  {
    key: 'pcp',
    eyebrow: 'PCP e produção',
    titleLead: 'A fábrica programada em', titleAccent: 'uma tela só', titleTail: ' — do pedido ao apontamento.',
    description: 'Gantt por máquina, ordens abertas com avanço real e carga de capacidade juntos. O planejador vê o dia, a semana e o mês sem abrir cinco relatórios.',
    background: '/images/cena-pcp.webp',
    shot: screens[0],
    primary: { label: 'Testar o PCP no meu ambiente', href: '/cadastro-empresa' },
    secondary: { label: 'Ver o PCP nos planos', href: '/planos?modulo=pcp' },
  },
  {
    key: 'qualidade',
    eyebrow: 'Qualidade e SGQ',
    titleLead: 'Da não conformidade ao', titleAccent: 'plano de ação', titleTail: ' com evidência.',
    description: 'RPNC, causa raiz com Ishikawa e 5 Porquês, CAPA com responsável e prazo, auditorias e documentos controlados no mesmo fluxo — prontos para a auditoria certificadora.',
    background: '/images/cena-qualidade.webp',
    shot: screens[1],
    primary: { label: 'Testar o SGQ no meu ambiente', href: '/cadastro-empresa' },
    secondary: { label: 'Ver a Qualidade nos planos', href: '/planos?modulo=qualidade' },
  },
  {
    key: 'estoque',
    eyebrow: 'Estoque e almoxarifado',
    titleLead: 'Saldo, lote e endereço no', titleAccent: 'mesmo lançamento', titleTail: '.',
    description: 'O que está reservado e o que está realmente disponível, o mapa de endereços e a movimentação registrada por código de barras — sem digitação no portão.',
    background: '/images/cena-almoxarifado.webp',
    shot: screens[2],
    primary: { label: 'Testar o Estoque no meu ambiente', href: '/cadastro-empresa' },
    secondary: { label: 'Ver o Estoque nos planos', href: '/planos?modulo=estoque' },
  },
  {
    key: 'chao-de-fabrica',
    eyebrow: 'Chão de fábrica',
    titleLead: 'Posto de apontamento que o operador usa', titleAccent: 'com luva', titleTail: '.',
    description: 'Botão grande, contador de peças e status da máquina no tablet ao lado do equipamento. Produção, parada, refugo e setup entram na ordem na hora, com usuário e turno.',
    background: '/images/cena-chao-de-fabrica.webp',
    shot: screens[3],
    primary: { label: 'Testar o Chão de Fábrica', href: '/cadastro-empresa' },
    secondary: { label: 'Ver o Chão de Fábrica nos planos', href: '/planos?modulo=chao-de-fabrica' },
  },
]

const modules: Module[] = [
  { key: 'pcp', title: 'PCP e Produção', description: 'Planejamento, ordens, sequenciamento e acompanhamento do chão de fábrica.', Icon: Factory },
  { key: 'estoque', title: 'Estoque e Materiais', description: 'Saldos, movimentações, lotes, endereços e rastreabilidade.', Icon: Boxes },
  { key: 'recebimento', title: 'Recebimento de Materiais', description: 'NF-e XML, conferência, lotes e entrada rastreável.', Icon: PackageCheck },
  { key: 'qualidade', title: 'Qualidade e SGQ', description: 'RPNC, auditorias, CAPA, documentos e evidências.', Icon: ClipboardCheck },
  { key: 'manutencao', title: 'Manutenção', description: 'Máquinas, planos preventivos, corretivas e histórico.', Icon: Wrench },
  { key: 'fiscal', title: 'Fiscal', description: 'Apuração, documentos fiscais e obrigações acessórias.', Icon: Receipt },
  { key: 'financeiro', title: 'Financeiro e Controladoria', description: 'Conciliação, contas, margens, custo industrial e resultado.', Icon: BarChart3 },
  { key: 'compras', title: 'Compras e Fornecedores', description: 'Solicitações, requisições, cotações e pedidos.', Icon: Truck },
  { key: 'comissoes', title: 'Comissões', description: 'Regras, cálculo, perfil do vendedor e auditoria.', Icon: ClipboardCheck },
  { key: 'rh', title: 'RH e Departamento Pessoal', description: 'Colaboradores, jornada, custo de hora e competências.', Icon: Users },
  { key: 'engenharia', title: 'Engenharia e BOM', description: 'Fichas de processo, roteiros, estruturas e revisões.', Icon: FileText },
  { key: 'chao-fabrica', title: 'Chão de Fábrica', description: 'Apontamentos, paradas, refugo e rastreabilidade por lote.', Icon: Factory },
  { key: 'metrologia', title: 'Metrologia', description: 'Paquímetro digital, instrumentos, calibração e validade.', Icon: ShieldCheck },
  { key: 'documentos', title: 'Documentos Controlados', description: 'GED do SGQ: procedimentos, instruções e revisões.', Icon: FileText },
  { key: 'expedicao', title: 'Expedição', description: 'Separação, conferência, embalagem, romaneio e entrega.', Icon: Truck },
  { key: 'indicadores', title: 'Indicadores', description: 'Produção, qualidade, estoque, custos e performance.', Icon: BarChart3 },
]

const plans = [
  { key: 'start', name: 'Start', monthly: 199, tag: 'Plano de entrada', description: 'Cadastros, materiais e rotinas essenciais para organizar a operação e sair da planilha.' },
  { key: 'industrial', name: 'Industrial', monthly: 349, tag: 'Mais escolhido', description: 'PCP, chão de fábrica, qualidade com SGQ, estoque e indicadores integrados na mesma base.' },
  { key: 'enterprise', name: 'Enterprise', monthly: null, tag: 'Operação avançada', description: 'Escopo personalizado, múltiplas unidades, integrações e governança conforme a sua operação.' },
] as const

const productMenuModules: Module[] = modules.slice(0, 9)

type ModuleDetail = { items: string[]; flow: string[]; results: string[] }

const moduleDetails: Record<string, ModuleDetail> = {
  pcp: { items: ['Planejamento e programação das ordens de produção', 'Capacidade de máquinas, turnos e recursos', 'Apontamentos, paradas, setup e perdas', 'Rastreabilidade e fechamento da produção'], flow: ['Planejar', 'Programar', 'Produzir', 'Apontar', 'Inspecionar', 'Fechar'], results: ['Ordens e quantidades produzidas', 'Eficiência e paradas', 'Perdas e refugo', 'Integração com estoque e qualidade'] },
  estoque: { items: ['Consulta de saldo por item, lote e localização', 'Entradas, saídas e ajustes controlados', 'Inventário e acurácia de saldos', 'Materiais críticos e necessidade de reposição'], flow: ['Necessidade', 'Receber', 'Armazenar', 'Consumir', 'Inventariar'], results: ['Saldos disponíveis', 'Movimentações', 'Itens críticos', 'Histórico por lote'] },
  qualidade: { items: ['Registro de não conformidade (RPNC) e triagem', 'Causa raiz com Ishikawa e plano de ação CAPA', 'Auditorias internas com evidências', 'Documentos controlados e revisões'], flow: ['Registrar', 'Triar', 'Analisar causa', 'Agir', 'Verificar eficácia'], results: ['Não conformidades abertas', 'Ações com prazo e responsável', 'Recorrência por peça e lote', 'Documentos vigentes'] },
  recebimento: { items: ['Conferência de NF-e XML e itens', 'Validação de quantidades recebidas', 'Identificação e controle de lotes', 'Encaminhamento rastreável ao estoque'], flow: ['NF-e', 'Conferir', 'Identificar lotes', 'Registrar', 'Armazenar'], results: ['Recebimentos pendentes', 'Divergências', 'Lotes recebidos', 'Entrada rastreável'] },
  compras: { items: ['Solicitações e requisições de compra', 'Cotação e acompanhamento de fornecedores', 'Pedidos, aprovações e prazos', 'Vínculo com recebimento e financeiro'], flow: ['Solicitar', 'Cotar', 'Aprovar', 'Comprar', 'Receber'], results: ['Pedidos abertos', 'Prazos de entrega', 'Fornecedores', 'Compras do período'] },
  manutencao: { items: ['Cadastro e histórico de equipamentos', 'Planos preventivos e ordens corretivas', 'Registro de intervenções e paradas', 'Integração com máquinas e produção'], flow: ['Ativo', 'Planejar', 'Abrir ordem', 'Executar', 'Registrar'], results: ['Ordens abertas', 'Preventivas pendentes', 'Paradas', 'Disponibilidade'] },
  fiscal: { items: ['Apuração e conferência de documentos fiscais', 'Classificação fiscal com base oficial', 'Emissão de NF-e e eventos', 'Obrigações acessórias por período'], flow: ['Operação', 'Documento', 'Validar', 'Apurar', 'Entregar'], results: ['Pendências fiscais', 'Documentos processados', 'Apuração do período', 'Razão e lançamentos'] },
  financeiro: { items: ['Contas a pagar e a receber por empresa', 'Conciliação bancária com extrato importado', 'Custo industrial, margem e lucratividade', 'Auditoria de comissões e estornos'], flow: ['Lançar', 'Conciliar', 'Apurar', 'Analisar', 'Decidir'], results: ['Saldo e previsões', 'Diferenças de conciliação', 'Margem por produto e cliente', 'Resultado do período'] },
  rh: { items: ['Colaboradores, cargos e jornada', 'Custo de hora por função e setor', 'Treinamentos e competências', 'Permissões por setor e posto de trabalho'], flow: ['Cadastrar', 'Escalar', 'Alocar', 'Apontar', 'Custear'], results: ['Quadro e turno', 'Custo de hora', 'Treinamentos válidos', 'Acessos por posto'] },
  engenharia: { items: ['Fichas de processo do injetado ao montado', 'Roteiro de operações com tempos padrão', 'Estrutura de produto (BOM) e versões', 'Parâmetros de código e part number'], flow: ['Projetar', 'Estruturar', 'Rotear', 'Padronizar', 'Revisar'], results: ['Tempo padrão por operação', 'Estruturas e versões', 'Ficha técnica imprimível', 'Histórico de revisão'] },
  'chao-fabrica': { items: ['Terminal de apontamento por posto', 'Contador de peças boas e refugo', 'Parada com motivo e tempo', 'Lote, operador e turno registrados'], flow: ['Selecionar máquina', 'Iniciar', 'Apontar', 'Registrar parada', 'Encerrar turno'], results: ['Produção em tempo real', 'Paradas e motivos', 'Refugo por operação', 'Avanço da ordem'] },
  metrologia: { items: ['Medição dimensional com paquímetro digital', 'Tolerâncias e critérios de aceitação', 'Instrumentos, certificados e validade', 'Evidência vinculada ao lote'], flow: ['Medir', 'Comparar', 'Julgar', 'Registrar', 'Calibrar'], results: ['Medições e desvios', 'Instrumentos vencidos', 'Histórico por item', 'Evidência de inspeção'] },
  documentos: { items: ['Repositório controlado de documentos do SGQ', 'Procedimentos, instruções de trabalho e registros', 'Revisões, vigência e obsoletos', 'Trilha de acesso por empresa'], flow: ['Elaborar', 'Aprovar', 'Publicar', 'Revisar', 'Tornar obsoleto'], results: ['Documentos vigentes', 'Revisões pendentes', 'Obsoletos arquivados', 'Acessos e evidências'] },
  expedicao: { items: ['Separação e conferência de pedidos', 'Embalagem, romaneio e etiquetagem', 'Roteirização de carga e entrega', 'Comprovante de entrega (POD)'], flow: ['Separar', 'Conferir', 'Embalhar', 'Carregar', 'Entregar'], results: ['Pedidos prontos', 'Cargas e rotas', 'Volumes e cubagem', 'Entregas confirmadas'] },
  indicadores: { items: ['Índices de produção, qualidade e estoque', 'Custo, margem e resultado por período', 'Painéis por setor, máquina e produto', 'Base para a reunião de resultados'], flow: ['Coletar', 'Consolidar', 'Comparar', 'Decidir'], results: ['Eficiência e OEE', 'Refugo e retrabalho', 'Acurácia de estoque', 'Margem industrial'] },
  comissoes: { items: ['Regras por vendedor, produto e período', 'Cálculo sobre faturamento e metas', 'Perfil do vendedor e custo de hora', 'Auditoria antes do pagamento'], flow: ['Regra', 'Faturar', 'Calcular', 'Auditar', 'Pagar'], results: ['Base de cálculo', 'Comissão apurada', 'Divergências', 'Histórico de pagamento'] },
}

const genericDetail = (m: Module): ModuleDetail => ({
  items: [m.description, 'Cadastros e consultas do processo', 'Acompanhamento de etapas e pendências', 'Integração com as áreas conectadas do ERP'],
  flow: ['Cadastrar', 'Planejar', 'Executar', 'Conferir', 'Acompanhar'],
  results: ['Status do processo', 'Pendências', 'Histórico', 'Integrações relacionadas'],
})

/**
 * Capturas reais do sistema publicado. Enquanto a foto não existe, a moldura do navegador
 * mostra a réplica DOM montada com o vocabulário visual do próprio ERP (TelaVitrine), que e a
 * unica tela que de fato existe hoje. Quando o proprietario enviar o print do sistema, o arquivo
 * entra em public/images/telas/<chave>.png e e registrado abaixo: a replica dessa tela para de ser
 * desenhada e a foto ocupa o mesmo lugar dentro da mesma moldura.
 */
const capturasReais: Partial<Record<TelaVitrine['key'], string>> = {}

function ScreenShot({ screen, compacta = false }: { screen: Screen; compacta?: boolean }) {
  const tela = telasVitrine[screen.key]
  const captura = capturasReais[screen.key]
  return (
    <div className="ph-shot ph-shot--hero">
      <div className="ph-shot-bar" aria-hidden="true"><i /><i /><i /><span>sysnqra.app{tela.rota}</span></div>
      {captura ? (
        <img
          src={captura}
          alt={`Tela real do SYSNQRA — ${screen.title}`}
          className="ph-shot-foto"
          width={1280}
          height={720}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <TelaVitrineReplica tela={tela} compacta={compacta} />
      )}
    </div>
  )
}

const INTERVALO_SLIDE_MS = 7000

function HeroCarousel() {
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const total = heroSlides.length

  useEffect(() => {
    if (pausado) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setInterval(() => setIndice(atual => (atual + 1) % total), INTERVALO_SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [pausado, total])

  const slide = heroSlides[indice]

  return (
    <section
      id="inicio"
      className="ph-hero ph-hero--carousel"
      aria-roledescription="carrossel"
      aria-label="Telas e módulos do SYSNQRA ERP & SGQ Industrial"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="ph-carousel-bg" aria-hidden="true">
        {heroSlides.map((item, i) => (
          <img key={item.key} src={item.background} alt="" className={i === indice ? 'is-active' : undefined} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
        ))}
      </div>
      <div className="ph-carousel-scrim" aria-hidden="true" />

      <div className="ph-wrap ph-carousel-grid" key={slide.key}>
        <div className="ph-slide-copy">
          <span className="ph-kicker">{slide.eyebrow}</span>
          <h1>{slide.titleLead} <em>{slide.titleAccent}</em>{slide.titleTail}</h1>
          <p className="ph-lead">{slide.description}</p>
          <div className="ph-cta-row">
            <a className="ph-solid" href={slide.primary.href}>{slide.primary.label} <ArrowRight size={16} /></a>
            <a className="ph-ghost" href={slide.secondary.href}>{slide.secondary.label}</a>
          </div>
          {slide.assurances && (
            <div className="ph-assurances">
              {slide.assurances.map(item => <span key={item} className="ph-assurance"><Check size={15} /> {item}</span>)}
            </div>
          )}
          <p className="ph-cta-note">O teste inclui todos os módulos do plano Industrial. Nenhum cartão é solicitado para começar.</p>
        </div>
      </div>

      {/* Ordem do proprietario em 2026-11-04, sobre print com "TIRAR" nos quadradinhos: a barra de
          indicadores do carrossel sai da tela. O slide continua trocando sozinho a cada 7s. */}
    </section>
  )
}

export default function PublicIndustrialHome() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  const openModule = (m: Module) => {
    setSelectedModule(m)
    setMenuOpen(false)
    window.requestAnimationFrame(() => document.getElementById('modulo-detalhe')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return <main className="sgq-public-home">
    <header className="ph-nav">
      <a href="/" className="ph-brand" aria-label="SYSNQRA ERP & SGQ INDUSTRIAL">
        <img className="ph-brand-mark" src="/logo/logo-marca.png" alt="" aria-hidden="true" />
        <span className="ph-brand-text"><strong>SYSNQRA</strong><span>ERP &amp; SGQ Industrial</span></span>
      </a>
      <nav className="ph-nav-links" aria-label="Navegação principal">
        <a className="ph-nav-link" href="#inicio">Início</a>
        <div className="ph-product" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
          <button className="ph-product-button" type="button" aria-expanded={menuOpen} aria-haspopup="true" onClick={() => setMenuOpen(value => !value)}>Produtos do sistema <ChevronDown size={15} /></button>
          {menuOpen && <div className="ph-product-menu">{productMenuModules.map(m => { const Icon = m.Icon; return <a key={m.key} href="#modulo-detalhe" onClick={() => openModule(m)}><Icon size={17} /><span><strong>{m.title}</strong><small>{m.description}</small></span></a> })}</div>}
        </div>
        <a className="ph-nav-link" href="#telas">Telas</a>
        <a className="ph-nav-link" href="#planos">Planos</a>
        <a className="ph-nav-link" href="/blog">Blog</a>
        <a className="ph-nav-link" href="/contato">Contato</a>
      </nav>
      <div className="ph-nav-actions">
        <a className="ph-icon-link" href="/cadastro-master" title="Cadastro do proprietário Master" aria-label="Cadastro do proprietário Master"><Settings size={17} /></a>
        <a className="ph-ghost" href="/login">Entrar</a>
        <a className="ph-solid" href="/cadastro-empresa">Teste grátis 15 dias</a>
      </div>
    </header>

    <HeroCarousel />

    <section id="telas" className="ph-section ph-section--tint">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>As telas do sistema</span>
          <h2>Não é promessa de brochure: é a tela que o seu time abre na segunda-feira.</h2>
          <p>Cada rotina abaixo é uma tela real do SYSNQRA, com o que ela resolve no dia a dia da indústria.</p>
        </div>
        <div className="ph-screens">
          {screens.map(screen => <article key={screen.key} className="ph-screen">
            <ScreenShot screen={screen} compacta />
            <div className="ph-screen-copy">
              <span>{screen.eyebrow}</span>
              <h3>{screen.title}</h3>
              <p>{screen.description}</p>
              <ul className="ph-screen-list">{screen.highlights.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    <section id="modulos" className="ph-section">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>Módulos do ERP</span>
          <h2>Cada módulo tem uma função clara dentro da operação.</h2>
          <p>Clique em um módulo para ver o que ele contempla, como trabalha e o que você acompanha.</p>
        </div>
        <div className="ph-modules">{modules.map(m => { const Icon = m.Icon; return <button key={m.key} type="button" className="ph-module" aria-pressed={selectedModule?.key === m.key} onClick={() => openModule(m)}>
          <span className="ph-module-icon"><Icon size={20} /></span>
          <h3>{m.title}</h3>
          <p>{m.description}</p>
        </button> })}</div>
        <div id="modulo-detalhe" className="ph-module-detail" aria-live="polite">
          {selectedModule ? (() => {
            const m = selectedModule
            const Icon = m.Icon
            const d = moduleDetails[m.key] ?? genericDetail(m)
            return <>
              <div className="ph-detail-head">
                <span className="ph-module-icon"><Icon size={22} /></span>
                <div><h3>{m.title}</h3><p>{m.description}</p></div>
                <a className="ph-detail-back" href="#inicio">Voltar ao início ↑</a>
              </div>
              <div className="ph-detail-grid">
                <article><h4>O que este módulo contempla</h4><ul>{d.items.map(item => <li key={item}>{item}</li>)}</ul></article>
                <article><h4>Fluxo de trabalho</h4><ol>{d.flow.map((item, i) => <li key={item}><b>{String(i + 1).padStart(2, '0')}</b>{item}</li>)}</ol></article>
                <article><h4>O que você acompanha</h4><ul>{d.results.map(item => <li key={item}>{item}</li>)}</ul></article>
              </div>
              <p className="ph-detail-security">Esta é a apresentação pública do módulo. Para ver dados e executar operações reais, entre no sistema com o usuário da sua empresa.</p>
            </>
          })() : <p className="ph-detail-security" style={{ marginTop: 0 }}>Escolha um módulo acima para abrir o detalhamento da rotina.</p>}
        </div>
      </div>
    </section>

    <section id="planos" className="ph-section ph-section--tint">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>Planos</span>
          <h2>Comece pelo nível que a sua operação aguenta hoje.</h2>
          <p>Todos os planos incluem ativação em 3 etapas, armazenamento das evidências e isolamento dos dados por empresa.</p>
        </div>
        <div className="ph-billing" role="group" aria-label="Periodicidade de cobrança">
          <button type="button" aria-pressed={billingPeriod === 'monthly'} onClick={() => setBillingPeriod('monthly')}>Mensal</button>
          <button type="button" aria-pressed={billingPeriod === 'annual'} onClick={() => setBillingPeriod('annual')}>Anual</button>
          <span>15% de desconto no anual</span>
        </div>
        <div className="ph-plans">{plans.map(plan => {
          const annualPrice = plan.monthly === null ? null : Math.round(plan.monthly * 0.85 * 100) / 100
          const shown = plan.monthly === null ? 'Sob consulta' : (billingPeriod === 'annual' ? annualPrice! : plan.monthly).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const annualTotal = annualPrice === null ? null : annualPrice * 12
          return <article key={plan.key} className={plan.key === 'industrial' ? 'ph-plan is-featured' : 'ph-plan'}>
            <small>{plan.tag}</small>
            <h3>{plan.name}</h3>
            <span className="ph-plan-price">{shown}</span>
            {plan.monthly !== null && <span className="ph-plan-period">{billingPeriod === 'annual' ? 'por mês, cobrado anualmente' : 'por mês'}</span>}
            {billingPeriod === 'annual' && annualTotal !== null && <span className="ph-plan-period">Total anual: {annualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
            <p>{plan.description}</p>
            <a href="/planos">{plan.monthly === null ? 'Falar sobre o Enterprise' : 'Ver o que este plano inclui'} <ArrowRight size={14} /></a>
          </article>
        })}</div>
        <div className="ph-plans-link"><a className="ph-ghost" href="/planos">Comparar os módulos de cada plano <ArrowRight size={16} /></a></div>
      </div>
    </section>

    <section id="fluxo" className="ph-section">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>Como o ERP se conecta</span>
          <h2>Da matéria-prima ao resultado.</h2>
          <p>Os módulos compartilham a mesma base, então o dado entra uma vez e vale para todas as áreas.</p>
        </div>
        <div className="ph-flow">
          <article><b>01 · PLANEJAR</b><h3>Engenharia + PCP + MRP</h3><p>Estrutura, roteiro, capacidade, necessidade de material e programação antes de a máquina girar.</p></article>
          <article><b>02 · EXECUTAR</b><h3>Produção + Estoque + Qualidade</h3><p>Apontamentos, consumo de material, inspeções, lotes, refugo e evidência registrada no momento certo.</p></article>
          <article><b>03 · GERIR</b><h3>Custos + Fiscal + Indicadores</h3><p>O que foi executado vira custo real, documento fiscal e indicador de resultado no fechamento.</p></article>
        </div>
      </div>
    </section>

    <footer className="ph-footer">
      <div className="ph-footer-brand">
        <img src="/logo/logo-marca.png" alt="" aria-hidden="true" />
        <div><strong>SYSNQRA</strong><br />ERP &amp; SGQ Industrial · FernandoSch_System</div>
      </div>
      <div><a href="/contato">Contato</a> · <a href="/blog">Blog</a> · <a href="/planos">Planos</a> · <a href="/login">Entrar</a></div>
    </footer>

    <button className="ph-help-fab" type="button" aria-label="Abrir ajuda" title="Ajuda" aria-expanded={helpOpen} onClick={() => setHelpOpen(value => !value)}><Bot size={22} /></button>
    {helpOpen && <div className="ph-help-panel">
      <button type="button" aria-label="Fechar ajuda" onClick={() => setHelpOpen(false)} style={{ float: 'right', border: 0, background: 'transparent', cursor: 'pointer' }}><X size={16} /></button>
      <h3>Como posso ajudar?</h3>
      <p>Veja as telas do sistema, entenda cada módulo ou comece o teste grátis de 15 dias.</p>
      <a href="#telas">Ver as telas</a>
      <a href="#modulos">Ver módulos</a>
      <a href="#planos">Ver planos</a>
      <a href="/cadastro-empresa">Ativar teste grátis</a>
      <a href="/contato">Falar com atendimento</a>
    </div>}
  </main>
}
