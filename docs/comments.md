# Registro de ciclo de engenharia

- 2026-10-07: Etapa Compras iniciou reconstrução sobre o fluxo real erp_compras_salvar_pedido, fornecedores e produtos do Supabase.
- 2026-10-07: Referências SAP S/4HANA confirmaram estrutura documento cabeçalho + itens e fluxo requisição, RFQ, cotação e pedido.
- 2026-10-07: Referências TOTVS Logix confirmaram validação de preço entre cotação e ordem de compra.

## 2026-10-07 — Workspace Compras / Suprimentos
- `src/pages/ComprasOrdemCompra.tsx` foi reconstruído sobre os contratos reais já existentes do ERP: `erp_current_empresa_id`, `erp_fornecedores`, `erp_produtos`, `erp_pedidos_compra`, `erp_pedidos_compra_itens` e `erp_compras_salvar_pedido`.
- O workspace mantém o fluxo operacional de solicitação → cotação/RFQ → pedido/aprovação → fiscal → recebimento sem criar tabela fictícia de cotação.
- A referência SAP consultada confirma a anatomia de documentos de compras por cabeçalho/item e campos como material, fornecedor, número do fabricante, unidade, preço, requisição, centro/conta e entrega.


## 2026-10-07 — Saneamento SRE / tenant e auditoria
- `EstoqueAlmoxarifadoCompact.tsx` preserva o fluxo transacional real de estoque e foi ajustado para geometria compacta; o cabeçalho unificado continua sendo fornecido por `VendasLayout` → `ERPHeader`.
- `scripts/auditoria-brutal.mjs` passou a reconhecer corretamente o `AccessGate` real de `AppBootstrap` e delimitou marcadores falsos por palavra, evitando classificar valores como `todos` como `TODO`.
- `BalancoEstoque.tsx` e `PainelOrdensProducao.tsx` passaram a resolver `erp_current_empresa_id()` antes das consultas e aplicar `empresa_id` explicitamente.

## 2026-10-12 — NF-e / recuperação do gate de TypeScript
- O CI do PR #80 no commit `70229223` falhou em `src/pages/NFeEmissao.tsx` por CSS de impressão inserido fora do template JSX: erros em cascata iniciando na linha 748.
- O template foi corrigido no commit `94aef1455e0f52acbf0d198ee6d0ab7cad29ee06`; a execução GitHub Actions #4250 terminou com conclusão `success`.
- Criado `src/lib/fiscal/nfe-xml-builder.ts` como serializador XML interno tipado de rascunho, com escape XML e remoção de caracteres inválidos XML 1.0. O resultado declara explicitamente `suitableForSefaz: false`; não é XML fiscal XSD, não é assinado e não pode ser transmitido diretamente.

## 2026-10-12 — NF-e / correção do lint do serializador
- A execução #4261 (PR #80, merge commit `77c2a352fea9afa3d0faf200877e43663ebadc14`) passou no TypeScript, mas falhou no ESLint: `src/lib/fiscal/nfe-xml-builder.ts:28`, regra `no-control-regex` sobre a regex de caracteres XML inválidos.
- Substituída a regex por filtragem de pontos de código, preservando somente os caracteres permitidos pelo XML 1.0; validação completa fica pendente da nova execução de CI.
