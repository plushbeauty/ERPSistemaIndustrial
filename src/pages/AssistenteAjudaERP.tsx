import { useMemo, useState } from "react";

type Emissor = "usuario" | "ia";
interface IMensagem { emissor: Emissor; texto: string; }

const respostas: Array<{ termos: string[]; texto: string }> = [
  { termos: ["venda","pedido","outlook","xml"], texto: "Em Vendas, informe o cliente ou importe o pedido do Outlook. O XML é cruzado com o De-Para cadastrado. Verde indica saldo disponível para reserva; laranja indica falta e necessidade de PCP." },
  { termos: ["pcp","prensa","dupla","mrp"], texto: "No PCP, revise a OP e marque Operação Dupla somente quando o processo e o ferramental suportarem dois moldes simultâneos. O planejamento recalcula capacidade e o MRP verifica os componentes da BOM." },
  { termos: ["tablet","operador","refugo","peça"], texto: "No terminal de fábrica, o operador registra a produção. A regra de quantidade boa é: Peças Boas = Encontradas - Defeituosas. Havendo defeito, o motivo deve ser informado antes do apontamento." },
  { termos: ["calibração","calibracao","paquímetro","paquimetro","vencido"], texto: "Na Qualidade, acompanhe a validade dos instrumentos. Um instrumento vencido deve ser tratado conforme a regra de bloqueio configurada para a operação antes de novo apontamento." },
];

function responder(pergunta: string): string {
  const texto = pergunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const resposta = respostas.find((item) => item.termos.some((termo) => texto.includes(termo)));
  return resposta?.texto ?? "Não encontrei essa orientação no manual. Tente perguntar sobre Vendas, Outlook/XML, PCP, Operação Dupla, Tablet, Refugo ou Calibração.";
}

export default function AssistenteAjudaERP() {
  const [mensagens, setMensagens] = useState<IMensagem[]>([
    { emissor: "ia", texto: "Olá! Sou o Assistente Virtual do ERP Industrial. Posso explicar os fluxos de Vendas, PCP, Tablet, Qualidade e Calibração." },
  ]);
  const [input, setInput] = useState("");

  const sugestoes = useMemo(() => ["Como importar um pedido XML?", "Como funciona a Operação Dupla?", "Como registrar refugo no Tablet?", "O que acontece com um instrumento vencido?"], []);

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
          <button type="button" onClick={() => window.history.back()} className="rounded-md border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900">Voltar</button>
        </header>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          {sugestoes.map((sugestao) => <button key={sugestao} type="button" onClick={() => { setInput(sugestao); }} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-slate-900">{sugestao}</button>)}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 md:p-6">
          {mensagens.map((mensagem, index) => (
            <div key={index} className={`max-w-[88%] rounded-lg p-4 text-base font-medium leading-6 ${mensagem.emissor === "ia" ? "mr-auto bg-blue-50 text-slate-900" : "ml-auto bg-slate-200 text-slate-900"}`}>
              {mensagem.texto}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex gap-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") enviar(); }} placeholder="Digite sua dúvida..." className="min-h-[54px] flex-1 rounded-md border border-slate-400 bg-white px-4 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" />
            <button type="button" onClick={enviar} className="min-h-[54px] rounded-md bg-slate-800 px-6 font-black text-white shadow-sm hover:bg-slate-700">PERGUNTAR</button>
          </div>
        </div>
      </section>
    </main>
  );
}
