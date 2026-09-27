import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Emissor = "usuario" | "ia";
interface IMensagem { emissor: Emissor; texto: string; }

const respostas: Array<{ termos: string[]; texto: string }> = [
  { termos: ["venda","pedido","outlook","xml"], texto: "🛍️ VENDAS: informe o cliente ou importe o pedido real. O fluxo de reserva deve usar dados cadastrados no ERP; não há dados fictícios." },
  { termos: ["calibracao","paquimetro","instrumento","rbc","vencido"], texto: "📐 CALIBRAÇÃO: o Nº CERTIFICADO RBC deve corresponder ao laudo do laboratório. Informe DATA DO ENSAIO e PRÓXIMA CALIBRAÇÃO. Instrumento vencido deve ficar bloqueado para uso no tablet quando essa trava estiver aplicada no banco." },
  { termos: ["ficha","processo","produto","molde","ferramental","temperatura","forca"], texto: "⚙️ FICHA DE PROCESSO: Produto Mestre e Ferramental/Molde devem ser selecionados por Lupa a partir de registros reais. Forças e temperaturas das zonas 1 a 4 são parâmetros estruturados da receita; a embalagem deve registrar caixa e empilhamento permitido." },
  { termos: ["laudo","liberacao","embalagem","lote","palete","retido"], texto: "🛡️ LIBERAÇÃO DE LOTE: cada item do checklist do palete deve ser inspecionado. Lote retido deve permanecer bloqueado para expedição. A trava fiscal só deve ser considerada ativa quando existir enforcement real no fluxo de faturamento." },
  { termos: ["manutencao","tpm","ordem de servico","os","componente","mttr"], texto: "🛠️ MANUTENÇÃO TPM: selecione a O.S., registre causa/solução e lance componentes por registro real. A baixa deve ocorrer no estoque real. Ao finalizar, o MTTR deve ser calculado e a máquina liberada somente pela regra efetivamente implementada." },
  { termos: ["roteirizacao","caminhao","peso","expedicao"], texto: "🚚 ROTEIRIZAÇÃO: selecione veículo e cargas reais e valide capacidade, peso e pendências antes da liberação." },
  { termos: ["pcp","tablet","operador","refugo"], texto: "🏭 PCP/TABLET: o operador registra produção real e, havendo defeito, informa obrigatoriamente o motivo. Instrumentos vencidos não devem ser aceitos quando a trava de calibração estiver ativa." },
];

function responder(pergunta: string): string {
  const texto = pergunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return respostas.find((item) => item.termos.some((termo) => texto.includes(termo)))?.texto
    ?? "Não encontrei essa orientação. Tente Vendas, Calibração, Ficha de Processo, Liberação de Lote, Manutenção TPM, Roteirização ou PCP.";
}

export default function AssistenteAjudaERP() {
  const [searchParams] = useSearchParams();
  const [mensagens, setMensagens] = useState<IMensagem[]>([
    { emissor: "ia", texto: "Olá! Sou o Assistente Virtual do ERP Industrial. Posso orientar os procedimentos do POP-SGQ-012." },
  ]);
  const [input, setInput] = useState(() => searchParams.get("busca") ?? "");

  const sugestoes = useMemo(() => [
    "Como preencher calibração?",
    "Como preencher ficha de processo?",
    "Como funciona o laudo de liberação?",
    "Como fechar ordem de serviço TPM?",
    "Como funciona a roteirização?",
  ], []);

  const enviar = () => {
    const pergunta = input.trim();
    if (!pergunta) return;
    setMensagens((atual) => [...atual, { emissor: "usuario", texto: pergunta }, { emissor: "ia", texto: responder(pergunta) }]);
    setInput("");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-slate-600">ERP Industrial</p>
            <h1 className="text-xl font-black text-slate-950">Central de Ajuda & Inteligência do Sistema</h1>
          </div>
        </header>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          {sugestoes.map((sugestao) => <button key={sugestao} type="button" onClick={() => setInput(sugestao)} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-slate-900">{sugestao}</button>)}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 md:p-6">
          {mensagens.map((mensagem, index) => <div key={index} className={`max-w-[88%] rounded-lg p-4 text-base font-medium leading-6 ${mensagem.emissor === "ia" ? "mr-auto bg-blue-50 text-slate-900" : "ml-auto bg-slate-200 text-slate-900"}`}>{mensagem.texto}</div>)}
        </div>
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex h-[54px] gap-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") enviar(); }} placeholder="Digite sua dúvida..." className="min-h-[54px] flex-1 rounded-md border border-slate-400 bg-white px-4 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
            <button type="button" onClick={enviar} className="min-h-[54px] rounded-md bg-slate-900 px-6 font-black text-white shadow-sm hover:bg-slate-800">PERGUNTAR</button>
          </div>
        </div>
      </section>
    </main>
  );
}
