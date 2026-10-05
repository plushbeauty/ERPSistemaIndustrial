# Handoff do módulo Estoque / Almoxarifado

Este documento permite que outra sessão continue o módulo sem refazer a triagem básica nem confundir uma implementação local com operação homologada.

## Estado geral

- O módulo tem telas reais e algumas RPCs transacionais; **não está todo concluído**.
- As correções de listagem/inventário do item `ERP-2026-026` e o fluxo da separação do item `ERP-2026-032` estão no registro central. O fluxo de separação foi implementado e passou pelos gates locais, mas a nova migration ainda não foi aplicada/testada em Postgres/Supabase.
- Sem banco local, `psql`, Supabase CLI ou sessão Supabase autenticada, não declarar RLS/RPC/tenant validados.
- Não fazer deploy para tentar validar. Confirmar primeiro schema e migrations aplicados em ambiente de desenvolvimento autorizado.
- Não criar tabela duplicada. A separação usa `erp_estoque_separacoes` e `erp_rastreabilidade_cartoes`, já existentes.

## Já feito / pode ser considerado apenas localmente corrigido

1. `src/pages/EstoqueAlmoxarifado.tsx`
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
   - Existe fluxo real com upload de certificado e RPC `fn_receber_lote_almoxarifado`, mas a consulta de produtos usa `.limit(2000)` e a limpeza compensatória do arquivo pode falhar sem sinalização.
   - O contrato da RPC e storage precisa ser comparado com migrations/catálogo remoto antes de mexer.

## Pendências prioritárias, em ordem sugerida

### A. Ajustes de estoque — tela hoje demonstrativa

Arquivo: `src/pages/EstoqueAjustes.tsx`.

Evidência observada: saldos `450` e `25` vêm do estado inicial local; o botão de novo apenas zera valores; o botão de efetivar navega para `/estoque`; a lupa de produto recebe `value=""` e `onChange` vazio; lote/posição/motivo não são persistidos; o laudo só chama `window.print()`.

Passos:

1. Mapear rota, tabelas de lote/razão/auditoria e RPCs em migrations; buscar também `erp_inventario_auditoria_saldos`, `erp_estoque_lotes`, `erp_produto_estoque` e ajustes preexistentes.
2. Confirmar se avaria altera apenas o lote, saldo global, ambos, ou exige quarentena; confirmar unidade, motivo obrigatório, custo e política de autorização. Não decidir a partir do mock atual.
3. Implementar lookup de produto/lote real e carregar saldo atual do tenant; remover valores iniciais fixos.
4. Garantir que perda ≤ quantidade disponível, regras para lote/quarentena e concorrência sejam validadas server-side.
5. Usar RPC transacional que atualize o saldo/lote e escreva o movimento/auditoria imutável juntos; criar migration somente se não existir contrato canônico.
6. Confirmar resultado com retorno da RPC; separar "novo ajuste" do sucesso/navegação; botão laudo só imprime dados persistidos.
7. Testar perfil sem `estoque.movimentar`, empresa/lote alheios, quantidade maior que saldo, repetição e falha transacional.

### B. Etiquetas — consulta/identificação atualmente incorreta

Arquivo: `src/pages/EstoqueEtiquetas.tsx`, rota `/estoque/etiquetas`.

Evidência observada: carrega até 500 itens de `erp_pedidos_venda_itens` sem `empresa_id`; filtra a referência localmente procurando texto no UUID do item/produto, não por pedido ou NF-e; produtos são consultados por IDs sem tenant; query `.in()` pode receber lista vazia; quantidade impressa permite zero e não é usada pela impressão; destino "impressora operacional" é texto fixo; não há renderização de barcode real.

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

Evidência observada: leituras de `erp_produtos` e `erp_produto_estoque` não têm empresa explícita nem paginação. Confirmar as policies e chaves compostas existentes. A implementação classifica usando valor atual (custo médio × quantidade) e a série ordenada, mas o rótulo "anual" não é baseado em movimento histórico no código visto.

Passos:

1. Confirmar fórmula operacional aprovada: valor em estoque ou consumo/venda anual; confirmar data-base e custo.
2. Filtrar ambos os conjuntos pelo tenant e compor saldos pela chave `empresa_id + produto_id`, não apenas produto.
3. Usar páginas completas ou query/RPC agregada server-side conforme volume; propagar erros.
4. Corrigir rótulo do relatório (anual vs snapshot) se não usar razão histórico; definir os limites A/B/C e garantir soma de percentuais/valor.
5. Adicionar tabela/lista com itens classificados, totais e paginação/exports com data-base; testar tenant sem dados e saldo/custo nulos.

### D. Balanço e auditoria de saldos

Arquivos: `src/features/inventario/BalancoEstoque.tsx` e `src/features/inventario/AuditoriaSaldos.tsx`, rotas devem ser confirmadas em `src/AppEntryV2.tsx`.

Evidência observada no balanço: filtro de data, almoxarifado e método de custo existem, mas só alteram estado visual; lista de produtos tem `.limit(5000)` e não tem filtro explícito de empresa; almoxarifados sem tenant explícito; os saldos/custos exibidos vêm de `erp_produtos.estoque_atual`/`custo_medio`, sem snapshot histórico; o status de todos os produtos é derivado como ATIVO/DIVERGENTE sem status real de lote. O export não prova um balanço histórico.

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

- `/estoque`, `/almoxarifado`, `/estoque/saldos` → `src/pages/EstoqueAlmoxarifado.tsx`
- `/estoque/ajustes` → `src/pages/EstoqueAjustes.tsx`
- `/estoque/separacao` → `src/pages/EstoqueSeparacao.tsx`
- `/estoque/etiquetas` → `src/pages/EstoqueEtiquetas.tsx`
- `/estoque/recebimento-lotes`, `/estoque/recebimento` → `src/pages/estoque/EstoqueRecebimentoLotes.tsx`
- `/estoque/curva-abc` → `src/pages/EstoqueCurvaABC.tsx`
- `/inventario/balanco` → `src/features/inventario/BalancoEstoque.tsx`
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
