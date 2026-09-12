import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type SystemRole = 'master' | 'admin' | 'operator'

export interface SystemExecutionContext {
  tenantId: string
  userEmail: string
  role: SystemRole
  strictMode: boolean
}

type RowRecord = Record<string, unknown>

const isRecord = (value: unknown): value is RowRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeRows = <T extends RowRecord>(value: unknown): T[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord) as T[]
}

const normalizeRow = <T extends RowRecord>(value: unknown): T => {
  if (!isRecord(value)) throw new Error('A API retornou um registro inválido.')
  return value as T
}

export class SecureDataPipeline<T extends RowRecord> {
  private readonly tableName: string
  private readonly client: SupabaseClient

  constructor(tableName: string, client: SupabaseClient = supabase) {
    this.tableName = tableName
    this.client = client
  }

  private assertTenant(empresaId: string): void {
    if (!empresaId.trim()) throw new Error('Empresa inválida para operação CRUD.')
  }

  private sanitizePayload(payload: RowRecord): RowRecord {
    const copy: RowRecord = { ...payload }
    delete copy.id
    delete copy.empresa_id
    return copy
  }

  async fetchRecords(empresaId: string, filters?: Partial<T>): Promise<T[]> {
    this.assertTenant(empresaId)
    let query = this.client.from(this.tableName).select('*').eq('empresa_id', empresaId)
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'empresa_id') continue
        if (value !== undefined && value !== null) query = query.eq(key, value as never)
      }
    }
    const { data, error } = await query
    if (error) throw new Error(`Erro de leitura em ${this.tableName}: ${error.message}`)
    return normalizeRows<T>(data)
  }

  async persistRecord(empresaId: string, payload: T): Promise<T> {
    this.assertTenant(empresaId)
    const body = this.sanitizePayload(payload)
    const { data, error } = await this.client.from(this.tableName).insert({ ...body, empresa_id: empresaId }).select('*').single()
    if (error) throw new Error(`Erro de criação em ${this.tableName}: ${error.message}`)
    return normalizeRow<T>(data)
  }

  async updateRecord(empresaId: string, id: string, payload: Partial<T>): Promise<T> {
    this.assertTenant(empresaId)
    if (!id.trim()) throw new Error('Registro inválido para alteração.')
    const body = this.sanitizePayload(payload)
    const { data, error } = await this.client.from(this.tableName).update(body).eq('id', id).eq('empresa_id', empresaId).select('*').single()
    if (error) throw new Error(`Erro de alteração em ${this.tableName}: ${error.message}`)
    return normalizeRow<T>(data)
  }

  async deleteRecord(empresaId: string, id: string): Promise<void> {
    this.assertTenant(empresaId)
    if (!id.trim()) throw new Error('Registro inválido para exclusão.')
    const { error } = await this.client.from(this.tableName).delete().eq('id', id).eq('empresa_id', empresaId)
    if (error) throw new Error(`Erro de exclusão em ${this.tableName}: ${error.message}`)
  }
}

export interface IndustrialCostCalculationInput {
  produto_id: string
  quantidade_lote: number
  horas_mao_obra?: number
  custo_hora_mao_obra?: number
  horas_maquina?: number
  custo_hora_maquina?: number
  energia?: number
  custos_indiretos?: number
  terceirizacao?: number
  embalagem?: number
  perda_refugo?: number
  markup_percentual?: number
}

export interface IndustrialCostCalculationResult extends RowRecord {
  custo_material?: number
  custo_mao_obra?: number
  custo_maquina?: number
  custo_energia?: number
  custo_indireto?: number
  custo_terceirizacao?: number
  custo_embalagem?: number
  custo_refugo?: number
  custo_total?: number
  custo_unitario?: number
  preco_sugerido?: number
  margem_percentual?: number
  [key: string]: unknown
}

export async function executarCalculoCustosIndustriais(input: IndustrialCostCalculationInput, client: SupabaseClient = supabase): Promise<IndustrialCostCalculationResult> {
  if (!input.produto_id) throw new Error('Produto obrigatório para cálculo de custo.')
  if (!Number.isFinite(input.quantidade_lote) || input.quantidade_lote <= 0) throw new Error('A quantidade do lote deve ser maior que zero.')
  const { data, error } = await client.rpc('erp_calcular_custo_produto', {
    p_produto_id: input.produto_id,
    p_quantidade: input.quantidade_lote,
    p_horas_mao_obra: input.horas_mao_obra ?? 0,
    p_custo_hora_mao_obra: input.custo_hora_mao_obra ?? 0,
    p_horas_maquina: input.horas_maquina ?? 0,
    p_custo_hora_maquina: input.custo_hora_maquina ?? 0,
    p_energia: input.energia ?? 0,
    p_custos_indiretos: input.custos_indiretos ?? 0,
    p_terceirizacao: input.terceirizacao ?? 0,
    p_embalagem: input.embalagem ?? 0,
    p_perda_refugo: input.perda_refugo ?? 0,
    p_markup_percentual: input.markup_percentual ?? 0,
  })
  if (error) throw new Error(`Falha na RPC de Custos: ${error.message}`)
  return normalizeRow<IndustrialCostCalculationResult>(data)
}

export interface ExternalProviderStatus { providerName: 'SEFAZ' | 'W-API WhatsApp' | 'Gateway Pagamento' | 'SMTP Email'; isConfigured: boolean; statusMessage: string }

export function verificarStatusProvedoresExternos(config: Record<string, string | undefined>): ExternalProviderStatus[] {
  const providers: Array<[ExternalProviderStatus['providerName'], string[]]> = [
    ['SEFAZ', ['SEFAZ_API_URL', 'SEFAZ_API_KEY']],
    ['W-API WhatsApp', ['WHATSAPP_API_URL', 'WHATSAPP_API_KEY']],
    ['Gateway Pagamento', ['PAYMENT_API_URL', 'PAYMENT_API_KEY']],
    ['SMTP Email', ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']],
  ]
  return providers.map(([providerName, keys]) => ({ providerName, isConfigured: keys.every(key => Boolean(config[key]?.trim())), statusMessage: keys.every(key => Boolean(config[key]?.trim())) ? 'Configurado' : 'Configuração externa necessária' }))
}
