/*
 * SYSNQRA ERP INDUSTRIAL — modelo e paginação dos relatórios profissionais (A4)
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELATORIO-A4-20261105-01 — estrutura própria de relatório; os botões Imprimir
 * deixam de ser captura da tela do sistema
 * @STATUS_APROVACAO: ORDEM GERAL DO PROPRIETÁRIO EM 2026-11-05, item 5 — "Quero relatórios
 * completos, com layout próprio, e não uma captura da tela do sistema" / "Não basta adicionar CSS
 * @media print para imprimir a tela atual. Quero uma estrutura própria de relatório."
 */

export type Celula = string | number | null | undefined

export type ColunaTabela = {
  titulo: string
  larguraMm?: number
  alinhar?: 'esquerda' | 'direita' | 'centro'
}

export type Bloco =
  | { tipo: 'campos'; titulo: string; itens: { rotulo: string; valor: Celula }[]; colunas?: 1 | 2 | 3 }
  | { tipo: 'tabela'; titulo: string; colunas: ColunaTabela[]; linhas: Celula[][]; nota?: string }
  | { tipo: 'texto'; titulo: string; texto: string }
  | { tipo: 'lista'; titulo: string; itens: string[] }
  | { tipo: 'historico'; titulo: string; itens: { quando: string; quem: string; oque: string }[] }
  | { tipo: 'imagem'; titulo: string; url: string; legenda?: string; alturaMm?: number }
  | { tipo: 'assinaturas'; titulo?: string; assinantes: { papel: string; nome?: string }[] }

export type Documento = {
  modulo: string
  tipo: string
  titulo: string
  codigo: string
  subtitulo?: string
  unidade?: string
  blocos: Bloco[]
  observacoes?: string
}

/*
 * alturas em milímetros da área útil. A folha é 186 x 273 mm (A4 com as margens de 12 mm que
 * src/styles/index.css:94 declara). Cabeçalho do documento e rodapé são fixos em toda página,
 * então o corpo disponível é sempre o mesmo — é isso que torna "Página X de Y" exato.
 */
const ALTURA_FOLHA_MM = 273
const ALTURA_CABECALHO_MM = 38
const ALTURA_RODAPE_MM = 12
const CORPO_POR_PAGINA_MM = ALTURA_FOLHA_MM - ALTURA_CABECALHO_MM - ALTURA_RODAPE_MM

const TITULO_MM = 8
const CAMPO_MM = 7
const LINHA_TABELA_MM = 6.6
const CABECALHO_TABELA_MM = 7
const LINHA_TEXTO_MM = 4.6
const ITEM_LISTA_MM = 6
const LINHA_HISTORICO_MM = 7
const BLOCO_ASSINATURAS_MM = 30

export function alturaBloco(bloco: Bloco): number {
  switch (bloco.tipo) {
    case 'campos': {
      const colunas = bloco.colunas ?? 2
      return TITULO_MM + Math.ceil(bloco.itens.length / colunas) * CAMPO_MM
    }
    case 'tabela':
      return TITULO_MM + CABECALHO_TABELA_MM + bloco.linhas.length * LINHA_TABELA_MM + (bloco.nota ? 6 : 0)
    case 'texto': {
      const paragrafos = bloco.texto.split('\n')
      const linhas = paragrafos.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / 105)), 0)
      return TITULO_MM + linhas * LINHA_TEXTO_MM
    }
    case 'lista':
      return TITULO_MM + bloco.itens.length * ITEM_LISTA_MM
    case 'historico':
      return TITULO_MM + Math.max(1, bloco.itens.length) * LINHA_HISTORICO_MM
    case 'imagem':
      return TITULO_MM + (bloco.alturaMm ?? 70) + 10
    case 'assinaturas':
      return BLOCO_ASSINATURAS_MM + (bloco.titulo ? TITULO_MM : 0)
  }
}

function dividirTabela(bloco: Extract<Bloco, { tipo: 'tabela' }>, linhas: number): Extract<Bloco, { tipo: 'tabela' }>[] {
  if (linhas <= 0) return []
  const partes: Extract<Bloco, { tipo: 'tabela' }>[] = []
  for (let i = 0; i < bloco.linhas.length; i += linhas) {
    partes.push({ ...bloco, linhas: bloco.linhas.slice(i, i + linhas), nota: i === 0 ? bloco.nota : undefined })
  }
  return partes
}

function linhasCabem(bloco: Extract<Bloco, { tipo: 'tabela' }>, espacoMm: number): number {
  const disponivel = espacoMm - TITULO_MM - CABECALHO_TABELA_MM - (bloco.nota ? 6 : 0)
  return Math.floor(disponivel / LINHA_TABELA_MM)
}

/**
 * Distribui os blocos em páginas de corpo fixo. Bloco que não cabe inteiro passa inteiro para a
 * página seguinte, exceto tabela: essa é fatiada com o cabeçalho repetido, porque o dono exigiu
 * "tabelas que não sejam cortadas" — corte é sempre entre linhas, nunca dentro de uma linha.
 */
export function paginar(blocos: Bloco[]): Bloco[][] {
  const paginas: Bloco[][] = []
  let atual: Bloco[] = []
  let usado = 0

  const fecharPagina = () => {
    if (atual.length) paginas.push(atual)
    atual = []
    usado = 0
  }

  for (const blocoOriginal of blocos) {
    let pendente = blocoOriginal

    for (;;) {
      const espaco = CORPO_POR_PAGINA_MM - usado
      const altura = alturaBloco(pendente)

      if (altura <= espaco) {
        atual.push(pendente)
        usado += altura
        break
      }

      // Página atual ainda tem espaço para um começo da tabela: fatia aqui e continua na próxima.
      if (
        pendente.tipo === 'tabela' &&
        espaco >= TITULO_MM + CABECALHO_TABELA_MM + LINHA_TABELA_MM * 3
      ) {
        const quantas = linhasCabem(pendente, espaco)
        if (quantas >= 3) {
          atual.push({ ...pendente, linhas: pendente.linhas.slice(0, quantas) })
          fecharPagina()
          pendente = { ...pendente, linhas: pendente.linhas.slice(quantas), nota: undefined }
          continue
        }
      }

      // Bloco inteiro não cabe no resto da página: passa para a página seguinte.
      if (usado > 0) {
        fecharPagina()
        continue
      }

      // Bloco isolado maior que uma página. Só tabela é divisível; o resto ocupa a página sozinho.
      if (pendente.tipo === 'tabela') {
        const quantas = Math.max(3, linhasCabem(pendente, CORPO_POR_PAGINA_MM))
        const partes = dividirTabela(pendente, quantas)
        for (const parte of partes.slice(0, -1)) {
          atual.push(parte)
          fecharPagina()
        }
        const ultima = partes[partes.length - 1] ?? pendente
        atual.push(ultima)
        usado += alturaBloco(ultima)
        break
      }

      atual.push(pendente)
      usado += altura
      break
    }
  }

  fecharPagina()
  return paginas.length ? paginas : [[]]
}

export const CORPO_POR_PAGINA = CORPO_POR_PAGINA_MM
