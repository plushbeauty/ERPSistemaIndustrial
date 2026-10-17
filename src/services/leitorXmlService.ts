import { supabase } from "../lib/supabaseClient";
import { fetchAllPages } from "../lib/supabasePagination";

export interface IItemConvertido {
  codigo_interno: string;
  codigo_cliente: string;
  quantidade: number;
  estoque_disponivel: number | null;
  pronto_para_reservar: boolean;
}

export interface IProcessamentoXmlPedido {
  sucesso: boolean;
  itens: IItemConvertido[];
  contem_erros: boolean;
  erro?: string;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function tagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_]+:)?" + tag + ">", "i"));
  return decodeXml(match?.[1]?.trim() ?? "");
}

type DeParaRow = { codigo_interno: string; codigo_cliente: string };
type StockLot = { quantidade_disponivel: number | null };

export async function processarEConverterXmlPedido(
  xmlTexto: string,
  clienteId: string,
  empresaId: string,
): Promise<IProcessamentoXmlPedido> {
  try {
    if (!xmlTexto.trim()) throw new Error("XML vazio.");
    if (!clienteId || !empresaId) throw new Error("Cliente e empresa são obrigatórios.");

    const blocos = xmlTexto.match(/<(?:[A-Za-z0-9_]+:)?det(?:\s[^>]*)?>[\s\S]*?<\/(?:[A-Za-z0-9_]+:)?det>/gi) ?? [];
    if (!blocos.length) throw new Error("Nenhum bloco <det> localizado no XML.");

    const dePara = await fetchAllPages<DeParaRow>((from, to) => supabase
      .from("erp_vendas_depara_produtos")
      .select("codigo_interno,codigo_cliente", { count: "exact" })
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId)
      .range(from, to));

    const itens: IItemConvertido[] = [];
    for (const bloco of blocos) {
      const codigoCliente = tagValue(bloco, "cProd");
      const quantidade = Number.parseFloat(tagValue(bloco, "qCom").replace(",", "."));
      if (!codigoCliente || !Number.isFinite(quantidade) || quantidade <= 0) continue;

      const correspondencia = dePara.find(row => row.codigo_cliente === codigoCliente);
      let estoqueDisponivel: number | null = null;

      if (correspondencia?.codigo_interno) {
        const { data: produto, error: produtoError } = await supabase
          .from("erp_produtos")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("codigo", correspondencia.codigo_interno)
          .maybeSingle();
        if (produtoError) throw produtoError;

        if (produto?.id) {
          const lotes = await fetchAllPages<StockLot>((from, to) => supabase
            .from("erp_estoque_lotes")
            .select("quantidade_disponivel", { count: "exact" })
            .eq("empresa_id", empresaId)
            .eq("produto_id", produto.id)
            .range(from, to));
          estoqueDisponivel = lotes.length ? lotes.reduce((total, lote) => total + Number(lote.quantidade_disponivel ?? 0), 0) : null;
        }
      }

      itens.push({
        codigo_interno: correspondencia?.codigo_interno ?? "NÃO_ENCONTRADO",
        codigo_cliente: codigoCliente,
        quantidade,
        estoque_disponivel: estoqueDisponivel,
        pronto_para_reservar:
          correspondencia !== undefined &&
          estoqueDisponivel !== null &&
          estoqueDisponivel >= quantidade,
      });
    }

    if (!itens.length) throw new Error("Nenhum item válido foi encontrado no XML.");
    return {
      sucesso: true,
      itens,
      contem_erros: itens.some(item => item.codigo_interno === "NÃO_ENCONTRADO"),
    };
  } catch (error) {
    return {
      sucesso: false,
      itens: [],
      contem_erros: true,
      erro: error instanceof Error ? error.message : "Erro desconhecido ao processar XML.",
    };
  }
}
