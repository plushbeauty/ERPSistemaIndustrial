# Matriz de desbloqueio — telas bloqueadas pelo banco

- Data: 2026-11-08
- Revisão: REV-MATRIZ-DESBLOQUEIO-20261108-01
- Autor: FernandoSch
- Origem: pacote `supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql` + varredura de `src/` por `supabase.from(...)`.
- Verificação: `docs/banco/VERIFICACAO-POS-MIGRATIONS.sql` (somente leitura).
- Nenhum DDL foi executado no ambiente remoto. Quem aplica o pacote é o proprietário.

## 1. Números medidos

|Medida|Valor|
|---|---|
|Blocos de migration no pacote|28|
|Tabelas tocadas pelos blocos|89|
|Funções criadas/substituídas|47|
|Tabelas declaradas ausentes no banco remoto|28|
|Telas que consultam alguma dessas tabelas|27|
|Policies sem `drop policy if exists` (antes da correção)|19|
|Policies sem `drop policy if exists` (depois da correção)|0|

### Reconciliação com a ordem de execução

A ordem solicitou uma matriz para 24 telas prioritárias. A varredura do pacote e das chamadas do código identificou 27 páginas dependentes das tabelas listadas. As 27 foram mantidas nesta matriz para não omitir dependências; as três entradas além das 24 prioritárias ficam registradas como dependências adicionais, não como autorização para removê-las ou declará-las concluídas.

## 2. Correção de idempotência aplicada nesta rodada

A varredura do pacote encontrou 19 `create policy` sem o `drop policy if exists` correspondente, o que faria o SQL Editor abortar na segunda execução com `policy already exists`.

- Origem: `supabase/migrations/20260912160000_qms_controlled_documents_workflow_v1.sql` (11 policies) e `supabase/migrations/20260921130000_erp_fornecedores_iso_precos_clientes.sql` (8 policies).
- Correção: `drop policy if exists <nome> on <tabela>;` imediatamente antes de cada `create policy`, nos dois arquivos de origem.
- Pacote regerado pelo próprio gerador (`scripts/gerar-pacote-migrations-pendentes.mjs`), sem edição manual do artefato.
- Conferido no pacote atual: 123 declarações `create policy` (112 pares únicos tabela/policy), todas com `drop policy if exists` correspondente; 96 declarações `create table` cobrindo 89 tabelas únicas, todas com `if not exists`; 90 declarações `create index`, todas com `if not exists`; 48 declarações `create function` cobrindo 47 funções únicas, todas com `or replace`; 23 criações de trigger e 23 remoções explícitas.

## 3. Telas bloqueadas

|Módulo|Página|Arquivo|Rota|Menu|Supabase|Situação|
|---|---|---|---|---|---|---|
|SGQ|Liberação de lotes|`src/pages/qualidade/QualidadeLiberacaoLotes.tsx`|`/pageprincipal/qualidade/liberacao-lote`|Grade SGQ|`erp_qualidade_liberacao_lotes`|BLOQUEADO|
|SGQ|Genealogia de lotes|`src/pages/qualidade/QualidadeGenealogiaLote.tsx`|`/pageprincipal/qualidade/genealogia-lote`|Grade SGQ|`erp_qualidade_genealogia_lotes`|BLOQUEADO|
|SGQ|FMEA|`src/pages/qualidade/FMEA.tsx`|`/pageprincipal/qualidade/fmea`|Grade SGQ|`erp_fmea_cabecalho` + `erp_fmea_*`|BLOQUEADO|
|SGQ|Plano de Controle (CPP)|`src/pages/qualidade/PlanoControle.tsx`|`/pageprincipal/qualidade/plano-controle`|Grade SGQ|`erp_plano_controle`, `erp_plano_controle_linha`|BLOQUEADO|
|SGQ|Auditorias da planta|`src/pages/QualidadeAuditoriasPlanta.tsx`|`/pageprincipal/qualidade/auditorias-planta`|Grade SGQ|`erp_qualidade_auditorias_planta`|BLOQUEADO|
|SGQ|Auditorias (lista)|`src/pages/QualityAuditsList.tsx`|`/pageprincipal/qualidade/auditorias`|Não localizado|`erp_sgq_auditorias`|BLOQUEADO + rota sem menu|
|SGQ|Refugos|`src/pages/QualidadeRefugos.tsx`|`/pageprincipal/qualidade/refugos`|Grade SGQ|`erp_qualidade_refugos`, `erp_qualidade_defeitos_motivos`|BLOQUEADO|
|SGQ|Gráficos de refugo|`src/pages/QualidadeGraficosRefugo.tsx`|`/pageprincipal/qualidade/graficos-refugo`|Grade SGQ|`erp_qualidade_refugos`, `erp_qualidade_defeitos_motivos`|BLOQUEADO|
|SGQ|Evidências de RPNC|`src/pages/QualidadeRPNC.tsx`, `src/pages/QualityRpncForm.tsx`|`/pageprincipal/qualidade/rpnc`|Grade SGQ|`erp_qualidade_rpnc_evidencias`|PARCIAL|
|SGQ|Certificados|`src/pages/CertificadoQualidade.tsx`|`/pageprincipal/qualidade/certificados`|Não localizado|`erp_qualidade_certificado_cotas`|PARCIAL|
|Documentos|Controle de documentos|`src/pages/DocumentosQualidadeControle.tsx`|`/pageprincipal/qualidade/documentos`|Não localizado|`erp_documentos_qualidade_aprovacoes`, `_revisoes`, `_solicitacoes`, `_ciencia`, `_distribuicoes`, `_leituras`, `erp_permissoes_modulos`|BLOQUEADO|
|Engenharia|BOM mestre|`src/pages/EngenhariaBOM.tsx`|`/pageprincipal/engenharia/bom-mestre`|**Sem menu**|`erp_engenharia_bom`, `erp_engenharia_bom_itens`|BLOQUEADO + rota órfã|
|Engenharia|Revisões de BOM|`src/pages/EngenhariaRevisoesBOM.tsx`|`/pageprincipal/engenharia/revisoes-bom`|Shell|`erp_bom_revisoes`|BLOQUEADO|
|Estoque|Separação|`src/pages/EstoqueSeparacao.tsx`|`/pageprincipal/estoque/separacao`|Shell|`erp_estoque_separacoes`|BLOQUEADO|
|Estoque|Rastreabilidade de lotes|`src/pages/EstoqueRastreabilidadeLotes.tsx`|`/pageprincipal/estoque/rastreabilidade`|Não localizado|`erp_estoque_separacoes`, `erp_qualidade_genealogia_lotes`|BLOQUEADO parcial|
|Logística|Expedição NF-e|`src/pages/logistica/ExpedicaoNFe.tsx`|`/pageprincipal/logistica/expedicao-nfe`|Registro de ícones|`erp_expedicao_nfe`|BLOQUEADO|
|Financeiro|Apuração de custos|`src/pages/FinanceiroGraficoDesvios.tsx`|`/pageprincipal/financeiro/grafico-desvios`|**Sem menu**|`erp_financeiro_apuracao_custos`|BLOQUEADO + rota órfã|
|Financeiro|Configuração de notas de débito|`src/pages/CustomerDnSettings.tsx`|`/pageprincipal/financeiro/notas-debito/configuracoes`|Shell|`erp_clientes_dn_config`, `erp_notas_debito_clientes`|BLOQUEADO|
|Fiscal|Regras tributárias|`src/pages/FiscalImpostos.tsx`|`/pageprincipal/fiscal/impostos`|Sidebar fiscal|`erp_regras_fiscais`|BLOQUEADO|
|Fiscal|Liberação de item de pedido|`src/pages/Fiscal.tsx`|`/pageprincipal/fiscal/*`|Sidebar fiscal|`erp_fiscal_liberacoes_pedido_item`|BLOQUEADO parcial|
|Compras|Pedido de compra|`src/pages/ComprasIndustrial.tsx`, `ComprasWorkspace.tsx`, `ComprasRelatorios.tsx`|`/pageprincipal/compras/*`|Shell|`erp_pedidos_compra`, `erp_pedidos_compra_itens`|BLOQUEADO|
|Compras|RFQ|`src/pages/ComprasRFQ.tsx`, `ComprasWorkspace.tsx`|`/pageprincipal/compras/rfq`|Shell|`erp_rfq`, `erp_rfq_itens`, `erp_rfq_fornecedores`|BLOQUEADO|
|Compras|Análise de preços|`src/pages/ComprasAnalisePrecos.tsx`, `ComprasRelatorios.tsx`|`/pageprincipal/compras/analise-precos`|**Sem menu**|`erp_rfq`|BLOQUEADO + rota órfã|
|Cadastros|Tabelas de preço|`src/pages/VendasClientes.tsx`|`/pageprincipal/vendas/clientes`|Shell|`erp_tabelas_preco`, `erp_tabelas_preco_itens`|BLOQUEADO (dependência)|
|Manutenção|Ordens de manutenção|`src/pages/ManutencaoOrdens.tsx`, `ManutencaoCentral.tsx`, `ManutencaoCronograma.tsx`|`/pageprincipal/manutencao/*`|Shell|`erp_manutencao_ordens`|BLOQUEADO (dependência)|
|Administração|Central de Evolução|`src/pages/CentralEvolucao.tsx`|`/pageprincipal/administracao/central-evolucao`|Shell|`erp_central_evolucao_item`, `erp_central_evolucao_evento`|BLOQUEADO|
|SGQ|GED · documentos|`src/pages/FileTreeGED.tsx`|`/pageprincipal/qualidade/ged`|Grade SGQ|`erp_qualidade_rpnc_evidencias` (evidência)|PARCIAL|

## 4. Bloco de migration → tabelas

|Bloco|Motivo|Tabelas criadas|
|---|---|---|
|`20260912160000_qms_controlled_documents_workflow_v1`|aprovacoes ausente|`erp_documentos_qualidade_revisoes`, `_solicitacoes`, `_ciencia`, `_aprovacoes`, `erp_permissoes_modulos`|
|`20260921130000_erp_fornecedores_iso_precos_clientes`|dependência|`erp_fornecedores`, `erp_tabelas_preco`, `erp_tabelas_preco_itens`|
|`20260925134500_manutencao_ordens_v1`|dependência|`erp_manutencao_ordens`|
|`20260926190000_erp_fiscal_regras_v1`|ausente|`erp_regras_fiscais`|
|`20260926_industrial_quality_supplyshopfloor_submodules`|separacoes ausente|`erp_requisicoes_compra`, `_itens`, `erp_estoque_lotes`, `erp_producao_paradas`, `erp_acabamentos`, `erp_estoque_separacoes`, `erp_rastreabilidade_cartoes`, `erp_qualidade_8d`, `erp_qualidade_5s_auditorias`|
|`20260927124000_erp_quality_finance_tpm_hardening`|apuracao_custos ausente|`erp_financeiro_apuracao_custos`|
|`20260927183000_pedidos_compra`|dependência|`erp_pedidos_compra`, `_itens`|
|`20261001120000_pos_rfq_operacao_comercial`|dependência|`erp_caixas`, `_movimentos`, `_movimentos_itens`, `erp_rfq`, `erp_rfq_fornecedores`, `erp_rfq_itens`|
|`20261004100000_sgq_integrated_erp_v1`|distribuicoes ausente|`erp_sgq_contadores`, `erp_sgq_capa_acoes`, `erp_sgq_auditoria`, `erp_documentos_qualidade_distribuicoes`, `_leituras`|
|`20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr`|dependência|`engenharia_produtos`, `engenharia_bom`, `_componentes`, `estoque_enderecos`, `estoque_lotes`, `estoque_saldos`, `qualidade_*`, `pcp_*`, `fiscal_*`, `rh_*`|
|`20261019150000_erp_qualidade_liberacao_lotes`|ausente|`erp_qualidade_liberacao_lotes`|
|`20261019190000_erp_qualidade_genealogia_lotes`|ausente|`erp_qualidade_genealogia_lotes`|
|`20261021100000_logistica_expedicao_nfe_etiquetas`|ausente|`erp_expedicao_nfe`, `erp_log_etiquetas`|
|`20261021180000_engenharia_bom_mestre`|ausente|`erp_engenharia_bom`, `_itens`|
|`20261021190000_qualidade_refugos_transacional`|ausente|`erp_qualidade_defeitos_motivos`, `erp_qualidade_refugos`|
|`20261022120000_erp_qualidade_auditorias_planta`|ausente|`erp_qualidade_auditorias_planta`|
|`20261024130000_repair_compras_rest_schema`|dependência|`erp_requisicoes_compra`, `_itens`, `erp_pedidos_compra`, `erp_rfq`|
|`20261027120000_repair_production_rest_schema`|engenharia_bom ausente|`erp_crm_oportunidades`, `erp_engenharia_bom`, `_itens`, `erp_regras_fiscais`, `erp_fiscal_bloco_k_estoque`, `_producao`|
|`20261029170000_erp_qualidade_rpnc_ged_evidencias`|ausente|`erp_qualidade_rpnc_evidencias`|
|`20261030210000_customer_debit_notes_pod`|ausente|`erp_clientes_dn_config`, `erp_notas_debito_clientes`|
|`20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1`|ausente|`erp_sgq_auditorias`|
|`20261101120000_erp_qualidade_certificados_dimensional`|ausente|`erp_qualidade_certificados`, `erp_qualidade_certificado_cotas`|
|`20261102031000_erp_fiscal_liberacao_item_pedido_v1`|ausente|`erp_fiscal_liberacoes_pedido_item`|
|`20261103140000_repair_centrais_rest_schema_v1`|bom_revisoes ausente|`erp_almoxarifados`, `erp_contas_pagar`, `erp_contas_receber`, `erp_financeiro_lancamentos`, `erp_bom_revisoes`, `erp_planos_inspecao`, `erp_documentos_anexos`, `erp_alertas_sistema`|
|`20261104190000_repair_updated_em_exigido_pela_trigger`|reparo|—|
|`20261104200000_repair_central_custos_tabela_e_isolamento`|reparo|`erp_centros_custos`, `erp_custos_fixos`|
|`20261106120000_erp_fmea_plano_controle_aiag_v1`|ausente|`erp_fmea_cabecalho`, `erp_plano_controle`, `erp_plano_controle_linha`|
|`20261106150000_erp_central_evolucao_v1`|ausente|`erp_central_evolucao_item`, `erp_central_evolucao_evento`|

## 5. O que ainda não está provado

- Aplicação real do pacote: depende do proprietário (SQL Editor). Sem isso, as telas da seção 3 continuam sem persistência.
- RLS por empresa: as policies são criadas pelo pacote, mas a prova só sai rodando a seção 3 e 4 do `VERIFICACAO-POS-MIGRATIONS.sql` no banco vivo.
- RPCs do "Anexo A" (76 chamadas por telas sem migration neste repo) continuam pendentes de decisão: criar, trocar a chamada ou remover a tela. Não foram inventadas.
- 4 rotas sem link de menu localizadas nesta varredura: `engenharia/bom-mestre`, `financeiro/grafico-desvios`, `compras/analise-precos`, `qualidade/auditorias`. Registradas para a Fase 4.
