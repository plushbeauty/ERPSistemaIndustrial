/**
 * @DATA_REVISAO: 2026-10-18
 * @ESCOPO: POP público de cadastro de empresa
 * @STATUS: DOCUMENTAÇÃO OPERACIONAL — homologação de backend pendente.
 */
import { ArrowLeft, Building2, CheckCircle2, FileText, KeyRound, ShieldAlert } from 'lucide-react'

const sectionTitle = 'flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-800'

export default function HelpCadastroEmpresa() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 font-sans text-[#123B50] antialiased sm:p-5">
      <article className="mx-auto max-w-3xl space-y-5 rounded border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <header className="space-y-1 border-b-2 border-slate-800 pb-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-teal-700">Onboarding · Procedimento operacional padrão</div>
          <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">POP-ADM-001 — Cadastro de empresa</h1>
          <p className="font-mono text-[10px] text-slate-500">Revisão: 2026-10-18 · Versão: 1.0 · Portal público de cadastro</p>
        </header>

        <section className="space-y-2">
          <h2 className={sectionTitle}><Building2 size={13} className="text-teal-700" /> 1. Objetivo</h2>
          <p className="pl-5 text-[11px] font-medium leading-relaxed text-slate-600">
            Orientar o preenchimento da solicitação de cadastro de uma organização e do primeiro administrador. O formulário envia os dados à Edge Function
            <code className="mx-1 rounded bg-slate-100 px-1">erp-company-signup</code>; o provisionamento ocorre no servidor, não diretamente no navegador.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className={sectionTitle}><FileText size={13} className="text-teal-700" /> 2. Preenchimento dos campos</h2>
          <ol className="list-decimal space-y-1.5 pl-9 text-[11px] font-medium leading-relaxed text-slate-600">
            <li>Informe a razão social e o nome fantasia conforme os dados oficiais da organização.</li>
            <li>Selecione o tipo de documento e informe todos os dígitos. A máscara visual não substitui validação fiscal.</li>
            <li>Informe o nome completo e um e-mail válido para o primeiro administrador.</li>
            <li>Crie uma senha com pelo menos oito caracteres e confirme-a. Não reutilize nem compartilhe senhas.</li>
            <li>Confira os dados antes de enviar. Em caso de falha, corrija o formulário ou acione o suporte; não repita várias vezes sem verificar se o cadastro anterior foi concluído.</li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className={sectionTitle}><KeyRound size={13} className="text-teal-700" /> 3. Nome de acesso</h2>
          <p className="pl-5 text-[11px] font-medium leading-relaxed text-slate-600">
            O nome mostrado no formulário é derivado da primeira palavra do nome fantasia (ou da razão social). Confirme que esse identificador é adequado antes de enviar. Sua unicidade e a forma de autenticação devem ser confirmadas no fluxo real de login.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className={sectionTitle}><ShieldAlert size={13} className="text-amber-700" /> 4. Segurança e limites conhecidos</h2>
          <div className="ml-5 space-y-2 rounded border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium leading-relaxed text-amber-950">
            <p>• O formulário público não deve ser considerado uma tela de criação de usuário Master global. A Edge Function revisada cria o primeiro usuário como administrador da empresa (perfil ADMIN, nível 1, is_master=false).</p>
            <p>• A Edge Function atualmente grava o documento na coluna <code>erp_empresas.cnpj</code>, mesmo quando o formulário envia tipo CPF. Não use CPF até que o contrato do banco e a validação fiscal sejam corrigidos e homologados.</p>
            <p>• O código atual da Edge Function define o plano inicial como Essencial e não persiste o módulo recebido. O plano exibido por parâmetro na URL ainda não comprova contratação nem alteração do plano armazenado.</p>
            <p>• A função usa credencial privilegiada apenas no servidor. Nunca coloque service-role key no frontend. O endpoint público precisa de controles contra abuso, duplicidade concorrente e automação maliciosa antes de ser considerado pronto para produção.</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className={sectionTitle}><CheckCircle2 size={13} className="text-teal-700" /> 5. Critério de conclusão</h2>
          <p className="pl-5 text-[11px] font-medium leading-relaxed text-slate-600">
            Considere a solicitação concluída somente quando o servidor retornar sucesso e a organização e o usuário estiverem presentes no banco com os vínculos esperados. A confirmação visual no navegador, isoladamente, não substitui a verificação de banco e de acesso.
          </p>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <a href="/cadastro-empresa" className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={12} /> Voltar ao cadastro</a>
          <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400">SYSNQRA · Documentação de suporte</span>
        </footer>
      </article>
    </main>
  )
}
