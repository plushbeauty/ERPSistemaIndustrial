# Registro de ciclo de engenharia

- 2026-10-07: Etapa Compras iniciou reconstrução sobre o fluxo real erp_compras_salvar_pedido, fornecedores e produtos do Supabase.
- 2026-10-07: Referências SAP S/4HANA confirmaram estrutura documento cabeçalho + itens e fluxo requisição, RFQ, cotação e pedido.
- 2026-10-07: Referências TOTVS Logix confirmaram validação de preço entre cotação e ordem de compra.

## 2026-10-07 — Workspace Compras / Suprimentos
- `src/pages/ComprasOrdemCompra.tsx` foi reconstruído sobre os contratos reais já existentes do ERP: `erp_current_empresa_id`, `erp_fornecedores`, `erp_produtos`, `erp_pedidos_compra`, `erp_pedidos_compra_itens` e `erp_compras_salvar_pedido`.
- O workspace mantém o fluxo operacional de solicitação → cotação/RFQ → pedido/aprovação → fiscal → recebimento sem criar tabela fictícia de cotação.
- A referência SAP consultada confirma a anatomia de documentos de compras por cabeçalho/item e campos como material, fornecedor, número do fabricante, unidade, preço, requisição, centro/conta e entrega.
