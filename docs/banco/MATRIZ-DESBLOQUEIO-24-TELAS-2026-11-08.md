# Matriz de dependências — 24 telas prioritárias

**Projeto:** SYSNQRA ERP INDUSTRIAL  
**Data:** 08/11/2026  
**Revisão:** REV-MATRIZ-BANCO-20261108-01  
**Branch de referência:** `prod-telas-novas`  
**Commit-base desta matriz:** `038175332b9a4c6c4ab972cbe5796519e921e805`

## Critério

Matriz estática construída pelo cruzamento de `src/AppEntryV2.tsx`, `src/components/layout/ERPHorizontalShell.tsx`, arquivos de tela e do pacote `supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql`.

**Importante:** o conector Supabase não autorizou leitura de migrations/tabelas do projeto remoto. Portanto, a coluna Supabase registra dependências declaradas no código/migrations; não afirma que os objetos estejam aplicados ou que a gravação remota esteja validada.

|Módulo|Página|Arquivo|Rota|Menu|Supabase|Situação|
|---|---|---|---|---|---|---|
|SGQ|Painel consolidado| `src/pages/QualidadeDashboardSGQ.tsx` | `/pageprincipal/qualidade` | Sistema SGQ → tablet | `erp_inspecoes`, `erp_documentos_qualidade`, `erp_rpnc`, `erp_qualidade_refugos`, `erp_sgq_auditorias`, `erp_equipamentos_medicao`; RPC `erp_current_empresa_id` | Indicadores reais adicionados; validar schema remoto e RLS. |
|SGQ|RPNC unificada| `src/pages/QualityRpncUnified.tsx`, `QualidadeRPNC.tsx`, `QualityRpncForm.tsx`, `QualidadeRPNCMultiorigem.tsx` | `/pageprincipal/qualidade/rpnc` | Sistema SGQ → tablet | `erp_rpnc`, `erp_setores`, `erp_qualidade_rpnc_evidencias`, `erp_sgq_capa_acoes`; RPCs `erp_sgq_abrir_rpnc`, `erp_sgq_transicionar_rpnc`, `erp_sgq_salvar_analise_rpnc`, `erp_sgq_registrar_eficacia_rpnc` | Abertura e tratamento usam banco/RPC; impressão A4 compartilhada adicionada na aba de abertura. |
|SGQ|Auditorias SGQ| `src/pages/QualityAuditsList.tsx` | `/pageprincipal/qualidade/auditorias` | Sistema SGQ → tablet | `erp_sgq_auditorias`, `erp_rpnc`, `erp_usuarios`; RPC `erp_sgq_vincular_rpnc_auditoria` | Migration `20261031100000` declarada no pacote; aplicação remota pendente. |
|SGQ|Auditorias por planta| `src/pages/QualidadeAuditoriasPlanta.tsx` | `/pageprincipal/qualidade/auditorias-planta` | Sistema SGQ → tablet | `erp_qualidade_auditorias_planta`; RPC `erp_qualidade_auditoria_planta_defaults` | Migration declarada; validar RLS, GRANT e persistência remota. |
|SGQ|GED — documentos controlados| `src/pages/qualidade/GEDDocumentos.tsx` | `/pageprincipal/qualidade/ged-documentos` | Sistema SGQ → tablet | `erp_documentos_qualidade`, `erp_documentos_qualidade_revisoes`, `erp_documentos_qualidade_solicitacoes`, `erp_documentos_qualidade_aprovacoes`, `erp_documentos_qualidade_distribuicoes`, `erp_documentos_qualidade_leituras`; RPCs `erp_qms_criar_documento`, `erp_qms_criar_revisao`, `erp_qms_salvar_revisao`, `erp_qms_transicionar_revisao`, `erp_qms_distribuir_revisao`, `erp_qms_confirmar_leitura` | Fluxo versionado presente no código/migrations; conferir objetos e permissões remotas. |
|SGQ|Documentos da qualidade| `src/pages/DocumentosQualidadeControle.tsx` | `/pageprincipal/qualidade/documentos` | Sistema SGQ → tablet | `erp_documentos_qualidade`, `erp_documentos_qualidade_revisoes`, `erp_documentos_qualidade_aprovacoes`, `erp_documentos_qualidade_distribuicoes` | Tela existente; verificar se usa o workflow GED oficial sem duplicar fluxo. |
|SGQ|FMEA AIAG| `src/pages/qualidade/FMEA.tsx` | `/pageprincipal/qualidade/fmea` | Sistema SGQ → tablet | `erp_fmea_cabecalho`, `qualidade_fmea`; RPCs `erp_fmea_matriz`, `erp_fmea_resumo` | Migration `20261106120000`; verificar aplicação, RLS e vínculo com Plano de Controle. |
|SGQ|Plano de Controle| `src/pages/qualidade/PlanoControle.tsx` | `/pageprincipal/qualidade/plano-controle` | Sistema SGQ → tablet | `erp_plano_controle`, `erp_plano_controle_linha`; RPC `erp_plano_controle_matriz` | Migration `20261106120000`; impressão já usa `abrirRelatorio`/A4 compartilhado. |
|SGQ|Certificado de qualidade| `src/pages/CertificadoQualidade.tsx` | `/pageprincipal/qualidade/certificados` | Sistema SGQ → tablet | `erp_qualidade_certificados`, `erp_qualidade_certificado_cotas`; RPC `erp_qualidade_certificado_criar`; Storage `qualidade-certificados` | Impressão migrada para A4 compartilhado; homologar leitura de Storage e dados remotos. |
|SGQ|Parecer/liberação de lote| `src/pages/qualidade/QualidadeLiberacaoLotes.tsx` | `/pageprincipal/qualidade/liberacao-lote` | Sistema SGQ → tablet | `erp_qualidade_liberacao_lotes`, `erp_produtos` | **Bloqueio funcional:** grava parecer documental; ainda não libera/bloqueia o lote operacional. RPCs `erp_liberar_lote` e `erp_bloquear_lote` são pendentes. |
|SGQ/Estoque|Genealogia de lote| `src/pages/qualidade/QualidadeGenealogiaLote.tsx` | `/pageprincipal/qualidade/genealogia-lote` | Sistema SGQ → tablet | `erp_qualidade_genealogia_lotes`, `erp_estoque_lotes_rastreabilidade`, `erp_estoque_lotes` | Migration declarada; validar genealogia de ponta a ponta com lotes reais. |
|SGQ/Estoque|Quarentena| `src/pages/qualidade/QualidadeQuarentena.tsx` | `/pageprincipal/qualidade/quarentena` | Sistema SGQ → tablet | `estoque_lotes`, `estoque_saldos`, `estoque_enderecos`; trigger `erp_quality_quarantine_lot` | Validar transação, endereço de quarentena e vínculo com inspeção/RNC. |
|SGQ|Metrologia| `src/components/quality/MetrologiaVencimentoAlerta.tsx` + renderer `CentraisIndustriais module="metrologia"` | `/pageprincipal/qualidade/metrologia` | Sistema SGQ → tablet | `erp_equipamentos_medicao`; RPC `erp_current_empresa_id` | Alerta com vazio/erro explícito e ordenação por criticidade; validar colunas e datas no banco remoto. |
|SGQ/PCP|Refugo| `src/pages/QualidadeRefugos.tsx` | `/pageprincipal/qualidade/refugos` | Sistema SGQ → tablet | `erp_qualidade_refugos`, `erp_qualidade_defeitos_motivos`, `erp_ordens_producao`; RPC `erp_registrar_refugo` | Fluxo transacional declarado; validar GRANT/RLS e limites de quantidade por OP. |
|Estoque|Separação| `src/pages/EstoqueSeparacao.tsx` | `/pageprincipal/estoque/separacao` | Estoque → Separação | `erp_estoque_separacoes`, `erp_pedidos_venda`, `erp_pedidos_venda_itens` | Migration declarada; testar reserva, baixa e rastreabilidade de origem. |
|Logística/Fiscal|Expedição NF-e| `src/pages/logistica/ExpedicaoNFe.tsx` | `/pageprincipal/logistica/expedicao-nfe` | Rota existe; vínculo direto de menu deve ser confirmado | `erp_expedicao_nfe`, `erp_log_etiquetas`, `erp_fiscal_liberacoes_pedido_item`; RPC `erp_liberar_item_fiscal` | Validar integração com pedido, etiqueta, liberação fiscal e documento autorizado. |
|Engenharia|Workspace BOM genérico| `src/pages/IndustrialDataWorkspace.tsx` | `/pageprincipal/engenharia/bom` | Engenharia de Produto (BOM) → Estrutura BOM | `engenharia_produtos`, `engenharia_bom`, `engenharia_bom_componentes` | **CMP-003:** classificar formalmente como coberta pelo renderer genérico ou exigir tela própria. |
|Engenharia|BOM mestre| `src/pages/EngenhariaBOM.tsx` | `/pageprincipal/engenharia/bom-mestre` | Engenharia de Produto (BOM) | `erp_engenharia_bom`, `erp_engenharia_bom_itens`; RPCs `erp_salvar_bom_mestre`, `erp_homologar_bom_mestre` | Migration declarada; validar revisão, homologação e explosão multinível. |
|Engenharia|Revisões BOM| `src/pages/EngenhariaRevisoesBOM.tsx` | `/pageprincipal/engenharia/revisoes-bom` | Engenharia de Produto (BOM) → Revisões BOM | `erp_bom_revisoes`, `erp_engenharia_bom` | Migration declarada; validar integridade e vínculo da revisão à BOM mestre. |
|Fiscal|Parâmetros fiscais genéricos| `src/pages/IndustrialDataWorkspace.tsx` | `/pageprincipal/fiscal/parametros` | Fiscal → Parâmetros fiscais | `erp_regras_fiscais`, `fiscal_parametros_tributarios` | **CMP-003:** renderer genérico; validar se atende cadastro fiscal completo. |
|Fiscal|NF-e de entradas genérica| `src/pages/IndustrialDataWorkspace.tsx` | `/pageprincipal/fiscal/nfe-entradas` | Fiscal → NF-e de entradas | `fiscal_nfe_entradas`, `erp_documentos_fiscais` | **CMP-003:** renderer genérico; validar importação, escrituração e rastreio de XML. |
|Financeiro/Fiscal|Custos industriais| `src/pages/CentralCustosIndustrial.tsx` | `/pageprincipal/fiscal/custos-industriais` | Fiscal/Controladoria → custos | `erp_centros_custos`, `erp_custos_fixos`, `erp_financeiro_apuracao_custos` | Central de custos existente; **custo real fechado por OP ainda pendente**. |
|Fiscal|Emissão NF-e| `src/pages/NFeEmissao.tsx` | `/pageprincipal/fiscal/emissao` | Fiscal → Emissão de NF-e | `erp_documentos_fiscais`, `erp_documentos_fiscais_itens`, `erp_notas_fiscais`, `erp_config_fiscal`; RPCs `erp_reservar_numero_nfe`, `erp_salvar_rascunho_nfe`, `erp_nfe_pagamento_salvar`, `erp_nfe_pagamento_consultar` | NF-e implementada; homologação SEFAZ depende de certificado digital e credenciais externas. |
|Vendas/Logística|Expedição/portaria| `src/pages/ExpedicaoPortaria.tsx` | `/pageprincipal/vendas/expedicao` | Vendas → Expedição | `erp_expedicoes`, `erp_veiculos`, `erp_motoristas`; RPC `erp_current_empresa_id` | Fluxo de portaria consulta e atualiza romaneios reais; testar concorrência e autorização de liberação. |

## Pendências transversais que a matriz não resolve

1. O banco remoto ainda precisa ser consultado com permissão adequada; o script `VERIFICACAO-POS-MIGRATIONS.sql` faz a prova de catálogo após a aplicação.
2. As políticas RLS precisam ser testadas com duas empresas e papéis distintos; existência de `empresa_id` não prova isolamento.
3. A liberação operacional de lote continua bloqueada até as RPCs transacionais `erp_liberar_lote` e `erp_bloquear_lote`.
4. Templates de inspeção versionados e custo real por OP exigem novas migrations e telas.
5. NFS-e permanece fora desta matriz: não há rota de emissão no inventário conferido; a ordem vigente pede apenas especificação até decisão do provedor.
6. As 11 rotas de `IndustrialDataWorkspace` e os contratos de auth/RLS continuam sob CMP-003/CMP-004; esta matriz não declara essas auditorias concluídas.

**Resultado:** 24 fluxos mapeados no código. Banco remoto, permissões efetivas e persistência real permanecem pendentes de prova no Supabase.
