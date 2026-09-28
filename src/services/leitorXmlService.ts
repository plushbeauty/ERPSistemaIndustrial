import { supabase } from "../lib/supabaseClient";

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
  const match = xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_]+:)?"+tag+">", "i"));
  return decodeXml(match?.[1]?.trim() ?? "");
}

export async function processarEConverterXmlPedido(
  xmlTexto: string,
  clienteId: string,
  empresaId: string,
): Promise<IProcessamentoXmlPedido> {
  try {
    if (!xmlTexto.trim()) throw new Error("XML vazio.");
    if (!clienteId || !empresaId) throw new Error("Cliente e empresa são obrigatórios.");

    const blocos = xmlTexto.match(/<(?:[A-Za-z0-9_]+:)?det(?:\\s[^>]*)?>[\\s\\S]*?<\/(?:[A-Za-z0-9_]+:)?det>/gi) ?? [];
    if (!blocos.length) throw new Error("Nenhum bloco <det> localizado no XML.");

    const { data: dePara, error: deParaError } = await supabase
      .from("erp_vendas_depara_produtos")
      .select("codigo_interno,codigo_cliente")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId);

    if (deParaError) throw deParaError;

    const itens: IItemConvertido[] = [];
    for (const bloco of blocos) {
      const codigoCliente = tagValue(bloco, "cProd");
      const quantidade = Number.parseFloat(tagValue(bloco, "qCom").replace(",", "."));
      if (!codigoCliente || !Number.isFinite(quantidade) || quantidade <= 0) continue;

      const correspondencia = (dePara ?? []).find(
        (row) => row.codigo_cliente === codigoCliente,
      );
      let estoqueDisponivel: number | null = null;

      if (correspondencia?.codigo_interno) {
        const { data: produto } = await supabase
          .from("erp_produtos")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("codigo", correspondencia.codigo_interno)
          .maybeSingle();

        if (produto?.id) {
          const { data: estoque } = await supabase
            .from("erp_produto_estoque")
            .select("quantidade_disponivel")
            .eq("empresa_id", empresaId)
            .eq("produto_id", produto.id)
            .maybeSingle();
          estoqueDisponivel = estoque?.quantidade_disponivel == null
            ? null
            : Number(estoque.quantidade_disponivel);
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
      contem_erros: itens.some((item) => item.codigo_interno === "NÃO_ENCONTRADO"),
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
