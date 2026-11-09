# MATRIZ DE DESBLOQUEIO — 24 TELAS SYSNQRA

**Data:** 08/11/2026  
**Revisão:** REV-MATRIZ-BANCO-20261108-01  
**Branch auditada:** `prod-telas-novas`  
**Base de rotas:** `src/AppEntryV2.tsx`  
**Regra:** esta matriz identifica os contratos encontrados no código. Não comprova aplicação no Supabase. A comprovação ocorre pelo script `VERIFICACAO-POS-MIGRATIONS.sql`.

|Módulo|Página|Arquivo|Rota|Menu|Supabase|Situação|
|---|---|---|---|---|---|---|
|Engenharia|BOM mestre|`src/pages/EngenhariaBOM.tsx`|`/pageprincipal/engenharia/bom-mestre`|Engenharia|`erp_engenharia_bom`, `erp_engenharia_bom_itens`|Pacote SQL; aguarda aplicação e prova de RLS/grants.|
|Engenharia|Revisões BOM|`src/pages/EngenhariaRevisoesBOM.tsx`|`/pageprincipal/engenharia/revisoes-bom`|Engenharia|`erp_bom_revisoes`|Tabela no pacote. Tela aprovada; consulta/insert não informam `empresa_id` explicitamente e dependem do default/RLS. Não alterar sem autorização específica; validar o contrato no banco.|
|Financeiro|Configuração de notas de débito|`src/pages/CustomerDnSettings.tsx`|`/pageprincipal/financeiro/notas-debito/configuracoes`|Financeiro|`erp_clientes_dn_config`|Pacote SQL; a gravação informa `empresa_id`; aguarda aplicação e teste.|
|Qualidade|Documentos controlados|`src/pages/DocumentosQualidadeControle.tsx`|`/pageprincipal/qualidade/documentos`|SGQ tablet|`erp_documentos_qualidade_revisoes`, `erp_documentos_qualidade_aprovacoes`, `erp_documentos_qualidade_solicitacoes`, `erp_documentos_qualidade_distribuicoes`, `erp_permissoes_modulos`|Código filtra por empresa; pacote SQL; aguarda aplicação e teste de fluxo de aprovação/distribuição.|
|Administração|Controle de usuários e acessos|`src/pages/AccessControlSettings.tsx`|`/pageprincipal/configuracoes-usuario`|Configurações|`erp_usuarios` e RPCs `erp_admin_*`|Validar assinaturas, grants e contrato Auth/RBAC no banco; não confundir com acesso direto à tabela `erp_permissoes_modulos`.|
|Estoque|Separação de materiais|`src/pages/EstoqueSeparacao.tsx`|`/pageprincipal/estoque/separacao`|Estoque|`erp_estoque_separacoes`, `erp_estoque_lotes`, RPCs `erp_estoque_separar_material`, `erp_confirmar_consumo_op`|Incluída dependência de segurança/RBAC `20261006140000`; aguarda aplicação e teste transacional.|
|Logística|Expedição NF-e|`src/pages/logistica/ExpedicaoNFe.tsx`|`/pageprincipal/logistica/expedicao-nfe`|Logística|`erp_expedicao_nfe`|Pacote SQL; aguarda aplicação, grants e teste com documento fiscal real de homologação.|
|Fiscal|Liberação fiscal de itens do pedido|`src/pages/Fiscal.tsx`|`/pageprincipal/fiscal`|Fiscal|`erp_pedidos_venda`, `erp_pedidos_venda_itens`, `erp_fiscal_liberacoes_pedido_item`, RPC `erp_liberar_item_fiscal`|Migration identificada no pacote; aguarda aplicação e validação da autorização por item.|
|Financeiro|Gráfico de desvios de custos|`src/pages/FinanceiroGraficoDesvios.tsx`|`/pageprincipal/financeiro/grafico-desvios`|Financeiro|`erp_financeiro_apuracao_custos`|Migration identificada no pacote; aguarda aplicação e validação de leitura.|
|Financeiro|Central de custos industriais|`src/pages/CentralCustosIndustrial.tsx`|`/pageprincipal/fiscal/custos-industriais`|Financeiro/Fiscal|`erp_centros_custos`, `erp_custos_fixos`, `erp_custos_produtos`|Pacote contém reparo de estrutura e isolamento; aguarda aplicação e teste multiempresa.|
|Financeiro|Custo real por ordem de produção|`src/pages/FinanceiroCustoOP.tsx`|`/pageprincipal/financeiro/custo-op`|Financeiro|`erp_financeiro_custo_op` (VIEW), `erp_custos_produtos`, `erp_estoque_movimentos`, `erp_apontamentos_processo`, RPCs `erp_pcp_consumir_material_op`, `erp_financeiro_custo_op_registrar_indireto`, `erp_financeiro_custo_op_apurar`|Nova migration `20261108223500`; aguarda aplicação e teste de fechamento por OP.|
|Qualidade|Genealogia de lote|`src/pages/qualidade/QualidadeGenealogiaLote.tsx`|`/pageprincipal/qualidade/genealogia-lote`|SGQ tablet|`erp_qualidade_genealogia_lotes`, `erp_estoque_lotes`|Pacote SQL; aguarda aplicação e teste de rastreabilidade ponta a ponta.|
|Qualidade|Refugos industriais|`src/pages/QualidadeRefugos.tsx`|`/pageprincipal/qualidade/refugos`|SGQ tablet|`erp_qualidade_refugos`|Migration transacional no pacote; aguarda aplicação e teste de apontamento/consulta.|
|Qualidade|RPNC e evidências|`src/pages/QualidadeRPNC.tsx`|`/pageprincipal/qualidade/rpnc`|SGQ tablet|`erp_rpnc`, `erp_qualidade_rpnc_evidencias`, Storage `qualidade-evidencias`, RPC `erp_sgq_abrir_rpnc`|Pacote SQL; aguarda aplicação, policy de Storage e teste de upload/consulta.|
|Qualidade|GED de evidências|`src/pages/FileTreeGED.tsx`|`/pageprincipal/qualidade/ged`|SGQ tablet|`erp_rpnc`, `erp_qualidade_rpnc_evidencias`, `erp_clientes`, Storage do GED|Pacote SQL; validar vínculo da evidência à RPNC, tenant e URL assinada.|
|Qualidade|Auditorias por planta|`src/pages/QualidadeAuditoriasPlanta.tsx`|`/pageprincipal/qualidade/auditorias-planta`|SGQ tablet|`erp_qualidade_auditorias_planta`|Migration no pacote; o nome real usado pela tela é `erp_qualidade_auditorias_planta`, não `erp_qualidade_auditorias`.|
|Fiscal|Regras tributárias|`src/pages/FiscalImpostos.tsx`|`/pageprincipal/fiscal/impostos`|Fiscal|`erp_regras_fiscais`|Pacote SQL; aguarda aplicação e validação por empresa/UF/NCM/CFOP.|
|Qualidade|FMEA|`src/pages/qualidade/FMEA.tsx`|`/pageprincipal/qualidade/fmea`|SGQ tablet|`erp_fmea_cabecalho` e legado `qualidade_fmea`|Pacote SQL; validar compatibilidade entre contrato novo e legado antes de liberar gravação.|
|Qualidade|Plano de Controle|`src/pages/qualidade/PlanoControle.tsx`|`/pageprincipal/qualidade/plano-controle`|SGQ tablet|`erp_plano_controle` e tabelas filhas `erp_plano_controle_*`|Pacote SQL; aguarda aplicação e teste de vínculo com FMEA/produto/operação.|
|Qualidade|Templates versionados de inspeção|`src/pages/qualidade/QualidadeTemplatesInspecao.tsx`|`/pageprincipal/qualidade/templates-inspecao`|SGQ tablet|`erp_qualidade_inspecao_templates`, `erp_qualidade_inspecao_template_itens` e RPCs de salvar/publicar/revisar|Nova migration `20261108200000`; aguarda aplicação e teste de versão/snapshot na inspeção.|
|Qualidade|Liberação e bloqueio de lote|`src/pages/qualidade/QualidadeLiberacaoLotes.tsx`|`/pageprincipal/qualidade/liberacao-lote`|SGQ tablet|`erp_qualidade_liberacao_lotes`, `erp_estoque_lotes`, `erp_qualidade_liberacao_lotes_auditoria`, RPCs `erp_liberar_lote`/`erp_bloquear_lote`|Migration `20261108225000` criada; FK ao lote operacional, auditoria e autorização `nivel_admin >= 8`; aguarda aplicação e teste real.|
|PCP|Capacidade de produção|`src/pages/PCPCapacidade.tsx`|`/pageprincipal/pcp/capacidade`|PCP|`erp_maquinas`, `erp_ordens_producao`; migration também define `pcp_programacao_capacidade`|Parcial: a tela usa máquinas/OP; confirmar persistência da programação finita e sua ligação com a tabela de capacidade.|
|PCP|MRP II|`src/pages/MRPIndustrial.tsx`|`/pageprincipal/pcp/mrp-ii`|PCP|`erp_mrp_runs`, `erp_mrp_necessidades`, RPC `erp_mrp_explodir`|A tela chama `erp_mrp_explodir`; migration adicional também define `erp_pcp_mrp_explodir`. Confirmar assinatura/compatibilidade, sem presumir que os nomes são equivalentes.|
|PCP|Paradas de máquina|`src/pages/PCPParadasMaquina.tsx`|`/pageprincipal/pcp/paradas`|PCP|`erp_producao_paradas`|Tabela e RLS por empresa incluídas no pacote; aguarda aplicação e teste de apontamento/consulta.|

## Divergências do benchmark que não devem gerar tabelas duplicadas

A conferência dos arquivos atuais encontrou diferenças entre alguns nomes citados no benchmark e os contratos efetivamente usados pelas telas:

- `erp_qualidade_capa`: não encontrado no código atual. A tela de RNC usa a tabela legada `qualidade_rnc_capa`.
- `erp_qualidade_auditorias`: não encontrado como contrato da tela. A tela usa `erp_qualidade_auditorias_planta`; o dashboard também consulta `erp_sgq_auditorias`.
- `erp_historico_ajustes_maquina`: não encontrado nas consultas atuais de `FichasProcesso.tsx` nem de `ManutencaoOrdens.tsx`. A ficha atual usa `erp_fichas_processo`.
- `erp_log_etiquetas`: existe no pacote, mas não foi encontrado como escrita/leitura em `EstoqueEtiquetas.tsx`; a tela atual consulta produtos/usuários e prepara impressão. Confirmar se o log deve ser conectado antes de declarar rastreabilidade de impressão.
- A página `EngenhariaRevisoesBOM.tsx` está no manifesto de telas aprovadas. Não alterar seu layout/contrato sem autorização específica; a validação de isolamento deve ser feita primeiro pelo RLS e pelo script SQL.

## Limites desta matriz

1. As rotas foram conferidas no `AppEntryV2.tsx`; a presença de rota não prova presença no menu nem autorização correta.
2. O cruzamento definitivo rota × menu × permissão × escrita no banco continua sendo o CMP-002.
3. A prova de RLS e grants depende da aplicação das migrations no Supabase e da execução de `VERIFICACAO-POS-MIGRATIONS.sql`.
4. Não foi executado DDL remoto e nenhum dado de negócio foi criado artificialmente.
