/**
 * SYSNQRA ERP INDUSTRIAL — Biblioteca de Ícones
 * @REVISAO 28/10/2026
 * Galeria reutilizável para configurações, pastas, arquivos, rede, nuvem e indústria.
 */
import { useMemo, useState } from 'react'
import {
  Activity, Archive, ArrowLeftRight, Bell, BookOpen, Boxes, CalendarDays,
  Check, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, ClipboardList,
  Cloud, CloudDownload, CloudOff, CloudUpload, Database, DatabaseBackup,
  File, FileArchive, FileCheck2, FileImage, FileText, Folder, FolderCog,
  FolderOpen, FolderTree, HardDrive, Images, Laptop, Monitor, MonitorCog,
  Network, Package, RefreshCw, Rocket, Save, Search, Server, Settings2,
  ShieldCheck, Wifi, WifiOff, Workflow, type LucideIcon,
} from 'lucide-react'

type IconCategory = 'Pastas e arquivos' | 'Rede e conectividade' | 'Nuvem e armazenamento' | 'Sistema e instalação' | 'Indústria e operações'
type IconEntry = { key: string; label: string; description: string; category: IconCategory; Icon: LucideIcon }
const iconEntries: IconEntry[] = [
  { key: 'folder-tree', label: 'Estrutura de pastas', description: 'Árvore de diretórios e organização', category: 'Pastas e arquivos', Icon: FolderTree },
  { key: 'folder-open', label: 'Pasta aberta', description: 'Pasta selecionada ou em uso', category: 'Pastas e arquivos', Icon: FolderOpen },
  { key: 'folder', label: 'Pasta', description: 'Diretório padrão', category: 'Pastas e arquivos', Icon: Folder },
  { key: 'folder-cog', label: 'Pasta configurada', description: 'Diretório com parâmetros', category: 'Pastas e arquivos', Icon: FolderCog },
  { key: 'file', label: 'Arquivo', description: 'Arquivo genérico', category: 'Pastas e arquivos', Icon: File },
  { key: 'file-text', label: 'Documento', description: 'Documento, instrução ou PDF', category: 'Pastas e arquivos', Icon: FileText },
  { key: 'file-check', label: 'Documento validado', description: 'Documento conferido', category: 'Pastas e arquivos', Icon: FileCheck2 },
  { key: 'file-image', label: 'Imagem', description: 'Foto ou imagem técnica', category: 'Pastas e arquivos', Icon: FileImage },
  { key: 'images', label: 'Galeria de imagens', description: 'Coleção de fotos', category: 'Pastas e arquivos', Icon: Images },
  { key: 'file-archive', label: 'Arquivo compactado', description: 'Pacote compactado', category: 'Pastas e arquivos', Icon: FileArchive },
  { key: 'archive', label: 'Arquivo histórico', description: 'Arquivamento e histórico', category: 'Pastas e arquivos', Icon: Archive },
  { key: 'network', label: 'Rede', description: 'Rede local e compartilhamento', category: 'Rede e conectividade', Icon: Network },
  { key: 'server', label: 'Servidor', description: 'Servidor da empresa', category: 'Rede e conectividade', Icon: Server },
  { key: 'monitor', label: 'Computador', description: 'Estação de trabalho', category: 'Rede e conectividade', Icon: Monitor },
  { key: 'monitor-cog', label: 'Estação configurada', description: 'Computador configurado', category: 'Rede e conectividade', Icon: MonitorCog },
  { key: 'laptop', label: 'Notebook', description: 'Computador portátil', category: 'Rede e conectividade', Icon: Laptop },
  { key: 'wifi', label: 'Conectado', description: 'Conexão disponível', category: 'Rede e conectividade', Icon: Wifi },
  { key: 'wifi-off', label: 'Sem conexão', description: 'Conexão indisponível', category: 'Rede e conectividade', Icon: WifiOff },
  { key: 'cloud', label: 'Nuvem', description: 'Serviço em nuvem', category: 'Nuvem e armazenamento', Icon: Cloud },
  { key: 'cloud-off', label: 'Nuvem offline', description: 'Serviço temporariamente indisponível', category: 'Nuvem e armazenamento', Icon: CloudOff },
  { key: 'cloud-upload', label: 'Enviar à nuvem', description: 'Enviar arquivos', category: 'Nuvem e armazenamento', Icon: CloudUpload },
  { key: 'cloud-download', label: 'Baixar da nuvem', description: 'Receber arquivos', category: 'Nuvem e armazenamento', Icon: CloudDownload },
  { key: 'hard-drive', label: 'Disco local', description: 'Armazenamento local', category: 'Nuvem e armazenamento', Icon: HardDrive },
  { key: 'database', label: 'Banco de dados', description: 'Dados estruturados', category: 'Nuvem e armazenamento', Icon: Database },
  { key: 'database-backup', label: 'Backup', description: 'Cópia de segurança', category: 'Nuvem e armazenamento', Icon: DatabaseBackup },
  { key: 'sync', label: 'Sincronização', description: 'Troca de dados entre ambientes', category: 'Nuvem e armazenamento', Icon: ArrowLeftRight },
  { key: 'workflow', label: 'Fluxo de trabalho', description: 'Processo e etapas', category: 'Nuvem e armazenamento', Icon: Workflow },
  { key: 'shield-check', label: 'Proteção', description: 'Segurança e acesso autorizado', category: 'Nuvem e armazenamento', Icon: ShieldCheck },
  { key: 'rocket', label: 'Primeiro acesso', description: 'Início de configuração', category: 'Sistema e instalação', Icon: Rocket },
  { key: 'settings-2', label: 'Configurações', description: 'Parâmetros do sistema', category: 'Sistema e instalação', Icon: Settings2 },
  { key: 'save', label: 'Salvar', description: 'Gravar configurações', category: 'Sistema e instalação', Icon: Save },
  { key: 'refresh', label: 'Atualizar', description: 'Atualizar ou tentar novamente', category: 'Sistema e instalação', Icon: RefreshCw },
  { key: 'check-circle', label: 'Concluído', description: 'Etapa concluída', category: 'Sistema e instalação', Icon: CheckCircle2 },
  { key: 'help', label: 'Ajuda', description: 'Ajuda contextual', category: 'Sistema e instalação', Icon: CircleHelp },
  { key: 'bell', label: 'Notificação', description: 'Avisos do sistema', category: 'Sistema e instalação', Icon: Bell },
  { key: 'calendar', label: 'Agenda', description: 'Data e programação', category: 'Sistema e instalação', Icon: CalendarDays },
  { key: 'book-open', label: 'Manual', description: 'Instruções e documentação', category: 'Sistema e instalação', Icon: BookOpen },
  { key: 'clipboard-check', label: 'Conferência', description: 'Checklist e validação', category: 'Indústria e operações', Icon: ClipboardCheck },
  { key: 'clipboard-list', label: 'Lista de tarefas', description: 'Operações pendentes', category: 'Indústria e operações', Icon: ClipboardList },
  { key: 'boxes', label: 'Materiais', description: 'Conjunto de componentes', category: 'Indústria e operações', Icon: Boxes },
  { key: 'package', label: 'Produto', description: 'Item ou embalagem', category: 'Indústria e operações', Icon: Package },
  { key: 'activity', label: 'Atividade', description: 'Estado operacional', category: 'Indústria e operações', Icon: Activity },
  { key: 'chevron-right', label: 'Avançar', description: 'Próxima etapa ou nível', category: 'Sistema e instalação', Icon: ChevronRight },
]
const categories: ('Todas' | IconCategory)[] = ['Todas', 'Pastas e arquivos', 'Rede e conectividade', 'Nuvem e armazenamento', 'Sistema e instalação', 'Indústria e operações']

export default function BibliotecaIconesSYSNQRA() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number]>('Todas')
  const [copied, setCopied] = useState<string | null>(null)
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return iconEntries.filter(item => (category === 'Todas' || item.category === category) && (!query || [item.key, item.label, item.description, item.category].some(value => value.toLocaleLowerCase('pt-BR').includes(query))))
  }, [search, category])
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
    } catch {
      setCopied(null)
    }
  }

  return <main className="compras-page" aria-label="Biblioteca de Ícones SYSNQRA">
    <header className="compras-header">
      <div><span className="compras-eyebrow">SYSNQRA DESIGN SYSTEM</span><h1>Biblioteca de Ícones</h1><p>Ícones premium reutilizáveis para Configurações, pastas, rede, nuvem e operações industriais.</p></div>
      <div className="compras-header-actions"><span className="admin-global-count">{filtered.length} de {iconEntries.length} ícones</span></div>
    </header>
    <section className="compras-panel">
      <div className="compras-panel-heading"><div><h2>Encontre e reutilize</h2><p>Pesquise pelo nome, finalidade ou categoria. Selecione um cartão para copiar o nome do ícone ou o exemplo de uso.</p></div></div>
      <div className="synqra-icon-toolbar">
        <label className="synqra-icon-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar ícone, pasta, nuvem, servidor…" aria-label="Pesquisar ícones"/></label>
        <label className="synqra-icon-filter"><span>Categoria</span><select value={category} onChange={event => setCategory(event.target.value as (typeof categories)[number])}>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="synqra-icon-grid">
        {filtered.map(item => { const Icon = item.Icon; return <article className="synqra-icon-card" key={item.key}>
          <div className="synqra-icon-art"><Icon size={27} strokeWidth={1.8}/></div>
          <div className="synqra-icon-copy"><strong>{item.label}</strong><span>{item.description}</span><code>{item.key}</code><small>{item.category}</small></div>
          <div className="synqra-icon-actions">
            <button type="button" onClick={() => void copy(item.key, item.key)} aria-label={`Copiar nome de ${item.label}`}><Check size={13}/>{copied === item.key ? 'Copiado' : 'Copiar nome'}</button>
            <button type="button" onClick={() => void copy(`import { ${item.Icon.name} } from 'lucide-react'\n\n<${item.Icon.name} size={20} aria-hidden="true" />`, item.key + '-code')}>Copiar código</button>
          </div>
        </article> })}
      </div>
      {filtered.length === 0 && <div className="compras-empty"><Search size={22}/><strong>Nenhum ícone encontrado</strong><span>Altere o termo de busca ou selecione outra categoria.</span></div>}
    </section>
    <footer className="synqra-icon-footer">Padrão Premium SYSNQRA · Biblioteca visual reutilizável · Revisado em 28/10/2026</footer>
    <style>{`
      .synqra-icon-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(200px,280px);gap:12px;margin:0 0 16px}
      .synqra-icon-search,.synqra-icon-filter{display:flex;align-items:center;gap:9px;min-width:0;border:1px solid #d7e3e8;background:#fff;border-radius:8px;padding:0 12px;color:#2d8db8}
      .synqra-icon-search input,.synqra-icon-filter select{width:100%;min-width:0;height:40px;border:0;outline:none;background:transparent;color:#123b50;font-size:12px}
      .synqra-icon-filter span{font-size:10px;font-weight:800;text-transform:uppercase;white-space:nowrap;color:#64748b}
      .synqra-icon-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      .synqra-icon-card{display:flex;flex-direction:column;min-width:0;min-height:204px;border:1px solid #dbe5ea;border-radius:12px;background:linear-gradient(150deg,#fff 0%,#f6fbfd 100%);padding:14px;box-shadow:0 2px 7px #123b5008;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
      .synqra-icon-card:hover{transform:translateY(-2px);border-color:#48b7c7;box-shadow:0 8px 22px #123b5012}
      .synqra-icon-art{display:grid;place-items:center;width:48px;height:48px;border:1px solid #d4edf2;border-radius:13px;background:linear-gradient(145deg,#e8f8fb,#f8fdff);color:#2d8db8;margin-bottom:12px}
      .synqra-icon-copy{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1}
      .synqra-icon-copy strong{font-size:12px;color:#123b50}.synqra-icon-copy>span{font-size:10px;line-height:1.45;color:#64748b;min-height:29px}
      .synqra-icon-copy code{width:fit-content;max-width:100%;overflow-wrap:anywhere;background:#eef4f7;border-radius:4px;padding:3px 5px;color:#36576a;font-size:9px}
      .synqra-icon-copy small{font-size:9px;font-weight:700;color:#2d8db8}
      .synqra-icon-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
      .synqra-icon-actions button{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:28px;padding:0 7px;border:1px solid #d8e4e9;border-radius:6px;background:#fff;color:#123b50;font-size:9px;font-weight:800;cursor:pointer}
      .synqra-icon-actions button:hover{border-color:#f97316;color:#c65d00}
      .synqra-icon-footer{padding:7px 2px;color:#64748b;font-size:10px;font-weight:700;text-align:right}
      @media(max-width:1100px){.synqra-icon-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:760px){.synqra-icon-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.synqra-icon-toolbar{grid-template-columns:1fr}}
      @media(max-width:460px){.synqra-icon-grid{grid-template-columns:1fr}}
    `}</style>
  </main>
}
