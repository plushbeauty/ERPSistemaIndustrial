/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @STATUS_APROVACAO: POP-AJUDA-CADASTRO-SKU-OK
 * @ESCOPO: Manual de conformidade do Cadastro Mestre de Itens.
 */
import { Box, ShieldCheck, Layers } from 'lucide-react'

export default function HelpListagemProdutos() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] p-4 text-[#123B50] font-sans antialiased text-xs leading-relaxed">
      <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="border-b-2 border-slate-800 pb-2">
          <span className="block text-[8px] font-black uppercase tracking-widest text-teal-700">SGQ • Manual de Processo de Engenharia</span>
          <h1 className="mt-1 text-sm font-black uppercase text-slate-900">POP-ENG-001: Abertura de Cadastro Mestre de Itens</h1>
        </header>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Layers size={12} className="text-teal-700" /> 1. Estrutura relacional e unidade de medida</h2>
          <p className="pl-4 font-medium text-slate-600">O cadastro mestre de produtos é uma referência central para estoque, compras e produção. Defina a unidade de medida conforme o padrão aprovado pela empresa e valide as conversões usadas nas compras, no consumo e nas listas de materiais (BOM). Não presuma conversões automáticas sem configuração e validação no sistema.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><ShieldCheck size={12} className="text-emerald-700" /> 2. Geração de Part Number / SKU</h2>
          <p className="pl-4 font-medium text-slate-600">Para cadastrar um item, selecione uma regra de numeração válida e a sigla correspondente ao tipo de material. A geração deve ocorrer pela rotina transacional configurada no banco de dados. Em caso de falha, não invente nem reutilize um código manualmente: encaminhe o erro para a administração do sistema.</p>
        </section>
        <section className="space-y-1.5">
          <h2 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-800"><Box size={12} className="text-sky-700" /> 3. Conferência antes de gravar</h2>
          <ul className="list-disc space-y-1 pl-8 font-medium text-slate-600">
            <li>Verifique nome, categoria, unidade de medida e cliente de destino.</li>
            <li>Confirme a empresa ativa e a situação do item.</li>
            <li>Ao editar, confira se o registro selecionado corresponde ao SKU desejado.</li>
            <li>Após salvar, confirme a mensagem de sucesso e a presença do item na listagem.</li>
          </ul>
        </section>
        <footer className="border-t pt-2 text-center text-[8px] font-mono uppercase tracking-widest text-slate-400">SYNQRA ERP • Padrões de Dados Mestres • Revisão 2026-10-19</footer>
      </div>
    </main>
  )
}
