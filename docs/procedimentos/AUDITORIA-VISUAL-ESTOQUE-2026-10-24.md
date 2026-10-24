# Auditoria integral do módulo Estoque — SYSNQRA ERP INDUSTRIAL

- Data: 2026-10-24
- Branch de trabalho: `fix/estoque-anatomia-visual-2026-10-24`
- Referência visual: Central de Compras aprovada + tokens mestres.
- Estado: inspeção de código concluída; correções em branch; homologação de banco e CI ainda pendentes.
- Restrição: não aplicar migrations nem publicar produção sem confirmar schema/migration history no ambiente de homologação.

## 1. Inventário de rotas e componentes

Rotas conferidas em `src/AppEntryV2.tsx`:

| Rota | Componente | Papel |
|---|---|---|
| `/estoque`, `/almoxarifado`, `/estoque/saldos`, `/vendas/estoque` | `src/pages/EstoqueAlmoxarifadoCompact.tsx` | Tela principal: saldo, endereços, entradas/saídas, transferências, inventário cíclico, produção e histórico |
| `/estoque/ajustes` | `src/pages/EstoqueAjustes.tsx` | Ajuste de avaria via RPC de movimento |
| `/estoque/separacao` | `src/pages/EstoqueSeparacao.tsx` | Separação de material e cartão rastreável via RPC |
| `/estoque/etiquetas` | `src/pages/EstoqueEtiquetas.tsx` | Geração de ZPL para SKU; copiar/baixar não aciona impressora |
| `/estoque/recebimento-lotes`, `/estoque/recebimento` | `src/pages/estoque/EstoqueRecebimentoLotes.tsx` | Recebimento com certificado PDF + RPC |
| `/estoque/validade` | `src/pages/estoque/InventarioValidade.tsx` | Validade e fila FIFO/PEPS |
| `/almoxarifado/inventario-mestre` | `src/pages/AlmoxarifadoInventario.tsx` | Painel mestre de lotes, alertas e recebimento alternativo |
| `/estoque/curva-abc` | `src/pages/EstoqueCurvaABC.tsx` | Classificação de valor em estoque |
| `/inventario/balanco`, `/vendas/balanco` | `src/features/inventario/BalancoEstoque.tsx` | Valoração pelo saldo atual do produto × custo médio |
| `/inventario/auditoria` | `src/features/inventario/AuditoriaSaldos.tsx` | Histórico de auditoria de saldos, agora com filtro por tenant e paginação |
| `/estoque/enderecos`, `/estoque/movimentacoes` | `IndustrialDataWorkspace` | Rotas genéricas de dados; não são formulários especializados |
| `/ajuda/estoque-recebimento` | `src/pages/estoque/HelpEstoqueRecebimento.tsx` | Ajuda operacional |

`src/pages/EstoqueAlmoxarifado.tsx` e `src/pages/EstoqueAlmoxarifadoMestre.tsx` são implementações paralelas/reexport; as três rotas principais acima apontam para `EstoqueAlmoxarifadoCompact.tsx`. A inspeção não deve tomar o arquivo paralelo como fonte da tela ativa.

## 2. Correções na branch

1. CSS `src/styles/estoque-standard.css` com escopo `.stock-standard`: controles operacionais h-9/36 px, labels consistentes, foco visível, cabeçalhos navy, tabelas densas, rolagem horizontal responsiva e impressão.
2. Padrão aplicado às telas principais, ajustes, separação, etiquetas, recebimento, validade/FIFO, Curva ABC, balanço, auditoria de saldos e painel mestre. A implementação paralela do Almoxarifado também recebeu o escopo, sem mudar as rotas ativas.
3. Recebimento de lotes, Ajustes e Etiquetas: removidos limites implícitos de resposta ao carregar produtos; as três telas usam `fetchAllPages` com filtro de empresa. No recebimento, falhas da operação e da limpeza compensatória do PDF agora são reportadas juntas.
4. Balanço: removido o limite fixo de 5.000 produtos; produtos e almoxarifados são carregados por páginas completas e escopo de empresa. O rótulo “Status do Lote” virou “Status do Saldo”. Data, almoxarifado e método de custo não simulam filtros: controles sem fonte comprovada ficam desabilitados e a tela informa que os valores são saldo atual, não snapshot histórico.
5. Auditoria de saldos: filtro explícito por `erp_current_empresa_id()`, paginação de 50 registros, intervalo de data semiaberto (início inclusivo / dia seguinte exclusivo) e ordenação estável. A policy existente também filtra por empresa ou Master, mas a tela não consulta todos os tenants quando não há empresa contextualizada.
6. Curva ABC: estado inicial de carregamento corrigido; fórmula atual explicitada como saldo físico × último custo encontrado, sem alegar consumo anual.
7. Criada a migration `20261024173000_estoque_recebimento_rbac_integrity.sql`: a RPC de recebimento valida sessão, empresa, permissão `estoque.movimentar`, produto ativo pertencente ao tenant, quantidade finita, laudo aprovado, NF, lote e validade; o helper de incremento deixa de ser invocável diretamente por clientes; escritas REST diretas nas tabelas de saldo físico e rastreabilidade são revogadas para `authenticated`, mantendo leitura. Essa migration está apenas na branch e **não foi aplicada nem testada em banco**.

Nenhuma tela aprovada de Compras foi modificada. Não foram criadas tabelas nem alterados campos de negócio em tabelas existentes.

## 3. Achados funcionais e de segurança

### Alto — recebimento/RBAC (migration adicionada, ainda não homologada)
As migrations anteriores de `fn_receber_lote_almoxarifado` validavam empresa e status, mas não verificavam `erp_has_permission('estoque','movimentar')` nem confirmavam diretamente que o produto estava ativo e pertencia à empresa antes de inserir o lote. O helper `fn_incrementar_saldo_almoxarifado` era executável por `authenticated`. A migration nova fecha esses caminhos no código, porém precisa de teste real de assinatura, permissões e transação antes de ser aplicada.

### Alto — estado real do banco desconhecido
Não há evidência nesta execução de conexão a Postgres/Supabase de homologação nem do histórico de migrations aplicado. A existência de SQL no repositório não prova que os objetos remotos tenham a mesma versão.

### Alto — inventário concorrente
`erp_estoque_inventario_iniciar` verifica inventário aberto antes de inserir. O código da migration inspecionada não mostra índice único parcial que impeça duas sessões concorrentes de criarem inventários abertos ao mesmo tempo. Testar e, se confirmado no schema, corrigir atomicamente em migration separada.

### Médio — duas experiências de recebimento
`EstoqueRecebimentoLotes.tsx` exige certificado PDF; `AlmoxarifadoInventario.tsx` permite caminho de certificado opcional. Ambos usam a mesma RPC. Confirmar se o certificado é regra universal ou se o fluxo mestre aceita referência documental previamente registrada; não remover campos sem decisão de negócio.

### Médio — validade/FIFO não bloqueia consumo por si só
`InventarioValidade.tsx` lê `erp_estoque_lotes_rastreabilidade`, ordena por data de entrada e exibe `localizacao`/lote interno como indisponíveis nessa fonte. A própria tela informa que bloqueio de vencido e FEFO/FIFO precisam ser aplicados no fluxo de baixa. A visualização não é garantia de bloqueio transacional.

### Médio — Curva ABC
O relatório usa `erp_produto_estoque.saldo_fisico` e último registro em `erp_custos_produtos`; não usa consumo/vendas anuais. Não chamar de “ABC anual”. A tela mostra distribuição por classe, sem grade detalhada por SKU, o que limita auditoria operacional da classificação.

### Médio — balanço
O balanço utiliza `erp_produtos.estoque_atual` e `custo_medio`; não é snapshot histórico, saldo por almoxarifado, custo PEPS nem valoração contábil oficial. Os controles sem fonte equivalente permanecem indisponíveis.

### Médio — ajuste de avaria
`EstoqueAjustes.tsx` chama a RPC de saída com lote/documento e grava a localização como observação, sem vínculo relacional do lote/endereço na chamada. Confirmar se o negócio exige movimentação específica por lote/quarentena antes de alterar a regra.

### Médio — separação
A RPC de separação valida empresa/permissão e grava separação + cartão na mesma transação. Ela não baixa nem reserva saldo. Manter assim até o negócio definir o significado da separação e aprovar um contrato de reserva/baixa; não adicionar decremento no client.

### Médio — etiquetas
A tela gera ZPL baseado no SKU do produto e não aciona uma impressora diretamente. Ainda é necessário validar etiqueta no modelo físico de impressora/leitor e definir se a identidade impressa deve ser SKU, lote, OP ou unidade rastreável.

### Médio — auditoria de saldos
A migration cria RLS por `empresa_id` (ou Master) para leitura. A página foi corrigida para exigir empresa contextualizada e paginar. Ainda é necessário validar se os registros da tabela são alimentados pelo fluxo oficial de ajuste; a UI não deve ser tomada como prova de trilha de auditoria completa.

## 4. Objetos Supabase inspecionados

- `erp_produtos`, `erp_produto_estoque`, `erp_estoque_movimentos`
- `erp_estoque_localizacoes`, `erp_almoxarifados`
- `erp_estoque_inventarios`, `erp_estoque_inventario_itens`
- `erp_estoque_lotes_rastreabilidade`, `erp_estoque_lotes`
- `erp_estoque_separacoes`, `erp_rastreabilidade_cartoes`
- `erp_estoque_reservas`, `erp_inventario_auditoria_saldos`
- RPCs `erp_estoque_registrar_movimento`, `erp_estoque_inventario_iniciar/contar/ajustar/encerrar`, `erp_estoque_separar_material`, `fn_receber_lote_almoxarifado`, `fn_incrementar_saldo_almoxarifado`, `erp_registrar_conferencia_producao`

Migrations revisadas por leitura de fonte: `20260923190000_plastibor_inventory_docs_purge_v1.sql`, `20260927160000_erp_recebimento_lotes_certificado_v1.sql`, `20260927160100_erp_recebimento_lotes_transacao_v1.sql`, `20260928164500_erp_security_inventory_and_production_rpc_rbac_v1.sql`, `20261003143000_inventario_valoracao_controladoria.sql`, `20261006140000_erp_stock_separation_atomic_rbac.sql`, `20261006153000_erp_stock_manual_movement_rbac.sql`, `20261020170000_estoque_lotes_data_validade.sql` e a migration nova desta branch.

## 5. Validação — evidência real

- Leitura do código, rotas e migrations no GitHub: **concluída**.
- Alterações gravadas na branch: **concluídas**, sujeitas a revisão.
- Type-check, lint, auditorias, build e teste de rotas: **não confirmados** nesta execução.
- Teste visual desktop/tablet e navegação real: **não executados**.
- Testes Supabase/RLS/RBAC/RPC/Storage e corrida de inventário: **não executados**.
- Migration nova aplicada: **não**.
- Deploy/produção: **não validado**.

O status Vercel consultado anteriormente retornou falha por `build-rate-limit`; isso é bloqueio de quota e não prova sucesso nem falha de compilação do código. Não declarar a PR pronta nem publicar antes dos checks reais e de homologação da migration.

## 6. Plano de fechamento

1. Executar CI da PR: `npm run verify:auth-master-contract`, `npm run verify:approved-ui-lock`, `npm run type-check`, `npm run lint:check`, `npm run audit:all`, `npm run verify:lazy-imports`, `npm run verify-routes`, `npm run audit:ui-standardization` e `npm run build:vercel`.
2. Aplicar a migration nova somente em banco de homologação depois de comparar migration history e testar: usuário sem permissão; usuário de outra empresa; produto inativo/tenant alheio; quantidade inválida/NaN; lote reprovado; validade vencida; falha após insert; idempotência/duplicidade; helper direto negado; leitura e escrita via RLS.
3. Testar duas sessões iniciando inventário simultaneamente e revisar concorrência de contagem/ajuste.
4. Homologar recebimento, Storage e limpeza compensatória; imprimir ZPL no hardware real.
5. Validar responsividade e regressões sem alterar a Central de Compras aprovada.
