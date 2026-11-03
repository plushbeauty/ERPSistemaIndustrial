/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-CONFIGURACOES-INSTALACAO-SISTEMA-20261103-01 — aba "Instalação do sistema" de
 *   AdministracaoConfiguracoesGlobais, integrada por ordem do proprietário. Cria a estrutura documental
 *   somente depois que o usuário escolhe e autoriza a pasta no navegador (File System Access API);
 *   a referência fica no IndexedDB local e nenhum arquivo existente é substituído.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FolderOpen, HardDrive, Network, ShieldAlert } from 'lucide-react'
import '../../styles/system-installation.css'

type Destination = 'computer' | 'network'
// Mesma união do tipo DOM; declarada aqui porque o ESLint desta base não resolve globais de tipo.
type PermissionState = 'granted' | 'denied' | 'prompt'
type AccessPermission = PermissionState | 'unknown'

interface DirectoryHandleLike {
  readonly name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

interface InstallationWindow extends Window {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandleLike>
}

interface SavedInstallation {
  companyName: string
  destination: Destination
  directory: DirectoryHandleLike
}

const databaseName = 'sysnqra-installation-settings'
const objectStoreName = 'settings'
const installationKey = 'company-document-directory'

const documentFolders = [
  'Desenhos',
  'Procedimentos',
  'Notas Fiscais',
  'Notas Fiscais/XML',
  'Notas Fiscais/PDF',
  'Documentos',
] as const

function openSettingsDatabase(): Promise<IDBDatabase> {
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
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir as configurações locais.'))
  })
}

async function saveInstallation(config: SavedInstallation): Promise<void> {
  const database = await openSettingsDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(objectStoreName, 'readwrite')
    transaction.objectStore(objectStoreName).put(config, installationKey)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível salvar a configuração local.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('A gravação da configuração local foi cancelada.'))
  }).finally(() => database.close())
}

async function loadInstallation(): Promise<SavedInstallation | null> {
  const database = await openSettingsDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(objectStoreName, 'readonly')
    const request = transaction.objectStore(objectStoreName).get(installationKey)
    request.onsuccess = () => {
      const value: unknown = request.result
      if (
        typeof value === 'object' &&
        value !== null &&
        'companyName' in value &&
        'destination' in value &&
        'directory' in value &&
        typeof value.companyName === 'string' &&
        (value.destination === 'computer' || value.destination === 'network')
      ) {
        const directory = value.directory
        if (
          typeof directory === 'object' &&
          directory !== null &&
          'name' in directory &&
          typeof directory.name === 'string' &&
          'getDirectoryHandle' in directory &&
          typeof directory.getDirectoryHandle === 'function'
        ) {
          resolve({ companyName: value.companyName, destination: value.destination, directory: directory as DirectoryHandleLike })
          return
        }
      }
      resolve(null)
    }
    request.onerror = () => reject(request.error ?? new Error('Não foi possível recuperar a configuração local.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
  })
}

function getCompanyFolderName(companyName: string): string {
  const trimmed = companyName.trim().replace(/[. ]+$/, '')
  if (!trimmed) throw new Error('Informe o nome da empresa.')
  if (trimmed.length > 80) throw new Error('Use até 80 caracteres no nome da empresa.')
  // O Windows proíbe estes caracteres e qualquer código de controle abaixo de 0x20 no nome do arquivo.
  if ([...trimmed].some(character => character < ' ' || '<>:"/\\|?*'.includes(character))) {
    throw new Error('O nome não pode conter \\, /, :, *, ?, ", <, > ou |.')
  }

  const baseName = trimmed.replace(/\.doc$/i, '').replace(/[. ]+$/, '')
  if (!baseName) throw new Error('Informe um nome antes da extensão .Doc.')
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(baseName)) {
    throw new Error('Esse nome é reservado pelo Windows. Informe outro nome de empresa.')
  }

  return /\.doc$/i.test(trimmed) ? trimmed : `${trimmed}.Doc`
}

function permissionMessage(permission: AccessPermission): string {
  if (permission === 'granted') return 'Acesso autorizado neste navegador.'
  if (permission === 'denied') return 'Acesso bloqueado pelo navegador. Reautorize a pasta para continuar.'
  if (permission === 'prompt') return 'O navegador solicitará autorização quando a pasta for usada.'
  return 'A autorização da pasta será solicitada pelo navegador quando necessário.'
}

export default function SystemInstallationSettings() {
  const [companyName, setCompanyName] = useState('')
  const [destination, setDestination] = useState<Destination>('computer')
  const [directory, setDirectory] = useState<DirectoryHandleLike | null>(null)
  const [permission, setPermission] = useState<AccessPermission>('unknown')
  const [createdPaths, setCreatedPaths] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(true)

  const folderName = useMemo(() => {
    try {
      return getCompanyFolderName(companyName)
    } catch {
      return ''
    }
  }, [companyName])

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const saved = await loadInstallation()
        if (!active || !saved) return
        setCompanyName(saved.companyName)
        setDestination(saved.destination)
        setDirectory(saved.directory)
        const currentPermission = saved.directory.queryPermission
          ? await saved.directory.queryPermission({ mode: 'readwrite' })
          : 'unknown'
        if (active) setPermission(currentPermission)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível recuperar a configuração local.')
      } finally {
        if (active) setRestoring(false)
      }
    }
    void restore()
    return () => { active = false }
  }, [])

  const chooseDirectory = async () => {
    setError('')
    setMessage('')
    const browserWindow = window as InstallationWindow
    if (!browserWindow.showDirectoryPicker) {
      setError('Este navegador não permite selecionar pastas diretamente. Use uma versão atual do Microsoft Edge ou Google Chrome.')
      return
    }
    try {
      const selectedDirectory = await browserWindow.showDirectoryPicker({ id: 'sysnqra-company-documents', mode: 'readwrite' })
      setDirectory(selectedDirectory)
      const currentPermission = selectedDirectory.queryPermission
        ? await selectedDirectory.queryPermission({ mode: 'readwrite' })
        : 'unknown'
      setPermission(currentPermission)
      await saveInstallation({ companyName, destination, directory: selectedDirectory })
      setMessage('Pasta selecionada e configuração salva neste navegador.')
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : 'Não foi possível selecionar ou salvar a pasta.')
    }
  }

  const authorizeDirectory = async () => {
    if (!directory?.requestPermission) {
      setError('Este navegador não oferece reautorização para a pasta salva. Selecione a pasta novamente.')
      return
    }
    setError('')
    try {
      const nextPermission = await directory.requestPermission({ mode: 'readwrite' })
      setPermission(nextPermission)
      if (nextPermission === 'granted') setMessage('Acesso à pasta autorizado.')
      else setError('O navegador não autorizou o acesso à pasta.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível autorizar a pasta.')
    }
  }

  const updateCompanyName = (value: string) => {
    setCompanyName(value)
    setCreatedPaths([])
    setError('')
    setMessage('')
  }

  const persistCompanyName = (value: string) => {
    if (!directory) return
    void saveInstallation({ companyName: value, destination, directory }).then(
      () => undefined,
      cause => setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o nome da empresa.')
    )
  }

  const updateDestination = (value: Destination) => {
    setDestination(value)
    setMessage('')
    if (directory) {
      void saveInstallation({ companyName, destination: value, directory }).then(
        () => setMessage('Destino atualizado nesta configuração local.'),
        cause => setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o destino.')
      )
    }
  }

  const createFolderStructure = async () => {
    setError('')
    setMessage('')
    setCreatedPaths([])
    if (!directory) {
      setError('Selecione uma pasta raiz antes de preparar a estrutura.')
      return
    }

    let packageName: string
    try {
      packageName = getCompanyFolderName(companyName)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Confira o nome da empresa.')
      return
    }

    setBusy(true)
    const completed: string[] = []
    try {
      let currentPermission: AccessPermission = permission
      if (directory.queryPermission) {
        currentPermission = await directory.queryPermission({ mode: 'readwrite' })
        setPermission(currentPermission)
        if (currentPermission !== 'granted') throw new Error('Autorize o acesso à pasta pelo botão "Reautorizar acesso à pasta" antes de criar a estrutura.')
      }
      const companyDirectory = await directory.getDirectoryHandle(packageName, { create: true })
      completed.push(`${packageName}/`)
      setCreatedPaths([...completed])
      for (const folder of documentFolders) {
        const parts = folder.split('/')
        let current = companyDirectory
        for (const part of parts) current = await current.getDirectoryHandle(part, { create: true })
        completed.push(`${packageName}/${folder}/`)
        setCreatedPaths([...completed])
      }
      setMessage(`Estrutura documental preparada em ${directory.name}/${packageName}. Nenhum arquivo existente foi alterado.`)
      void saveInstallation({ companyName, destination, directory }).catch(cause => {
        setError(cause instanceof Error
          ? `As pastas foram criadas, mas a configuração não foi salva neste navegador: ${cause.message}`
          : 'As pastas foram criadas, mas a configuração não foi salva neste navegador.')
      })
    } catch (cause) {
      setError(cause instanceof Error
        ? `A criação foi interrompida: ${cause.message}. As pastas já criadas foram preservadas; execute novamente para completar.`
        : 'A criação foi interrompida. As pastas já criadas foram preservadas; execute novamente para completar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="sys-install" aria-labelledby="sys-install-title">
      <header className="sys-install-header">
        <div className="sys-install-header-icon"><HardDrive size={24} aria-hidden="true" /></div>
        <div>
          <p className="sys-install-eyebrow">CONFIGURAÇÃO DO AMBIENTE</p>
          <h2 id="sys-install-title">Instalação do sistema</h2>
          <p>Prepare o espaço documental da empresa no computador atual ou em uma pasta de rede acessível.</p>
        </div>
      </header>

      <div className="sys-install-notice" role="note">
        <ShieldAlert size={18} aria-hidden="true" />
        <p><strong>Limite importante:</strong> esta etapa cria a estrutura de pastas. O ERP ainda não sincroniza arquivos nem executa rotinas offline; isso exige um agente local de sincronização que não existe nesta aplicação web.</p>
      </div>

      {error && <div className="sys-install-feedback is-error" role="alert"><AlertTriangle size={17} />{error}</div>}
      {message && <div className="sys-install-feedback is-success" role="status"><CheckCircle2 size={17} />{message}</div>}

      <div className="sys-install-grid">
        <section className="sys-install-card" aria-labelledby="sys-install-identity-title">
          <div className="sys-install-card-heading">
            <span className="sys-install-step">01</span>
            <div><h3 id="sys-install-identity-title">Identificação da empresa</h3><p>O nome será usado na pasta principal.</p></div>
          </div>
          <label className="sys-install-field">
            <span>Nome da empresa</span>
            <input
              value={companyName}
              onChange={event => updateCompanyName(event.target.value)}
              onBlur={event => persistCompanyName(event.currentTarget.value)}
              placeholder="Ex.: Plastinbor"
              maxLength={80}
              autoComplete="organization"
              aria-describedby="sys-install-company-hint"
            />
          </label>
          <p className="sys-install-hint" id="sys-install-company-hint">
            Pasta a criar: <strong>{folderName || 'NomeDaEmpresa.Doc'}</strong>
          </p>
        </section>

        <section className="sys-install-card" aria-labelledby="sys-install-location-title">
          <div className="sys-install-card-heading">
            <span className="sys-install-step">02</span>
            <div><h3 id="sys-install-location-title">Local de armazenamento</h3><p>Escolha uma raiz acessível neste computador.</p></div>
          </div>
          <fieldset className="sys-install-destinations">
            <legend>Onde ficará a pasta da empresa?</legend>
            <label className={destination === 'computer' ? 'is-selected' : ''}>
              <input type="radio" name="installation-destination" value="computer" checked={destination === 'computer'} onChange={() => updateDestination('computer')} />
              <HardDrive size={18} aria-hidden="true" /><span><strong>Neste computador</strong><small>Disco local ou pasta escolhida</small></span>
            </label>
            <label className={destination === 'network' ? 'is-selected' : ''}>
              <input type="radio" name="installation-destination" value="network" checked={destination === 'network'} onChange={() => updateDestination('network')} />
              <Network size={18} aria-hidden="true" /><span><strong>Pasta de rede</strong><small>Unidade compartilhada já acessível</small></span>
            </label>
          </fieldset>
          <button type="button" className="sys-install-select" onClick={() => void chooseDirectory()} disabled={busy}>
            <FolderOpen size={17} aria-hidden="true" />
            {directory ? 'Escolher outra pasta raiz' : destination === 'network' ? 'Selecionar pasta de rede' : 'Selecionar pasta do computador'}
          </button>
          <div className="sys-install-location" aria-live="polite">
            <span className={`sys-install-status-dot ${directory ? 'is-ready' : ''}`} aria-hidden="true" />
            <span><strong>{directory?.name ?? 'Nenhuma pasta selecionada'}</strong><small>{directory ? permissionMessage(permission) : 'A autorização será solicitada pelo navegador.'}</small></span>
          </div>
          {directory && permission !== 'granted' && (
            <button type="button" className="sys-install-link-button" onClick={() => void authorizeDirectory()} disabled={busy}>
              Reautorizar acesso à pasta
            </button>
          )}
          {destination === 'network' && <p className="sys-install-hint">A pasta compartilhada deve estar montada e liberada para este usuário no Windows. O navegador só consegue acessar o local escolhido no seletor nativo.</p>}
        </section>
      </div>

      <section className="sys-install-card sys-install-structure" aria-labelledby="sys-install-structure-title">
        <div className="sys-install-card-heading">
          <span className="sys-install-step">03</span>
          <div><h3 id="sys-install-structure-title">Estrutura documental</h3><p>Pastas criadas sem substituir arquivos existentes; repetir a ação é seguro.</p></div>
        </div>
        <div className="sys-install-structure-layout">
          <div className="sys-install-tree" aria-label="Prévia das pastas que serão criadas">
            <strong><FolderOpen size={16} aria-hidden="true" />{folderName || 'NomeDaEmpresa.Doc'}</strong>
            <ul>
              <li>Desenhos</li>
              <li>Procedimentos</li>
              <li>Notas Fiscais<ul><li>XML</li><li>PDF</li></ul></li>
              <li>Documentos</li>
            </ul>
          </div>
          <div className="sys-install-action-panel">
            <p>O navegador pedirá acesso à pasta selecionada. A estrutura será criada somente após sua confirmação ao clicar abaixo.</p>
            <button type="button" className="sys-install-create" onClick={() => void createFolderStructure()} disabled={busy || restoring || !directory || !companyName.trim() || (permission !== 'granted' && Boolean(directory?.queryPermission))}>
              <FolderOpen size={17} aria-hidden="true" />
              {busy ? 'Preparando pastas…' : 'Criar estrutura da empresa'}
            </button>
            {!directory && <small>Selecione uma pasta raiz para habilitar a criação.</small>}
          </div>
        </div>
        {createdPaths.length > 0 && (
          <div className="sys-install-created" role="status">
            <strong>{createdPaths.length} de {documentFolders.length + 1} pastas preparadas</strong>
            <ul>{createdPaths.map(path => <li key={path}>{path}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="sys-install-offline" aria-labelledby="sys-install-offline-title">
        <div className="sys-install-offline-icon"><AlertTriangle size={19} aria-hidden="true" /></div>
        <div><h3 id="sys-install-offline-title">Uso offline e sincronização</h3><p>Status: <strong>não configurado</strong>. Para abrir o ERP sem internet e sincronizar sem conflitos, será necessário instalar um serviço local com política de cache, fila de envio, proteção contra duplicidade e regras para resolução de versões. O diretório acima, sozinho, não ativa esse comportamento.</p></div>
      </section>

      {restoring && <span className="sys-install-visually-hidden" role="status">Recuperando configuração local…</span>}
    </section>
  )
}
