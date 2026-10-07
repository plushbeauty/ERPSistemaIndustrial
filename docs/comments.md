# Registro de ciclo de engenharia

- 2026-10-07: Etapa Compras iniciou reconstrução sobre o fluxo real erp_compras_salvar_pedido, fornecedores e produtos do Supabase.
- 2026-10-07: Referências SAP S/4HANA confirmaram estrutura documento cabeçalho + itens e fluxo requisição, RFQ, cotação e pedido.
- 2026-10-07: Referências TOTVS Logix confirmaram validação de preço entre cotação e ordem de compra.

## 2026-10-07 — Workspace Compras / Suprimentos
- `src/pages/ComprasOrdemCompra.tsx` foi reconstruído sobre os contratos reais já existentes do ERP: `erp_current_empresa_id`, `erp_fornecedores`, `erp_produtos`, `erp_pedidos_compra`, `erp_pedidos_compra_itens` e `erp_compras_salvar_pedido`.
- O workspace mantém o fluxo operacional de solicitação → cotação/RFQ → pedido/aprovação → fiscal → recebimento sem criar tabela fictícia de cotação.
- A referência SAP consultada confirma a anatomia de documentos de compras por cabeçalho/item e campos como material, fornecedor, número do fabricante, unidade, preço, requisição, centro/conta e entrega.

## 2026-10-07 — Saneamento SRE / tenant e auditoria
- `EstoqueAlmoxarifadoCompact.tsx` preserva o fluxo transacional real de estoque e resolve `erp_current_empresa_id()` antes das consultas; o cabeçalho unificado é fornecido por `VendasLayout` → `ERPHeader`.
- `scripts/auditoria-brutal.mjs` reconhece o `AccessGate` real de `AppBootstrap` e delimita marcadores falsos por palavra.
- `BalancoEstoque.tsx` e `PainelOrdensProducao.tsx` resolvem `erp_current_empresa_id()` antes das consultas e aplicam `empresa_id` explicitamente.
- A migração mestre de produtos do repositório não contém a coluna `estoque_seguranca`; os campos de estoque existentes documentados são `estoque_atual`, `estoque_maximo` e `ponto_reposicao`. Nenhuma consulta foi alterada para uma coluna não comprovada.
- `ERPHeader.tsx` foi ajustado para importar o asset real `src/assets/synqra/logo-synqra.png`, mantendo a barra mestre de 48px e o menu central por módulo.
- A referência SAP consultada para produção confirma o fluxo ordem → liberação → consumo → confirmação → entrada de produto e integração com estoque; a implementação deve reutilizar as tabelas/RPCs existentes em vez de inventar contratos.
