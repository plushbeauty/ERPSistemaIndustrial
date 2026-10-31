import type { ReactNode } from 'react'

export type PageIntro = {
  module?: string
  title: string
  description: string
}

export default function PageIntroCard({ module, title, description }: PageIntro): ReactNode {
  return (
    <section className="page-intro-card" aria-label={`Abertura: ${title}`}>
      {module && <span className="page-intro-module">{module}</span>}
      <h1>{title}</h1>
      <p>{description}</p>
      <style>{`
        .page-intro-card{width:100%;margin:0 0 10px;padding:14px 18px;background:linear-gradient(110deg,#123b50 0%,#194b63 100%);border:1px solid #2d6178;border-radius:4px;color:#f4fbfd;box-shadow:0 2px 7px rgba(18,59,80,.12)}
        .page-intro-module{display:block;margin-bottom:5px;color:#9edce5;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
        .page-intro-card h1{margin:0;color:#fff;font-size:17px;font-weight:800;line-height:1.25}
        .page-intro-card p{margin:5px 0 0;color:#d5e8ef;font-size:11px;line-height:1.45}
      `}</style>
    </section>
  )
}
