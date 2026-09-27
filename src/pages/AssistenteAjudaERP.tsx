import { useState } from 'react';
import { HelpCircle, Send, ShieldCheck, Cpu, ShoppingCart, Wrench, Printer } from 'lucide-react';

interface IMensagemChat {
  emissor: 'usuario' | 'ia';
  texto: string;
}

export default function AssistenteAjudaERP() {
  const [mensagens, setMensagens] = useState<IMensagemChat[]>([
    {
      emissor: 'ia',
      texto:
        'Olá! Sou o Assistente de IA do seu ERP Industrial. Selecione ou digite qual procedimento (Vendas, PCP, Calibração, Ficha de Processo, Laudo de Liberação ou Manutenção) você deseja consultar que eu te explico o preenchimento campo por campo!',
    },
  ]);
  const [input, setInput] = useState('');

  const processarDuvidaDoProcedimento = () => {
    if (!input.trim()) return;

    const novaMensagemUsuario: IMensagemChat = { emissor: 'usuario', texto: input };
    setMensagens((prev) => [...prev, novaMensagemUsuario]);
    const busca = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    setInput('');

    let resposta =
      'Desculpe, não localizei este procedimento específico no POP-SGQ-012. Tente pesquisar por Vendas, PCP, Calibração, Ficha de Processo, Laudo de Liberação ou Manutenção.';

    if (busca.includes('venda') || busca.includes('pedido') || busca.includes('carteira')) {
      resposta =
        "🛍️ [INSTRUÇÃO OPERACIONAL - SETOR COMERCIAL VENDAS]\n\n• CAMPO NOVO PEDIDO: Insira os dados ou utilize o fluxo de importação disponível no ERP para ler o pedido. Linhas VERDES representam disponibilidade real; linhas LARANJAS indicam necessidade de atendimento pelo PCP conforme as regras implementadas.\n\n• CARTEIRA DE PEDIDOS: Utilize o painel touch para acompanhar os pedidos e seus status reais.";
    } else if (busca.includes('calibracao') || busca.includes('paquimetro') || busca.includes('instrumento') || busca.includes('rbc')) {
      resposta =
        '📐 [INSTRUÇÃO OPERACIONAL - SETOR QUALIDADE METROLOGIA]\n\n• CAMPO Nº CERTIFICADO RBC: Digite o código alfanumérico do certificado emitido pelo laboratório.\n\n• DATA DO ENSAIO: Registre a data efetiva do ensaio.\n\n• PRÓXIMA CALIBRAÇÃO (VALIDADE): Registre a data limite. Instrumento vencido deve ser tratado como bloqueado somente quando o enforcement correspondente estiver ativo no banco/fluxo operacional.';
    } else if (busca.includes('ficha') || busca.includes('processo')) {
      resposta =
        '⚙️ [INSTRUÇÃO OPERACIONAL - SETOR ENGENHARIA PCP]\n\n• CAMPO PRODUTO E MOLDE: Utilize os localizadores para selecionar registros reais do Supabase.\n\n• PARÂMETROS TÉRMICOS: Registre força/pressão em BAR e temperaturas das zonas 1 a 4 como parâmetros estruturados da receita.\n\n• EMBALAGEM: Defina o modelo de caixa e o empilhamento máximo.';
    } else if (busca.includes('laudo') || busca.includes('liberacao') || busca.includes('embalagem')) {
      resposta =
        '🛡️ [INSTRUÇÃO OPERACIONAL - SETOR GESTÃO DA QUALIDADE SGQ]\n\n• CAMPO ROMANEIO EXPEDIÇÃO: Utilize a seleção por registro real.\n\n• CHECKLIST: Cada item inspecionado deve receber resultado conforme ou não conforme.\n\n• LOTE RETIDO: O bloqueio físico/logístico deve permanecer ativo conforme as regras de qualidade implementadas. O bloqueio de faturamento/NF-e somente deve ser informado como ativo quando existir enforcement real no fluxo fiscal.';
    } else if (busca.includes('manutencao') || busca.includes('tpm') || busca.includes('os')) {
      resposta =
        '🛠️ [INSTRUÇÃO OPERACIONAL - SETOR MANUTENÇÃO INDUSTRIAL TPM]\n\n• FILA DE CHAMADOS: Selecione a O.S. correspondente ao contexto real de falha.\n\n• LAUDO TÉCNICO: Registre causa raiz, diagnóstico e solução. Componentes devem ser selecionados por registros reais e a baixa de estoque somente deve ser considerada concluída quando persistida no estoque.\n\n• FINALIZAÇÃO: A liberação da máquina depende da regra efetivamente implementada no sistema.';
    } else if (busca.includes('roteirizacao') || busca.includes('caminhao') || busca.includes('peso')) {
      resposta =
        '🚚 [INSTRUÇÃO OPERACIONAL - SETOR LOGÍSTICA EXPEDIÇÃO]\n\n• CAPACIDADE VEÍCULO: Utilize a capacidade cadastrada do veículo.\n\n• CARGA: Valide o peso acumulado contra a capacidade e bloqueie a liberação quando houver excesso ou pendência conforme as regras efetivamente implementadas.';
    }

    setMensagens((prev) => [...prev, { emissor: 'ia', texto: resposta }]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-slate-900 font-sans print:border-none print:shadow-none print:p-0">
      <div className="flex justify-between items-start gap-4 border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-blue-600 h-6 w-6 print:hidden" />
          <h2 className="text-xl font-bold text-slate-950 uppercase tracking-tight print:text-black print:text-lg print:font-black">
            🧠 CENTRAL DE COMPLIANCE E INSTRUÇÃO OPERACIONAL (POP-SGQ-012)
          </h2>
        </div>

        <div className="hidden print:block border-2 border-dashed border-slate-600 p-3 text-center text-xs font-black text-slate-700 bg-slate-50 uppercase rounded-md tracking-wider leading-relaxed">
          ⚠️ CÓPIA NÃO CONTROLADA<br />
          APENAS PARA CONSULTA LOCAL
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 px-4 rounded-md shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer print:hidden"
        >
          <Printer className="h-4 w-4 text-blue-400" /> IMPRIMIR INSTRUÇÃO DA TELA
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 print:hidden">
        <button type="button" onClick={() => setInput('Como preencher Ficha de Processo?')} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><Cpu className="h-4 w-4 text-blue-600" /> PCP ENGENHARIA</button>
        <button type="button" onClick={() => setInput('Como funciona o laudo de liberação?')} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> QUALITY INSPECTION</button>
        <button type="button" onClick={() => setInput('Como lançar Pedido de Venda?')} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><ShoppingCart className="h-4 w-4 text-amber-600" /> COMERCIAL B2B</button>
        <button type="button" onClick={() => setInput('Como fechar Ordem de Serviço TPM?')} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><Wrench className="h-4 w-4 text-slate-600" /> MANUTENÇÃO TPM</button>
      </div>

      <div className="h-96 overflow-y-auto bg-slate-50 p-4 rounded-md border border-slate-200 space-y-3 mb-4 shadow-inner print:h-auto print:bg-white print:border-none print:shadow-none print:space-y-6">
        {mensagens.map((mensagem, index) => {
          if (mensagem.emissor === 'usuario') return null;
          return (
            <div key={index} className="p-4 rounded-lg bg-blue-50 text-slate-900 border border-blue-100 text-base font-medium whitespace-pre-line leading-relaxed print:bg-white print:border-b print:border-slate-300 print:rounded-none print:p-0 print:text-black print:text-sm">
              {mensagem.texto}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 h-[54px] print:hidden">
        <input type="text" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') processarDuvidaDoProcedimento(); }} placeholder="Digite a dúvida operacional para gerar o documento..." className="w-full px-4 text-base border border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-900 bg-white" />
        <button type="button" onClick={processarDuvidaDoProcedimento} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-sm px-6 rounded-md shadow-md flex items-center gap-1.5 cursor-pointer transition-colors">
          <Send className="h-4 w-4" /> ENVIAR DÚVIDA
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, sidebar, header, .print\\:hidden, button, input {
            display: none !important;
          }
          body, main, .max-w-4xl {
            background-color: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-slate-50, .bg-blue-50 {
            background-color: #ffffff !important;
            border: none !important;
          }
        }
      ` }} />
    </div>
  );
}
