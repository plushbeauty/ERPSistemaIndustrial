/*
 * REVISÃO TÉCNICA: 16/10/2026
 * Revisado: interface compacta e comunicação explícita de que backup/restauração reais não são executados por esta tela.
 * Não validado nesta revisão: existência de rotina operacional de backup, retenção, restauração testada, type-check/build.
 */
import { AlertTriangle, DatabaseBackup, ShieldCheck } from 'lucide-react'

export default function ConfiguracaoBackups() {
  return <section className="space-y-2 text-[10px] text-slate-700">
    <header className="border-b border-[#CFE1E7] pb-2"><div className="text-[9px] font-bold uppercase tracking-wider text-[#176487]">SEGURANÇA / CONTINUIDADE</div><h2 className="mt-1 text-[15px] font-bold text-[#123B50]">Backups e recuperação</h2><p className="mt-1 text-[10px] text-slate-500">Informações operacionais sem simular execução de backup.</p></header>
    <div className="grid gap-2 md:grid-cols-2">
      <article className="border border-[#CFE1E7] bg-white p-3"><div className="flex items-center gap-2 text-[#123B50]"><DatabaseBackup size={16}/><h3 className="text-[11px] font-bold">Backup do PostgreSQL</h3></div><p className="mt-2 leading-5 text-slate-600">A execução e a retenção dependem do plano e da infraestrutura Supabase. Esta página não possui credencial nem endpoint confirmado para executar backup físico.</p></article>
      <article className="border border-[#CFE1E7] bg-white p-3"><div className="flex items-center gap-2 text-[#123B50]"><ShieldCheck size={16}/><h3 className="text-[11px] font-bold">Recuperação e continuidade</h3></div><p className="mt-2 leading-5 text-slate-600">A recuperação precisa ser comprovada por procedimento e teste de restauração. Não há execução ou sucesso afirmado nesta tela.</p><div className="mt-2 flex items-start gap-2 border border-[#E8D6AD] bg-[#FFFDF5] p-2 text-[9px] text-[#7A581C]"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>Próximo passo: documentar retenção, responsáveis, RPO/RTO e evidência de restore do ambiente.</div></article>
    </div>
  </section>
}
