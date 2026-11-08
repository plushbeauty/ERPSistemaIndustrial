/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-PASTA-LOCAL-DOCUMENTOS-20261103-01 — cópia local de documentos do SGQ
 *
 * Ordem do proprietário em 2026-11-03: o procedimento tem que ser gravado no banco de dados e na
 * pasta do PC ou da rede que o cliente determinar, para o setor continuar trabalhando sem internet.
 * A pasta é a mesma escolhida em Configurações › Instalação do sistema (IndexedDB
 * "sysnqra-installation-settings"), então o setor não autoriza duas vezes o mesmo local.
 * Nada aqui apaga ou sobrescreve uma pasta inteira: a escrita é sempre de um arquivo dentro de
 * Procedimentos/, e o navegador pede permissão antes de gravar.
 */

type PermissionState = 'granted' | 'denied' | 'prompt'

export interface DocumentFileHandle {
  readonly name: string
  createWritable(options?: { keepExistingData?: boolean }): Promise<{
    write(data: string | Blob | Uint8Array): Promise<void>
    close(): Promise<void>
  }>
}

export interface DocumentFolderHandle {
  readonly name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DocumentFolderHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<DocumentFileHandle>
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

export interface CompanyFolder {
  root: DocumentFolderHandle
  companyName: string
}

const databaseName = 'sysnqra-installation-settings'
const objectStoreName = 'settings'
const installationKey = 'company-document-directory'

/** Mesmo padrão da aba de instalação: a pasta da empresa recebe o nome informado + extensão .Doc. */
export function companyFolderName(companyName: string): string {
  const trimmed = companyName.trim().replace(/[. ]+$/, '')
  if (!trimmed) throw new Error('Informe o nome da empresa em Configurações › Instalação do sistema.')
  return /\.doc$/i.test(trimmed) ? trimmed : `${trimmed}.Doc`
}

/** O Windows proíbe estes caracteres e qualquer código de controle abaixo de 0x20 no nome do arquivo. */
export function windowsSafeName(value: string): string {
  const cleaned = [...value.trim().replace(/[. ]+$/, '')]
    .filter(character => character >= ' ' && !'<>:"/\\|?*'.includes(character))
    .join('')
    .replace(/\s+/g, ' ')
  return cleaned.slice(0, 120)
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(objectStoreName)) {
        request.result.createObjectStore(objectStoreName)
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir as configurações locais deste navegador.'))
  })
}

export async function loadCompanyFolder(): Promise<CompanyFolder | null> {
  const database = await openDatabase()
  const saved = await new Promise<{ companyName: string; directory: unknown } | null>((resolve, reject) => {
    const transaction = database.transaction(objectStoreName, 'readonly')
    const request = transaction.objectStore(objectStoreName).get(installationKey)
    request.onsuccess = () => {
      const value: unknown = request.result
      if (
        typeof value === 'object' && value !== null &&
        'companyName' in value && typeof value.companyName === 'string' &&
        'directory' in value &&
        typeof value.directory === 'object' && value.directory !== null &&
        'name' in value.directory && typeof value.directory.name === 'string' &&
        'getDirectoryHandle' in value.directory && typeof value.directory.getDirectoryHandle === 'function'
      ) {
        resolve({ companyName: value.companyName, directory: value.directory })
        return
      }
      resolve(null)
    }
    request.onerror = () => reject(request.error ?? new Error('Não foi possível recuperar a pasta configurada neste navegador.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
  })
  return saved ? { companyName: saved.companyName, root: saved.directory as DocumentFolderHandle } : null
}

export async function ensureWriteAccess(root: DocumentFolderHandle): Promise<PermissionState | 'unknown'> {
  if (root.queryPermission && await root.queryPermission({ mode: 'readwrite' }) === 'granted') return 'granted'
  if (!root.requestPermission) return 'unknown'
  return root.requestPermission({ mode: 'readwrite' })
}

/**
 * Grava um texto dentro de <pasta da empresa>/<pastas>/<arquivo>. Cria os diretórios que faltam e
 * substitui apenas o arquivo de mesmo nome — comportamento esperado para a revisão vigente do
 * próprio documento, que tem código + revisão no nome.
 */
export async function writeCompanyDocument(folderPath: string[], fileName: string, content: string): Promise<string> {
  const saved = await loadCompanyFolder()
  if (!saved) throw new Error('Nenhuma pasta configurada. Abra Configurações › Instalação do sistema e escolha a pasta do computador ou da rede.')
  const permission = await ensureWriteAccess(saved.root)
  if (permission === 'denied') throw new Error('O navegador negou a permissão de escrita na pasta escolhida.')
  if (permission !== 'granted' && permission !== 'unknown') throw new Error('Autorize o acesso à pasta no aviso do navegador para gravar a cópia local.')

  let current = await saved.root.getDirectoryHandle(companyFolderName(saved.companyName), { create: true })
  for (const folder of folderPath) current = await current.getDirectoryHandle(folder, { create: true })

  const safeName = windowsSafeName(fileName)
  if (!safeName) throw new Error('O nome do arquivo ficou vazio depois de limpar os caracteres inválidos.')
  const file = await current.getFileHandle(safeName, { create: true })
  const stream = await file.createWritable({ keepExistingData: false })
  await stream.write(content)
  await stream.close()

  return `${saved.root.name}/${companyFolderName(saved.companyName)}/${[...folderPath, safeName].join('/')}`
}
