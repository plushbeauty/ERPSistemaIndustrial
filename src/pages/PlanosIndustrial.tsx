/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-VITRINE-PUBLICA-20261101-02 — /planos refeita como página comercial premium
 * @STATUS_APROVACAO: REESCRITA AUTORIZADA PELO PROPRIETARIO EM 2026-11-01 ("COISA MAIS FEIA DE SE VER … VEJA TODOS OS MODULOS DO SISTEMA PARA COLOCAR NOS PLANOS")
 *
 * Os preços e a composição continuam vindo do catálogo comercial do banco (erp_planos_catalogo
 * + erp_plano_modulos). Quando essa leitura não devolve linhas, a tela mostra a composição de
 * catálogo do produto — nunca um preço inventado na hora — e avisa que a confirmação é feita
 * na ativação.
 */
import { ArrowLeft, ArrowRight, Check, ChevronRight, Database, Minus, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/public-home-premium-20261101.css'

type PlanModuleRow = {
  plano_codigo: string
  modulo_codigo: string
  modulo_nome: string
  recursos: { features?: string[] } | null
}

type Plan = {
  codigo: string
  nome: string
  precoMensal: number
  descricao: string
  modulos: string[]
  nomesPorModulo: Record<string, string>
  recursos: string[]
}

type Estado = 'carregando' | 'sucesso' | 'vazio' | 'erro'

const moduloNomes: Record<string, string> = {
  cadastros: 'Cadastros e usuários',
  estoque: 'Estoque e Materiais',
  recebimento: 'Recebimento de Materiais',
  vendas: 'Vendas e CRM',
  compras: 'Compras e Fornecedores',
  comissoes: 'Comissões',
  producao: 'Ordens de Produção',
  pcp: 'PCP e Programação',
  'chao-de-fabrica': 'Chão de Fábrica',
  'chao-fabrica': 'Chão de Fábrica',
  'prensa-dupla': 'PCP de Prensa Dupla',
  'matriz-desenhos': 'Matriz de Desenhos',
  engenharia: 'Engenharia e BOM',
  qualidade: 'Qualidade e SGQ',
  fmea: 'FMEA, RPNC e CAPA',
  documentos: 'Documentos e Databook',
  'documentos-obsoletos': 'Documentos Controlados',
  metrologia: 'Metrologia',
  'metrologia-rbc': 'Metrologia RBC',
  injecao: 'Injeção Plástica',
  prensados: 'Prensados',
  estamparia: 'Estamparia',
  extrusao: 'Extrusão',
  usinagem: 'Usinagem',
  soldagem: 'Soldagem',
  'tratamento-superficie': 'Tratamento de Superfície',
  caldeiraria: 'Caldeiraria e Solda',
  ferramentaria: 'Ferramentaria',
  'manutencao-tpm': 'Manutenção TPM',
  manutencao: 'Manutenção',
  seguranca: 'Segurança e Meio Ambiente',
  custos: 'Custos Industriais',
  financeiro: 'Financeiro e Controladoria',
  fiscal: 'Fiscal',
  expedicao: 'Expedição',
  'roteirizacao-balanca': 'Roteirização de Carga',
  rastreabilidade: 'Rastreabilidade',
  rh: 'RH e Departamento Pessoal',
  bi: 'Indicadores e BI',
  indicadores: 'Indicadores e BI',
  ia: 'IA Industrial',
  sgq: 'SGQ Avançado e TPM',
  'sgq-tpm': 'SGQ Avançado e TPM',
  'cavidades-iguais': 'Injeção de Cavidades Iguais',
  'encaixe-perfeito': 'PCP de Peças com Encaixe',
  'engenharia-autopecas': 'Engenharia Automotiva',
}

/**
 * Composição de catálogo do produto, espelhando as migrations 20260925143000 (essencial /
 * profissional / diamante), 20260927250000 (enterprise_gold) e 20260930101500 (módulos novos).
 * Usada apenas quando a leitura do catálogo no banco não devolve linhas.
 */
/** Códigos de módulo que a vitrine "tudo que o sistema cobre" usa quando o banco não devolve o catálogo. */
const composicaoCatalogo: Record<string, string[]> = {
  essencial: ['cadastros', 'estoque', 'vendas', 'compras', 'producao', 'expedicao'],
  profissional: ['cadastros', 'estoque', 'vendas', 'compras', 'pcp', 'producao', 'engenharia', 'injecao', 'prensados', 'estamparia', 'ferramentaria', 'qualidade', 'manutencao', 'custos', 'expedicao', 'rh', 'bi'],
  diamante: ['cadastros', 'estoque', 'vendas', 'compras', 'pcp', 'producao', 'engenharia', 'injecao', 'prensados', 'estamparia', 'ferramentaria', 'qualidade', 'fmea', 'manutencao', 'custos', 'financeiro', 'fiscal', 'expedicao', 'documentos', 'rh', 'bi', 'ia', 'rastreabilidade', 'prensa-dupla', 'chao-fabrica', 'metrologia-rbc', 'documentos-obsoletos'],
  enterprise_gold: ['sgq-tpm', 'rastreabilidade', 'fmea', 'prensa-dupla', 'chao-fabrica', 'metrologia-rbc', 'documentos-obsoletos', 'matriz-desenhos', 'manutencao-tpm', 'roteirizacao-balanca'],
}

const planosCatalogo = [
  { codigo: 'essencial', nome: 'Essencial', precoMensal: 199, ordem: 1, resumo: 'Base operacional para organizar cadastros, materiais, compras e expedição.' },
  { codigo: 'profissional', nome: 'Profissional', precoMensal: 349, ordem: 2, resumo: 'PCP, chão de fábrica, qualidade, custos e indicadores rodando na mesma base.' },
  { codigo: 'diamante', nome: 'Diamante', precoMensal: 549, ordem: 3, resumo: 'Gestão industrial completa, com fiscal, financeiro, FMEA e rastreabilidade.' },
  { codigo: 'enterprise_gold', nome: 'Industrial Enterprise Gold', precoMensal: 1290, ordem: 4, resumo: 'SGQ avançado, TPM e rastreabilidade de ponta a ponta para operações críticas.' },
]

const etiquetasDiamante: Record<string, string> = {
  fiscal: 'Fiscal Brasil',
  financeiro: 'Financeiro e Controladoria',
  documentos: 'Documentos e Databook',
  'metrologia-rbc': 'Metrologia RBC',
  'documentos-obsoletos': 'Documentos Controlados',
}

/** Recursos descritos nas migrations de catálogo; usados só na composição de referência. */
const catalogoRecursos: Record<string, string[]> = {
  'sgq-tpm': ['Balança Rodoviária de Portaria', 'Roteirização de Carga com trava de excesso de peso', 'Gestão de Não Conformidades RNC 8D', 'Assinatura Eletrônica SHA-256', 'Assistente de IA de Ajuda Contextual POP-SGQ-012'],
  rastreabilidade: ['Lote da matéria-prima ao produto acabado', 'Genealogia do pedido à expedição'],
  'chao-fabrica': ['Apontamento por posto', 'Paradas com motivo', 'Refugo e setup'],
  'metrologia-rbc': ['Instrumentos, calibração e certificados'],
  'documentos-obsoletos': ['Revisões, aprovação e histórico de obsoletos'],
  'matriz-desenhos': ['Revisões de desenho e documentos técnicos'],
  'manutencao-tpm': ['Preventiva, corretiva e laudo técnico'],
  'roteirizacao-balanca': ['Roteirização de carga e conferência de peso'],
  'prensa-dupla': ['Programação síncrona frente/trás com gantt'],
  fmea: ['RPNC, RPN e CAPA com auditoria'],
  documentos: ['Revisão, assinatura eletrônica e Databook'],
  ia: ['Copiloto, previsão e recomendações'],
}

/** Módulos que a tela apresenta na vitrine "todos os módulos do sistema". */
const todosModulos = [
  'cadastros', 'pcp', 'chao-de-fabrica', 'producao', 'prensa-dupla', 'engenharia', 'matriz-desenhos', 'injecao', 'prensados',
  'estamparia', 'ferramentaria', 'estoque', 'recebimento', 'compras', 'fmea', 'qualidade', 'metrologia-rbc',
  'documentos-obsoletos', 'manutencao-tpm', 'rastreabilidade', 'custos', 'financeiro', 'fiscal', 'expedicao',
  'roteirizacao-balanca', 'rh', 'vendas', 'comissoes', 'bi', 'ia', 'sgq-tpm',
]

const planosPriorizados = ['profissional', 'essencial', 'diamante', 'enterprise_gold']

const destaqueModulo: Record<string, string> = {
  pcp: 'Planejamento, programação e capacidade finita com gantt das máquinas.',
  'chao-de-fabrica': 'Terminal de apontamento do operador: produção, parada, refugo e setup.',
  producao: 'Ordens de produção com apontamento, consumo e fechamento.',
  'prensa-dupla': 'Programação síncrona dos dois lados da prensa com travas de sequência.',
  engenharia: 'Fichas de processo, roteiros, estruturas BOM e revisões controladas.',
  'matriz-desenhos': 'Matriz de desenhos e documentos técnicos por família de peça.',
  injecao: 'Moldes, cavidades, ciclo e parâmetros de injeção.',
  prensados: 'Prensa, ferramental e cura com controle de parâmetros.',
  estamparia: 'Estampo, força de prensa e setup por ferramenta.',
  ferramentaria: 'Moldes e estampos com vida útil, ciclos e manutenção.',
  estoque: 'Saldo por item, lote e endereço, com inventário e acurácia.',
  recebimento: 'Conferência de NF-e, identificação de lote e entrada rastreável.',
  compras: 'Requisições, cotações, pedidos e acompanhamento de fornecedor.',
  fmea: 'RPNC, Ishikawa, 5 Porquês e plano de ação CAPA com prazo.',
  qualidade: 'Inspeções, não conformidades, auditorias e evidências do SGQ.',
  'metrologia-rbc': 'Instrumentos, calibração, certificados e validade.',
  'documentos-obsoletos': 'Documentos controlados, revisões, aprovação e obsoletos.',
  'manutencao-tpm': 'Preventiva, corretiva, bloqueio de máquina e laudo técnico.',
  manutencao: 'Planos preventivos, ordens corretivas e histórico de intervenções.',
  documentos: 'Procedimentos, instruções e registros controlados por revisão.',
  metrologia: 'Paquímetro digital, instrumentos, calibração e validade.',
  rastreabilidade: 'Do lote da matéria-prima ao pedido, à ordem e à expedição.',
  custos: 'Custo padrão, custo real, margem e simulação de cenário.',
  financeiro: 'Contas, conciliação, fluxo de caixa e resultado por período.',
  fiscal: 'Apuração, documentos fiscais e obrigações acessórias.',
  expedicao: 'Separação, conferência, embalagem, romaneio e entrega.',
  'roteirizacao-balanca': 'Roteirização de carga com trava de excesso de peso na portaria.',
  rh: 'Colaboradores, jornada, custo de hora, treinamentos e competências.',
  vendas: 'Orçamentos, pedidos e histórico comercial do cliente.',
  comissoes: 'Regras, cálculo, perfil do vendedor e auditoria de estorno.',
  bi: 'Cockpit, projeções, alertas e indicadores de performance.',
  ia: 'Copiloto industrial, previsão e recomendações de decisão.',
  sgq: 'SGQ avançado com processos, riscos e melhoria contínua.',
  'sgq-tpm': 'SGQ avançado e TPM com gestão de ativos e indisponibilidades.',
  cadastros: 'Produtos, clientes, fornecedores, máquinas e permissões por usuário.',
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)

function resourceFeatures(resources: PlanModuleRow['recursos']): string[] {
  return Array.isArray(resources?.features)
    ? resources.features.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

/** Uma linha por módulo exibido: códigos que representam a mesma área viram a mesma linha. */
type LinhaModulo = { nome: string; codigos: string[]; codigo: string }

function linhasPorNome(codigos: string[], nome: (codigo: string) => string): LinhaModulo[] {
  const mapa = new Map<string, string[]>()
  for (const codigo of codigos) {
    const rotulo = nome(codigo)
    mapa.set(rotulo, [...(mapa.get(rotulo) ?? []), codigo])
  }
  return [...mapa.entries()]
    .map(([nomeModulo, grupo]) => ({
      nome: nomeModulo,
      codigos: grupo,
      codigo: grupo.find(codigo => destaqueModulo[codigo] !== undefined) ?? grupo[0],
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export default function PlanosIndustrial() {
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const modulo = params.get('modulo') ?? ''
  const [planos, setPlanos] = useState<Plan[]>([])
  const [todosOsModulos, setTodosOsModulos] = useState<string[]>([])
  const [estado, setEstado] = useState<Estado>('carregando')
  const [erro, setErro] = useState('')
  const [selecionado, setSelecionado] = useState(params.get('plano') ?? 'profissional')

  const carregar = useCallback(async () => {
    setEstado('carregando')
    setErro('')
    try {
      const [planosResultado, modulosResultado] = await Promise.all([
        supabase
          .from('erp_planos_catalogo')
          .select('codigo,nome,preco_mensal,descricao,ordem')
          .eq('ativo', true)
          .order('ordem'),
        supabase
          .from('erp_plano_modulos')
          .select('plano_codigo,modulo_codigo,modulo_nome,recursos')
          .eq('acesso', true)
          .order('modulo_nome'),
      ])
      if (planosResultado.error) throw planosResultado.error
      if (modulosResultado.error) throw modulosResultado.error

      const linhasModulo = (modulosResultado.data ?? []) as PlanModuleRow[]
      const linhasPlano = planosResultado.data ?? []

      if (linhasPlano.length === 0) {
        setEstado('vazio')
        return
      }

      const construidos = linhasPlano.map<Plan>(linha => {
        const codigo = String(linha.codigo)
        const modulos = linhasModulo.filter(item => item.plano_codigo === codigo)
        return {
          codigo,
          nome: String(linha.nome),
          precoMensal: Number(linha.preco_mensal),
          descricao: linha.descricao == null ? '' : String(linha.descricao),
          modulos: modulos.map(item => item.modulo_codigo),
          nomesPorModulo: Object.fromEntries(modulos.map(item => [item.modulo_codigo, item.modulo_nome])),
          recursos: modulos.flatMap(item => resourceFeatures(item.recursos)),
        }
      })
      setPlanos(construidos)
      const conhecidos = new Set(Object.keys(moduloNomes))
      setTodosOsModulos(construidos
        .flatMap(plan => plan.modulos)
        .filter((codigo, index, all) => all.indexOf(codigo) === index && conhecidos.has(codigo))
        .sort((a, b) => moduloNome(a).localeCompare(moduloNome(b), 'pt-BR')))
      setSelecionado(atual => (construidos.some(plan => plan.codigo === atual) ? atual : (construidos[0]?.codigo ?? atual)))
      setEstado('sucesso')
    } catch (cause) {
      setErro(mensagemDeFalha(cause))
      setEstado('erro')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const emExibicao = estado === 'sucesso' ? planos : planosDeReferencia()
  const nomesCatalogo: Record<string, string> = {}
  for (const plan of emExibicao) {
    for (const [codigo, nome] of Object.entries(plan.nomesPorModulo)) {
      if (!nomesCatalogo[codigo]) nomesCatalogo[codigo] = nome
    }
  }
  const codigosExibidos = [...new Set([
    ...(estado === 'sucesso' ? todosOsModulos : []),
    ...todosModulos,
    ...Object.values(composicaoCatalogo).flat(),
  ])]
  const linhas = linhasPorNome(codigosExibidos, codigo => nomesCatalogo[codigo] ?? moduloNome(codigo))
  const ordenados = [...emExibicao].sort((a, b) => {
    const ia = planosPriorizados.indexOf(a.codigo)
    const ib = planosPriorizados.indexOf(b.codigo)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  const atual = emExibicao.find(plan => plan.codigo === selecionado) ?? ordenados[0]
  const nomeModulo = (codigo: string) => atual?.nomesPorModulo[codigo] ?? moduloNome(codigo)
  const hrefPlano = (codigo: string) =>
    '/cadastro-empresa?plano=' + encodeURIComponent(codigo) + (modulo ? '&modulo=' + encodeURIComponent(modulo) : '')
  const planoTopo = emExibicao.find(plan => plan.codigo === 'enterprise_gold') ?? emExibicao.find(plan => plan.codigo === 'diamante')
  const recursosDestaque = planoTopo ? [...new Set(planoTopo.recursos)] : []

  return <main className="sgq-public-home">
    <div className="ph-wrap" style={{ paddingTop: 22 }}>
      <Link to={modulo ? '/#modulos' : '/'} className="ph-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40 }}>
        <ArrowLeft size={16} /> {modulo ? 'Voltar aos módulos' : 'Voltar ao início'}
      </Link>
    </div>

    <section className="ph-hero" style={{ paddingBottom: 34 }}>
      <div className="ph-wrap ph-hero-grid">
        <div>
          <span className="ph-kicker">Planos · SYSNQRA ERP &amp; SGQ Industrial</span>
          <h1>Escolha o nível de gestão da sua indústria.</h1>
          <p className="ph-lead">Cada plano libera um conjunto de módulos da mesma base de dados. O material entra uma vez e vale para PCP, estoque, qualidade, custos e fiscal — sem retrabalho e sem planilha paralela.</p>
          <div className="ph-cta-row">
            <a className="ph-solid" href={hrefPlano(atual?.codigo ?? 'profissional')}>Começar pelo {atual?.nome ?? 'Profissional'} <ArrowRight size={16} /></a>
            <a className="ph-ghost" href="#comparativo">Comparar módulo a módulo</a>
          </div>
          <p className="ph-cta-note">Ativação em três etapas, dados isolados por empresa e migração assistida dos cadastros.</p>
        </div>
        <div className="ph-shot">
          <div className="ph-shot-bar" aria-hidden="true"><i /><i /><i /><span>sysnqra.app/pageprincipal/pcp/dashboard</span></div>
          <img src="/images/telas/pcp.webp" alt="Dashboard do PCP com programação por máquina e ordens de produção" loading="lazy" decoding="async" />
        </div>
      </div>
    </section>

    {modulo && (
      <div className="ph-wrap">
        <div className="ph-module-detail" style={{ marginTop: 0 }}>
          <div className="ph-detail-head">
            <span className="ph-module-icon"><ShieldCheck size={19} /></span>
            <div>
              <h3>{nomeModulo(modulo)}</h3>
              <p>{destaqueModulo[modulo] ?? 'Veja abaixo em quais planos este módulo está incluído.'}</p>
            </div>
          </div>
        </div>
      </div>
    )}

    {estado === 'carregando' && (
      <section className="ph-wrap ph-empty" role="status" aria-live="polite" style={{ borderColor: 'var(--ph-line)', background: '#fff', color: 'var(--ph-muted)' }}>
        <strong style={{ color: 'var(--ph-navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw size={17} className="ph-spin" /> Carregando o catálogo comercial…
        </strong>
        <p style={{ marginTop: 6 }}>Preços e composição são lidos do catálogo ativo da base. Nada aqui é exibido antes da consulta voltar.</p>
      </section>
    )}

    {estado === 'erro' && (
      <section className="ph-wrap">
        <div className="ph-empty" role="alert">
          <strong><Database size={16} aria-hidden="true" /> Não foi possível ler o catálogo comercial desta base.</strong>
          <p style={{ marginTop: 6 }}>{erro}</p>
          <p style={{ marginTop: 10 }}>Abaixo está a <b>composição de catálogo</b> do produto, para comparação. O valor final é confirmado na ativação da empresa, nunca estimado aqui.</p>
          <ul>
            <li>Verifique se a leitura pública das tabelas de catálogo está liberada para visitantes.</li>
            <li>Se você acabou de aplicar as migrations do catálogo, atualize esta página.</li>
          </ul>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="ph-ghost" onClick={() => void carregar()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, border: '1px solid var(--ph-line)', borderRadius: 10, padding: '0 16px', font: 'inherit', fontWeight: 900, cursor: 'pointer' }}>
              <RefreshCw size={16} /> Tentar novamente
            </button>
            <a className="ph-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 16px' }} href="/contato">Falar com a equipe <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>
    )}

    {estado === 'vazio' && (
      <section className="ph-wrap">
        <div className="ph-empty">
          <strong><Database size={16} aria-hidden="true" /> O catálogo comercial ainda não está publicado nesta base.</strong>
          <p style={{ marginTop: 6 }}>A leitura foi concluída, mas nenhuma plano ativo foi retornado. Este site não simula valores: enquanto o catálogo estiver vazio, a comparação abaixo usa a composição de catálogo do produto.</p>
          <ul>
            <li>Ative pelo menos um plano na tabela de catálogo para publicar preços reais.</li>
            <li>Confirme que a migration de política de leitura pública foi aplicada no projeto Supabase.</li>
          </ul>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="ph-ghost" onClick={() => void carregar()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, border: '1px solid var(--ph-line)', borderRadius: 10, padding: '0 16px', font: 'inherit', fontWeight: 900, cursor: 'pointer' }}>
              <RefreshCw size={16} /> Recarregar catálogo
            </button>
            <a className="ph-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 16px' }} href="/cadastro-empresa">Ativar minha empresa <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>
    )}

    {estado !== 'carregando' && (<>
    <section className="ph-section" id="planos">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>Planos</span>
          <h2>Quatro níveis, uma base só.</h2>
          <p>Comece pelo que a operação aguenta hoje e evolua de plano sem migrar de sistema nem perder histórico.</p>
        </div>
        <div className="ph-plans" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {ordenados.map(plan => {
            const incluiModulo = modulo === '' || plan.modulos.includes(modulo)
            const selecionadoAgora = atual?.codigo === plan.codigo
            return <article key={plan.codigo} className={plan.codigo === 'enterprise_gold' ? 'ph-plan is-featured' : 'ph-plan'}
              style={selecionadoAgora ? { borderColor: 'var(--ph-blue)', boxShadow: '0 16px 34px rgba(45,141,184,.13)' } : undefined}>
              <small>{plan.codigo === 'enterprise_gold' ? 'Topo de linha' : selecionadoAgora ? 'Sua escolha' : 'Plano'}</small>
              <h3>{plan.nome}</h3>
              <span className="ph-plan-price">{money(plan.precoMensal)}</span>
              <span className="ph-plan-period">por mês, por empresa</span>
              {plan.codigo === 'enterprise_gold' && (
                <span className="ph-plan-period" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--ph-blue)', fontWeight: 900 }}>
                  <Sparkles size={13} /> SGQ Avançado e TPM
                </span>
              )}
              <p>{plan.descricao || resumoDeCatalogo(plan.codigo)}</p>
              {modulo && (
                <div className="ph-chips" style={{ marginTop: 0, marginBottom: 14 }}>
                  <span className="ph-chip" style={incluiModulo ? { borderColor: 'var(--ph-green)', color: 'var(--ph-green)' } : undefined}>
                    {incluiModulo ? <Check size={14} /> : <Minus size={14} />} {incluiModulo ? 'Inclui ' + nomeModulo(modulo) : 'Não inclui este módulo'}
                  </span>
                </div>
              )}
              <div className="ph-plan-modules">
                <b>{plan.modulos.length} módulos</b>
                <div className="ph-chips" style={{ marginTop: 0 }}>
                  {plan.modulos.slice(0, 7).map(codigo => <span className="ph-chip" key={codigo}>{nomeModulo(codigo)}</span>)}
                  {plan.modulos.length > 7 && <span className="ph-chip">+{plan.modulos.length - 7}</span>}
                </div>
              </div>
              <button type="button" onClick={() => setSelecionado(plan.codigo)} aria-pressed={selecionadoAgora}
                style={{ width: '100%', minHeight: 38, marginBottom: 10, border: '1px solid var(--ph-line)', borderRadius: 10, background: selecionadoAgora ? 'var(--ph-tint)' : '#fff', color: 'var(--ph-navy)', font: 'inherit', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
                {selecionadoAgora ? 'Selecionado' : 'Comparar este plano'}
              </button>
              <a href={hrefPlano(plan.codigo)}>Escolher {plan.nome} <ArrowRight size={15} /></a>
            </article>
          })}
        </div>
      </div>
    </section>

    <section className="ph-section ph-section--tint" id="comparativo">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>Comparativo</span>
          <h2>Todos os módulos, plano a plano.</h2>
          <p>A grade abaixo é a composição completa. Role na horizontal para ver cada plano; a primeira coluna fica fixa.</p>
        </div>
        <div className="ph-compare-wrap">
          <table className="ph-compare">
            <caption className="ph-sr-only">Módulos incluídos em cada plano</caption>
            <thead>
              <tr>
                <th scope="col">Módulo</th>
                {ordenados.map(plan => <th scope="col" key={plan.codigo}>{plan.nome}<br /><small style={{ color: 'var(--ph-muted)', fontWeight: 800 }}>{money(plan.precoMensal)}/mês</small></th>)}
              </tr>
            </thead>
            <tbody>
              {linhas.map(linha => <tr key={linha.nome} style={linha.codigos.includes(modulo) ? { background: 'var(--ph-tint)' } : undefined}>
                <th scope="row">{linha.nome}</th>
                {ordenados.map(plan => {
                  const sim = linha.codigos.some(codigo => plan.modulos.includes(codigo))
                  return <td key={plan.codigo} className={sim ? 'is-yes' : 'is-no'} aria-label={sim ? 'Incluído no plano ' + plan.nome : 'Não incluído no plano ' + plan.nome}>
                    {sim ? '✓' : '—'}
                  </td>
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
        {recursosDestaque.length > 0 && (
          <div className="ph-chips" style={{ marginTop: 18 }}>
            {recursosDestaque.map(recurso => <span className="ph-chip" key={recurso}><Check size={13} style={{ color: 'var(--ph-green)' }} /> {recurso}</span>)}
          </div>
        )}
      </div>
    </section>

    <section className="ph-section" id="todos-os-modulos">
      <div className="ph-wrap">
        <div className="ph-head">
          <span>Escopo do produto</span>
          <h2>Tudo que o sistema cobre.</h2>
          <p>Cada módulo libera telas, cadastros e indicadores próprios na mesma base, com permissão por usuário e isolamento por empresa.</p>
        </div>
        <div className="ph-modules">
          {linhas.map(linha => {
            const emPlanos = emExibicao
              .filter(plan => linha.codigos.some(codigo => plan.modulos.includes(codigo)))
              .map(plan => plan.nome)
            return <article className="ph-module" key={linha.nome}>
              <span className="ph-module-icon"><Check size={18} /></span>
              <h3>{linha.nome}</h3>
              <p>{destaqueModulo[linha.codigo] ?? 'Rotinas industriais integradas à mesma base de dados.'}</p>
              <div className="ph-chips" style={{ marginTop: 12 }}>
                {emPlanos.length === 0
                  ? <span className="ph-chip">Sob consulta</span>
                  : emPlanos.map(nome => <span className="ph-chip" key={nome}>{nome}</span>)}
              </div>
            </article>
          })}
        </div>
      </div>
    </section>

    {atual && (
      <section className="ph-section ph-section--tint">
        <div className="ph-wrap">
          <div className="ph-head" style={{ marginBottom: 20 }}>
            <span>Sua escolha</span>
            <h2>{atual.nome} · {money(atual.precoMensal)}/mês</h2>
            <p>{modulo
              ? (atual.modulos.includes(modulo) ? `O módulo ${nomeModulo(modulo)} está incluído nesta composição.` : `O módulo ${nomeModulo(modulo)} não está neste plano — veja o comparativo para qual incluir.`)
              : `${atual.modulos.length} módulos liberados na mesma base, com ativação em três etapas.`}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a className="ph-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 20px' }} href={hrefPlano(atual.codigo)}>
              Continuar para o cadastro <ChevronRight size={16} />
            </a>
            <a className="ph-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 20px' }} href="/contato">Tirar dúvidas antes</a>
          </div>
        </div>
      </section>
    )}
    </>)}

    <footer className="ph-footer">
      <div className="ph-footer-brand">
        <img src="/logo/logo.png" alt="" aria-hidden="true" />
        <div><strong>SYSNQRA</strong><br />ERP &amp; SGQ Industrial</div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <a href="/">Início</a>
        <a href="/#modulos">Módulos</a>
        <a href="/blog">Blog</a>
        <a href="/contato">Contato</a>
        <a href="/login">Entrar</a>
      </div>
    </footer>
  </main>
}

function moduloNome(codigo: string) {
  return moduloNomes[codigo] ?? codigo
}

/** PostgrestError e AuthError não são instâncias de Error; a mensagem útil vem na propriedade message. */
function mensagemDeFalha(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message
  if (cause !== null && typeof cause === 'object') {
    const mensagem = (cause as { message?: unknown }).message
    if (typeof mensagem === 'string' && mensagem.trim()) return mensagem
    const code = (cause as { code?: unknown }).code
    if (typeof code === 'string' && code.trim()) return `A consulta ao catálogo devolveu o código ${code}.`
  }
  return 'A leitura do catálogo comercial não pôde ser concluída.'
}

function resumoDeCatalogo(codigo: string) {
  return planosCatalogo.find(plan => plan.codigo === codigo)?.resumo ?? 'Composição do catálogo comercial do produto.'
}

function planosDeReferencia(): Plan[] {
  const modulosPorPlano = Object.fromEntries(Object.entries(composicaoCatalogo).map(([codigo, lista]) => [codigo, lista])) as Record<string, string[]>
  const enterpriseGold = modulosPorPlano['enterprise_gold'] ?? []
  const diamante = modulosPorPlano['diamante'] ?? []
  return planosCatalogo.map(plan => ({
    codigo: plan.codigo,
    nome: plan.nome,
    precoMensal: plan.precoMensal,
    descricao: plan.resumo,
    modulos: modulosPorPlano[plan.codigo] ?? [],
    nomesPorModulo: Object.fromEntries((modulosPorPlano[plan.codigo] ?? []).map(codigo =>
      [codigo, etiquetasDiamante[codigo] ?? moduloNome(codigo)])),
    recursos: plan.codigo === 'enterprise_gold'
      ? [...new Set([...enterpriseGold, ...diamante].flatMap(codigo => catalogoRecursos[codigo] ?? []))]
      : (modulosPorPlano[plan.codigo] ?? []).flatMap(codigo => catalogoRecursos[codigo] ?? []),
  }))
}

