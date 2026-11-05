# Relatório de todas as páginas — medido no banco vivo e no código publicado

**Quando:** 2026-11-05 · **Branch:** `prod-telas-novas` · **SHA auditado:** `9305a777fb16949e3aece0f074650a45a42fdcfe`
**Deployment correspondente:** Vercel Preview `7582483202` → `https://erp-sistema-industrial-7txrj11dv-plushbeauty.vercel.app` (estado `success`, CI GitHub run `42088485143` `success`)

## Como este relatório foi produzido (reproduzível por qualquer um)

| Coluna | De onde vem | Comando |
|---|---|---|
| ROTA | parse de `src/AppEntryV2.tsx` — 314 rotas, o mesmo número que o gate `verify-routes` confere | `npm run verify-routes` |
| ARQUIVO | mapa de imports (estáticos e `lazy`) resolvido no disco | — |
| PÁGINA / MÓDULO / MENU | parse de `src/components/layout/ERPHorizontalShell.tsx` | — |
| SUPABASE / SITUAÇÃO | sonda **somente GET** no PostgREST do projeto real | `npm run db:contract` |

Assinatura usada na sonda (sem chave secreta, sem escrita): `200` = tabela existe e o papel `anon` lê · `42501` = tabela **existe** mas o `anon` não tem grant (comportamento esperado com RLS; usuário logado lê) · `PGRST205` = **a tabela não existe no banco**. RPC: o REST não distingue função inexistente de função que exige parâmetros, então RPC aparece como "não confirmada", nunca como "quebrada".

**Nada aqui foi chutado:** tabela só entra na lista de ausentes se o banco respondeu `PGRST205` para ela.

## 1. Situação geral (314 rotas)

| Situação | Telas |
|---|---|
| BANCO OK | 209 |
| REDIRECIONAMENTO (apontamento para outra rota) | 75 |
| SEM CONSULTA AO SUPABASE | 19 |
| ARQUIVO NAO RESOLVIDO PELO PARSE | 7 |
| PENDENTE DE BANCO — tabela ausente | 4 |
| **Total com link de menu** | **110** |

## 2. Contrato com o banco real (medido hoje)

- Tabelas consultadas pelas telas: **174**
- Existem: **149** — 119 com leitura liberada ao `anon`, 30 exigindo sessão autenticada
- **Não existem: 25**
- RPCs chamadas pelas telas: **100**

### As 25 tabelas que faltam no banco

Todas as 25 **já têm migration escrita neste repo** (classe `MIGRATION_EXISTE_NAO_APLICADA`). Nenhuma precisa ser inventada — o código está na frente do banco.

| Tabela ausente | Migration que a cria | Telas que a pedem |
|---|---|---|
| erp_clientes_dn_config | 20261030210000_customer_debit_notes_pod.sql | CustomerDnSettings.tsx |
| erp_bom_revisoes | 20261103140000_repair_centrais_rest_schema_v1.sql | EngenhariaRevisoesBOM.tsx |
| erp_documentos_qualidade_distribuicoes | 20261004100000_sgq_integrated_erp_v1.sql | DocumentosQualidadeControle.tsx |
| erp_documentos_qualidade_aprovacoes | 20260912160000_qms_controlled_documents_workflow_v1.sql | DocumentosQualidadeControle.tsx |
| erp_documentos_qualidade_revisoes | 20260912160000_qms_controlled_documents_workflow_v1.sql | DocumentosQualidadeControle.tsx |
| erp_documentos_qualidade_solicitacoes | 20260912160000_qms_controlled_documents_workflow_v1.sql | DocumentosQualidadeControle.tsx |
| erp_engenharia_bom | 20261021180000_engenharia_bom_mestre.sql<br>20261027120000_repair_production_rest_schema.sql | EngenhariaBOM.tsx |
| erp_estoque_separacoes | 20260926_industrial_quality_supplyshopfloor_submodules.sql | EstoqueRastreabilidadeLotes.tsx<br>EstoqueSeparacao.tsx |
| erp_expedicao_nfe | 20261021100000_logistica_expedicao_nfe_etiquetas.sql | logistica/ExpedicaoNFe.tsx |
| erp_financeiro_apuracao_custos | 20260927124000_erp_quality_finance_tpm_hardening.sql | FinanceiroGraficoDesvios.tsx |
| erp_historico_ajustes_maquina | 20261020120000_erp_historico_ajustes_maquina.sql | qualidade/FichasProcesso.tsx |
| erp_fiscal_liberacoes_pedido_item | 20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql | Fiscal.tsx |
| erp_log_etiquetas | 20261021100000_logistica_expedicao_nfe_etiquetas.sql | logistica/ImpressaoEtiquetas.tsx |
| erp_permissoes_modulos | 20260912160000_qms_controlled_documents_workflow_v1.sql | DocumentosQualidadeControle.tsx |
| erp_qualidade_auditorias_planta | 20261022120000_erp_qualidade_auditorias_planta.sql | QualidadeAuditoriasPlanta.tsx |
| erp_qualidade_certificado_cotas | 20261101120000_erp_qualidade_certificados_dimensional.sql | CertificadoQualidade.tsx |
| erp_qualidade_defeitos_motivos | 20261021190000_qualidade_refugos_transacional.sql | QualidadeGraficosRefugo.tsx<br>QualidadeRefugos.tsx |
| erp_qualidade_genealogia_lotes | 20261019190000_erp_qualidade_genealogia_lotes.sql | EstoqueRastreabilidadeLotes.tsx<br>qualidade/QualidadeGenealogiaLote.tsx |
| erp_qualidade_refugos | 20261021190000_qualidade_refugos_transacional.sql | QualidadeGraficosRefugo.tsx<br>QualidadeRefugos.tsx |
| erp_qualidade_rpnc_evidencias | 20261029170000_erp_qualidade_rpnc_ged_evidencias.sql | FileTreeGED.tsx<br>QualidadeRPNC.tsx<br>QualityRpncForm.tsx |
| erp_regras_fiscais | 20260926190000_erp_fiscal_regras_v1.sql<br>20261027120000_repair_production_rest_schema.sql | FiscalImpostos.tsx |
| erp_qualidade_liberacao_lotes | 20261019150000_erp_qualidade_liberacao_lotes.sql | qualidade/QualidadeLiberacaoLotes.tsx |
| erp_sgq_auditorias | 20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql | QualityAuditsList.tsx<br>QualityRpncForm.tsx |
| erp_sgq_capa_acoes | 20261004100000_sgq_integrated_erp_v1.sql | QualityRpncForm.tsx |
| usuarios | 0001_erp_industrial_core.sql | src/AppBootstrap.tsx |

### O SQL pronto para colar

Arquivo: [`supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql`](../supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql)
Conteúdo: **27 migrations, 4292 linhas**, em ordem de timestamp e fechadas por dependência, terminando com `notify pgrst, 'reload schema';`. Todas as 23 tabelas que o pacote cria já têm DDL versionada neste repo — **nenhuma linha de DDL foi escrita por mim agora**; o gerador só copia os arquivos do repo.
Como gerar: `npm run db:contract && npm run db:pending-package` (e cole o arquivo inteiro no SQL Editor do Supabase).

**Risco medido no próprio arquivo:** statement destrutivo que roda na colagem = **0**. Os 29 `UPDATE/DELETE/DROP FUNCTION` estão dentro de corpo de função (`$$…$$`) e só executam quando alguém chama a RPC. Cada `drop policy if exists` é seguido do `create policy` da mesma política no mesmo arquivo, então nenhuma política fica ausente.

**Exclusão declarada (não foi escondida nada):** `0001_erp_industrial_core.sql` — baseline de 2024 com 21 tabelas SEM prefixo (usuarios, produtos, almoxarifados...). Quem pede "usuarios" e src/AppBootstrap.tsx:96, que e codigo legado do portao de autenticacao: a correcao e ler so erp_usuarios, nao criar a tabela velha.. A tabela `usuarios` fica de fora do banco **por decisão técnica**: criar a baseline de 2024 colocaria 21 tabelas sem prefixo (`usuarios`, `produtos`, `almoxarifados`…) ao lado das `erp_*`, ou seja, uma segunda fonte de verdade de permissão e de cadastro. O item 5 trata do código que ainda a consulta.

## 3. Resumo por módulo

| MÓDULO | TELAS | COM LINK DE MENU | BANCO OK | PENDENTES DE BANCO |
|---|---|---|---|---|
| qualidade | 42 | 0 | 38 | 0 |
| — | 20 | 0 | 0 | 0 |
| Relatórios | 19 | 19 | 18 | 0 |
| vendas | 16 | 0 | 13 | 0 |
| Estoque | 14 | 14 | 11 | 2 |
| Engenharia e PCP | 14 | 14 | 13 | 0 |
| financeiro | 12 | 0 | 2 | 0 |
| Financeiro | 11 | 11 | 11 | 0 |
| Tablet Fiscal (painel flutuante) | 10 | 10 | 9 | 0 |
| processos | 10 | 0 | 10 | 0 |
| cadastros | 8 | 0 | 3 | 0 |
| Sistema SGQ | 8 | 8 | 5 | 0 |
| pcp | 8 | 0 | 8 | 0 |
| Controladoria | 6 | 6 | 5 | 0 |
| Caixa | 5 | 5 | 4 | 0 |
| Engenharia de Produto (BOM) | 5 | 5 | 5 | 0 |
| Manutenção | 5 | 5 | 5 | 0 |
| RH / Departamento Pessoal | 5 | 5 | 5 | 0 |
| ajuda | 4 | 0 | 0 | 0 |
| compras | 4 | 0 | 1 | 0 |
| fiscal | 4 | 0 | 4 | 0 |
| Principal | 3 | 3 | 1 | 0 |
| Chão de Fábrica | 3 | 3 | 3 | 0 |
| engenharia | 3 | 0 | 3 | 0 |
| logistica | 3 | 0 | 1 | 2 |
| parametros-codigo | 2 | 0 | 0 | 0 |
| Almoxarifado | 2 | 2 | 2 | 0 |
| expedicao | 2 | 0 | 2 | 0 |
| fichas-processo | 2 | 0 | 1 | 0 |
| outlook | 2 | 0 | 2 | 0 |
| paquimetro | 2 | 0 | 1 | 0 |
| tablet | 2 | 0 | 2 | 0 |
| ficha-tecnica | 1 | 0 | 0 | 0 |
| listagem-produtos | 1 | 0 | 0 | 0 |
| pages | 1 | 0 | 0 | 0 |
| apontamento-operador | 1 | 0 | 0 | 0 |
| auditoria | 1 | 0 | 0 | 0 |
| calculo | 1 | 0 | 0 | 0 |
| perfil | 1 | 0 | 0 | 0 |
| regras | 1 | 0 | 0 | 0 |
| requisicoes | 1 | 0 | 0 | 0 |
| solicitacao | 1 | 0 | 0 | 0 |
| auditoria-comissoes | 1 | 0 | 0 | 0 |
| cadastro-decimais | 1 | 0 | 0 | 0 |
| lucratividade | 1 | 0 | 0 | 0 |
| razao-geral | 1 | 0 | 0 | 0 |
| retificacao-assistente | 1 | 0 | 0 | 0 |
| retificacao-pedido | 1 | 0 | 1 | 0 |
| conciliacao-bancaria | 1 | 0 | 0 | 0 |
| importar-extratos | 1 | 0 | 0 | 0 |
| lista-precos-cliente | 1 | 0 | 0 | 0 |
| emissao | 1 | 0 | 0 | 0 |
| * | 1 | 0 | 0 | 0 |
| admin | 1 | 0 | 1 | 0 |
| almoxarifado | 1 | 0 | 0 | 0 |
| catalogo | 1 | 0 | 1 | 0 |
| central-custos-industrial | 1 | 0 | 1 | 0 |
| clientes | 1 | 0 | 1 | 0 |
| comissoes | 1 | 0 | 0 | 0 |
| configuracao-lote | 1 | 0 | 1 | 0 |
| configuracao-lote-pcp | 1 | 0 | 1 | 0 |
| configuracoes-adm | 1 | 0 | 1 | 0 |
| controladoria | 1 | 0 | 1 | 0 |
| custos | 1 | 0 | 1 | 0 |
| documentos-qualidade | 1 | 0 | 1 | 0 |
| estoque | 1 | 0 | 0 | 0 |
| ficha-engenharia | 1 | 0 | 1 | 0 |
| fornecedores | 1 | 0 | 1 | 0 |
| industrial | 1 | 0 | 1 | 0 |
| manual-usuario | 1 | 0 | 0 | 0 |
| master | 1 | 0 | 1 | 0 |
| module-overview | 1 | 0 | 0 | 0 |
| moldes-injecao | 1 | 0 | 1 | 0 |
| mrp | 1 | 0 | 1 | 0 |
| operacao-industrial | 1 | 0 | 1 | 0 |
| recuperar-senha | 1 | 0 | 0 | 0 |
| tabela-precos | 1 | 0 | 0 | 0 |
| tabelas-preco | 1 | 0 | 0 | 0 |
| teste-erp | 1 | 0 | 1 | 0 |
| usuarios | 1 | 0 | 1 | 0 |
| usuarios-admin | 1 | 0 | 1 | 0 |
| capacidade | 1 | 0 | 0 | 0 |
| portal-operador | 1 | 0 | 0 | 0 |
| roteiros | 1 | 0 | 0 | 0 |
| imprimir | 1 | 0 | 0 | 0 |
| auditorias | 1 | 0 | 0 | 0 |
| documentos | 1 | 0 | 0 | 0 |
| ged-documentos | 1 | 0 | 0 | 0 |
| rpnc | 1 | 0 | 0 | 0 |
| rpnc-formulario | 1 | 0 | 0 | 0 |

## 4. Telas travadas por tabela ausente (as únicas 4)

| MÓDULO | PÁGINA | ARQUIVO | ROTA | MENU | SUPABASE | SITUAÇÃO |
|---|---|---|---|---|---|---|
| Estoque | Rastreabilidade de Lotes | src/pages/EstoqueRastreabilidadeLotes.tsx | /pageprincipal/estoque/rastreabilidade | 1 | 13 | PENDENTE — tabela ausente: erp_qualidade_genealogia_lotes, erp_estoque_separacoes |
| Estoque | Separação | src/pages/EstoqueSeparacao.tsx | /pageprincipal/estoque/separacao | 1 | 6 | PENDENTE — tabela ausente: erp_estoque_separacoes |
| logistica | (sem link no menu) | src/pages/logistica/ExpedicaoNFe.tsx | /pageprincipal/logistica/expedicao-nfe | 0 | 2 | PENDENTE — tabela ausente: erp_expedicao_nfe |
| logistica | (sem link no menu) | src/pages/logistica/ImpressaoEtiquetas.tsx | /pageprincipal/logistica/impressao-etiquetas | 0 | 2 | PENDENTE — tabela ausente: erp_log_etiquetas |

Aplicado o pacote do item 2, estas quatro telas passam a ter contrato completo — sem mudança de código.

## 5. Defeito novo encontrado nesta auditoria (ainda não corrigido)

| MÓDULO | PÁGINA | ARQUIVO | ROTA | MENU | SUPABASE | SITUAÇÃO |
|---|---|---|---|---|---|---|
| Acesso | Portão de autenticação | `src/AppBootstrap.tsx:96` | todas as rotas protegidas | 0 | `usuarios` (tabela legada, **não existe**) | PENDENTE DE DECISÃO |

O `AccessGate` consulta a tabela legada **`usuarios`** (sem prefixo `erp_`) quando o usuário não tem linha em `erp_usuarios`. Como essa tabela não existe, o PostgREST devolve `PGRST205`, o `catch` marca `denied` e a pessoa volta para o login. Consequência prática: hoje só entra quem já tem linha em `erp_usuarios`; o caminho de "admin global" está morto e gera HTTP 400 no Network.

Duas saídas honestas, e a escolha é sua:
- **(A) Corrigir o código** — ler apenas `erp_usuarios` (origem única, como manda a regra de não restaurar tela/código antigo) e apagar a consulta legada. **Recomendado.**
- **(B) Criar a tabela legada** — contraria "uma única origem" e criaria segunda fonte de verdade de permissão. Não recomendo.

## 6. O que falta fazer (ordem de dependência)

1. **Banco:** colar o pacote do item 2 no SQL Editor do Supabase. Destrava as 4 telas da seção 4 e a maioria das RPCs. Sem isso, qualquer teste autenticado vai continuar dando 400/42703/PGRST205.
2. **`erp_usuarios.matricula`:** a migration `20261105120000_add_erp_usuarios_matricula.sql` foi publicada na `main` por outro agente, mas **não foi aplicada** (a sonda ao vivo devolve 42703 = coluna não existe). Ela não está no pacote acima porque nenhuma tela da nossa branch depende dela. Decidir se aplica ou se rejeita (a ordem permanente é "não criar coluna artificial em erp_usuarios").
3. **Decisão da seção 5** (Portão de autenticação).
4. **Relatórios A4:** fila do item 5 da ordem geral continua — lote B de Qualidade (7 telas), Estoque (6), Compras/Vendas (12), Outros (6) e, por último, as 11 telas travadas por hash (que precisam ser re-travadas depois).
5. **CI:** publicar `verify:carousel-artes` em `.github/workflows/ci.yml` — o PAT da sessão não tem escopo `workflow`; colar pelo editor web do GitHub (linhas prontas em `docs/ERP-CENTRAL-ERROS-PENDENCIAS.md`, ERP-2026-035).
6. **Validação visual:** os previews da Vercel são protegidos por login; eu não consigo autenticar. As telas logadas só têm validação visual depois que você abrir o link do deployment do SHA atual. Nada aqui é declarado "funcional na tela" sem essa conferência sua.

## 7. Tabela completa — uma linha por rota

MENU = 1 quando existe exatamente um link no menu horizontal para aquela rota; 0 = a rota existe mas não tem entrada de menu (ou é redirecionamento).

| MÓDULO | PÁGINA | ARQUIVO | ROTA | MENU | SUPABASE | SITUAÇÃO |
|---|---|---|---|---|---|---|
| — | (sem link no menu) | FlatWorkspaceRedirect | /* | 0 | - | ARQUIVO NAO RESOLVIDO |
| — | (sem link no menu) | Navigate | /administracao-configuracoes | 0 | - | REDIRECIONA para /pageprincipal/administracao-configuracoes |
| — | (sem link no menu) | Navigate | /ajuda | 0 | - | REDIRECIONA para /pageprincipal/ajuda |
| ficha-tecnica | (sem link no menu) | Navigate | /ajuda/ficha-tecnica | 0 | - | REDIRECIONA para /pageprincipal/cadastros/ajuda/ficha-tecnica |
| listagem-produtos | (sem link no menu) | Navigate | /ajuda/listagem-produtos | 0 | - | REDIRECIONA para /pageprincipal/cadastros/ajuda/listagem-produtos |
| parametros-codigo | (sem link no menu) | Navigate | /ajuda/parametros-codigo | 0 | - | REDIRECIONA para /pageprincipal/cadastros/ajuda/parametros-codigo |
| — | (sem link no menu) | Navigate | /area-funcionario | 0 | - | REDIRECIONA para /pageprincipal/chao-de-fabrica/portal-operador |
| pages | (sem link no menu) | src/pages/SetupADMInicial.tsx | /cadastro-master | 0 | 0 | SEM CONSULTA AO SUPABASE |
| — | (sem link no menu) | Navigate | /cadastro-produtos | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos/ficha-tecnica |
| parametros-codigo | (sem link no menu) | Navigate | /cadastro-produtos/parametros-codigo | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos/parametros-codigo |
| — | (sem link no menu) | Navigate | /cadastros | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos |
| apontamento-operador | (sem link no menu) | Navigate | /chao-de-fabrica/apontamento-operador | 0 | - | REDIRECIONA para /pageprincipal/chao-de-fabrica/apontamento-operador |
| — | (sem link no menu) | Navigate | /comissoes | 0 | - | REDIRECIONA para /pageprincipal/comissoes |
| auditoria | (sem link no menu) | Navigate | /comissoes/auditoria | 0 | - | REDIRECIONA para /pageprincipal/comissoes/auditoria |
| calculo | (sem link no menu) | Navigate | /comissoes/calculo | 0 | - | REDIRECIONA para /pageprincipal/comissoes/calculo |
| perfil | (sem link no menu) | Navigate | /comissoes/perfil | 0 | - | REDIRECIONA para /pageprincipal/comissoes/perfil |
| regras | (sem link no menu) | Navigate | /comissoes/regras | 0 | - | REDIRECIONA para /pageprincipal/comissoes/regras |
| — | (sem link no menu) | Navigate | /compras | 0 | - | REDIRECIONA para /pageprincipal/compras |
| requisicoes | (sem link no menu) | Navigate | /compras/requisicoes | 0 | - | REDIRECIONA para /pageprincipal/compras/requisicoes |
| solicitacao | (sem link no menu) | Navigate | /compras/solicitacao | 0 | - | REDIRECIONA para /pageprincipal/compras/solicitacao |
| — | (sem link no menu) | Navigate | /configuracoes-adm | 0 | - | REDIRECIONA para /pageprincipal/administracao-configuracoes |
| — | (sem link no menu) | Navigate | /controladoria | 0 | - | REDIRECIONA para /pageprincipal/controladoria |
| auditoria-comissoes | (sem link no menu) | Navigate | /controladoria/auditoria-comissoes | 0 | - | REDIRECIONA para /pageprincipal/controladoria/auditoria-comissoes |
| cadastro-decimais | (sem link no menu) | Navigate | /controladoria/cadastro-decimais | 0 | - | REDIRECIONA para /pageprincipal/controladoria/cadastro-decimais |
| lucratividade | (sem link no menu) | Navigate | /controladoria/lucratividade | 0 | - | REDIRECIONA para /pageprincipal/controladoria/lucratividade |
| razao-geral | (sem link no menu) | Navigate | /controladoria/razao-geral | 0 | - | REDIRECIONA para /pageprincipal/controladoria/razao-geral |
| retificacao-assistente | (sem link no menu) | Navigate | /controladoria/retificacao-assistente | 0 | - | REDIRECIONA para /pageprincipal/controladoria/retificacao-assistente |
| retificacao-pedido | (sem link no menu) | src/features/controladoria/RetificacaoPedido.tsx | /controladoria/retificacao-pedido/:pedidoId | 0 | 4 | BANCO OK — 4 objetos |
| — | (sem link no menu) | Navigate | /documentos-qualidade | 0 | - | REDIRECIONA para /pageprincipal/qualidade/ged |
| — | (sem link no menu) | Navigate | /erp-industrial | 0 | - | REDIRECIONA para /pageprincipal |
| — | (sem link no menu) | Navigate | /financeiro | 0 | - | REDIRECIONA para /pageprincipal/financeiro |
| conciliacao-bancaria | (sem link no menu) | Navigate | /financeiro/conciliacao-bancaria | 0 | - | REDIRECIONA para /pageprincipal/financeiro/conciliacao-bancaria |
| importar-extratos | (sem link no menu) | Navigate | /financeiro/importar-extratos | 0 | - | REDIRECIONA para /pageprincipal/financeiro/importar-extratos |
| lista-precos-cliente | (sem link no menu) | Navigate | /financeiro/lista-precos-cliente | 0 | - | REDIRECIONA para /pageprincipal/financeiro/lista-precos-cliente |
| — | (sem link no menu) | Navigate | /fiscal | 0 | - | REDIRECIONA para /pageprincipal/fiscal |
| emissao | (sem link no menu) | Navigate | /fiscal/emissao | 0 | - | REDIRECIONA para /pageprincipal/fiscal/emissao |
| — | (sem link no menu) | Navigate | /master | 0 | - | REDIRECIONA para /pageprincipal/master |
| Principal | Principal | src/pages/PagePrincipal.tsx | /pageprincipal | 1 | 0 | SEM CONSULTA AO SUPABASE |
| * | (sem link no menu) | Navigate | /pageprincipal/* | 0 | - | REDIRECIONA para /pageprincipal |
| admin | (sem link no menu) | src/pages/AdminLogs.tsx | /pageprincipal/admin/logs | 0 | 2 | BANCO OK — 2 objetos |
| Relatórios | Configurações | src/pages/AdministracaoConfiguracoesGlobais.tsx | /pageprincipal/administracao-configuracoes | 1 | 6 | BANCO OK — 6 objetos |
| Tablet Fiscal (painel flutuante) | Central de Ajuda | src/pages/CentralAjuda.tsx | /pageprincipal/ajuda | 1 | 0 | SEM CONSULTA AO SUPABASE |
| ajuda | (sem link no menu) | src/pages/AssistenteAjudaERP.tsx | /pageprincipal/ajuda/assistente | 0 | 0 | SEM CONSULTA AO SUPABASE |
| ajuda | (sem link no menu) | src/pages/configuracoes/HelpBackups.tsx | /pageprincipal/ajuda/backups | 0 | 0 | SEM CONSULTA AO SUPABASE |
| ajuda | (sem link no menu) | src/pages/estoque/HelpEstoqueRecebimento.tsx | /pageprincipal/ajuda/estoque-recebimento | 0 | 0 | SEM CONSULTA AO SUPABASE |
| ajuda | (sem link no menu) | src/pages/HelpPCPFichas.tsx | /pageprincipal/ajuda/pcp-fichas-processo | 0 | 0 | SEM CONSULTA AO SUPABASE |
| almoxarifado | (sem link no menu) | Navigate | /pageprincipal/almoxarifado | 0 | - | REDIRECIONA para /pageprincipal/almoxarifado/inventario-mestre |
| Almoxarifado | Almoxarifado | src/pages/AlmoxarifadoInventario.tsx | /pageprincipal/almoxarifado/inventario-mestre | 1 | 4 | BANCO OK — 4 objetos |
| Almoxarifado | Controle e Saída de Material | src/pages/AlmoxarifadoSaidaMaterial.tsx | /pageprincipal/almoxarifado/saida-material | 1 | 7 | BANCO OK — 7 objetos |
| cadastros | (sem link no menu) | src/pages/cadastro-produtos/HelpFichaTecnica.tsx | /pageprincipal/cadastros/ajuda/ficha-tecnica | 0 | 0 | SEM CONSULTA AO SUPABASE |
| cadastros | (sem link no menu) | src/pages/cadastro-produtos/HelpListagemProdutos.tsx | /pageprincipal/cadastros/ajuda/listagem-produtos | 0 | 0 | SEM CONSULTA AO SUPABASE |
| cadastros | (sem link no menu) | src/pages/cadastro-produtos/HelpParametrosCodigo.tsx | /pageprincipal/cadastros/ajuda/parametros-codigo | 0 | 0 | SEM CONSULTA AO SUPABASE |
| cadastros | (sem link no menu) | src/pages/VendasClientes.tsx | /pageprincipal/cadastros/clientes | 0 | 7 | BANCO OK — 7 objetos |
| cadastros | (sem link no menu) | src/pages/FornecedoresIndustrial.tsx | /pageprincipal/cadastros/fornecedores | 0 | 3 | BANCO OK — 3 objetos |
| Principal | Cadastros Mestres | src/pages/cadastro-produtos/ModuloCadastroProdutos.tsx | /pageprincipal/cadastros/produtos | 1 | 0 | SEM CONSULTA AO SUPABASE |
| cadastros | (sem link no menu) | Navigate | /pageprincipal/cadastros/produtos/ficha-tecnica | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos?aba=ficha |
| Principal | Cadastro Fiscal do Produto | src/pages/ProdutosVendasIndustrial.tsx | /pageprincipal/cadastros/produtos/fiscal | 1 | 14 | BANCO OK — 14 objetos |
| cadastros | (sem link no menu) | src/pages/ProdutosVendasIndustrial.tsx | /pageprincipal/cadastros/produtos/imprimir | 0 | 14 | BANCO OK — 14 objetos |
| cadastros | (sem link no menu) | Navigate | /pageprincipal/cadastros/produtos/parametros-codigo | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos?aba=regras |
| catalogo | (sem link no menu) | src/pages/CatalogoDigital.tsx | /pageprincipal/catalogo | 0 | 3 | BANCO OK — 3 objetos |
| central-custos-industrial | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/central-custos-industrial | 0 | 3 | BANCO OK — 3 objetos |
| Chão de Fábrica | Apontamento · cartão de ponto | src/pages/ChaoDeFabricaApontamento.tsx | /pageprincipal/chao-de-fabrica/apontamento-operador | 1 | 13 | BANCO OK — 13 objetos |
| Chão de Fábrica | Chão de Fábrica | src/pages/PCPAreaFuncionario.tsx | /pageprincipal/chao-de-fabrica/portal-operador | 1 | 11 | BANCO OK — 11 objetos |
| Chão de Fábrica | Postos de Trabalho | src/components/quality/QualityPlanGate.tsx | /pageprincipal/chao-de-fabrica/postos | 1 | 3 | BANCO OK — 3 objetos |
| clientes | (sem link no menu) | src/pages/ClientesIndustrial.tsx | /pageprincipal/clientes | 0 | 3 | BANCO OK — 3 objetos |
| Caixa | Comissões | Navigate | /pageprincipal/comissoes | 1 | - | REDIRECIONA para /pageprincipal/comissoes/regras |
| comissoes | (sem link no menu) | Navigate | /pageprincipal/comissoes/auditoria | 0 | - | REDIRECIONA para /pageprincipal/controladoria/auditoria-comissoes |
| Caixa | Cálculo de Comissão | src/features/comissoes/CalculoComissao.tsx | /pageprincipal/comissoes/calculo | 1 | 5 | BANCO OK — 5 objetos |
| Caixa | Perfil do Vendedor | src/features/comissoes/PerfilVendedor.tsx | /pageprincipal/comissoes/perfil | 1 | 5 | BANCO OK — 5 objetos |
| Caixa | Regras de Comissão | src/features/comissoes/CadastroRegras.tsx | /pageprincipal/comissoes/regras | 1 | 5 | BANCO OK — 5 objetos |
| Sistema SGQ | Compras | src/pages/ComprasWorkspace.tsx | /pageprincipal/compras | 1 | 3 | BANCO OK — 3 objetos |
| Sistema SGQ | Solicitações internas | src/pages/ComprasSolicitacaoManual.tsx | /pageprincipal/compras-solicitacao | 1 | 0 | SEM CONSULTA AO SUPABASE |
| compras | (sem link no menu) | ComprasRoute | /pageprincipal/compras/ajuda | 0 | - | ARQUIVO NAO RESOLVIDO |
| compras | (sem link no menu) | ComprasRoute | /pageprincipal/compras/analise-precos | 0 | - | ARQUIVO NAO RESOLVIDO |
| compras | (sem link no menu) | ComprasRoute | /pageprincipal/compras/industrial | 0 | - | ARQUIVO NAO RESOLVIDO |
| Sistema SGQ | Pedido de compra | ComprasRoute | /pageprincipal/compras/pedido | 1 | - | ARQUIVO NAO RESOLVIDO |
| Relatórios | Relatórios | ComprasRoute | /pageprincipal/compras/relatorios | 1 | - | ARQUIVO NAO RESOLVIDO |
| Sistema SGQ | Requisições de Compra | src/pages/ComprasRequisicoes.tsx | /pageprincipal/compras/requisicoes | 1 | 7 | BANCO OK — 7 objetos |
| Sistema SGQ | Central de compras / RFQ | ComprasRoute | /pageprincipal/compras/rfq | 1 | - | ARQUIVO NAO RESOLVIDO |
| Sistema SGQ | Solicitação de Compra | src/pages/SolicitacaoCompra.tsx | /pageprincipal/compras/solicitacao | 1 | 7 | BANCO OK — 7 objetos |
| compras | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/compras/suprimentos | 0 | 3 | BANCO OK — 3 objetos |
| configuracao-lote | (sem link no menu) | src/pages/ConfiguracaoLote.tsx | /pageprincipal/configuracao-lote | 0 | 4 | BANCO OK — 4 objetos |
| configuracao-lote-pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/configuracao-lote-pcp | 0 | 3 | BANCO OK — 3 objetos |
| configuracoes-adm | (sem link no menu) | src/pages/configuracoes/ConfiguracoesADM.tsx | /pageprincipal/configuracoes-adm/* | 0 | 2 | BANCO OK — 2 objetos |
| Relatórios | Configurações de Usuário | src/pages/AccessControlSettings.tsx | /pageprincipal/configuracoes-usuario | 1 | 3 | BANCO OK — 3 objetos |
| Controladoria | Controladoria | Navigate | /pageprincipal/controladoria | 1 | - | REDIRECIONA para /pageprincipal/controladoria/lucratividade |
| Controladoria | Auditoria de Comissões | src/features/controladoria/AuditoriaComissoes.tsx | /pageprincipal/controladoria/auditoria-comissoes | 1 | 7 | BANCO OK — 7 objetos |
| Controladoria | Cadastro de Decimais | src/features/controladoria/CadastroDecimais.tsx | /pageprincipal/controladoria/cadastro-decimais | 1 | 3 | BANCO OK — 3 objetos |
| Controladoria | Lucratividade e Margens | src/features/controladoria/PainelLucratividade.tsx | /pageprincipal/controladoria/lucratividade | 1 | 4 | BANCO OK — 4 objetos |
| Controladoria | Razão Geral | src/features/controladoria/PainelRazaoGeral.tsx | /pageprincipal/controladoria/razao-geral | 1 | 4 | BANCO OK — 4 objetos |
| Controladoria | Estorno Documental | src/features/controladoria/AssistenteRetificacao.tsx | /pageprincipal/controladoria/retificacao-assistente | 1 | 2 | BANCO OK — 2 objetos |
| controladoria | (sem link no menu) | src/features/controladoria/RetificacaoPedido.tsx | /pageprincipal/controladoria/retificacao-pedido/:pedidoId | 0 | 4 | BANCO OK — 4 objetos |
| custos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/custos | 0 | 3 | BANCO OK — 3 objetos |
| documentos-qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/documentos-qualidade | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia de Produto (BOM) | Engenharia de Produto (BOM) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia de Produto (BOM) | Estrutura BOM | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/bom | 1 | 3 | BANCO OK — 3 objetos |
| engenharia | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/bom-mestre | 0 | 3 | BANCO OK — 3 objetos |
| engenharia | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/ficha | 0 | 3 | BANCO OK — 3 objetos |
| engenharia | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/fichas-processo | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia de Produto (BOM) | Catálogo de itens | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/produtos | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia de Produto (BOM) | Revisões BOM | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/revisoes-bom | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia de Produto (BOM) | Roteiros de fabricação | src/components/quality/QualityPlanGate.tsx | /pageprincipal/engenharia/roteiros | 1 | 3 | BANCO OK — 3 objetos |
| Estoque | Estoque | Navigate | /pageprincipal/estoque | 1 | - | REDIRECIONA para /pageprincipal/estoque/saldos |
| Estoque | Ajustes | src/pages/EstoqueAjustes.tsx | /pageprincipal/estoque/ajustes | 1 | 3 | BANCO OK — 3 objetos |
| Estoque | Auditoria de Saldos | src/components/quality/QualityPlanGate.tsx | /pageprincipal/estoque/auditoria-saldos | 1 | 3 | BANCO OK — 3 objetos |
| Estoque | Balanço de Estoque | src/components/quality/QualityPlanGate.tsx | /pageprincipal/estoque/balanco | 1 | 3 | BANCO OK — 3 objetos |
| Estoque | Curva ABC de valorização | src/pages/EstoqueCurvaABC.tsx | /pageprincipal/estoque/curva-abc | 1 | 4 | BANCO OK — 4 objetos |
| Estoque | Regras de Depreciação | src/components/quality/QualityPlanGate.tsx | /pageprincipal/estoque/depreciacao | 1 | 3 | BANCO OK — 3 objetos |
| Estoque | Endereços físicos | src/pages/IndustrialDataWorkspace.tsx | /pageprincipal/estoque/enderecos | 1 | 1 | BANCO OK — 1 objetos |
| Estoque | Etiquetas e código de barras | src/pages/EstoqueEtiquetas.tsx | /pageprincipal/estoque/etiquetas | 1 | 2 | BANCO OK — 2 objetos |
| Estoque | Movimentações | src/pages/IndustrialDataWorkspace.tsx | /pageprincipal/estoque/movimentacoes | 1 | 1 | BANCO OK — 1 objetos |
| Estoque | Rastreabilidade de Lotes | src/pages/EstoqueRastreabilidadeLotes.tsx | /pageprincipal/estoque/rastreabilidade | 1 | 13 | PENDENTE DE BANCO — tabela ausente: erp_qualidade_genealogia_lotes, erp_estoque_separacoes |
| estoque | (sem link no menu) | Navigate | /pageprincipal/estoque/recebimento | 0 | - | REDIRECIONA para /pageprincipal/estoque/recebimento-lotes |
| Estoque | Recebimento de lotes | src/pages/estoque/EstoqueRecebimentoLotes.tsx | /pageprincipal/estoque/recebimento-lotes | 1 | 3 | BANCO OK — 3 objetos |
| Estoque | Saldos de estoque | src/pages/EstoqueAlmoxarifadoCompact.tsx | /pageprincipal/estoque/saldos | 1 | 14 | BANCO OK — 14 objetos |
| Estoque | Separação | src/pages/EstoqueSeparacao.tsx | /pageprincipal/estoque/separacao | 1 | 6 | PENDENTE DE BANCO — tabela ausente: erp_estoque_separacoes |
| Estoque | Validade e FIFO / PEPS | src/pages/estoque/InventarioValidade.tsx | /pageprincipal/estoque/validade | 1 | 3 | BANCO OK — 3 objetos |
| expedicao | (sem link no menu) | src/pages/ExpedicaoPortaria.tsx | /pageprincipal/expedicao/portaria | 0 | 2 | BANCO OK — 2 objetos |
| expedicao | (sem link no menu) | src/pages/ExpedicaoRoteirizacao.tsx | /pageprincipal/expedicao/roteirizacao | 0 | 6 | BANCO OK — 6 objetos |
| ficha-engenharia | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/ficha-engenharia | 0 | 3 | BANCO OK — 3 objetos |
| fichas-processo | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fichas-processo | 0 | 3 | BANCO OK — 3 objetos |
| Financeiro | Financeiro | src/modules/financeiro/pages/FinanceiroWorkspace.tsx | /pageprincipal/financeiro | 1 | 8 | BANCO OK — 8 objetos |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/auditoria-comissoes | 0 | - | REDIRECIONA para /pageprincipal/controladoria/auditoria-comissoes |
| Caixa | Caixa | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/caixa | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/comissoes | 0 | - | REDIRECIONA para /pageprincipal/comissoes/calculo |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/comissoes/perfil | 0 | - | REDIRECIONA para /pageprincipal/comissoes/perfil |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/comissoes/regras | 0 | - | REDIRECIONA para /pageprincipal/comissoes/regras |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/conciliacao | 0 | - | REDIRECIONA para /pageprincipal/financeiro/conciliacao-bancaria |
| Financeiro | Conciliação Bancária | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/conciliacao-bancaria | 1 | 3 | BANCO OK — 3 objetos |
| Financeiro | Contas a pagar | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/contas-pagar | 1 | 3 | BANCO OK — 3 objetos |
| Financeiro | Contas a receber | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/contas-receber | 1 | 3 | BANCO OK — 3 objetos |
| Financeiro | Custo padrão | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/custo-padrao | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/decimais | 0 | - | REDIRECIONA para /pageprincipal/controladoria/cadastro-decimais |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/extrato | 0 | - | REDIRECIONA para /pageprincipal/financeiro/importar-extratos |
| Financeiro | Fluxo de caixa | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/fluxo-caixa | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/grafico-desvios | 0 | 3 | BANCO OK — 3 objetos |
| Financeiro | Importar Extratos | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/importar-extratos | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/lista-precos | 0 | - | REDIRECIONA para /pageprincipal/financeiro/lista-precos-cliente |
| Financeiro | Lista de Preços por Cliente | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/lista-precos-cliente | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/lucratividade | 0 | - | REDIRECIONA para /pageprincipal/controladoria/lucratividade |
| Financeiro | Notas de Débito | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/notas-debito | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/notas-debito/:id/pod | 0 | 3 | BANCO OK — 3 objetos |
| Financeiro | Configurações de Notas de Débito | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/notas-debito/configuracoes | 1 | 3 | BANCO OK — 3 objetos |
| Financeiro | Retificação de Pedido | src/components/quality/QualityPlanGate.tsx | /pageprincipal/financeiro/retificacao | 1 | 3 | BANCO OK — 3 objetos |
| financeiro | (sem link no menu) | Navigate | /pageprincipal/financeiro/retificacao-assistente | 0 | - | REDIRECIONA para /pageprincipal/controladoria/retificacao-assistente |
| Relatórios | Fiscal | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Ano Fiscal | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/ano | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Auditoria Documental | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/auditoria-documental | 1 | 3 | BANCO OK — 3 objetos |
| fiscal | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/carteira | 0 | 3 | BANCO OK — 3 objetos |
| Relatórios | Carteira de NF-e | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/carteira-nfe | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Classificação Fiscal | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/classificacao | 1 | 3 | BANCO OK — 3 objetos |
| fiscal | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/compras | 0 | 3 | BANCO OK — 3 objetos |
| fiscal | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/custos-industriais | 0 | 3 | BANCO OK — 3 objetos |
| Relatórios | Emissão de NF-e | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/emissao | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Estorno de Lançamentos | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/estorno | 1 | 3 | BANCO OK — 3 objetos |
| fiscal | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/impostos | 0 | 3 | BANCO OK — 3 objetos |
| Relatórios | NF-e de entradas | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/nfe-entradas | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Parâmetros fiscais | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/parametros | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Pendências fiscais | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/pendencias | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Previsão de caixa | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/previsao-caixa | 1 | 3 | BANCO OK — 3 objetos |
| Relatórios | Painel Razão Geral | src/components/quality/QualityPlanGate.tsx | /pageprincipal/fiscal/razao | 1 | 3 | BANCO OK — 3 objetos |
| fornecedores | (sem link no menu) | src/pages/FornecedoresIndustrial.tsx | /pageprincipal/fornecedores | 0 | 3 | BANCO OK — 3 objetos |
| industrial | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/industrial/modulo-mestre | 0 | 3 | BANCO OK — 3 objetos |
| logistica | (sem link no menu) | src/pages/logistica/ExpedicaoNFe.tsx | /pageprincipal/logistica/expedicao-nfe | 0 | 2 | PENDENTE DE BANCO — tabela ausente: erp_expedicao_nfe |
| logistica | (sem link no menu) | src/pages/logistica/ImpressaoEtiquetas.tsx | /pageprincipal/logistica/impressao-etiquetas | 0 | 2 | PENDENTE DE BANCO — tabela ausente: erp_log_etiquetas |
| logistica | (sem link no menu) | src/pages/logistica/RomaneioCarga.tsx | /pageprincipal/logistica/romaneio-carga | 0 | 6 | BANCO OK — 6 objetos |
| manual-usuario | (sem link no menu) | src/pages/ManualUsuario.tsx | /pageprincipal/manual-usuario | 0 | 0 | SEM CONSULTA AO SUPABASE |
| Manutenção | Manutenção | src/components/quality/QualityPlanGate.tsx | /pageprincipal/manutencao | 1 | 3 | BANCO OK — 3 objetos |
| Manutenção | Cronograma | src/components/quality/QualityPlanGate.tsx | /pageprincipal/manutencao/cronograma | 1 | 3 | BANCO OK — 3 objetos |
| Manutenção | Indicadores | src/components/quality/QualityPlanGate.tsx | /pageprincipal/manutencao/indicadores | 1 | 3 | BANCO OK — 3 objetos |
| Manutenção | Ordens de manutenção | src/components/quality/QualityPlanGate.tsx | /pageprincipal/manutencao/ordens | 1 | 3 | BANCO OK — 3 objetos |
| Manutenção | Plano mestre | src/components/quality/QualityPlanGate.tsx | /pageprincipal/manutencao/plano-mestre | 1 | 3 | BANCO OK — 3 objetos |
| master | (sem link no menu) | src/pages/Master.tsx | /pageprincipal/master | 0 | 7 | BANCO OK — 7 objetos |
| module-overview | (sem link no menu) | src/pages/ModuleOverviewIndustrial.tsx | /pageprincipal/module-overview | 0 | 0 | SEM CONSULTA AO SUPABASE |
| moldes-injecao | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/moldes-injecao | 0 | 3 | BANCO OK — 3 objetos |
| mrp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/mrp | 0 | 3 | BANCO OK — 3 objetos |
| operacao-industrial | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/operacao-industrial | 0 | 3 | BANCO OK — 3 objetos |
| outlook | (sem link no menu) | src/pages/OutlookCaixaEntrada.tsx | /pageprincipal/outlook/caixa-entrada | 0 | 2 | BANCO OK — 2 objetos |
| outlook | (sem link no menu) | src/pages/OutlookConfiguracao.tsx | /pageprincipal/outlook/configuracao | 0 | 3 | BANCO OK — 3 objetos |
| paquimetro | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/paquimetro | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Engenharia e PCP | src/pages/PCPWorkspace.tsx | /pageprincipal/pcp | 1 | 0 | SEM CONSULTA AO SUPABASE |
| Engenharia e PCP | Agenda de máquinas | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/agenda-maquinas | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Apontamentos | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/apontamentos | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Auditoria PCP | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/auditoria | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Carga e Capacidade | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/capacidade | 1 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/pages/pcp/ControleProcessoInjetora.tsx | /pageprincipal/pcp/controle-injetora | 0 | 9 | BANCO OK — 9 objetos |
| Relatórios | PCP · dashboard OEE | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/dashboard-oee | 1 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/execucao-industrial | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Fichas de Processo | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/fichas-processo | 1 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/fichas-processo-mestre | 0 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/industrial | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | MRP II | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/mrp-ii | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Ordens de produção | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/ordens | 1 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/ordens-industriais | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Paradas / setup | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/paradas | 1 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/pedidos-pendentes | 0 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Planejamento | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/planejamento | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Programação Gantt | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/programacao-gantt | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Roteiro de Produção (tela anterior) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/roteiro-producao | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Roteiro de Operações | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/roteiros | 1 | 3 | BANCO OK — 3 objetos |
| Engenharia e PCP | Sequenciamento | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/sequenciamento | 1 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/tablet-operador | 0 | 3 | BANCO OK — 3 objetos |
| pcp | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/pcp/valida-fluxo | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/corte | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/estamparia | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/extrusao | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/ferramentaria | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/injecao | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/montagem | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/pintura | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/prensados | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/soldagem | 0 | 3 | BANCO OK — 3 objetos |
| processos | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/processos/usinagem | 0 | 3 | BANCO OK — 3 objetos |
| Sistema SGQ | Sistema SGQ | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade | 1 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/acompanhamento-rnc | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/assinatura-it | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/auditoria-5s | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/auditorias | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/auditorias-planta | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/calibracao | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/capa | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/cep | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/certificados | 0 | 3 | BANCO OK — 3 objetos |
| Relatórios | Qualidade · RNC | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/dashboard-rnc | 1 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/documentos | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/editor-it | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/especificacoes | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/fichas-processo | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/fmea | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | Navigate | /pageprincipal/qualidade/formulario-rpnc | 0 | - | REDIRECIONA para /pageprincipal/qualidade/rpnc |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/ged | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/ged-documentos | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/ged-documentos/:id | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/ged-documentos/nova | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/genealogia-lote | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/graficos-refugo | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/industrial | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/inspecao-processo | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/inspecoes | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/instrumentos | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/ishikawa | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/liberacao-lote | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/lista-mestre | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/metodologia-8d | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/metrologia | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/pfmea | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/procedimentos | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/quarentena | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/refugos | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/relatorios-documentos | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/rnc | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | Navigate | /pageprincipal/qualidade/rnc-capa | 0 | - | REDIRECIONA para /pageprincipal/qualidade/rpnc |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/rpnc | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | Navigate | /pageprincipal/qualidade/rpnc-formulario | 0 | - | REDIRECIONA para /pageprincipal/qualidade/rpnc |
| qualidade | (sem link no menu) | Navigate | /pageprincipal/qualidade/rpnc-multiorigem | 0 | - | REDIRECIONA para /pageprincipal/qualidade/rpnc |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/sala-rnc | 0 | 3 | BANCO OK — 3 objetos |
| qualidade | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/qualidade/tablet | 0 | 3 | BANCO OK — 3 objetos |
| Sistema SGQ | Recebimentos | src/pages/RecebimentoMateriais.tsx | /pageprincipal/recebimento-materiais | 1 | 1 | BANCO OK — 1 objetos |
| recuperar-senha | (sem link no menu) | src/pages/RecuperarSenha.tsx | /pageprincipal/recuperar-senha | 0 | 0 | SEM CONSULTA AO SUPABASE |
| Relatórios | Relatórios | src/pages/DiretoriaDashboard.tsx | /pageprincipal/relatorios | 1 | 9 | BANCO OK — 9 objetos |
| RH / Departamento Pessoal | RH / Departamento Pessoal | src/pages/RHIndustrial.tsx | /pageprincipal/rh | 1 | 8 | BANCO OK — 8 objetos |
| RH / Departamento Pessoal | EPIs | src/components/quality/QualityPlanGate.tsx | /pageprincipal/rh/epis | 1 | 3 | BANCO OK — 3 objetos |
| RH / Departamento Pessoal | Entregas de EPI | src/components/quality/QualityPlanGate.tsx | /pageprincipal/rh/epis/entregas | 1 | 3 | BANCO OK — 3 objetos |
| RH / Departamento Pessoal | Funcionários | src/components/quality/QualityPlanGate.tsx | /pageprincipal/rh/funcionarios | 1 | 3 | BANCO OK — 3 objetos |
| RH / Departamento Pessoal | Turnos e escalas | src/components/quality/QualityPlanGate.tsx | /pageprincipal/rh/turnos | 1 | 3 | BANCO OK — 3 objetos |
| tabela-precos | (sem link no menu) | src/pages/AjusteGlobal.tsx | /pageprincipal/tabela-precos | 0 | 0 | SEM CONSULTA AO SUPABASE |
| tabelas-preco | (sem link no menu) | src/pages/AjusteGlobal.tsx | /pageprincipal/tabelas-preco | 0 | 0 | SEM CONSULTA AO SUPABASE |
| tablet | (sem link no menu) | src/pages/TabletDashboard.tsx | /pageprincipal/tablet/dashboard | 0 | 3 | BANCO OK — 3 objetos |
| tablet | (sem link no menu) | src/pages/TabletDashboard.tsx | /pageprincipal/tablet/home | 0 | 3 | BANCO OK — 3 objetos |
| teste-erp | (sem link no menu) | src/pages/TesteERP.tsx | /pageprincipal/teste-erp | 0 | 3 | BANCO OK — 3 objetos |
| usuarios | (sem link no menu) | src/pages/UsuariosAdmin.tsx | /pageprincipal/usuarios | 0 | 4 | BANCO OK — 4 objetos |
| usuarios-admin | (sem link no menu) | src/pages/UsuariosAdmin.tsx | /pageprincipal/usuarios-admin | 0 | 4 | BANCO OK — 4 objetos |
| Tablet Fiscal (painel flutuante) | Vendas | src/pages/DashboardComercial.tsx | /pageprincipal/vendas | 1 | 6 | BANCO OK — 6 objetos |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/analise-custos | 0 | 3 | BANCO OK — 3 objetos |
| Tablet Fiscal (painel flutuante) | Catálogo digital | src/pages/VendasCatalogoDigital.tsx | /pageprincipal/vendas/catalogo-digital | 1 | 4 | BANCO OK — 4 objetos |
| Tablet Fiscal (painel flutuante) | Gestão do catálogo | src/pages/VendasCatalogoDigitalGestao.tsx | /pageprincipal/vendas/catalogo-digital/gestao | 1 | 2 | BANCO OK — 2 objetos |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/chao-de-fabrica | 0 | 3 | BANCO OK — 3 objetos |
| vendas | (sem link no menu) | src/pages/VendasClientes.tsx | /pageprincipal/vendas/clientes | 0 | 7 | BANCO OK — 7 objetos |
| vendas | (sem link no menu) | src/pages/configuracoes/ConfiguracoesADM.tsx | /pageprincipal/vendas/configuracoes | 0 | 2 | BANCO OK — 2 objetos |
| vendas | (sem link no menu) | src/pages/DashboardComercial.tsx | /pageprincipal/vendas/dashboard | 0 | 6 | BANCO OK — 6 objetos |
| Relatórios | Vendas · gráficos | src/pages/VendasDashboardGraficos.tsx | /pageprincipal/vendas/dashboard-graficos | 1 | 2 | BANCO OK — 2 objetos |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/engenharia | 0 | 3 | BANCO OK — 3 objetos |
| vendas | (sem link no menu) | Navigate | /pageprincipal/vendas/estoque | 0 | - | REDIRECIONA para /pageprincipal/estoque/saldos |
| vendas | (sem link no menu) | src/pages/ExpedicaoPortaria.tsx | /pageprincipal/vendas/expedicao | 0 | 2 | BANCO OK — 2 objetos |
| vendas | (sem link no menu) | Navigate | /pageprincipal/vendas/fluxo-caixa | 0 | - | REDIRECIONA para /pageprincipal/financeiro/fluxo-caixa |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/materiais | 0 | 3 | BANCO OK — 3 objetos |
| Tablet Fiscal (painel flutuante) | Metas | src/pages/VendasMetas.tsx | /pageprincipal/vendas/metas | 1 | 4 | BANCO OK — 4 objetos |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/mrp | 0 | 3 | BANCO OK — 3 objetos |
| Tablet Fiscal (painel flutuante) | Novo pedido | src/pages/NovoPedido.tsx | /pageprincipal/vendas/novo-pedido | 1 | 11 | BANCO OK — 11 objetos |
| Tablet Fiscal (painel flutuante) | Orçamentos e análise de custos | src/pages/VendasAnaliseCustos.tsx | /pageprincipal/vendas/orcamentos | 1 | 7 | BANCO OK — 7 objetos |
| Tablet Fiscal (painel flutuante) | PDV / venda rápida | src/pages/VendasPDV.tsx | /pageprincipal/vendas/pdv | 1 | 5 | BANCO OK — 5 objetos |
| vendas | (sem link no menu) | src/pages/VendasPedidoStatus.tsx | /pageprincipal/vendas/pedido/:id | 0 | 6 | BANCO OK — 6 objetos |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/qualidade | 0 | 3 | BANCO OK — 3 objetos |
| vendas | (sem link no menu) | src/pages/TabelaPrecos.tsx | /pageprincipal/vendas/reajuste | 0 | 4 | BANCO OK — 4 objetos |
| Tablet Fiscal (painel flutuante) | Relatórios | src/pages/VendasRelatorios.tsx | /pageprincipal/vendas/relatorios | 1 | 2 | BANCO OK — 2 objetos |
| vendas | (sem link no menu) | src/components/quality/QualityPlanGate.tsx | /pageprincipal/vendas/sgq | 0 | 3 | BANCO OK — 3 objetos |
| Tablet Fiscal (painel flutuante) | Status do pedido | src/pages/VendasCentral.tsx | /pageprincipal/vendas/status | 1 | 6 | BANCO OK — 6 objetos |
| vendas | (sem link no menu) | src/pages/VendasTablet.tsx | /pageprincipal/vendas/tablet | 0 | 0 | SEM CONSULTA AO SUPABASE |
| — | (sem link no menu) | Navigate | /paquimetro | 0 | - | REDIRECIONA para /pageprincipal/paquimetro |
| — | (sem link no menu) | Navigate | /pcp | 0 | - | REDIRECIONA para /pageprincipal/pcp |
| capacidade | (sem link no menu) | Navigate | /pcp/capacidade | 0 | - | REDIRECIONA para /pageprincipal/pcp/capacidade |
| fichas-processo | (sem link no menu) | Navigate | /pcp/fichas-processo | 0 | - | REDIRECIONA para /pageprincipal/pcp/fichas-processo |
| portal-operador | (sem link no menu) | Navigate | /pcp/portal-operador | 0 | - | REDIRECIONA para /pageprincipal/chao-de-fabrica/portal-operador |
| roteiros | (sem link no menu) | Navigate | /pcp/roteiros | 0 | - | REDIRECIONA para /pageprincipal/pcp/roteiros |
| — | (sem link no menu) | Navigate | /produtos | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos |
| — | (sem link no menu) | Navigate | /produtos-vendas | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos |
| imprimir | (sem link no menu) | Navigate | /produtos-vendas/imprimir | 0 | - | REDIRECIONA para /pageprincipal/cadastros/produtos/imprimir |
| auditorias | (sem link no menu) | Navigate | /qualidade/auditorias | 0 | - | REDIRECIONA para /pageprincipal/qualidade/auditorias |
| documentos | (sem link no menu) | Navigate | /qualidade/documentos | 0 | - | REDIRECIONA para /pageprincipal/qualidade/ged |
| ged-documentos | (sem link no menu) | Navigate | /qualidade/ged-documentos | 0 | - | REDIRECIONA para /pageprincipal/qualidade/ged |
| paquimetro | (sem link no menu) | Navigate | /qualidade/paquimetro | 0 | - | REDIRECIONA para /pageprincipal/paquimetro |
| rpnc | (sem link no menu) | Navigate | /qualidade/rpnc | 0 | - | REDIRECIONA para /pageprincipal/qualidade/rpnc |
| rpnc-formulario | (sem link no menu) | Navigate | /qualidade/rpnc-formulario | 0 | - | REDIRECIONA para /pageprincipal/qualidade/rpnc-formulario |
| — | (sem link no menu) | Navigate | /rh | 0 | - | REDIRECIONA para /pageprincipal/rh |
