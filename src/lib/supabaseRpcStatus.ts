/**
 * Mensagens acionáveis para contratos RPC do Supabase ainda não implantados.
 * Não substitui a migration: apenas identifica o erro e orienta a aplicação.
 */
export const MIGRACAO_PEDIDO_COMPRA_COMPLETO =
  'supabase/migrations/20261103190000_erp_compras_pedido_completo_atomic.sql'

export function erroBancoNaoInstalado(
  error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
  functionName: string,
  migration: string,
): string | null {
  if (!error) return null
  const code = error.code ?? ''
  const message = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
  const missingFunction =
    code === 'PGRST202' ||
    code === '42883' ||
    (message.includes(functionName.toLowerCase()) &&
      (message.includes('not found') || message.includes('does not exist') || message.includes('schema cache')))
  return missingFunction
    ? `A rotina ${functionName} ainda não está disponível no banco conectado. Aplique a migration ${migration} no projeto Supabase correto e atualize o schema da API.`
    : null
}
