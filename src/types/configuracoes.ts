export interface Area {
  id: string
  empresa_id: string
  codigo: string
  nome: string
  created_at: string
}

export interface Grupo {
  id: string
  empresa_id: string
  codigo: string
  nome: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CodigoConfig {
  id: string
  empresa_id: string
  prefixo: string
  separador: string
  modo_numeracao: 'NUM' | 'PS' | 'PGR'
  sequencia_atual: number
  created_at: string
  updated_at: string
}

export interface HistoricoCodigo {
  id: string
  empresa_id: string
  codigo_completo: string
  codigo_base: string
  sequencia: number
  gerado_por: string | null
  created_at: string
}
