import { Link } from 'react-router-dom'
import '../../styles/quality-workspace-standard.css'
import { Tablet } from 'lucide-react'

export default function QualitySidebar({ active }: { active: string }) {
  return (
    <nav aria-label="Menu da qualidade" className="flex min-w-0 items-center border border-slate-200 bg-white px-2 py-1">
      <Link
        to="/qualidade/tablet"
        aria-current={active === '/qualidade/tablet' ? 'page' : undefined}
        className={`inline-flex min-h-[30px] items-center gap-2 rounded-[2px] border px-3 text-[10px] font-extrabold uppercase tracking-wide transition-colors ${
          active === '/qualidade/tablet'
            ? 'border-[#2D8DB8] bg-[#123B50] text-white'
            : 'border-slate-200 bg-[#F4FBFD] text-[#123B50] hover:border-[#2D8DB8] hover:bg-[#E5F3F8]'
        }`}
      >
        <Tablet size={16} className="shrink-0" />
        QUALIDADE TABLET
      </Link>
    </nav>
  )
}
