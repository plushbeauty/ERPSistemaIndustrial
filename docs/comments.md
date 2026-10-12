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

## 2026-10-12 — NF-e / estado fiscal desconhecido
- CI #4284 terminou com sucesso em todas as etapas, incluindo TypeScript, ESLint, gate de contrato NF-e e build de produção.
- O repositório fiscal não deve mapear status nulo/desconhecido para `rascunho`: isso mascarava valores de banco não reconhecidos. Agora a leitura retorna erro controlado pela camada de consulta; o gate NF-e verifica essa proteção.
- Removido do backlog o apontamento de ESLint do serializador, pois a execução mais recente confirmou sucesso. As demais entradas históricas permanecem até auditoria individual de sua resolução.

- A mesma regra de integridade foi aplicada ao ambiente e à direção: valores nulos/desconhecidos não são convertidos silenciosamente para homologação/saída; o gate NF-e verifica os mapeamentos explícitos.

## 2026-10-12 — Backlog de auditoria / estado verificado
- As falhas históricas de TypeScript registradas em 07/10 foram removidas do backlog ativo após o gate TypeScript do CI #4315 concluir com sucesso. A falha histórica de ESLint já havia sido removida após CI #4284.
- O único bloqueio ativo registrado agora é externo ao código: a API da Vercel recusou a criação do preview com HTTP 402 por limite diário de deployments; nenhum deployment novo foi criado.


## 2026-10-12 — Almoxarifado → Liberação para NF-e
- Criada a rota `/estoque/liberacao-nfe` e incluída no submenu Estoque: carteira de pedidos, conferência por item, divisão por lotes, caixas/unidades por caixa, pesos, localização e observações.
- Nova migration `20261012175122_erp_warehouse_nfe_release_v1.sql`: cabeçalho/itens tenant-aware com RLS, RPCs para salvar, encaminhar, vincular ao rascunho fiscal e concluir a baixa física somente quando a NF-e persistida estiver autorizada. Lotes sem status aprovado são recusados; encaminhamento reserva saldo e conclusão registra movimento de saída.
- O emissor ativo `NFeEmissaoCompact.tsx` lê `liberacao_id`, importa cliente, quantidades, produto, lotes, caixas e pesos, e vincula o rascunho pela RPC fiscal. Natureza, CFOP e tributação permanecem sujeitos à conferência do Fiscal; a importação não declara autorização SEFAZ.
- Adicionado gate estático `verify:warehouse-nfe-release` ao CI.
- Migrations aplicadas ao projeto Supabase `zsklkydlawgvwgnvxwwx` nas versões `20261012175122`, `20261012175250`, `20261012175321`, `20261012175519`, `20261012175708`, `20261012180636` e `20261012180856` (ledger remoto); os arquivos locais correspondentes são `20261012180000` e `20261012182000`; verificação confirmou as duas tabelas com RLS habilitado, quatro wrappers públicos `SECURITY INVOKER`, implementações privilegiadas no schema privado, execução negada a `anon`, concedida a `authenticated`, e policies tenant-aware de leitura. Teste SQL confirmou rejeição de chamadas sem sessão nas quatro RPCs. Trigger adicional revalida status de Qualidade e bloqueia lote em quarentena (`RETIDO`), sucata ou retrabalho no salvamento, encaminhamento, vínculo fiscal e conclusão; a tela também desabilita lotes retidos; índices das FKs novas foram adicionados e índice único impede associar a mesma NF-e a duas liberações. A migration `20261012180000` aplicou a RPC fiscal de rascunho com RBAC/tenant e status `Rascunho` obrigatório; o vínculo com a liberação agora exige documento ainda em rascunho, destinatário igual ao cliente do pedido e quantidades por produto iguais às da separação. O emissor exibe o lote por linha e persiste a rastreabilidade em `erp_documentos_fiscais_itens.lote`. A migration `20261012182000` moveu a implementação de salvar rascunho para `private` e manteve o endpoint PostgREST como `SECURITY INVOKER`. Ainda falta teste funcional com sessão de operador autenticado (a conexão não expõe sessão do usuário final). O preview da Vercel segue condicionado à cota diária HTTP 402 registrada no backlog. Nenhuma alteração foi feita diretamente na `main`.
