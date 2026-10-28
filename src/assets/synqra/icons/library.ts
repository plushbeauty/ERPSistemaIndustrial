/**
 * Biblioteca visual oficial de ícones do SYSNQRA ERP INDUSTRIAL.
 * Reutilize estes ícones em novas telas para manter consistência visual.
 * Fonte: lucide-react já instalada no projeto.
 *
 * Exemplo:
 * import { SYNQRA_ICON_LIBRARY } from '@/assets/synqra/icons'
 * const Icon = SYNQRA_ICON_LIBRARY.pastas.find(item => item.key === 'folder-open')?.Icon
 */
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  CloudDownload,
  CloudOff,
  CloudUpload,
  Database,
  DatabaseBackup,
  File,
  FileArchive,
  FileCheck2,
  FileImage,
  FileText,
  Folder,
  FolderCog,
  FolderOpen,
  FolderTree,
  HardDrive,
  Images,
  Laptop,
  Loader2,
  Monitor,
  MonitorCog,
  Network,
  Package,
  RefreshCw,
  Rocket,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  Wifi,
  WifiOff,
  Workflow,
} from 'lucide-react'

export type SynqraIconItem = {
  key: string
  label: string
  description: string
  Icon: LucideIcon
}

export type SynqraIconCategory = {
  label: string
  description: string
  items: readonly SynqraIconItem[]
}

export const SYNQRA_ICON_LIBRARY = {
  instalacao: {
    label: 'Instalação e configuração',
    description: 'Ícones para assistentes, implantação e configuração inicial.',
    items: [
      { key: 'rocket', label: 'Primeiro acesso', description: 'Boas-vindas e início da configuração.', Icon: Rocket },
      { key: 'settings-2', label: 'Configurações', description: 'Parâmetros do sistema.', Icon: Settings2 },
      { key: 'monitor-cog', label: 'Computador configurado', description: 'Configuração de estação de trabalho.', Icon: MonitorCog },
      { key: 'check-circle', label: 'Concluído', description: 'Etapa concluída com sucesso.', Icon: CheckCircle2 },
      { key: 'save', label: 'Salvar', description: 'Gravar configurações.', Icon: Save },
      { key: 'loader', label: 'Processando', description: 'Operação em andamento.', Icon: Loader2 },
      { key: 'chevron-right', label: 'Avançar', description: 'Ir para a próxima etapa.', Icon: ChevronRight },
      { key: 'help', label: 'Ajuda', description: 'Ajuda contextual.', Icon: CircleHelp },
    ],
  },
  rede: {
    label: 'Rede e conectividade',
    description: 'Ícones para servidor, rede local, conectividade e modo offline.',
    items: [
      { key: 'network', label: 'Rede', description: 'Rede local ou compartilhamento.', Icon: Network },
      { key: 'server', label: 'Servidor', description: 'Servidor da empresa.', Icon: Server },
      { key: 'monitor', label: 'Computador', description: 'Estação local.', Icon: Monitor },
      { key: 'laptop', label: 'Notebook', description: 'Computador portátil.', Icon: Laptop },
      { key: 'wifi', label: 'Conectado', description: 'Conexão disponível.', Icon: Wifi },
      { key: 'wifi-off', label: 'Sem conexão', description: 'Conexão indisponível.', Icon: WifiOff },
      { key: 'cloud', label: 'Nuvem', description: 'Serviço em nuvem.', Icon: Cloud },
      { key: 'cloud-off', label: 'Nuvem offline', description: 'Nuvem temporariamente indisponível.', Icon: CloudOff },
      { key: 'arrow-left-right', label: 'Sincronização', description: 'Troca de dados entre ambientes.', Icon: ArrowLeftRight },
      { key: 'refresh', label: 'Atualizar', description: 'Tentar novamente ou sincronizar.', Icon: RefreshCw },
    ],
  },
  pastas: {
    label: 'Pastas e arquivos',
    description: 'Ícones para a estrutura universal de documentos industriais.',
    items: [
      { key: 'folder-tree', label: 'Estrutura de pastas', description: 'Árvore de diretórios.', Icon: FolderTree },
      { key: 'folder-open', label: 'Pasta aberta', description: 'Pasta selecionada ou em uso.', Icon: FolderOpen },
      { key: 'folder', label: 'Pasta', description: 'Diretório comum.', Icon: Folder },
      { key: 'folder-cog', label: 'Pasta configurada', description: 'Pasta e suas configurações.', Icon: FolderCog },
      { key: 'file', label: 'Arquivo', description: 'Arquivo genérico.', Icon: File },
      { key: 'file-image', label: 'Imagem', description: 'Foto ou imagem de produto.', Icon: FileImage },
      { key: 'images', label: 'Galeria de fotos', description: 'Coleção de imagens.', Icon: Images },
      { key: 'file-text', label: 'Documento', description: 'Documento de texto ou PDF.', Icon: FileText },
      { key: 'file-check', label: 'Documento validado', description: 'Documento conferido.', Icon: FileCheck2 },
      { key: 'file-archive', label: 'Arquivo compactado', description: 'Pacote de arquivos.', Icon: FileArchive },
      { key: 'archive', label: 'Arquivo histórico', description: 'Arquivamento e histórico.', Icon: Archive },
      { key: 'package', label: 'Pacote', description: 'Conjunto de arquivos ou itens.', Icon: Package },
    ],
  },
  armazenamento: {
    label: 'Armazenamento e sincronização',
    description: 'Ícones para disco, banco de dados, backup e transferência.',
    items: [
      { key: 'hard-drive', label: 'Disco local', description: 'Armazenamento no computador.', Icon: HardDrive },
      { key: 'database', label: 'Banco de dados', description: 'Dados estruturados do ERP.', Icon: Database },
      { key: 'database-backup', label: 'Backup', description: 'Cópia de segurança.', Icon: DatabaseBackup },
      { key: 'cloud-upload', label: 'Enviar à nuvem', description: 'Upload de arquivos.', Icon: CloudUpload },
      { key: 'cloud-download', label: 'Baixar da nuvem', description: 'Download de arquivos.', Icon: CloudDownload },
      { key: 'workflow', label: 'Fluxo de sincronização', description: 'Processo de sincronização.', Icon: Workflow },
      { key: 'shield-check', label: 'Armazenamento protegido', description: 'Segurança e acesso autorizado.', Icon: ShieldCheck },
      { key: 'alert-triangle', label: 'Atenção', description: 'Aviso ou ação necessária.', Icon: AlertTriangle },
      { key: 'activity', label: 'Atividade', description: 'Estado ou atividade do sistema.', Icon: Activity },
      { key: 'bell', label: 'Notificação', description: 'Avisos de sistema.', Icon: Bell },
      { key: 'calendar', label: 'Agenda', description: 'Data ou programação.', Icon: CalendarDays },
      { key: 'clipboard-check', label: 'Conferência', description: 'Checklist e validação.', Icon: ClipboardCheck },
      { key: 'clipboard-list', label: 'Lista de tarefas', description: 'Itens e operações pendentes.', Icon: ClipboardList },
      { key: 'book-open', label: 'Manual', description: 'Instruções e documentação.', Icon: BookOpen },
    ],
  },
} satisfies Record<string, SynqraIconCategory>

export type SynqraIconCategoryKey = keyof typeof SYNQRA_ICON_LIBRARY
export type SynqraIconKey = (typeof SYNQRA_ICON_LIBRARY)[SynqraIconCategoryKey]['items'][number]['key']

/** Lista plana para galerias, seletores e pesquisas de ícones. */
export const SYNQRA_ALL_ICONS: readonly SynqraIconItem[] = Object.values(SYNQRA_ICON_LIBRARY)
  .flatMap((category) => category.items)
