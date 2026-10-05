# Plano de conclusão técnica do ERP SYNQRA

## Objetivo e limites

Concluir os fluxos existentes sem substituir regras de negócio por telas demonstrativas, dados falsos, stubs ou persistência local. Preservar rotas, schema e navegação já usados. Alterar o schema somente após confirmar migrations e contratos existentes; não criar tabelas duplicadas.

Este plano não declara nenhum módulo aprovado por si só. A evidência válida é a combinação de código revisado, verificações locais e, quando requer banco ou autenticação, teste no ambiente apropriado. Atualize `docs/ERP-CENTRAL-ERROS-PENDENCIAS.md` durante a execução.

## Estado conhecido ao criar este plano

- Já há correções locais registradas para PDV, Financeiro, Qualidade, Vendas, Administração/RBAC, Expedição, RH, Manutenção, Fiscal, Compras, Estoque, PCP e Acabamento. Leia os itens individuais no registro central; muitos ainda dependem de prova no banco.
- O fluxo `Estoque > Separação e Rastreabilidade` foi refeito para remover placeholders, código de barras falso, escrita direta e limites de consulta; a migration `20261006140000_erp_stock_separation_atomic_rbac.sql` cria uma RPC para gravar separação e cartão em uma transação. O código **não reserva nem baixa estoque**: o contrato operacional local não demonstra que essa tela deve fazê-lo. Essa limitação deve ser preservada até existir requisito/schema confirmado.
- O gate `npm run verify:release` foi executado após os últimos ajustes locais da tela e da migration de separação e terminou com exit code 0. Type-check, auditorias, build, verificação de artefatos e rotas passaram.
- O ESLint terminou sem erros e reportou 64 warnings de identificadores não usados em outros pontos do projeto; não houve warning da tela de separação na execução final.
- Não há `psql`, Supabase CLI, banco local ou sessão autenticada Supabase disponíveis no workspace. Migrations, RPCs, políticas RLS, isolamento por tenant e fluxos de escrita não foram executados no banco.
- Esta é uma pasta sem Git. Não há worktree isolado nem diff/status confiável. Não fazer commit ou deploy.

## Procedimento obrigatório para cada fluxo

1. **Descobrir o caminho real:** localizar rota em `src/AppEntryV2.tsx`/routers, componentes filhos, RPCs chamadas, tabelas, migrations, policies e permissões. Preservar aliases/rotas atuais.
2. **Confirmar contratos antes de editar:** ler migrations por ordem e procurar tabela, funções, índices, triggers, grants e policies. Não inferir colunas a partir do TypeScript ou do nome da tabela.
3. **Reproduzir o problema:** descrever entradas, saída atual e risco de falha. Distinguir corte intencional de paginação incompleta.
4. **Corrigir o fluxo completo:** validação e feedback acessíveis; escopo explícito de empresa nas consultas; RLS como fronteira de segurança; RBAC no servidor; operação multi-registro em RPC/transaction quando houver risco de gravação parcial; tratar erro e confirmar linhas/retorno afetados.
5. **Preservar integridade:** não criar tabelas duplicadas; não usar `any`, dados fake, fallback de sucesso, autenticação em `localStorage`, bypass de RLS, ou operação client-side privilegiada. Não inventar destino para controles sem rota/função real.
6. **Paginação e responsividade:** aplicar paginação server-side em conjuntos grandes; paginação de UI quando a listagem for relevante; manter teclado, rótulos, estados vazio/carregando/erro, tablet e mobile. Não transformar histórico naturalmente limitado em carga ilimitada.
7. **Verificar:** type-check, lint direcionado, testes existentes do módulo, revisão estática de migration e, quando disponível, teste Postgres/Supabase autenticado com empresa/perfil válidos e inválidos.
8. **Registrar:** atualizar a tabela central com sintoma, mudança, arquivos, comandos/resultados, limitações e estado honesto. Marcar "implementado localmente" separadamente de "validado no banco".

## Sequência de execução

### Fase 1 — Estabilizar estado local

- Reexecutar `npm run verify:release` após as últimas alterações de Separação.
- Corrigir falhas introduzidas por mudanças deste trabalho; não ampliar o escopo para warnings antigos sem confirmar código morto relacionado.
- Revisar estaticamente `20261006120000_erp_production_stoppages_rbac.sql`, `20261006130000_erp_compras_requisitions_rbac_atomic.sql`, `20261006140000_erp_stock_separation_atomic_rbac.sql` e migrations recentes associadas; verificar ordem e assinatura das RPCs.
- Fazer revisão focada das telas substituídas `PCPParadas.tsx`, `ComprasRequisicoes.tsx` e `EstoqueSeparacao.tsx`, principalmente correspondência de retorno de RPC, detalhes Supabase de retorno composto e estados de erro.

### Fase 2 — Integridade e banco

Quando houver Supabase/PostgreSQL de desenvolvimento autorizado:

- Confirmar versão/estado real das migrations aplicadas e schema remoto antes de aplicar qualquer migration pendente.
- Aplicar migrations em banco descartável/de desenvolvimento, na ordem, capturando erros SQL e corrigindo sem ocultar falhas.
- Testar cada RPC com: usuário válido e inválido; permissão permitida e negada; empresa certa e incorreta; referência inexistente/de outro tenant; entrada inválida; repetição/retry; falha induzida e atomicidade.
- Verificar no catálogo efetivo do banco os grants, policies permissivas/restritivas, triggers e funções `SECURITY DEFINER`; testar RLS com perfis reais de cada tenant.
- Não testar mutações em produção nem fazer deploy como substituto de homologação.

### Fase 3 — Cobertura funcional por domínio

Percorrer uma rota real por vez, incluindo as rotas filhas do domínio. A lista abaixo é uma matriz de cobertura, não afirma que tudo nela esteja pendente ou concluído:

| Domínio | Rotas/fluxos a cobrir | Foco mínimo |
|---|---|---|
| Vendas / PDV | PDV, catálogo, pedido, clientes, metas, relatórios e orçamento | Caixa/operador, preço de servidor, cliente, idempotência, reserva/baixa, impressão |
| Financeiro | títulos, caixa, fluxo, pagar/receber e baixas | Parcelas, totais, transições de estado, lançamentos concorrentes e permissões |
| Estoque / Almoxarifado | saldos, movimentos, inventário, recebimento, lotes, requisições, separação | Razão de movimentos, unidade/lote, saldo concorrente, rastreabilidade e divergência |
| Compras | requisições, RFQ/cotações, pedido, aprovação e recebimento | Itens/cabeçalho atômicos, fornecedor, status e reflexo confirmado em estoque |
| PCP / Produção | demanda/MRP, OP, programação, apontamento e paradas | Numeração, conflito de programação concorrente, consumo, produção, refugo e retomada |
| Acabamento / Expedição | acabamento, separação de pedido, volumes, romaneio e entrega | Não afirmar transferência entre estágios sem vínculo persistido e transacional |
| Fiscal / NF-e | rascunho, transmissão, retorno SEFAZ, eventos, carteira, cancelamento e pendências | Estados reais, assinatura/segredos no servidor, idempotência e autorização fiscal |
| Qualidade / SGQ | RNC, inspeção, calibração, documentos, quarentena, 8D/5S e auditoria | Versionamento, aprovação, bloqueio/quarentena e histórico imutável |
| Administração / RBAC | usuários, papéis, permissões, logs e configurações | Delegação sem escalada, auditoria, papel/tenant e ações privilegiadas server-side |
| RH | colaboradores, ponto, avaliação, treinamentos e planos | Acesso a dados pessoais, aprovação/edição e escopo de empresa |
| Manutenção | ativos, O.S., componentes, indicadores e paradas | Abertura/fechamento atômicos, vínculo com parada e baixa de componente autorizada |
| Outros módulos/rotas | todas as rotas registradas e navegáveis | Descobrir conteúdo real; não remover aliases nem inventar funcionalidade |

Para cada linha, incluir evidência de uma leitura, uma escrita principal, erros/negações e comportamento responsivo. Se o módulo não tem banco/rota/função existente, registrar como bloqueio/ausência real em vez de simular.

### Fase 4 — Interface e interação

- Confirmar visual SYNQRA, navegação compartilhada, consistência do tablet e comportamento em desktop/mobile.
- Verificar navegação por teclado/foco, diálogos, filtros, paginação, botões de ação, estados vazios/erro e impressão.
- Validar no browser com sessão de teste; o browser observado nesta execução estava em `/login`, portanto não comprova fluxos autenticados.
- Não tratar auditoria estrutural de rotas como teste visual nem teste de interação autenticado.

### Fase 5 — Gate final e relatório

Executar no estado final, sem ignorar etapas:

```powershell
npm run type-check
npm run lint:check
npm run audit:global
npm run audit:brutal
npm run audit:interactions
npm run verify:lazy-imports
npm run verify:nfe-contract
npm run build
npm run verify:build
npm run verify-routes
npm run verify:release
```

O gate `verify:release` já encadeia as verificações locais relevantes; mantenha uma execução final dele para evidência única e guarde a saída/exit code. Um exit code zero do build **não** prova RLS, banco, permissões ou integração externa.

## Critério para declarar conclusão

Somente declarar concluído quando:

- todas as rotas e fluxos existentes estiverem mapeados e sem defeito reproduzível conhecido;
- cada escrita crítica validar permissionamento no servidor e persistir atomicamente quando necessário;
- isolamento entre empresas/RLS e permissões tiverem evidência de runtime, não apenas inspeção de código;
- testes de integração dos módulos críticos e todos os gates locais passarem no estado final;
- documentação central separar correção comprovada, correção apenas local e bloqueio externo;
- pendências restantes forem apenas itens explicitamente bloqueados por terceiro/ambiente, com passos de retomada definidos. Se isso ocorrer, reportar "implementação local pronta, homologação bloqueada", não "ERP totalmente homologado".

## Próximas ações imediatas

1. Revisar assinaturas e SQL das migrations 12:00, 13:00 e 14:00 junto às telas correspondentes.
2. Continuar a cobertura por rota usando a matriz acima e acrescentar achados ao registro central.
3. Reexecutar `npm run verify:release` depois de cada grupo de mudanças; o estado atual passou, mas mudanças futuras invalidam essa evidência.
4. Se o acesso ao banco não aparecer, completar toda a análise e correção local possível e listar as provas externas pendentes para homologação.
