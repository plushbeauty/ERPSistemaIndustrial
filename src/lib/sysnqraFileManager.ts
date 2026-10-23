import { supabase } from './supabaseClient'

type FileManagerSession = {
  companyId: string
  agentUrl: string
  token: string
}

const SESSION_KEY = 'sysnqra-file-manager-v1'
const IMAGE_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg', 'avif'] as const

function readSession(companyId: string): FileManagerSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw: unknown = window.sessionStorage.getItem(SESSION_KEY)
    if (typeof raw !== 'string') return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = parsed as Partial<FileManagerSession>
    if (value.companyId !== companyId || typeof value.agentUrl !== 'string' || typeof value.token !== 'string') return null
    const url = new URL(value.agentUrl)
    if (!['http:', 'https:'].includes(url.protocol) || !value.token.trim()) return null
    return { companyId, agentUrl: url.toString().replace(/\/+$/, ''), token: value.token }
  } catch {
    return null
  }
}

async function canReadIndustrialFiles(companyId: string, permissionModule: 'vendas' | 'pcp'): Promise<boolean> {
  const auth = await supabase.auth.getUser()
  if (auth.error || !auth.data.user) return false

  const currentCompany = await supabase.rpc('erp_current_empresa_id')
  if (currentCompany.error || !currentCompany.data || String(currentCompany.data) !== companyId) return false

  const profile = await supabase
    .from('erp_usuarios')
    .select('id')
    .eq('auth_user_id', auth.data.user.id)
    .eq('empresa_id', companyId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (profile.error || !profile.data?.id) return false

  const permission = await supabase.rpc('erp_has_permission', { p_modulo: permissionModule, p_acao: 'ver' })
  return !permission.error && permission.data === true
}

function safeFilename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 100)
}

/**
 * Carrega uma imagem somente para a empresa autenticada, com perfil ativo e permissão de leitura.
 * O agente local também exige token e o mesmo X-SYSNQRA-Company-ID vinculado na instalação.
 * Retorna object URL temporária; o chamador deve revogá-la quando deixar de usá-la.
 */
export async function loadIndustrialFallbackImage(
  companyId: string,
  folder: 'produtos' | 'fichas-processo' | 'desenhos-tecnicos' | 'fotos' | 'imagens',
  filename: string,
  permissionModule: 'vendas' | 'pcp' = 'vendas',
): Promise<string | null> {
  const session = readSession(companyId)
  if (!session || !filename.trim()) return null
  if (!(await canReadIndustrialFiles(companyId, permissionModule))) return null

  const baseName = safeFilename(filename)
  if (!baseName) return null
  const candidates = IMAGE_EXTENSIONS.map(extension => baseName.toLowerCase().endsWith('.' + extension)
    ? baseName
    : baseName + '.' + extension)

  for (const candidate of [...new Set(candidates)]) {
    try {
      const url = new URL(session.agentUrl + '/file')
      url.searchParams.set('path', folder + '/' + candidate)
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + session.token,
          'X-SYSNQRA-Company-ID': companyId,
        },
        cache: 'no-store',
      })
      if (!response.ok) continue
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) continue
      const blob = await response.blob()
      if (!blob.size) continue
      return URL.createObjectURL(blob)
    } catch {
      // Falha do agente é tratada como ausência de fallback; a tela mantém o cadastro real.
    }
  }
  return null
}
