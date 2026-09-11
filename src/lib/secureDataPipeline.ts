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

/**
 * Pipeline CRUD único para tabelas industriais multiempresa.
 *
 * Regras:
 * - usa o cliente Supabase já autenticado do ERP;
 * - nunca aceita empresa_id vindo dos filtros/payloads;
 * - sempre restringe leitura/alteração/exclusão ao tenant informado;
 * - não injeta updated_at automaticamente porque nem todas as tabelas possuem essa coluna;
 * - não usa any.
 */
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

    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'empresa_id') continue
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as never)
        }
      }
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro de leitura em ${this.tableName}: ${error.message}`)
    return normalizeRows<T>(data)
  }

  async persistRecord(
    empresaId: string,
    payload: Omit<T, 'id' | 'empresa_id'>,
  ): Promise<T> {
    this.assertTenant(empresaId)

    const completePayload: RowRecord = {
      ...this.sanitizePayload(payload),
      empresa_id: empresaId,
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(completePayload as never)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Erro de persistência [INSERT] em ${this.tableName}: ${error.message}`)
    }

    return normalizeRow<T>(data)
  }

  async updateRecord(
    empresaId: string,
    recordId: string | number,
    updates: Partial<T>,
  ): Promise<T> {
    this.assertTenant(empresaId)
    if (recordId === '' || recordId === null || recordId === undefined) {
      throw new Error(`Registro inválido para atualização em ${this.tableName}.`)
    }

    const safeUpdates = this.sanitizePayload(updates)

    const { data, error } = await this.client
      .from(this.tableName)
      .update(safeUpdates as never)
      .eq('id', recordId)
      .eq('empresa_id', empresaId)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Erro de atualização [UPDATE] em ${this.tableName}: ${error.message}`)
    }

    return normalizeRow<T>(data)
  }

  async removeRecord(empresaId: string, recordId: string | number): Promise<boolean> {
    this.assertTenant(empresaId)
    if (recordId === '' || recordId === null || recordId === undefined) {
      throw new Error(`Registro inválido para exclusão em ${this.tableName}.`)
    }

    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', recordId)
      .eq('empresa_id', empresaId)

    if (error) {
      throw new Error(`Erro de exclusão [DELETE] em ${this.tableName}: ${error.message}`)
    }

    return true
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

export interface IndustrialCostCalculationResult {
  id: string
  empresa_id: string
  produto_id: string
  ficha_id: string | null
  tipo_calculo: string
  materiais: number
  mao_obra: number
  maquinas: number
  energia: number
  custos_indiretos: number
  terceirizacao: number
  embalagem: number
  perdas_refugo: number
  custo_fabricacao: number
  custo_total: number
  quantidade_base: number
  preco_venda: number
  markup_percentual: number
  margem_valor: number
  margem_percentual: number
}

/**
 * A RPC real não recebe p_empresa_id.
 * O tenant é resolvido no banco por erp_current_empresa_id().
 */
export async function executarCalculoCustosIndustriais(
  input: IndustrialCostCalculationInput,
  client: SupabaseClient = supabase,
): Promise<IndustrialCostCalculationResult> {
  if (!input.produto_id) throw new Error('Produto obrigatório para cálculo de custo.')
  if (!Number.isFinite(input.quantidade_lote) || input.quantidade_lote <= 0) {
    throw new Error('A quantidade do lote deve ser maior que zero.')
  }

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

export interface ExternalProviderStatus {
  providerName: 'SEFAZ' | 'W-API WhatsApp' | 'Gateway Pagamento' | 'SMTP Email'
  isConfigured: boolean
  statusMessage: string
}

export function verificarStatusProvedoresExternos(
  config: Record<string, string | undefined>,
): ExternalProviderStatus[] {
  const providers: Array<[
    ExternalProviderStatus['providerName'],
    boolean,
  ]> = [
    ['SEFAZ', Boolean(config.SEFAZ_API_KEY && config.SEFAZ_CERT_PATH)],
    ['W-API WhatsApp', Boolean(config.WAPI_TOKEN && config.WAPI_ENDPOINT)],
    ['Gateway Pagamento', Boolean(config.PAYMENT_GATEWAY_KEY)],
    ['SMTP Email', Boolean(config.SMTP_HOST && config.SMTP_USER)],
  ]

  return providers.map(([providerName, isConfigured]) => ({
    providerName,
    isConfigured,
    statusMessage: isConfigured
      ? 'Configurado — validação operacional depende do provedor'
      : 'Provedor pendente / credencial necessária',
  }))
}

export const criarPipeline = <T extends RowRecord>(
  tableName: string,
  client: SupabaseClient = supabase,
): SecureDataPipeline<T> => new SecureDataPipeline<T>(tableName, client)
