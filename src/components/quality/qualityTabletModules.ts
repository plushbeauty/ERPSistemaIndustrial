/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-TABLET-TEMPLATE-INSPECAO-20261108-01 — novo card de templates versionados, autorizado na ordem de execução de 2026-11-08
 * @STATUS_APROVACAO: INCREMENTO ADITIVO AUTORIZADO; rotas e cards aprovados preservados
 */
import {
  Activity, Archive, Award, BarChart3, BookOpenCheck, Building2, ClipboardCheck, ClipboardList, FileCheck2,
  FileText, FolderOpen, Gauge, GitBranch, ListChecks, Microscope, PenTool, Ruler, ScrollText, SearchCheck,
  ShieldAlert, ShieldCheck, Signature, Target, TrendingDown, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-TABLET-SGQ-20261103-01 — ordem do proprietário (#108): "vai entrar aqui e colocar todas
 *           as telas no sistema, você não colocou o tablet da Qualidade" e "vamos deixar tudo no tablet
 *           qualidade". O painel flutuante do SGQ passa a ser a entrada única das rotinas da Qualidade.
 * @STATUS: TODAS as rotas abaixo foram conferidas uma a uma contra o roteador autenticado desta branch
 *          (src/AppEntryV2.tsx). Rota que não existe no roteador fica com route: null e o card aparece
 *          desabilitado; nada aqui aponta para tela antiga ou para rota inventada.
 * @REVISAO_2: REV-TABLET-CATALOGO-20261104-01 — conferência tela a tela do pedido "verificar se todos os módulos qualidade
 *          estão dentro dele": FMEA de projeto (/pageprincipal/qualidade/fmea) era a única tela real da
 *          Qualidade sem card. As rotas /qualidade/ishikawa, /qualidade/capa, /qualidade/rnc,
 *          /qualidade/sala-rnc e /qualidade/tablet ficaram fora por decisão registrada no relatório: as duas
 *          primeiras são abas da RPNC unificada e as demais são lançadores/telas substituídas.
 * @REVISAO_3: REV-FMEA-PLANO-CONTROLE-20261106-01 — o FMEA AIAG único (cabeçalho + matriz + QR) substitui
 *          as duas telas concorrentes: /qualidade/pfmea agora redireciona para /qualidade/fmea, e o card
 *          "FMEA de projeto" deu lugar ao Plano de Controle (CPP), que é o outro documento da pasta do
 *          proprietário. Um módulo com duas telas para o mesmo registro contraria a regra de origem única.
 * @REVISAO_4: REV-APQP-TRIO-20261108-01 — ordem do proprietário em 2026-11-08: "veja o FMEA para vc fazer
 *          FMEA E Plano de Controle juntos ok e Mapa de Processo ... ai vc junta e elemina os outros".
 *          FMEA, Plano de Controle e Mapa de Processo passam a ser abas da página única
 *          src/pages/qualidade/FmeaPlanoControle.tsx; o card do Mapa de Processo é adicionado e as três
 *          rotas continuam válidas para não quebrar QR Codes já impressos.
 */

export type QualityTabletModule = {
  label: string
  description: string
  route: string | null
  icon: LucideIcon
}

export const qualityTabletModules: QualityTabletModule[] = [
  { label: 'Visão geral do SGQ', description: 'Painel consolidado do Sistema de Gestão da Qualidade.', route: '/pageprincipal/qualidade', icon: Gauge },
  { label: 'Certificado de Qualidade', description: 'Inspeção dimensional, rastreabilidade e impressão de certificados.', route: '/pageprincipal/qualidade/certificados', icon: Award },
  { label: 'RPNC · formulário único por abas', description: 'Não conformidades, investigação, evidências e ações CAPA.', route: '/pageprincipal/qualidade/rpnc', icon: ClipboardList },
  { label: 'Painel de não conformidades', description: 'Indicador consolidado das RNCs abertas, em tratamento e encerradas.', route: '/pageprincipal/qualidade/dashboard-rnc', icon: BarChart3 },
  { label: 'Acompanhamento de RNC', description: 'Seguimento das não conformidades com responsável, prazo e eficácia.', route: '/pageprincipal/qualidade/acompanhamento-rnc', icon: ClipboardCheck },
  { label: 'Metodologia 8D', description: 'Investigação e tratamento estruturado de problemas.', route: '/pageprincipal/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA (AIAG) · matriz de risco', description: 'Cabeçalho controlado, linhas editáveis, NPR S×O×D e impressão A4 com QR Code.', route: '/pageprincipal/qualidade/fmea', icon: Activity },
  { label: 'Plano de Controle (CPP)', description: 'Controles por operação ligados à linha do FMEA, com QR Code.', route: '/pageprincipal/qualidade/plano-controle', icon: ListChecks },
  { label: 'Mapa de Processo', description: 'Fluxo de etapas com característica, controle e registro, ligado ao Plano de Controle.', route: '/pageprincipal/qualidade/mapa-processo', icon: GitBranch },
  { label: 'CEP / cartas de controle', description: 'Controle estatístico e cartas de processo.', route: '/pageprincipal/qualidade/cep', icon: ScrollText },
  { label: 'Inspeções de lotes', description: 'Inspeção de recebimento e controle dimensional de lotes.', route: '/pageprincipal/qualidade/inspecoes', icon: ClipboardCheck },
  { label: 'Inspeção em processo', description: 'Acompanhamento da qualidade durante a produção.', route: '/pageprincipal/qualidade/inspecao-processo', icon: Microscope },
  { label: 'Templates de inspeção', description: 'Critérios versionados por produto e operação; publicação controlada.', route: '/pageprincipal/qualidade/templates-inspecao', icon: ClipboardList },
  { label: 'Especificações técnicas', description: 'Especificações e critérios técnicos dos produtos.', route: '/pageprincipal/qualidade/especificacoes', icon: FileCheck2 },
  { label: 'Liberação de lotes', description: 'Parecer de qualidade para liberação de lotes.', route: '/pageprincipal/qualidade/liberacao-lote', icon: ShieldCheck },
  { label: 'Quarentena de lotes', description: 'Identificação e acompanhamento de lotes em quarentena.', route: '/pageprincipal/qualidade/quarentena', icon: ShieldAlert },
  { label: 'Genealogia de lotes', description: 'Rastreabilidade e genealogia dos lotes.', route: '/pageprincipal/qualidade/genealogia-lote', icon: GitBranch },
  { label: 'Fichas de processo', description: 'Fichas de processo conferidas pelo setor de Qualidade.', route: '/pageprincipal/qualidade/fichas-processo', icon: FileText },
  { label: 'Controle de Alteração de Documentos', description: 'Cadastro, anexos versionados, revisões, aprovações, distribuição e ciência de leitura.', route: '/pageprincipal/qualidade/documentos', icon: FolderOpen },
  { label: 'GED · Documentos da Qualidade', description: 'Repositório controlado de procedimentos, instruções e registros.', route: '/pageprincipal/qualidade/ged', icon: Archive },
  { label: 'Editor de Documentos do SGQ', description: 'Emissão e revisão do corpo textual do procedimento.', route: '/pageprincipal/qualidade/ged-documentos', icon: PenTool },
  { label: 'Procedimentos e PDFs', description: 'Consulta de procedimentos e documentos PDF.', route: '/pageprincipal/qualidade/procedimentos', icon: BookOpenCheck },
  { label: 'Lista mestra de documentos', description: 'Índice de documentos controlados do SGQ.', route: '/pageprincipal/qualidade/lista-mestre', icon: ListChecks },
  { label: 'Instruções de trabalho', description: 'Editor das instruções operacionais controladas.', route: '/pageprincipal/qualidade/editor-it', icon: PenTool },
  { label: 'Assinatura de instruções', description: 'Colaboradores que leram e assinaram a instrução de trabalho.', route: '/pageprincipal/qualidade/assinatura-it', icon: Signature },
  { label: 'Auditorias da Qualidade', description: 'Programa de auditorias por norma, com constatações ligadas às RPNCs.', route: '/pageprincipal/qualidade/auditorias', icon: ClipboardCheck },
  { label: 'Auditorias internas da planta', description: 'Roteiro de auditoria interna por área da planta.', route: '/pageprincipal/qualidade/auditorias-planta', icon: Building2 },
  { label: 'Auditoria 5S', description: 'Auditorias 5S e acompanhamento de resultados.', route: '/pageprincipal/qualidade/auditoria-5s', icon: SearchCheck },
  { label: 'Equipamentos de medição', description: 'Paquímetros e equipamentos de medição com validade.', route: '/pageprincipal/paquimetro', icon: Ruler },
  { label: 'Calibração de instrumentos', description: 'Plano e registros de calibração dos instrumentos.', route: '/pageprincipal/qualidade/calibracao', icon: Wrench },
  { label: 'Cadastro de instrumentos', description: 'Instrumentos de medição cadastrados com faixa e resolução.', route: '/pageprincipal/qualidade/instrumentos', icon: Gauge },
  { label: 'Central de Metrologia', description: 'Visão de conjunto da metrologia da planta.', route: '/pageprincipal/qualidade/metrologia', icon: SearchCheck },
  { label: 'Análise de refugos e perdas', description: 'Refugos, causas e perdas de qualidade.', route: '/pageprincipal/qualidade/refugos', icon: TrendingDown },
  { label: 'Gráficos de refugo', description: 'Série histórica de refugo por peça, processo e turno.', route: '/pageprincipal/qualidade/graficos-refugo', icon: BarChart3 },
  { label: 'Relatórios do SGQ', description: 'Relatórios e indicadores do sistema da qualidade.', route: '/pageprincipal/qualidade/relatorios-documentos', icon: FileText },
  { label: 'Qualidade Industrial', description: 'Visão operacional da qualidade na planta industrial.', route: '/pageprincipal/qualidade/industrial', icon: Activity },
]
