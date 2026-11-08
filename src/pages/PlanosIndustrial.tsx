/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-06
 * @REVISAO: REV-PLANOS-SISTEMA-20261106-01 — grade comercial do proprietário, visual do próprio ERP e módulos conferidos tela a tela
 * @STATUS_APROVACAO: REESCRITA AUTORIZADA PELO PROPRIETARIO EM 2026-11-06 — "TELA DE PLANOS ESTA FEIA DE
 * MAIS ARRUMAR ELA ACHAR EM OUTROS SISTEMA PARA MELHORAR O VISUAL DELA BASEADO NO NOSSO SISTEMA" e
 * "VER AS OUTRAS TELAS DO SISTEMA E VERIFICAR SE TEMOS TODOS ESSES ITENS NO SISTEMA QUE CONSTA NOS PLANOS"
 *
 * Preços e composição continuam vindo do catálogo comercial do banco (erp_planos_catalogo +
 * erp_plano_modulos). Enquanto essa leitura não devolve linhas, a tela usa a grade que o próprio
 * proprietário escreveu em 2026-11-06 — nunca um preço inventado na hora — e avisa disso no topo.
 *
 * A conferência que ele pediu foi feita rota a rota (AppEntryV2.tsx + menu ERPHorizontalShell.tsx +
 * catálogo do tablet SGQ): cada linha desta grade tem tela real no sistema. "IA Industrial" e
 * "Matriz de Desenhos" estavam na matriz comercial mas não têm página nenhuma — saem da vitrine por
 * regra permanente dele ("não mostrar módulos não implementados como se estivessem prontos") e estão
 * listadas no relatório para decisão. O mesmo vale para o "Databook" (existe GED, não existe databook)
 * e para a trava de peso da roteirização (existe roteirização, não existe balança).
 */
import { ArrowRight, Check, Database, FileText, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/public-home-premium-20261101.css'
import '../styles/planos-industrial-20261106.css'

type Estado = 'carregando' | 'sucesso' | 'vazio' | 'erro'

type CodigoPlano = 'essencial' | 'profissional' | 'diamante' | 'enterprise_gold'
type BandeiraPlano = Record<CodigoPlano, boolean>

type PlanCatalogoRow = {
  codigo: string
  nome: string
  preco_mensal: number | string | null
  descricao: string | null
  ordem: number | string | null
}

type PlanModuleRow = {
  plano_codigo: string
  modulo_codigo: string
  modulo_nome: string
  recursos: { features?: string[] } | null
}

type LinhaComercial = {
  codigo: string
  /** Códigos que representam a mesma área no catálogo do banco. */
  codigos: string[]
  nome: string
  grupo: string
  resumo: string
  planos: BandeiraPlano
}

type PlanoNaTela = {
  codigo: string
  nome: string
  precoMensal: number | null
  resumo: string
  tag: string
  acento: string
  escuro: boolean
  /** true quando a composição veio do catálogo publicado no banco. */
  doBanco: boolean
  /** Códigos de módulo do plano (linhas de erp_plano_modulos ou bandeiros da grade local). */
  modulos: string[]
  /** Unidade de contagem da tela: as linhas comerciais que o plano libera. */
  linhas: LinhaComercial[]
  /** Códigos que o catálogo vinculou ao plano mas não correspondem a nenhuma linha da grade. */
  codigosForaDaGrade: string[]
}

const band = (essencial: boolean, profissional: boolean, diamante: boolean, enterpriseGold: boolean): BandeiraPlano => ({
  essencial,
  profissional,
  diamante,
  enterprise_gold: enterpriseGold,
})

/** Grade comercial escrita pelo proprietário em 2026-11-06, linha a linha, com o resumo de cada módulo conferido na tela real. */
const gradeComercial: LinhaComercial[] = [
  { codigo: 'pcp', codigos: ['pcp'], nome: 'PCP e Programação', grupo: 'Produção e PCP', resumo: 'Programação, sequenciamento, capacidade finita e gantt das máquinas.', planos: band(true, false, true, false) },
  { codigo: 'producao', codigos: ['producao'], nome: 'Ordens de Produção', grupo: 'Produção e PCP', resumo: 'Ordens com apontamento, consumo de material e fechamento.', planos: band(true, true, true, false) },
  { codigo: 'chao-fabrica', codigos: ['chao-fabrica', 'chao-de-fabrica'], nome: 'Chão de Fábrica', grupo: 'Produção e PCP', resumo: 'Terminal de apontamento por posto: peças boas, parada, refugo e setup.', planos: band(false, false, true, true) },
  { codigo: 'prensa-dupla', codigos: ['prensa-dupla'], nome: 'PCP de Prensa Dupla', grupo: 'Produção e PCP', resumo: 'Modo de operação dupla (frente/trás) dentro das ordens de produção.', planos: band(false, false, true, true) },

  { codigo: 'engenharia', codigos: ['engenharia'], nome: 'Engenharia e BOM', grupo: 'Engenharia e Processos', resumo: 'Fichas de processo, roteiros, estruturas BOM e revisões controladas.', planos: band(true, false, true, false) },
  { codigo: 'injecao', codigos: ['injecao'], nome: 'Injeção Plástica', grupo: 'Engenharia e Processos', resumo: 'Moldes, cavidades, ciclo e parâmetros da injetora.', planos: band(true, false, true, false) },
  { codigo: 'prensados', codigos: ['prensados'], nome: 'Prensados', grupo: 'Engenharia e Processos', resumo: 'Prensa, ferramental e cura com controle de parâmetros.', planos: band(true, false, true, false) },
  { codigo: 'estamparia', codigos: ['estamparia'], nome: 'Estamparia', grupo: 'Engenharia e Processos', resumo: 'Estampo, força de prensa e setup por ferramenta.', planos: band(true, false, true, false) },
  { codigo: 'ferramentaria', codigos: ['ferramentaria'], nome: 'Ferramentaria', grupo: 'Engenharia e Processos', resumo: 'Moldes e estampos com vida útil, ciclos e manutenção.', planos: band(true, false, true, false) },

  { codigo: 'qualidade', codigos: ['qualidade'], nome: 'Qualidade e SGQ', grupo: 'Qualidade e SGQ', resumo: 'Inspeções, não conformidades, auditorias e evidências do SGQ.', planos: band(true, false, true, false) },
  { codigo: 'fmea', codigos: ['fmea'], nome: 'FMEA, RPNC e CAPA', grupo: 'Qualidade e SGQ', resumo: 'RPNC com Ishikawa e 5 Porquês, plano de ação com prazo e auditoria.', planos: band(false, false, true, true) },
  { codigo: 'metrologia-rbc', codigos: ['metrologia-rbc', 'metrologia'], nome: 'Metrologia RBC', grupo: 'Qualidade e SGQ', resumo: 'Paquímetro digital, instrumentos, calibração, certificados e validade.', planos: band(false, false, true, true) },
  { codigo: 'documentos-obsoletos', codigos: ['documentos-obsoletos'], nome: 'Documentos Controlados', grupo: 'Qualidade e SGQ', resumo: 'Revisões, aprovação, vigência e obsoletos com trilha de acesso.', planos: band(false, false, true, true) },
  { codigo: 'documentos', codigos: ['documentos'], nome: 'GED — Arquivo Digital', grupo: 'Qualidade e SGQ', resumo: 'Repositório de procedimentos, instruções e registros por revisão.', planos: band(false, false, true, false) },
  { codigo: 'rastreabilidade', codigos: ['rastreabilidade'], nome: 'Rastreabilidade', grupo: 'Qualidade e SGQ', resumo: 'Do lote da matéria-prima à ordem, ao pedido e à expedição.', planos: band(false, false, true, true) },
  { codigo: 'sgq-tpm', codigos: ['sgq-tpm', 'sgq'], nome: 'SGQ Avançado e TPM', grupo: 'Qualidade e SGQ', resumo: 'Riscos, auditorias do SGQ e gestão de ativos com indisponibilidades.', planos: band(false, false, false, true) },

  { codigo: 'estoque', codigos: ['estoque'], nome: 'Estoque e Materiais', grupo: 'Estoque e Suprimentos', resumo: 'Saldo por item, lote e endereço, com inventário e acurácia.', planos: band(true, true, true, false) },
  { codigo: 'recebimento', codigos: ['recebimento'], nome: 'Recebimento de Materiais', grupo: 'Estoque e Suprimentos', resumo: 'Conferência de NF-e, identificação de lote e entrada rastreável.', planos: band(false, false, false, false) },
  { codigo: 'compras', codigos: ['compras'], nome: 'Compras e Fornecedores', grupo: 'Estoque e Suprimentos', resumo: 'Requisições, cotações, pedidos e acompanhamento de fornecedor.', planos: band(true, true, true, false) },
  { codigo: 'expedicao', codigos: ['expedicao'], nome: 'Expedição', grupo: 'Estoque e Suprimentos', resumo: 'Separação, conferência, embalagem, romaneio e entrega.', planos: band(true, true, true, false) },
  { codigo: 'roteirizacao', codigos: ['roteirizacao-balanca', 'roteirizacao'], nome: 'Roteirização de Carga', grupo: 'Estoque e Suprimentos', resumo: 'Roteirização da entrega com volumes, cubagem e comprovante.', planos: band(false, false, false, true) },

  { codigo: 'manutencao', codigos: ['manutencao'], nome: 'Manutenção', grupo: 'Manutenção e Ativos', resumo: 'Planos preventivos, ordens corretivas e histórico de intervenções.', planos: band(true, false, true, false) },
  { codigo: 'manutencao-tpm', codigos: ['manutencao-tpm'], nome: 'Manutenção TPM', grupo: 'Manutenção e Ativos', resumo: 'Plano mestre, cronograma, bloqueio de máquina e indicadores.', planos: band(false, false, false, true) },

  { codigo: 'vendas', codigos: ['vendas'], nome: 'Vendas e CRM', grupo: 'Comercial', resumo: 'Orçamentos, pedidos, carteira e histórico comercial do cliente.', planos: band(true, true, true, false) },
  { codigo: 'comissoes', codigos: ['comissoes'], nome: 'Comissões', grupo: 'Comercial', resumo: 'Regras, cálculo, perfil do vendedor e auditoria de estorno.', planos: band(false, false, false, false) },

  { codigo: 'custos', codigos: ['custos'], nome: 'Custos Industriais', grupo: 'Gestão, Custos e Fiscal', resumo: 'Custo padrão, custo real, margem e simulação de cenário.', planos: band(true, false, true, false) },
  { codigo: 'financeiro', codigos: ['financeiro'], nome: 'Financeiro e Controladoria', grupo: 'Gestão, Custos e Fiscal', resumo: 'Contas, conciliação, fluxo de caixa e resultado por período.', planos: band(false, false, true, false) },
  { codigo: 'fiscal', codigos: ['fiscal'], nome: 'Fiscal Brasil', grupo: 'Gestão, Custos e Fiscal', resumo: 'Apuração, documentos fiscais, NF-e e obrigações acessórias.', planos: band(false, false, true, false) },
  { codigo: 'bi', codigos: ['bi', 'indicadores'], nome: 'Indicadores e BI', grupo: 'Gestão, Custos e Fiscal', resumo: 'Cockpit da diretoria, OEE, projeções e alertas por período.', planos: band(true, false, true, false) },

  { codigo: 'rh', codigos: ['rh'], nome: 'RH e Departamento Pessoal', grupo: 'Pessoas e Acessos', resumo: 'Colaboradores, jornada, custo de hora, treinamentos e competências.', planos: band(true, false, true, false) },
  { codigo: 'cadastros', codigos: ['cadastros'], nome: 'Cadastros e usuários', grupo: 'Pessoas e Acessos', resumo: 'Produtos, clientes, fornecedores, máquinas e permissões por usuário.', planos: band(true, true, true, false) },
]

/**
 * Itens que vieram na matriz comercial mas não têm tela no sistema. Enquanto não existirem, não
 * entram na vitrine: anunciar módulo sem página contraria a regra permanente do proprietário.
 * A pendência está no relatório do incremento de 2026-11-06.
 */
const semTelaNoSistema = new Set(['ia', 'matriz-desenhos'])

const gruposEmOrdem = [...new Set(gradeComercial.map(linha => linha.grupo))]

/** As linhas da grade que têm tela no sistema. É a unidade de contagem da página inteira. */
const linhasVisiveis = gradeComercial.filter(linha => !semTelaNoSistema.has(linha.codigo))

/**
 * Converte os códigos de erp_plano_modulos nas linhas comerciais correspondentes. Um mesmo módulo
 * pode voltar do banco com outro código (chao-fabrica / chao-de-fabrica), e o que a grade não
 * reconhece sai em `codigosForaDaGrade` em vez de sumir sem aviso da contagem.
 */
function linhasDoCatalogo(codigos: string[]): { modulos: string[]; linhas: LinhaComercial[]; codigosForaDaGrade: string[] } {
  const distintos = [...new Set(codigos)]
  const linhas = linhasVisiveis.filter(linha => linha.codigos.some(codigo => distintos.includes(codigo)))
  const fora = distintos.filter(codigo => !linhasVisiveis.some(linha => linha.codigos.includes(codigo)))
  return { modulos: distintos, linhas, codigosForaDaGrade: fora }
}

const planosBase: Array<{ codigo: CodigoPlano; nome: string; precoMensal: number; resumo: string; tag: string; acento: string; escuro: boolean }> = [
  { codigo: 'essencial', nome: 'Essencial', precoMensal: 199, resumo: 'Base operacional: cadastros, materiais, compras, vendas, ordens e expedição na mesma base.', tag: 'Plano de entrada', acento: '#2D8DB8', escuro: false },
  { codigo: 'profissional', nome: 'Profissional', precoMensal: 349, resumo: 'PCP, chão de fábrica, qualidade, custos e indicadores rodando juntos desde o primeiro pedido.', tag: 'Mais escolhido', acento: '#48B7C7', escuro: false },
  { codigo: 'diamante', nome: 'Diamante', precoMensal: 549, resumo: 'Gestão industrial completa, com fiscal, financeiro, FMEA, metrologia e rastreabilidade.', tag: 'Gestão completa', acento: '#123B50', escuro: true },
  { codigo: 'enterprise_gold', nome: 'Industrial Enterprise Gold', precoMensal: 1290, resumo: 'SGQ avançado, TPM e logística de ponta a ponta para operações críticas.', tag: 'Topo de linha', acento: '#E6A34A', escuro: true },
]

const oQueTodoPlanoInclui = [
  { Icon: ShieldCheck, titulo: 'Isolamento por empresa', texto: 'Cada empresa tem a sua base dentro do mesmo sistema; nenhum dado vaza de uma para outra.' },
  { Icon: Users, titulo: 'Permissão por usuário', texto: 'Quem abre qual tela e quem pode aprovar é definido no sistema, não no arquivo da planilha.' },
  { Icon: Database, titulo: 'Uma base só', texto: 'O material entra uma vez: pedido, ordem, inspeção, nota e custo vêm do mesmo cadastro.' },
  { Icon: FileText, titulo: 'Evidência do processo', texto: 'Apontamentos, revisões, documentos e registros ficam guardados com autor e data.' },
]

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)

/** Preço do catálogo pode voltar numeric, texto ou nulo. Sem número legível é "Sob consulta", nunca R$ 0. */
const precoMensal = (valor: number | string | null): number | null => {
  if (valor === null || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

/** CSS custom property num style: o objeto precisa do cast, React não tipa variáveis customizadas. */
function acentoStyle(acento: string) {
  return { '--pi-accent': acento } as CSSProperties
}

function moduloNomePlano(linha: LinhaComercial, nomesDoBanco: Record<string, string>): string {
  for (const codigo of linha.codigos) if (nomesDoBanco[codigo]) return nomesDoBanco[codigo]
  return linha.nome
}

export default function PlanosIndustrial() {
  const [catalogo, setCatalogo] = useState<{ planos: PlanCatalogoRow[]; modulos: PlanModuleRow[] } | null>(null)
  const [estado, setEstado] = useState<Estado>('carregando')
  const [erro, setErro] = useState('')
  const [selecionado, setSelecionado] = useState<string>('')
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const moduloFiltro = params.get('modulo') ?? ''

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
      const linhasPlano = (planosResultado.data ?? []) as PlanCatalogoRow[]
      if (linhasPlano.length === 0) {
        setCatalogo(null)
        setEstado('vazio')
        return
      }
      setCatalogo({ planos: linhasPlano, modulos: (modulosResultado.data ?? []) as PlanModuleRow[] })
      setEstado('sucesso')
    } catch (cause) {
      setCatalogo(null)
      setErro(mensagemDeFalha(cause))
      setEstado('erro')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const catalogoNoAr = estado === 'sucesso' && catalogo !== null
  const carregando = estado === 'carregando'
  const nomesDoBanco: Record<string, string> = {}
  for (const linha of catalogo?.modulos ?? []) {
    if (!nomesDoBanco[linha.modulo_codigo]) nomesDoBanco[linha.modulo_codigo] = linha.modulo_nome
  }

  const planosNaTela: PlanoNaTela[] = catalogoNoAr && catalogo
    ? [...catalogo.planos]
      .sort((a, b) => Number(a.ordem ?? 99) - Number(b.ordem ?? 99))
      .map<PlanoNaTela>(linha => {
        const base = planosBase.find(plan => plan.codigo === linha.codigo)
        const codigos = catalogo.modulos
          .filter(modulo => modulo.plano_codigo === linha.codigo)
          .map(modulo => modulo.modulo_codigo)
        return {
          codigo: String(linha.codigo),
          nome: String(linha.nome),
          precoMensal: precoMensal(linha.preco_mensal),
          resumo: linha.descricao == null ? (base?.resumo ?? '') : String(linha.descricao),
          tag: base?.tag ?? 'Plano',
          acento: base?.acento ?? '#2D8DB8',
          escuro: base?.escuro ?? false,
          doBanco: true,
          ...linhasDoCatalogo(codigos),
        }
      })
    : planosBase.map<PlanoNaTela>(base => {
        const linhas = linhasVisiveis.filter(linha => linha.planos[base.codigo])
        return {
          codigo: base.codigo,
          nome: base.nome,
          precoMensal: base.precoMensal,
          resumo: base.resumo,
          tag: base.tag,
          acento: base.acento,
          escuro: base.escuro,
          doBanco: false,
          modulos: linhas.map(linha => linha.codigo),
          linhas,
          codigosForaDaGrade: [],
        }
      })

  const linhaAtual = linhasVisiveis.find(linha => linha.codigos.includes(moduloFiltro))
  const hrefPlano = (codigo: string) =>
    '/cadastro-empresa?plano=' + encodeURIComponent(codigo) + (moduloFiltro ? '&modulo=' + encodeURIComponent(moduloFiltro) : '')
  const selecionadoNaTela = planosNaTela.find(plano => plano.codigo === selecionado) ?? planosNaTela[0]
  /** Linha que nenhum plano libera: fica explícita na matriz até a decisão comercial do proprietário. */
  const codigosSemPlano = new Set(linhasVisiveis.filter(linha => !planosNaTela.some(plano => plano.linhas.includes(linha))).map(linha => linha.codigo))
  const recursosDoTopo = useMemo(() => [...new Set((catalogo?.modulos ?? [])
    .filter(modulo => modulo.plano_codigo === 'diamante' || modulo.plano_codigo === 'enterprise_gold')
    .flatMap(modulo => {
      const features = modulo.recursos?.features
      if (!Array.isArray(features)) return [] as string[]
      return features.filter(texto => typeof texto === 'string' && texto.trim().length > 0)
    }))], [catalogo])

  return <main className="sgq-public-home">
    <header className="ph-nav">
      <Link to="/" className="ph-brand" aria-label="SYSNQRA ERP &amp; SGQ INDUSTRIAL">
        <span className="ph-brand-text"><strong>SYSNQRA</strong><span>ERP &amp; SGQ Industrial</span></span>
      </Link>
      <nav className="ph-nav-links" aria-label="Navegação principal">
        <Link className="ph-nav-link" to="/">Início</Link>
        <Link className="ph-nav-link" to="/#telas">Telas</Link>
        <Link className="ph-nav-link" to="/planos" aria-current="true">Planos</Link>
        <Link className="ph-nav-link" to="/blog">Blog</Link>
        <Link className="ph-nav-link" to="/contato">Contato</Link>
      </nav>
      <div className="ph-nav-actions">
        <a className="ph-ghost" href="/login">Entrar</a>
        <a className="ph-solid" href="/cadastro-empresa">Teste grátis 15 dias</a>
      </div>
    </header>

    <section className="pi-hero">
      <div className="ph-wrap pi-hero-grid">
        <div>
          <span className="ph-kicker">Planos · SYSNQRA ERP &amp; SGQ Industrial</span>
          <h1>Escolha o nível de gestão da sua <em>indústria</em>.</h1>
          <p className="pi-lead">Cada plano libera um conjunto de módulos da mesma base de dados. O material entra uma vez e vale para PCP, estoque, qualidade, custos e fiscal — sem retrabalho e sem planilha paralela.</p>
          <div className="ph-cta-row">
            <a className="ph-solid" href={hrefPlano(selecionadoNaTela?.codigo ?? 'profissional')}>Começar pelo {selecionadoNaTela?.nome ?? 'Profissional'} <ArrowRight size={16} /></a>
            <a className="ph-ghost" href="#comparativo">Comparar módulo a módulo</a>
          </div>
          <p className="pi-hero-note">Ativação em três etapas, isolamento por empresa e histórico preservado ao mudar de plano.</p>
        </div>
        <div className="pi-ladder">
          <b>{estado === 'sucesso' ? 'Os níveis publicados nesta base' : 'Os quatro níveis'}</b>
          {/* Enquanto o catálogo não volta, a escada fica em espera: o preço de referência local
              aparecendo ao lado do nome vindo do banco seria lido como preço publicado. */}
          {carregando
            ? <div className="pi-ladder-wait" role="status"><RefreshCw size={15} className="ph-spin" /> Lendo os preços do catálogo comercial desta base…</div>
            : planosNaTela.map(plano => (
              <div className="pi-ladder-row" key={plano.codigo}>
                <i style={{ background: plano.acento }} />
                <span>{plano.nome}<small>{plano.linhas.length} módulos</small></span>
                <b>{plano.precoMensal === null ? 'Sob consulta' : money(plano.precoMensal)}</b>
              </div>
            ))}
        </div>
      </div>
    </section>

    <section className="ph-section" id="planos">
      <div className="ph-wrap">
        {estado === 'carregando' && (
          <div className="pi-state" role="status" aria-live="polite">
            <strong><RefreshCw size={17} className="ph-spin" /> Lendo o catálogo comercial desta base…</strong>
            <p>Preços e composição vêm das tabelas de catálogo. Nada aqui é exibido antes da consulta voltar.</p>
          </div>
        )}
        {(estado === 'erro' || estado === 'vazio') && (
          <div className="pi-state pi-state--warn">
            <strong><Database size={16} aria-hidden="true" /> {estado === 'erro' ? 'Não foi possível ler o catálogo comercial desta base.' : 'O catálogo comercial ainda não está publicado nesta base.'}</strong>
            {estado === 'erro' && <p>{erro}</p>}
            <p>{estado === 'erro'
              ? 'A grade abaixo é a composição comercial de referência do produto. O valor final é confirmado na ativação da empresa, nunca estimado aqui.'
              : 'A leitura foi concluída, mas nenhum plano ativo voltou. A grade abaixo é a composição comercial de referência do produto; ative os planos no catálogo para publicar os preços do banco.'}</p>
            <div className="pi-state-actions">
              <button type="button" className="ph-ghost" onClick={() => void carregar()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, border: '1px solid var(--ph-line)', borderRadius: 10, padding: '0 16px', font: 'inherit', fontWeight: 900, cursor: 'pointer' }}>
                <RefreshCw size={16} /> {estado === 'erro' ? 'Tentar novamente' : 'Recarregar catálogo'}
              </button>
              <a className="ph-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 16px' }} href="/contato">Falar com a equipe <ArrowRight size={16} /></a>
            </div>
          </div>
        )}

        {estado !== 'carregando' && (<>
          <div className="ph-head" style={{ marginTop: estado === 'sucesso' ? 0 : 30 }}>
            <span>Planos</span>
            <h2>Quatro níveis, uma base só.</h2>
            <p>Comece pelo que a operação aguenta hoje e evolua de plano sem migrar de sistema nem perder histórico.</p>
          </div>

          <div className="pi-plans">
            {planosNaTela.map(plano => {
              const atual = selecionadoNaTela?.codigo === plano.codigo
              return <article key={plano.codigo}
                className={['pi-card', plano.escuro ? 'pi-card--dark' : '', plano.codigo === 'enterprise_gold' ? 'pi-card--gold' : ''].filter(Boolean).join(' ')}
                style={acentoStyle(plano.acento)}>
                <span className="pi-card-tag">{plano.tag}</span>
                <h3 className="pi-card-name">{plano.nome}</h3>
                <span className="pi-card-price">
                  {plano.precoMensal === null ? 'Sob consulta' : money(plano.precoMensal)}
                  {plano.precoMensal !== null && <small>/mês</small>}
                </span>
                <span className="pi-card-per">{plano.precoMensal === null ? 'escopo definido com a sua operação' : 'por empresa, sem limite de usuários'}</span>
                <p className="pi-card-for">{plano.resumo}</p>
                {/* Plano publicado no catálogo sem nenhum módulo vinculado: é pendência de catálogo,
                    não um plano completo. Dizemos isso em vez de mostrar a lista vazia como escopo. */}
                {plano.linhas.length === 0
                  ? <p className="pi-card-alert"><Database size={14} /> Este plano está no catálogo sem nenhum módulo vinculado em <code>erp_plano_modulos</code>. A composição ainda não está definida.</p>
                  : <ul className="pi-card-list">
                    {plano.linhas.slice(0, 5).map(linha => (
                      <li key={linha.codigo}><Check size={14} /> {moduloNomePlano(linha, nomesDoBanco)}</li>
                    ))}
                    {plano.linhas.length > 5 && (
                      <li className="pi-card-more">+{plano.linhas.length - 5} módulos no comparativo</li>
                    )}
                  </ul>}
                <span className="pi-card-count">{plano.linhas.length} de {linhasVisiveis.length} módulos desta grade</span>
                {plano.codigosForaDaGrade.length > 0 && (
                  <span className="pi-card-count pi-card-out">+{plano.codigosForaDaGrade.length} códigos do catálogo fora desta grade: {plano.codigosForaDaGrade.join(', ')}</span>
                )}
                <a className="pi-card-cta" href={hrefPlano(plano.codigo)}>Escolher {plano.nome} <ArrowRight size={15} /></a>
                <button type="button" className="pi-card-cta pi-card-cta--ghost" onClick={() => document.getElementById('comparativo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  Ver o que este plano inclui
                </button>
                <button type="button" className="pi-card-pick" aria-pressed={atual} onClick={() => setSelecionado(plano.codigo)}>
                  {atual ? 'Plano em destaque' : 'Destacar este plano'}
                </button>
              </article>
            })}
          </div>
        </>)}
      </div>
    </section>

    {estado !== 'carregando' && (
      <section className="ph-section ph-section--tint" id="comparativo">
        <div className="ph-wrap">
          <div className="ph-head">
            <span>Comparativo</span>
            <h2>Todos os módulos, plano a plano.</h2>
            <p>{catalogoNoAr
              ? 'A grade abaixo é a composição publicada no catálogo desta base. A primeira coluna fica fixa; role na horizontal para ver cada plano.'
              : 'Cada linha abaixo é uma tela que existe no sistema. A grade é a composição comercial de referência; o catálogo publicado no banco tem prioridade sobre ela.'}</p>
          </div>
          <div className="pi-matrix-wrap">
            <table className="pi-matrix">
              <caption className="ph-sr-only">Módulos incluídos em cada plano</caption>
              <thead>
                <tr>
                  <th scope="col">Módulo</th>
                  {planosNaTela.map(plano => (
                    <th scope="col" key={plano.codigo} className="pi-col-own" style={acentoStyle(plano.acento)}>
                      {plano.nome}
                      <small>{plano.precoMensal === null ? 'Sob consulta' : `${money(plano.precoMensal)}/mês`}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gruposEmOrdem.map(grupo => {
                  const linhasDoGrupo = linhasVisiveis.filter(linha => linha.grupo === grupo)
                  if (!linhasDoGrupo.length) return null
                  return <Fragment key={grupo}>
                    <tr className="pi-group">
                      <th scope="colgroup" colSpan={planosNaTela.length + 1}>{grupo}</th>
                    </tr>
                    {linhasDoGrupo.map(linha => {
                      const atual = linhaAtual?.codigo === linha.codigo
                      const foraDeTodoPlano = codigosSemPlano.has(linha.codigo)
                      return <tr className={atual ? 'pi-row is-current' : 'pi-row'} key={linha.codigo}>
                        <th scope="row">
                          {moduloNomePlano(linha, nomesDoBanco)}
                          {foraDeTodoPlano && <em className="pi-row-flag">fora de todo plano</em>}
                          <span>{linha.resumo}</span>
                        </th>
                        {planosNaTela.map(plano => {
                          const sim = plano.linhas.includes(linha)
                          return <td key={plano.codigo} className={sim ? 'pi-yes' : 'pi-no'} aria-label={sim ? 'Incluído no plano ' + plano.nome : 'Não incluído no plano ' + plano.nome}>
                            {sim ? '✓' : '—'}
                          </td>
                        })}
                      </tr>
                    })}
                  </Fragment>
                })}
              </tbody>
            </table>
          </div>
          <div className="pi-matrix-foot">
            <span><b>✓</b> incluído no plano</span>
            <span><b>—</b> não incluído</span>
            {codigosSemPlano.size > 0 && <span><b className="pi-foot-flag">fora de todo plano</b> módulo que está na grade mas em nenhum dos quatro níveis — decisão comercial pendente</span>}
            <span>{linhasVisiveis.length} módulos conferidos um a um nas telas do sistema.</span>
          </div>
          {recursosDoTopo.length > 0 && (
            <div className="ph-chips" style={{ marginTop: 16 }}>
              {recursosDoTopo.map(recurso => <span className="ph-chip" key={recurso}><Check size={13} style={{ color: 'var(--ph-green)' }} /> {recurso}</span>)}
            </div>
          )}
        </div>
      </section>
    )}

    {selecionadoNaTela && estado !== 'carregando' && (
      <section className="ph-section">
        <div className="ph-wrap">
          <div className="ph-head" style={{ marginBottom: 20 }}>
            <span>Plano em destaque</span>
            <h2>{selecionadoNaTela.nome}{selecionadoNaTela.precoMensal === null ? '' : ` · ${money(selecionadoNaTela.precoMensal)}/mês`}</h2>
            <p>{linhaAtual
              ? (selecionadoNaTela.linhas.includes(linhaAtual)
                ? `O módulo ${linhaAtual.nome} está incluído nesta composição.`
                : `O módulo ${linhaAtual.nome} não está neste plano — veja o comparativo para saber em qual ele entra.`)
              : `${selecionadoNaTela.linhas.length} módulos liberados na mesma base, com ativação em três etapas.`}</p>
          </div>
          <div className="pi-steps">
            <article className="pi-step"><b>1</b><h3>Cadastro da empresa</h3><p>Razão social, CNPJ e o plano escolhido. A base da sua empresa nasce isolada das demais.</p><a href="/cadastro-empresa">Abrir o cadastro <ArrowRight size={14} /></a></article>
            <article className="pi-step"><b>2</b><h3>Ativação em três etapas</h3><p>Usuários, setores e permissões são montados na ativação, junto com os cadastros essenciais.</p><a href="/#modulos">Ver os módulos <ArrowRight size={14} /></a></article>
            <article className="pi-step"><b>3</b><h3>Convite por e-mail</h3><p>Cada funcionário recebe o próprio acesso e ativa a senha na primeira entrada — nada de senha compartilhada.</p><a href="/ativar-acesso">Tela de ativação <ArrowRight size={14} /></a></article>
          </div>
          <div className="pi-includes">
            {oQueTodoPlanoInclui.map(item => {
              const Icon = item.Icon
              return <div className="pi-include" key={item.titulo}>
                <span><Icon size={17} /></span>
                <div><strong>{item.titulo}</strong><p>{item.texto}</p></div>
              </div>
            })}
          </div>
          <div className="ph-cta-row" style={{ justifyContent: 'center', marginTop: 26 }}>
            <a className="ph-solid" href={hrefPlano(selecionadoNaTela.codigo)}>Continuar para o cadastro <ArrowRight size={16} /></a>
            <a className="ph-ghost" href="/contato">Tirar dúvidas antes</a>
          </div>
        </div>
      </section>
    )}

    <footer className="ph-footer">
      <div className="ph-footer-brand">
        <img src="/logo/logo-marca.png" alt="" aria-hidden="true" />
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
