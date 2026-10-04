export interface IItemPedidoXml {
  id_linha: string;
  codigo_produto_cliente: string;
  quantidade_solicitada: number;
  unidade_medida: "un" | "kg" | "metr";
}

export interface IPedidoXmlConvertido {
  numero_pedido_cliente: string;
  cnpj_cliente_comprador: string;
  itens: IItemPedidoXml[];
}
