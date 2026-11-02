/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-SGQ-ISHIKAWA-EDITAVEL-20261101-01 — Ishikawa 6M com causa e subcausa, com leitura do formato legado
 * @STATUS_APROVACAO: SUBCAUSAS GRAVAM SOMENTE APOS A MIGRATION 20261101220000_...SQL (o servidor é a fonte da estrutura)
 */

/**
 * Contrato tipado do payload Ishikawa 6M persistido em erp_rpnc.ishikawa_data.
 * Mantém os seis grupos do formulário RPNC e aceita causa com subcausas.
 * A estrutura canônica é decidida por public.erp_sgq_normalizar_ishikawa(jsonb):
 * o cliente lê o formato antigo (texto solto) e grava texto solto quando não há
 * subcausa, então o diagrama continua compatível com a função já implantada.
 */
export type IshikawaChave = 'Metodo' | 'Maquina' | 'Medida' | 'MeioAmbiente' | 'MaoDeObra' | 'Material'

export type IshikawaCausa = {
  texto: string
  subcausas: string[]
}

export type Ishikawa6MData = Record<IshikawaChave, IshikawaCausa[]>

/** O que o banco pode devolver: canônico, legado (string solta) ou nulo. */
export type IshikawaBruto = Partial<Record<IshikawaChave, unknown>> | null | undefined

const CHAVES: IshikawaChave[] = ['Metodo', 'Maquina', 'Medida', 'MeioAmbiente', 'MaoDeObra', 'Material']

export const ishikawaVazio = (): Ishikawa6MData => ({
  Metodo: [],
  Maquina: [],
  Medida: [],
  MeioAmbiente: [],
  MaoDeObra: [],
  Material: [],
})

const textoLimpo = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : '')

/** Normaliza qualquer JSONB lido do banco para o shape de dois níveis. */
export const normalizarIshikawa = (bruto: IshikawaBruto): Ishikawa6MData => {
  const base = ishikawaVazio()
  if (!bruto || typeof bruto !== 'object') return base
  for (const chave of CHAVES) {
    const itens = bruto[chave]
    if (!Array.isArray(itens)) continue
    base[chave] = itens.reduce<IshikawaCausa[]>((acumulada, item) => {
      if (typeof item === 'string') {
        const texto = item.trim()
        if (texto) acumulada.push({ texto, subcausas: [] })
        return acumulada
      }
      if (item && typeof item === 'object') {
        const registro = item as Record<string, unknown>
        const texto = textoLimpo(registro.texto)
        if (!texto) return acumulada
        const subcausas = Array.isArray(registro.subcausas)
          ? registro.subcausas.map(textoLimpo).filter((sub) => sub.length > 0)
          : []
        acumulada.push({ texto, subcausas })
      }
      return acumulada
    }, [])
  }
  return base
}

/** Remove causas e subcausas em branco criadas durante a edição no diagrama. */
export const semCausasVazias = (dados: Ishikawa6MData): Ishikawa6MData => {
  const base = ishikawaVazio()
  for (const chave of CHAVES) {
    base[chave] = dados[chave]
      .filter((causa) => causa.texto.trim().length > 0)
      .map((causa) => ({ texto: causa.texto.trim(), subcausas: causa.subcausas.map((sub) => sub.trim()).filter((sub) => sub.length > 0) }))
  }
  return base
}

export const totalDeCausas = (dados: Ishikawa6MData): number =>
  CHAVES.reduce((total, chave) => total + dados[chave].length, 0)

/**
 * Payload enviado às RPCs. Causa sem subcausa vira texto simples: assim o
 * formulário continua gravando na função antiga, e o servidor exige a migration
 * nova somente quando existirem subcausas de verdade.
 */
export const serializarIshikawa = (dados: Ishikawa6MData): Record<IshikawaChave, Array<string | { texto: string; subcausas: string[] }>> => {
  const base = {} as Record<IshikawaChave, Array<string | { texto: string; subcausas: string[] }>>
  for (const chave of CHAVES) {
    base[chave] = dados[chave].map((causa) => (
      causa.subcausas.length ? { texto: causa.texto.trim(), subcausas: causa.subcausas.map((sub) => sub.trim()) } : causa.texto.trim()
    ))
  }
  return base
}

export interface RPNCAnaliseCausaRaiz {
  ishikawa_data: Ishikawa6MData;
  cinco_porques: string[];
}

export interface RPNCEficaciaPayload {
  prazo_eficacia_dias: 30 | 60;
  data_verificacao_eficacia: string;
  parecer_eficacia: string;
  eficacia_aprovada: boolean;
}
