import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { loadIndustrialFallbackImage } from '../lib/sysnqraFileManager'

type Props = {
  src: string | null
  companyId: string
  filename: string
  folder?: 'produtos' | 'fichas-processo' | 'desenhos-tecnicos' | 'fotos' | 'imagens'
  permissionModule?: 'vendas' | 'pcp'
  alt: string
  className?: string
  showPlaceholder?: boolean
}

export default function IndustrialFileImage({
  src,
  companyId,
  filename,
  folder = 'produtos',
  permissionModule = 'vendas',
  alt,
  className = 'h-full w-full object-contain',
  showPlaceholder = false,
}: Props) {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [triedFallback, setTriedFallback] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setFallbackUrl(null)
    setTriedFallback(false)

    const load = async () => {
      if (src || !companyId || !filename) return
      setTriedFallback(true)
      objectUrl = await loadIndustrialFallbackImage(companyId, folder, filename, permissionModule)
      if (active) setFallbackUrl(objectUrl)
      else if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    void load()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, companyId, filename, folder, permissionModule])

  async function tryFallback() {
    if (triedFallback || !companyId || !filename) return
    setTriedFallback(true)
    const objectUrl = await loadIndustrialFallbackImage(companyId, folder, filename)
    if (objectUrl) setFallbackUrl(objectUrl)
  }

  useEffect(() => () => {
    if (fallbackUrl) URL.revokeObjectURL(fallbackUrl)
  }, [fallbackUrl])

  const imageUrl = fallbackUrl || src
  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={className} onError={() => {
      if (fallbackUrl) {
        URL.revokeObjectURL(fallbackUrl)
        setFallbackUrl(null)
      } else {
        void tryFallback()
      }
    }} />
  }
  if (!showPlaceholder) return null
  return <div className="flex h-full w-full flex-col items-center justify-center text-center text-[9px] text-slate-400" aria-label="Imagem não localizada">
    <ShoppingBag size={28} className="mb-1 opacity-40" />
    {triedFallback ? 'Sem imagem' : 'Buscando arquivo…'}
  </div>
}
