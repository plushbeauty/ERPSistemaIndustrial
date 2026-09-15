import { ArrowRight, Factory, ShieldCheck, Sparkles } from 'lucide-react'

const visuals = [
  { src: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=82', alt: 'Profissional trabalhando em ambiente industrial', title: 'Chão de fábrica conectado' },
  { src: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=82', alt: 'Operação e tecnologia industrial', title: 'Processos e tecnologia' },
  { src: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=900&q=82', alt: 'Ambiente de produção industrial', title: 'Produção com rastreabilidade' },
]

export default function IndustrialVisualShowcase() {
  return <section className="industrial-visual-showcase">
    <div className="industrial-visual-inner">
      <div className="industrial-visual-copy">
        <span className="industrial-visual-kicker"><Sparkles size={14}/> OPERAÇÃO REAL</span>
        <h2>ERP para quem precisa enxergar a fábrica inteira.</h2>
        <p>Uma camada visual mais humana para apresentar o SGQ ERP sem perder o foco industrial: produção, qualidade, materiais, manutenção e gestão no mesmo fluxo.</p>
        <div className="industrial-visual-trust"><span><Factory size={16}/> Produção e PCP</span><span><ShieldCheck size={16}/> Qualidade e rastreabilidade</span></div>
        <a href="/cadastro-empresa" className="industrial-visual-cta">Conhecer o ERP <ArrowRight size={16}/></a>
      </div>
      <div className="industrial-visual-grid">{visuals.map(v=><figure key={v.src}><img src={v.src} alt={v.alt} loading="lazy"/><figcaption>{v.title}</figcaption></figure>)}</div>
    </div>
  </section>
}
