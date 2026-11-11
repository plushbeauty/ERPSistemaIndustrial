/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-06
 * @REVISAO: REV-CARROSSEL-PRELOAD-E-MARCA-SYSNQRA-20261110-01 — pré-carregamento das artes e identificação pública SYSNQRA
 * @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-06 — "A IMAGEM FICOU GRANDE DE MAIS ELE TA PEGANDO
 * A TELA TODA PERFEITO MAIS ELA FICOU MUITNA ALTA PEGANDO A TELA MUITO PARA BAIXO CONSEGUE ARRUA" e
 * "SABE A BARRA DO TOPO ACHO QUE PODEMOS TIRAR O LOGO DELA PORQUE JA TEM O LOGO NAS IMAGENS ASSIM
 * DEIXANDO ESSA BARRA MAIS FINA"
 *
 * Ordem do proprietario em 2026-11-06: o slide 16:9 herdava a altura da largura inteira e, numa janela
 * de notebook, empurrava o conteudo para baixo da dobra. A folha agora tem altura propria (a janela menos
 * a barra do topo, com piso e teto) e a arte e exibida inteira sobre uma copia desfocada dela mesma,
 * porque as artes tem marca no topo e faixa de slogan embaixo e qualquer corte (object-fit: cover)
 * perderia justamente esses dois blocos. Na barra do topo saiu o quadrado da marca — as cinco artes ja
 * trazem o logo — e a régua caiu de 66px para 52px. O slot quadrado do topo saiu da trava de
 * scripts/verify-logo-assets.mjs junto; a marca continua travada no rodape desta mesma tela e nas demais.
 *
 * Ordem do proprietario em 2026-11-05: as fotos de fundo geradas por maquina (cena-*.webp) saem do
 * carrossel e entram as cinco artes que ele enviou, em public/images/carrossel/. Cada arte ja carrega
 * a marca, o titulo e a lista de itens, entao nao sobra texto do DOM por cima da imagem — o slide e a
 * propria arte, em 16:9, passando sozinha a cada 7s. O contrato das artes esta em
 * scripts/verify-carousel-artes.mjs: trocar uma das cinco, apontar o carrossel de volta para uma cena
 * gerada ou devolver a moldura de navegador para o hero reprova o build da Vercel.
 *
 * Ordem do proprietario em 2026-11-04: "mandei vc tirar botoes da tela principal de 15 dias gratis que
 * se repete e as imagens nao fica neles para vem passando como um carrossel". O botao de teste de 15 dias
 * fica somente no topo da pagina: saiu do slide do carrossel (que repetia o mesmo botao a cada volta) e
 * saiu da central de ajuda. A pausa por mouse, que antes era ligada no hero inteiro — uma area que cobre
 * a tela toda e congelava a rotacao com o ponteiro em cima — passou a valer so sobre o bloco de texto,
 * entao as fotos continuam passando enquanto o mouse esta sobre a imagem.
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
import { ArrowRight, BarChart3, Boxes, Bot, ChevronDown, ClipboardCheck, Factory, FileText, PackageCheck, Receipt, Settings, ShieldCheck, Truck, Users, Wrench, X } from 'lucide-react'
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
  art: string
  titulo: string
}

const heroSlides: HeroSlide[] = [
  { key: 'pcp-chao-de-fabrica', art: '/images/carrossel/pcp-chao-de-fabrica.png', titulo: 'PCP e Chão de Fábrica — planejamento, controle e execução em tempo real' },
  { key: 'qualidade-sgq', art: '/images/carrossel/qualidade-sgq.png', titulo: 'Qualidade e SGQ — controle total da qualidade do seu processo' },
  { key: 'estoque-compras-vendas', art: '/images/carrossel/estoque-compras-vendas.png', titulo: 'Estoque, Compras e Vendas — gestão integrada da sua operação' },
  { key: 'rh-manutencao-gestao', art: '/images/carrossel/rh-manutencao-gestao.png', titulo: 'RH, Manutenção e Gestão — tudo o que sua empresa precisa em um só sistema' },
  { key: 'planos', art: '/images/carrossel/planos.png', titulo: 'Planos de funcionamento para todas as necessidades da sua indústria' },
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
  const total = heroSlides.length

  useEffect(() => {
    let cancelado = false
    let timer: number | undefined

    // Aguarda todas as artes terminarem de carregar antes de iniciar a rotacao.
    // Uma falha individual e isolada: o carrossel continua apenas com as artes disponiveis.
    const carregarArte = (src: string) => new Promise<boolean>(resolve => {
      const imagem = new Image()
      imagem.onload = () => resolve(imagem.naturalWidth > 0)
      imagem.onerror = () => resolve(false)
      imagem.src = src
      if (imagem.complete) resolve(imagem.naturalWidth > 0)
    })

    void Promise.all(heroSlides.map(slide => carregarArte(slide.art))).then(carregadas => {
      if (cancelado) return

      const indicesDisponiveis = carregadas
        .map((carregada, indiceArte) => carregada ? indiceArte : -1)
        .filter(indiceArte => indiceArte >= 0)

      if (indicesDisponiveis.length === 0) return

      setIndice(indicesDisponiveis[0])
      if (indicesDisponiveis.length < 2) return

      let posicao = 0
      timer = window.setInterval(() => {
        posicao = (posicao + 1) % indicesDisponiveis.length
        setIndice(indicesDisponiveis[posicao])
      }, INTERVALO_SLIDE_MS)
    })

    return () => {
      cancelado = true
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [total])

  return (
    <section
      id="inicio"
      className="ph-hero ph-hero--carousel ph-hero--artes"
      aria-roledescription="carrossel"
      aria-label="Módulos do SYSNQRA ERP & SGQ Industrial"
    >
      <h1 className="ph-sr-only">SYSNQRA ERP Industrial: PCP, qualidade com SGQ, estoque, compras, vendas, RH, manutenção e planos em uma única base, separada por empresa.</h1>
      <div className="ph-carousel-bg">
        {heroSlides.map((item, i) => (
          <div key={item.key} className={i === indice ? 'ph-carousel-slide is-active' : 'ph-carousel-slide'}>
            <img
              src={item.art}
              alt=""
              aria-hidden="true"
              className="ph-carousel-fill"
              loading="eager"
              decoding="async"
            />
            <img
              src={item.art}
              alt={i === indice ? item.titulo : ''}
              aria-hidden={i === indice ? undefined : true}
              className="ph-carousel-art"
              loading="eager"
              decoding="async"
            />
          </div>
        ))}
      </div>
      <p className="ph-sr-only" aria-live="polite">{`Arte ${indice + 1} de ${total}: ${heroSlides[indice].titulo}`}</p>
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
        <div><strong>SYSNQRA</strong><br />SYSNQRA ERP INDUSTRIAL</div>
      </div>
      <div><a href="/contato">Contato</a> · <a href="/blog">Blog</a> · <a href="/planos">Planos</a> · <a href="/login">Entrar</a></div>
    </footer>

    <button className="ph-help-fab" type="button" aria-label="Abrir ajuda" title="Ajuda" aria-expanded={helpOpen} onClick={() => setHelpOpen(value => !value)}><Bot size={22} /></button>
    {helpOpen && <div className="ph-help-panel">
      <button type="button" aria-label="Fechar ajuda" onClick={() => setHelpOpen(false)} style={{ float: 'right', border: 0, background: 'transparent', cursor: 'pointer' }}><X size={16} /></button>
      <h3>Como posso ajudar?</h3>
      <p>Veja as telas do sistema e entenda cada módulo, ou fale com o atendimento.</p>
      <a href="#telas">Ver as telas</a>
      <a href="#modulos">Ver módulos</a>
      <a href="#planos">Ver planos</a>
      <a href="/contato">Falar com atendimento</a>
    </div>}
  </main>
}
