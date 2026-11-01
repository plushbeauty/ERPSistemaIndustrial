/**
 * SYSNQRA ERP INDUSTRIAL — origem única dos planos comerciais públicos.
 * Revisão: EXPERIENCIA-PUBLICA-20261031-01 | Desenvolvedor: FernandoSch
 *
 * Os valores aqui são os já publicados na página aprovada em 2026-10-16; nenhum preço
 * novo foi inventado. O catálogo do banco (erp_planos_catalogo) usa outra taxonomia
 * (essencial/profissional/diamante) e continua divergente — ver catalogoBanco.
 */

export type ErpPlano = {
  /** Identificador trafegado em /cadastro-empresa?plano=<chave> */
  chave: 'start' | 'industrial' | 'enterprise'
  nome: string
  /** Preço mensal em BRL; null = sob consulta. */
  precoMensal: number | null
  selo: string
  descricao: string
  recursos: string[]
  limites: { usuarios: string; empresas: string; implantacao: string }
  /** Código correspondente no catálogo do banco, quando houver. */
  catalogoBanco: string | null
  destaque?: boolean
}

export const DESCONTO_ANUAL = 0.15

export const planosErp: ErpPlano[] = [
  {
    chave: 'start',
    nome: 'Start',
    precoMensal: 199,
    selo: 'PLANO DE ENTRADA',
    descricao: 'Gestão essencial de materiais, cadastros e rotinas para iniciar a organização industrial.',
    recursos: [
      'Cadastros de produtos, clientes e fornecedores',
      'Estoque com saldo, movimentação e lotes',
      'Compras: solicitação e pedido',
      'Portal do operador no chão de fábrica',
      '1 empresa e até 5 usuários',
    ],
    limites: { usuarios: '5 usuários', empresas: '1 empresa', implantacao: 'Autoatendimento guiado' },
    catalogoBanco: 'essencial',
  },
  {
    chave: 'industrial',
    nome: 'Industrial',
    precoMensal: 349,
    selo: 'MAIS ESCOLHIDO',
    descricao: 'Integração de PCP, produção, qualidade, estoque e indicadores para a operação.',
    recursos: [
      'Tudo do Start, mais:',
      'PCP: ordens, roteiros, capacidade e carga',
      'SGQ: RPNC, CAPA, auditorias e documentos controlados',
      'Metrologia com paquímetro digital e calibração',
      'Indicadores de eficiência, prazo e refugo',
      'Até 25 usuários e 2 empresas',
    ],
    limites: { usuarios: '25 usuários', empresas: '2 empresas', implantacao: 'Implantação assistida' },
    catalogoBanco: 'profissional',
    destaque: true,
  },
  {
    chave: 'enterprise',
    nome: 'Enterprise',
    precoMensal: null,
    selo: 'OPERAÇÃO AVANÇADA',
    descricao: 'Escopo personalizado, governança e integração conforme as necessidades da sua operação.',
    recursos: [
      'Tudo do Industrial, mais:',
      'MES/MRP com integração de máquinas',
      'Financeiro, fiscal e controladoria sob demanda',
      'Integrações, BI e trilha de auditoria estendida',
      'Usuários e empresas ilimitados por contrato',
    ],
    limites: { usuarios: 'Ilimitado', empresas: 'Ilimitado', implantacao: 'Comitê de implantação dedicado' },
    catalogoBanco: 'diamante',
  },
]

export const planoPorChave = (chave: string | null | undefined): ErpPlano | null =>
  planosErp.find((plano) => plano.chave === chave) ?? null

export const precoFormatado = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const precoMensalVigente = (plano: ErpPlano, periodo: 'mensal' | 'anual'): number | null =>
  plano.precoMensal === null ? null : (periodo === 'anual' ? Math.round(plano.precoMensal * (1 - DESCONTO_ANUAL) * 100) / 100 : plano.precoMensal)
