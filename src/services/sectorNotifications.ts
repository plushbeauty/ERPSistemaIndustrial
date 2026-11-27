import { supabase } from '../lib/supabaseClient'

export type SectorCode = 'VENDAS' | 'PCP' | 'COMPRAS' | 'ALMOXARIFADO' | 'SGQ' | 'FINANCEIRO'
export type SectorReference = 'PEDIDO' | 'OP' | 'REQUISICAO' | 'TITULO' | 'RPNC'

export type CreateSectorNotification = {
  empresa_id: string
  setor_origem: SectorCode
  setor_destino: SectorCode
  titulo: string
  mensagem: string
  referencia_tipo?: SectorReference | null
  referencia_id?: string | null
  rota_destino?: string | null
}

/** Dispara uma notificação somente a partir de uma ação real já confirmada pelo fluxo chamador. */
export async function createSectorNotification(notification: CreateSectorNotification): Promise<void> {
  if (!notification.empresa_id || !notification.titulo.trim() || !notification.mensagem.trim()) {
    throw new Error('Empresa, título e mensagem são obrigatórios para notificar um setor.')
  }
  const { error } = await supabase.from('erp_notificacoes_setor').insert({
    ...notification,
    referencia_tipo: notification.referencia_tipo ?? null,
    referencia_id: notification.referencia_id ?? null,
    rota_destino: notification.rota_destino ?? null,
  })
  if (error) throw error
}
