import { useState } from 'react'
import { Bot, X, PlayCircle } from 'lucide-react'

type Props = { brand: string; name?: string }

/** Slot preparado para receber a arte e/ou vídeo aprovados do avatar. */
export default function VirtualGuide({ brand, name = 'Dri' }: Props) {
  const image = import.meta.env.VITE_VIRTUAL_GUIDE_IMAGE_URL as string | undefined
  const video = import.meta.env.VITE_VIRTUAL_GUIDE_VIDEO_URL as string | undefined
  const [open, setOpen] = useState(false)
  if (!image && !video) return null

  return <>
    <button type="button" aria-label={`Abrir ${name}, consultora virtual do ${brand}`} onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-[#d7bd7a] bg-[#103c46] px-4 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5">
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#c9a86a] text-[#082d35]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Bot size={18} />}</span>
      Fale com a {name}
    </button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-end bg-black/25 p-4 md:p-6" role="dialog" aria-modal="true" aria-label={`${name}, consultora virtual`}>
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e5e0d6] bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-[#103c46] px-5 py-4 text-white"><div><strong>{name} — Consultora Virtual</strong><p className="text-xs text-white/75">{brand}</p></div><button type="button" aria-label="Fechar consultora" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-white/10"><X size={20}/></button></header>
        {video ? <video className="aspect-video w-full bg-black object-cover" controls playsInline preload="metadata" src={video}/> : <div className="flex aspect-video items-center justify-center bg-[#f6f2e8]"><img src={image} alt={`${name}, consultora virtual do ${brand}`} className="h-full w-full object-cover"/></div>}
        <div className="p-5"><p className="text-sm leading-6 text-[#536b71]">Olá! Eu sou a {name}. Estou preparada para apresentar o {brand} e acompanhar você pelos principais módulos.</p><div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f6f2e8] px-3 py-2 text-xs font-bold text-[#103c46]"><PlayCircle size={16}/> Guia preparado para a demonstração</div></div>
      </section>
    </div>}
  </>
}
