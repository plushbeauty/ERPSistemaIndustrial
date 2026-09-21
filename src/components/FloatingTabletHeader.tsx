import { useEffect, useState } from 'react'
import { Accessibility, ArrowLeft, Monitor, Moon, Sun } from 'lucide-react'

export interface FloatingTabletHeaderProps {
  title?: string
  subtitle?: string
  onBack?: () => void
  onTablet?: () => void
}

export default function FloatingTabletHeader({ title = 'SGQ ERP Industrial', subtitle = 'PCP Brasil • Chão de fábrica', onBack, onTablet }: FloatingTabletHeaderProps) {
  const [brightness, setBrightness] = useState(100)
  const [largeText, setLargeText] = useState(false)
  useEffect(() => {
    document.documentElement.style.setProperty('--erp-brightness', brightness + '%')
    document.documentElement.classList.toggle('erp-a11y-large', largeText)
    return () => { document.documentElement.style.removeProperty('--erp-brightness'); document.documentElement.classList.remove('erp-a11y-large') }
  }, [brightness, largeText])
  return <header className="erp-tablet-header">
    <div className="erp-tablet-brand">
      {onBack && <button type="button" className="erp-icon-button" onClick={onBack} aria-label="Voltar"><ArrowLeft size={18}/></button>}
      <img src="/logo-industrial.svg" alt="SGQ ERP"/>
      <div><strong>{title}</strong><span>{subtitle}</span></div>
    </div>
    <div className="erp-header-controls">
      <button type="button" className="erp-icon-button" onClick={() => setBrightness(v => v >= 120 ? 90 : v + 10)} aria-label="Ajustar iluminação" title={"Iluminação " + brightness + "%"}>{brightness >= 110 ? <Sun size={18}/> : <Moon size={18}/>}<span>{brightness}%</span></button>
      <button type="button" className={"erp-icon-button" + (largeText ? " active" : "")} onClick={() => setLargeText(v => !v)} aria-pressed={largeText} aria-label="Texto maior"><Accessibility size={18}/></button>
      <button type="button" className="erp-tablet-button" onClick={onTablet}><Monitor size={19}/> TABLET</button>
    </div>
  </header>
}
