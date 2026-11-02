/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-18
 * @STATUS_ANTERIOR: POP-AJUDA-BACKUPS-OPERACAO-OK
 */
import { ArrowLeft, DatabaseBackup, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HelpBackups() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 font-sans text-xs leading-relaxed text-[#123B50]">
      <article className="mx-auto max-w-3xl space-y-4 rounded-[2px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <header className="border-b-2 border-[#123B50] pb-3">
          <span className="block text-[9px] font-black uppercase tracking-[.16em] text-teal-700">POP • Administração e continuidade</span>
          <h1 className="mt-1 text-base font-black uppercase">POP-ADM-088 — Consulta e governança de backups</h1>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">Revisão: 18/10/2026 • Uso técnico e administrativo</p>
        </header>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase"><DatabaseBackup size={14} className="text-sky-700" /> 1. Consultar o histórico</h2>
          <p className="pl-5 text-slate-600">Abra Administração → Backups. A tela resolve a empresa da sessão autenticada e filtra os logs pelo identificador da empresa. Use a pesquisa para localizar tipo, status, responsável ou hash; atualize antes de registrar uma ocorrência.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase"><ShieldCheck size={14} className="text-emerald-700" /> 2. Interpretar os indicadores</h2>
          <p className="pl-5 text-slate-600">Os totais são calculados exclusivamente sobre os registros retornados. Status concluído ou sucesso são contabilizados como conclusão; falha ou erro são contabilizados como falha. Tamanho e hash dependem dos dados gravados pelo processo responsável.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase"><TriangleAlert size={14} className="text-amber-700" /> 3. Limites e segurança</h2>
          <p className="pl-5 text-slate-600">Um log não comprova, por si só, que o arquivo físico pode ser restaurado. Não declare retenção, criptografia, integridade criptográfica ou sucesso de restauração sem evidências do servidor e testes documentados. Erros de tabela, RPC, sessão ou RLS devem ser encaminhados à administração técnica; não desative políticas RLS para contornar falhas.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="text-[11px] font-black uppercase">4. Execução manual</h2>
          <p className="pl-5 text-slate-600">O disparo manual fica bloqueado até a equipe validar a função de servidor autorizada, os parâmetros de empresa, o armazenamento de destino, o log de auditoria e o procedimento de restauração. Não crie uma RPC presumida nem informe sucesso sem confirmação transacional.</p>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[9px] font-mono text-slate-500">
          <span>SYNQRA ERP • POP-ADM-088</span>
          <Link to="/configuracoes-adm" className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-slate-300 px-2 font-sans font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={12} /> Voltar à administração</Link>
        </footer>
      </article>
    </main>
  )
}
