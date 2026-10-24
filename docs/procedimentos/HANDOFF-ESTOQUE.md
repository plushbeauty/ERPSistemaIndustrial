# Handoff do módulo Estoque / Almoxarifado

Este documento permite que outra sessão continue o módulo sem refazer a triagem básica nem confundir uma implementação local com operação homologada.

## Estado geral

- O módulo tem telas reais e algumas RPCs transacionais; **não está todo concluído**.
- As correções de listagem/inventário do item `ERP-2026-026` e o fluxo da separação do item `ERP-2026-032` estão no registro central. O fluxo de separação foi implementado e passou pelos gates locais, mas a nova migration ainda não foi aplicada/testada em Postgres/Supabase.
- Sem banco local, `psql`, Supabase CLI ou sessão Supabase autenticada, não declarar RLS/RPC/tenant validados.
- Não fazer deploy para tentar validar. Confirmar primeiro schema e migrations aplicados em ambiente de desenvolvimento autorizado.
- Não criar tabela duplicada. A separação usa `erp_estoque_separacoes` e `erp_rastreabilidade_cartoes`, já existentes.

## Já feito / pode ser considerado apenas localmente corrigido

1. `src/pages/EstoqueAlmoxarifadoCompact.tsx` (componente ativo das rotas principais); `src/pages/EstoqueAlmoxarifado.tsx` é implementação paralela e não recebe as rotas `/estoque`, `/almoxarifado` ou `/estoque/saldos`.
   - Consultas de produtos, localizações, almoxarifados, OPs, movimentos e itens do inventário usam carregamento por páginas completas e filtro explícito de empresa.
   - Saldo, histórico e inventário têm paginação visual; o comentário do inventário não cita empresa fixa.
   - Entrada/saída/transferência ainda devem ser revisadas quanto a autorização, consistência concorrente e razão de estoque; não declarar esses contratos corretos só porque existe mensagem de sucesso.
   - Inventário cíclico usa RPCs existentes: `erp_estoque_inventario_iniciar`, `erp_estoque_inventario_contar`, `erp_estoque_inventario_ajustar`, `erp_estoque_inventario_encerrar`.
   - Conferência de produção usa `erp_registrar_conferencia_producao`; conferir assinatura, policies e consistência da resposta no banco real.
2. `src/pages/EstoqueSeparacao.tsx`
   - Lookups completos e tenant-scoped; tabela paginada; código/cartão reabertos a partir de registro persistido.
   - Não tem campos fictícios nem barcode desenhado falsamente. O cartão mostra um identificador textual real.
   - A função/migration `erp_estoque_separar_material` valida empresa, permissão `estoque.movimentar`, OP, material ativo e lote pertencente ao produto; grava separação + cartão na mesma transação.
   - **Não baixa nem reserva saldo.** Manter esse comportamento até produto/negócio confirmar o significado da separação e um contrato seguro de razão de estoque. Não adicionar atualização de `estoque_atual` no client.
   - Arquivos: `src/pages/EstoqueSeparacao.tsx`, `supabase/migrations/20261006140000_erp_stock_separation_atomic_rbac.sql`.
3. `src/pages/ComprasRequisicoes.tsx` e `supabase/migrations/20261006130000_erp_compras_requisitions_rbac_atomic.sql`
   - Encaminhamento selecionado de requisições com RPC atômica e permissionamento `compras.*`; validar no banco antes de homologar.
4. `src/pages/estoque/EstoqueRecebimentoLotes.tsx`
   - Existe fluxo real com upload de certificado e RPC `fn_receber_lote_almoxarifado`. Na branch `fix/estoque-anatomia-visual-2026-10-24`, a consulta de produtos usa `fetchAllPages` e a mensagem reporta tanto falha do recebimento quanto falha de limpeza do PDF. A migration `20261024173000_estoque_recebimento_rbac_integrity.sql` adiciona validações de RBAC/tenant e revoga escrita REST direta, mas não foi aplicada nem testada em banco.
   - O contrato da RPC e storage precisa ser comparado com migrations/catálogo remoto antes de mexer.

## Pendências prioritárias, em ordem sugerida

### A. Ajustes de estoque — validar contrato transacional e interface atual

Arquivo: `src/pages/EstoqueAjustes.tsx`.

Evidência atual rechecando `src/pages/EstoqueAjustes.tsx`: produtos ativos são carregados por empresa da sessão, o lookup recebe os produtos reais e a ação chama `erp_estoque_registrar_movimento` com saída/Avaria. A descrição antiga de saldos fixos e botão demonstrativo está desatualizada. Permanecem sem prova os contratos server-side de RBAC, lote, concorrência e atomicidade; o campo de posição é gravado como observação e não como endereço relacional.

Passos:

1. Mapear rota, tabelas de lote/razão/auditoria e RPCs em migrations; buscar também `erp_inventario_auditoria_saldos`, `erp_estoque_lotes`, `erp_produto_estoque` e ajustes preexistentes.
2. Confirmar se avaria altera apenas o lote, saldo global, ambos, ou exige quarentena; confirmar unidade, motivo obrigatório, custo e política de autorização. Não decidir a partir do mock atual.
3. Implementar lookup de produto/lote real e carregar saldo atual do tenant; remover valores iniciais fixos.
4. Garantir que perda ≤ quantidade disponível, regras para lote/quarentena e concorrência sejam validadas server-side.
5. Usar RPC transacional que atualize o saldo/lote e escreva o movimento/auditoria imutável juntos; criar migration somente se não existir contrato canônico.
6. Confirmar resultado com retorno da RPC; separar "novo ajuste" do sucesso/navegação; botão laudo só imprime dados persistidos.
7. Testar perfil sem `estoque.movimentar`, empresa/lote alheios, quantidade maior que saldo, repetição e falha transacional.

### B. Etiquetas — validar ZPL e contrato físico de impressão

Arquivo: `src/pages/EstoqueEtiquetas.tsx`, rota `/estoque/etiquetas`.

Evidência atual rechecando `src/pages/EstoqueEtiquetas.tsx`: a tela consulta produtos ativos filtrados pela empresa do perfil autenticado, limita a quantidade a 1–100 e gera ZPL com o SKU. Copiar/baixar informa que a impressora não é acionada. A consulta anterior de itens de pedido e a alegação de destino fixo estão desatualizadas. Ainda falta validar o layout ZPL no modelo de impressora/leitor e definir se a etiqueta deve identificar SKU, lote, OP ou unidade rastreável.

Passos:

1. Identificar schema de pedido, pedido_itens, documento fiscal, lotes e rastreabilidade; escolher busca por número de pedido/NF-e com relação real.
2. Aplicar tenant explícito e RLS; paginar a pesquisa no servidor sem carregar todos os pedidos.
3. Validar seleção e quantidade inteira/decimal positiva, ≤ saldo/quantidade pendente, usando unidade correta.
4. Definir com schema existente o que cada etiqueta identifica (pedido, item, lote, OP); persistir um identificador único se etiqueta precisar de rastreabilidade e não existir um.
5. Usar barcode vetorial/gerado de um código persistido somente se o padrão de leitura existir; senão imprimir código textual real, sem desenhar barras falsas.
6. Remover destino de impressora fixo ou ligar a integração já existente; browser print pode ser opção honesta, sem alegar disparo direto à impressora.
7. Testar quantidade, isolamento de tenant, referência não encontrada, impressão e tamanho responsivo.

### C. Curva ABC

Arquivo: `src/pages/EstoqueCurvaABC.tsx`, rota `/estoque/curva-abc`.

Evidência atual rechecando `src/pages/EstoqueCurvaABC.tsx`: produtos, saldos e custos são carregados por páginas completas com `empresa_id` explícito; a classificação usa saldo físico × custo mais recente por produto, não consumo anual. Não chamar o relatório de “anual” sem uma fonte histórica e fórmula de negócio aprovada.

Passos:

1. Confirmar fórmula operacional aprovada: valor em estoque ou consumo/venda anual; confirmar data-base e custo.
2. Filtrar ambos os conjuntos pelo tenant e compor saldos pela chave `empresa_id + produto_id`, não apenas produto.
3. Usar páginas completas ou query/RPC agregada server-side conforme volume; propagar erros.
4. Corrigir rótulo do relatório (anual vs snapshot) se não usar razão histórico; definir os limites A/B/C e garantir soma de percentuais/valor.
5. Adicionar tabela/lista com itens classificados, totais e paginação/exports com data-base; testar tenant sem dados e saldo/custo nulos.

### D. Balanço e auditoria de saldos

Arquivos: `src/features/inventario/BalancoEstoque.tsx` e `src/features/inventario/AuditoriaSaldos.tsx`, rotas devem ser confirmadas em `src/AppEntryV2.tsx`.

Evidência atual rechecando `src/features/inventario/BalancoEstoque.tsx`: a consulta original tinha `.limit(5000)` e controles de data/almoxarifado/método sem efeito real sobre o cálculo. A branch `fix/estoque-anatomia-visual-2026-10-24` substitui o limite por `fetchAllPages`, deixa os controles de almoxarifado/método indisponíveis enquanto a fonte não for confirmada e declara que a data identifica o relatório, não um snapshot. A valoração continua baseada no saldo atual e `custo_medio`; não é balanço histórico ou contábil oficial.

Evidência observada na auditoria: consulta a `erp_inventario_auditoria_saldos` até 500 linhas sem tenant explícito e sem paginação; validar se a tabela ainda é fonte oficial e quais policies existem.

Passos:

1. Confirmar definição de saldo valorizado e fonte contábil. Não exibir snapshot passado com números atuais.
2. Fazer data-base/método/almoxarifado efetivamente afetarem uma consulta server-side ou remover controles não implementados.
3. Tornar export coerente com filtros e total exibidos; não rotular custo de estoque como custo contábil oficial sem validação financeira.
4. Escopar por tenant e paginar a auditoria; filtrar datas como intervalo semiaberto com fuso explícito.
5. Validar soma, precisão monetária, unidade, custo nulo e logs de auditoria protegidos contra escrita client-side.

### E. Recebimento de lote e Almoxarifado central

Arquivos: `src/pages/estoque/EstoqueRecebimentoLotes.tsx` e `src/pages/EstoqueAlmoxarifado.tsx`.

Passos:

1. Substituir `.limit(2000)` de produtos do recebimento por `fetchAllPages` ou busca paginada server-side.
2. Auditar migration/assinatura de `fn_receber_lote_almoxarifado`: validar empresa pela sessão (não confiar em `p_empresa_id` do cliente), RBAC, produto/fornecedor/NF, quantidade/unidade, status de qualidade e atomicidade do lote/saldo/razão.
3. Se RPC falha após upload, verificar o resultado de remoção do arquivo; reportar separadamente falha de compensação para evitar arquivo órfão silencioso.
4. Verificar acesso de leitura/remoção ao bucket `documentos-erp`; usuário não autorizado não pode forjar caminho de outra empresa.
5. Em Almoxarifado, rastrear políticas/triggers das inserções diretas de movimento e confirmar que impedem saldo negativo e corrida; caso não, encaminhar gravação via RPC atômica.
6. Testar inventário concorrente, venda durante snapshot, ajuste repetido, encerramento e failure path no banco.

## Arquivos e rotas de Estoque mapeados

- `/estoque`, `/almoxarifado`, `/estoque/saldos`, `/vendas/estoque` → `src/pages/EstoqueAlmoxarifadoCompact.tsx`
- `/estoque/ajustes` → `src/pages/EstoqueAjustes.tsx`
- `/estoque/separacao` → `src/pages/EstoqueSeparacao.tsx`
- `/estoque/etiquetas` → `src/pages/EstoqueEtiquetas.tsx`
- `/estoque/recebimento-lotes`, `/estoque/recebimento` → `src/pages/estoque/EstoqueRecebimentoLotes.tsx`
- `/estoque/curva-abc` → `src/pages/EstoqueCurvaABC.tsx`
- `/inventario/balanco`, `/vendas/balanco` → `src/features/inventario/BalancoEstoque.tsx`
- `/inventario/auditoria` → `src/features/inventario/AuditoriaSaldos.tsx` (na branch atual, filtro por empresa e paginação de 50 registros)
- `/estoque/validade` → `src/pages/estoque/InventarioValidade.tsx`
- `/almoxarifado/inventario-mestre` → `src/pages/AlmoxarifadoInventario.tsx`
- `/estoque/enderecos`, `/estoque/movimentacoes` → `IndustrialDataWorkspace` (telas genéricas, não formulários especializados)
- `AuditoriaSaldos.tsx` → localizar e confirmar sua rota antes de alterar.

## Migrations e objetos a localizar, não recriar

Começar buscando nos arquivos em `supabase/migrations`:

- `20260926_industrial_quality_supplyshopfloor_submodules.sql` — cria lotes, separação e cartão e policies tenant-only iniciais.
- `20260927160000_erp_recebimento_lotes_certificado_v1.sql` e migrations adjacentes de certificado/rastreabilidade.
- `20260923190000_plastibor_inventory_docs_purge_v1.sql` e demais migrations de inventário.
- `20260916_enforce_erp_rbac_on_core_operations.sql` — exemplo das permissões para operações de estoque.
- `20261006090000_erp_atomic_operations_stock_integrity.sql` — objetos de integridade/estoque; confirmar data/ordem aplicada no banco antes de depender dela.
- `20261006110000_erp_maintenance_atomic_rbac.sql` — baixa de componente na conclusão de manutenção.
- `20261006130000_erp_compras_requisitions_rbac_atomic.sql` — encaminhamento de requisições.
- `20261006140000_erp_stock_separation_atomic_rbac.sql` — RPC separação/cartão recém-adicionada.

Não presumir que o nome do arquivo corresponde ao estado remoto. Comparar migration history do ambiente aprovado antes de aplicar.

## Prompt pronto para outra sessão

> Continue primeiro o módulo Estoque usando `docs/procedimentos/HANDOFF-ESTOQUE.md` e `docs/ERP-CENTRAL-ERROS-PENDENCIAS.md`. Não repita correções marcadas como validadas localmente; verifique o código atual e implemente A (EstoqueAjustes) e B (Etiquetas) antes de C/D/E, na ordem do handoff. Leia migrations e schema existente antes de qualquer SQL. Não use dados demonstrativos, não crie tabelas duplicadas, não faça commit/deploy, não assuma que a separação baixa estoque. Rode `npm run verify:release` após as mudanças, atualize o registro central com evidência real e declare bloqueio externo claramente se não houver Postgres/Supabase de teste. Depois passe para o próximo domínio do plano geral.


## Auditoria integral 2026-10-24 — adendo da branch

- Relatório consolidado: `docs/procedimentos/AUDITORIA-VISUAL-ESTOQUE-2026-10-24.md`.
- Referência visual: Central de Compras aprovada + `src/styles/estoque-standard.css`; o escopo `.stock-standard` foi aplicado também à validade/FIFO, Almoxarifado Mestre e Auditoria de Saldos.
- A Curva ABC é valor em estoque (`saldo_fisico × último custo`), não consumo anual. A Validade/FIFO é uma fila de consulta; não substitui o bloqueio transacional no consumo.
- A auditoria de saldos agora exige empresa contextualizada e pagina o histórico em blocos de 50.
- Foi adicionada a migration `supabase/migrations/20261024173000_estoque_recebimento_rbac_integrity.sql` para validar permissão `estoque.movimentar`, empresa, produto ativo e valores de recebimento; ela também revoga escrita REST direta nas tabelas de saldo físico e rastreabilidade e acesso direto ao helper de saldo. **Não aplicar em produção sem teste em homologação e revisão do histórico de migrations.**
- A migration e as mudanças de TypeScript ainda precisam de CI real, type-check, lint, build, verificação de rotas e teste Supabase/RLS/RBAC/Storage. Vercel anteriormente bloqueou por `build-rate-limit`; não interpretar esse status como compilação aprovada.
