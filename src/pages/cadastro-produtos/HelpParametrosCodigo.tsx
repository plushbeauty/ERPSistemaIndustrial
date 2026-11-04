/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-03
 * @REVISAO: REV-CONTRATO-BANCO-20261103-01 — nomes citados na tela passaram a ser a rotina real erp_gerar_codigo
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-18
 * @STATUS_ANTERIOR: POP-AJUDA-PARAMETROS-CODIGO-OK
 * POP-ENG-009 — procedimento operacional para parâmetros de codificação de SKU.
 */
import { ArrowLeft, Hash, ShieldCheck, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HelpParametrosCodigo() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 font-sans text-xs leading-relaxed text-[#123B50]">
      <article className="mx-auto max-w-3xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <header className="flex items-start justify-between gap-3 border-b-2 border-[#123B50] pb-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-teal-700">Governança de cadastros mestres</p>
            <h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-ENG-009 — Parâmetros e máscara de SKU</h1>
            <p className="mt-1 text-[10px] text-slate-500">Procedimento operacional • Revisão 2026-10-18</p>
          </div>
          <Settings2 size={22} className="shrink-0 text-teal-700" />
        </header>

        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-800"><Hash size={13} className="text-teal-700" /> 1. Campos da regra</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li><strong>Prefixo:</strong> sigla de 1 a 8 caracteres entre A-Z e 0-9 que identifica a família do código. A tela grava em maiúsculas.</li>
            <li><strong>Separador:</strong> até dois caracteres colocados entre o prefixo e o resto do SKU. Deixe vazio para código contínuo.</li>
            <li><strong>Modo:</strong> <strong>PS</strong> monta prefixo + separador + sigla do tipo (PA, MP, SA, IN) + sequência; <strong>NUM</strong> monta prefixo + separador + sequência, sem sigla; <strong>PGR</strong> está bloqueado porque não existe cadastro de grupo de produto vinculado à regra.</li>
            <li><strong>Dígitos:</strong> largura numérica de 3 a 6 posições. O valor exibido não altera retroativamente SKUs já emitidos.</li>
            <li><strong>Sequência atual:</strong> contador do banco, incrementado pela rotina <code>erp_gerar_codigo</code> a cada SKU emitido; esta tela não permite editá-lo diretamente.</li>
            <li><strong>Prévia do próximo SKU:</strong> exatamente a composição que a rotina aplica ao prefixo, separador, modo, sigla PA e sequência + 1.</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-800"><ShieldCheck size={13} className="text-emerald-700" /> 2. Gravação segura</h2>
          <ol className="list-decimal space-y-1 pl-5 text-slate-600">
            <li>Confirme que a empresa autenticada é a correta antes de alterar parâmetros.</li>
            <li>Edite os campos na linha desejada e clique em <strong>Salvar</strong> nessa mesma linha.</li>
            <li>Aguarde a confirmação. Se houver erro de validação, permissão ou banco, a mensagem será apresentada na tela.</li>
            <li>Use <strong>Atualizar</strong> para recarregar o valor persistido no banco após salvar.</li>
          </ol>
        </section>

        <aside className="rounded border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">
          <strong>Controle de mudança:</strong> valide o comportamento das rotinas/triggers que consomem `erp_codigos` antes de alterar convenções usadas em produção. A política RLS do Supabase permanece responsável pela autorização; a filtragem por empresa na interface não a substitui.
        </aside>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">ERP Industrial • Engenharia de dados mestres</span>
          <Link to="/cadastro-produtos/parametros-codigo" className="inline-flex h-8 items-center gap-1 rounded bg-[#123B50] px-3 text-[10px] font-bold text-white hover:bg-[#1c536d]"><ArrowLeft size={12} /> Voltar aos parâmetros</Link>
        </footer>
      </article>
    </main>
  )
}
