export interface IOutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes: string;
}

export interface IOutlookMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: IOutlookAttachment[];
}

export interface IOutlookMailbox {
  address: string;
  label: string;
  role: 'vendedor' | 'comprador' | 'administrador';
}

export interface IXmlPedidoItem {
  codigoCliente: string | null;
  quantidade: number;
  descricao: string | null;
  unidade: string | null;
}

export interface IXmlPedidoResult {
  sucesso: boolean;
  pedidoCliente: string | null;
  itens: IXmlPedidoItem[];
  xmlTexto?: string;
  erro?: string;
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Faz apenas parsing determinístico do XML recebido.
 * Não inventa número de pedido, códigos ou quantidades.
 * O cruzamento De-Para deve ocorrer contra os dados reais do ERP.
 */
export function processarXmlPedido(xmlBase64: string): IXmlPedidoResult {
  try {
    const xmlTexto = decodeBase64Utf8(xmlBase64);
    const doc = new DOMParser().parseFromString(xmlTexto, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { sucesso: false, pedidoCliente: null, itens: [], erro: 'XML inválido ou malformado.' };
    }

    const text = (root: ParentNode, names: string[]): string | null => {
      for (const name of names) {
        const node = root.querySelector(name);
        const value = node?.textContent?.trim();
        if (value) return value;
      }
      return null;
    };

    const pedidoCliente = text(doc, ['nNF', 'numeroPedido', 'pedido', 'xPed']);
    const itemNodes = Array.from(doc.querySelectorAll('det, item, Item'));
    const itens: IXmlPedidoItem[] = itemNodes.map(node => {
      const quantidadeRaw = text(node, ['qCom', 'quantidade', 'qtd', 'QTD']);
      const quantidade = Number((quantidadeRaw ?? '0').replace(',', '.'));
      return {
        codigoCliente: text(node, ['cProd', 'codigoCliente', 'codigo', 'cod']),
        quantidade: Number.isFinite(quantidade) ? quantidade : 0,
        descricao: text(node, ['xProd', 'descricao', 'produto']),
        unidade: text(node, ['uCom', 'unidade', 'UN']),
      };
    }).filter(item => item.codigoCliente || item.quantidade > 0);

    return { sucesso: true, pedidoCliente, itens, xmlTexto };
  } catch (error) {
    return {
      sucesso: false,
      pedidoCliente: null,
      itens: [],
      erro: error instanceof Error ? error.message : 'Falha ao decodificar o XML.',
    };
  }
}
