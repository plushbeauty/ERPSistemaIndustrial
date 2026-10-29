import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle, FileText, Image as ImageIcon, Upload, X } from 'lucide-react'

interface DragDropEvidenciasProps {
  onArquivosAlterados: (arquivos: File[]) => void
  maxFileSizeBytes?: number
}

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'])

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLocaleLowerCase('pt-BR') ?? ''
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} Bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DragDropEvidencias({ onArquivosAlterados, maxFileSizeBytes = MAX_FILE_SIZE }: DragDropEvidenciasProps) {
  const [arquivos, setArquivos] = useState<File[]>([])
  const [estaArrastando, setEstaArrastando] = useState(false)
  const [avisos, setAvisos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const publicar = (lista: File[]) => {
    setArquivos(lista)
    onArquivosAlterados(lista)
  }

  const adicionarArquivos = (files: FileList | null) => {
    if (!files) return
    const avisosNovos: string[] = []
    const lista = [...arquivos]
    for (const arquivo of Array.from(files)) {
      const ext = extensionOf(arquivo.name)
      if (!ACCEPTED_EXTENSIONS.has(ext)) {
        avisosNovos.push(`${arquivo.name}: formato não permitido.`)
        continue
      }
      if (arquivo.size > maxFileSizeBytes) {
        avisosNovos.push(`${arquivo.name}: excede o limite de ${formatarTamanho(maxFileSizeBytes)}.`)
        continue
      }
      const duplicado = lista.some(item => item.name === arquivo.name && item.size === arquivo.size && item.lastModified === arquivo.lastModified)
      if (!duplicado) lista.push(arquivo)
    }
    setAvisos(avisosNovos)
    publicar(lista)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removerArquivo = (index: number) => publicar(arquivos.filter((_, i) => i !== index))

  return (
    <section className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onDragOver={event => { event.preventDefault(); setEstaArrastando(true) }}
        onDragLeave={event => { event.preventDefault(); setEstaArrastando(false) }}
        onDrop={event => { event.preventDefault(); setEstaArrastando(false); adicionarArquivos(event.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click() } }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${estaArrastando ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:border-sky-400'}`}
      >
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={event => adicionarArquivos(event.target.files)} className="hidden" />
        <Upload className={`mx-auto mb-2 h-8 w-8 ${estaArrastando ? 'text-sky-600' : 'text-slate-400'}`} />
        <p className="text-sm font-semibold text-slate-800">{estaArrastando ? 'Solte os arquivos aqui' : 'Arraste as evidências ou clique para selecionar'}</p>
        <p className="mt-1 text-xs text-slate-500">PDF, Excel, Word, PNG e JPEG · até {formatarTamanho(maxFileSizeBytes)} por arquivo</p>
      </div>

      {avisos.length > 0 && <div role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{avisos.map((aviso, index) => <p key={index} className="flex gap-2"><AlertCircle size={14} className="shrink-0" />{aviso}</p>)}</div>}

      {arquivos.length > 0 && <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-600"><CheckCircle size={14} className="text-emerald-600" /> Fila de evidências ({arquivos.length})</div>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {arquivos.map((arquivo, index) => <div key={`${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
            {arquivo.type.startsWith('image/') ? <ImageIcon size={16} className="shrink-0 text-emerald-600" /> : <FileText size={16} className="shrink-0 text-rose-600" />}
            <div className="min-w-0 flex-1"><p className="truncate font-mono text-xs text-slate-800">{arquivo.name}</p><p className="text-[10px] text-slate-500">{formatarTamanho(arquivo.size)}</p></div>
            <button type="button" aria-label={`Remover ${arquivo.name}`} onClick={event => { event.stopPropagation(); removerArquivo(index) }} className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-red-600"><X size={16} /></button>
          </div>)}
        </div>
      </div>}
    </section>
  )
}
