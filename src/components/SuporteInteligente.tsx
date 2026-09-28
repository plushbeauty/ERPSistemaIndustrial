import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface SupportResponse {
  ok: boolean;
  resposta?: string;
  contexto?: Array<{
    id: string;
    modulo: string | null;
    titulo: string;
    conteudo: string;
    link_acao: string | null;
    texto_acao: string | null;
  }>;
  linkAcao?: string | null;
  textoAcao?: string | null;
  error?: string;
}

function detectModule(
  pathname: string,
): string {
  const clean =
    pathname
      .replace(/^\/+/, "")
      .split("/")[0]
      .toLowerCase();

  const modules: Record<
    string,
    string
  > = {
    usuarios: "Usuários",
    empresas: "Empresas",
    produtos: "Produtos",
    estoque: "Estoque",
    producao: "Produção",
    pcp: "PCP",
    qualidade: "Qualidade",
    rpn: "Qualidade",
    rpnc: "RPNC",
    compras: "Compras",
    vendas: "Vendas",
    financeiro: "Financeiro",
    fiscal: "Fiscal",
    expedicao: "Expedição",
    manutencao: "Manutenção",
    auditorias: "Auditorias",
    rh: "RH",
    treinamentos: "Treinamentos",
    documentos: "Documentos",
  };

  return (
    modules[clean] ??
    "ERP Industrial"
  );
}

export default function SuporteInteligente() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    answer,
    setAnswer,
  ] =
    useState<SupportResponse | null>(
      null,
    );

  const moduleName =
    useMemo(
      () =>
        detectModule(
          location.pathname,
        ),
      [location.pathname],
    );

  async function sendQuestion(
    event: FormEvent,
  ) {
    event.preventDefault();

    const value =
      question.trim();

    if (!value || loading) {
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "erp-ia-suporte",
          {
            body: {
              pergunta: value,
              modulo:
                moduleName,
              rota:
                location.pathname,
            },
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      setAnswer(
        data as SupportResponse,
      );
    } catch (error) {
      setAnswer({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro no suporte.",
      });
    } finally {
      setLoading(false);
    }
  }

  function goToAction() {
    if (
      answer?.linkAcao
    ) {
      navigate(
        answer.linkAcao,
      );

      setOpen(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          aria-label="Abrir suporte inteligente"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:scale-105"
        >
          <MessageCircle
            size={23}
          />
        </button>
      )}

      {open && (
        <aside className="fixed bottom-5 right-5 z-50 flex w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div>
              <strong className="flex items-center gap-2 text-sm">
                <Bot
                  size={17}
                />
                Suporte inteligente
              </strong>

              <span className="text-[10px] text-slate-300">
                Contexto:{" "}
                {moduleName}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Fechar suporte"
            >
              <X size={18} />
            </button>
          </header>

          <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              Estou nesta tela com você. Pergunte como executar uma operação no ERP.
            </div>

            {answer && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 text-sm leading-6 text-slate-700">
                  {answer.resposta ??
                    answer.error ??
                    "Não foi possível responder."}
                </div>

                {answer.contexto?.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <strong className="block text-xs font-black text-slate-800">
                        {item.titulo}
                      </strong>

                      <p className="mt-1 line-clamp-4 text-[11px] leading-5 text-slate-500">
                        {
                          item.conteudo
                        }
                      </p>
                    </div>
                  ),
                )}

                {answer.linkAcao && (
                  <button
                    type="button"
                    onClick={
                      goToAction
                    }
                    className="flex w-full items-center justify-between rounded-xl bg-emerald-700 px-4 py-3 text-xs font-black text-white"
                  >
                    {answer.textoAcao ??
                      "Abrir tela relacionada"}

                    <ChevronRight
                      size={16}
                    />
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={
              sendQuestion
            }
            className="border-t border-slate-100 p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                value={
                  question
                }
                onChange={(
                  event,
                ) =>
                  setQuestion(
                    event.target
                      .value,
                  )
                }
                placeholder="Como faço isso?"
                className="min-w-0 flex-1 text-xs outline-none"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !question.trim()
                }
                className="text-emerald-700 disabled:opacity-40"
                aria-label="Enviar pergunta"
              >
                <Send
                  size={17}
                />
              </button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
