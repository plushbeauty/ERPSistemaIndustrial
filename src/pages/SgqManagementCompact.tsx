import { useLocation, useNavigate } from 'react-router-dom'
import { ClipboardCheck, GitBranch, ListChecks, ShieldCheck } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import CompactButton from '../components/ui/CompactButton'
import QualidadeSGQAvancado from './QualidadeSGQAvancado'

const links = [
  ['/vendas/sgq','RNC / QMS',ClipboardCheck],
  ['/qualidade/metodologia-8d','8D / CAPA',ListChecks],
  ['/qualidade/pfmea','PFMEA / RISCO',ShieldCheck],
  ['/qualidade/documentos','DOCUMENTOS',GitBranch],
] as const

export default function SgqManagementCompact() {
  const location = useLocation()
  const navigate = useNavigate()
  return <main className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
    <ERPHeader />
    <div className="border-b border-slate-200 bg-white px-2 py-1">
      <nav className="flex min-h-[30px] items-center gap-1 overflow-x-auto" aria-label="Submódulos SGQ">
        {links.map(([href,label,Icon]) => <CompactButton key={href} type="button" tone={location.pathname === href ? 'primary' : 'default'} onClick={() => navigate(href)} title={label}><Icon size={12}/>{label}</CompactButton>)}
      </nav>
    </div>
    <QualidadeSGQAvancado />
  </main>
}