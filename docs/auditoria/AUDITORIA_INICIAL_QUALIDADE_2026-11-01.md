# SYSNQRA ERP INDUSTRIAL — Auditoria inicial de Qualidade
**Data:** 2026-11-01  
**Branch:** `feature/quality-module-rebuild-20261101`  
**Base:** `main` em `d3876521f7c7c320b635ae2df5c15fc397df4021`  
**Status:** auditoria estática inicial; reconstrução e homologação pendentes.

> Este documento registra evidências encontradas no código-fonte do repositório. Não representa aceite funcional, nem declara o módulo concluído.

## 1. Escopo inspecionado

Arquivos de aplicação inspecionados:
- `src/AppEntryV2.tsx` — declaração das rotas de Qualidade.
- `src/pages/QualidadeRPNC.tsx` — abertura e triagem de RPNC.
- `src/pages/QualityRpncForm.tsx` — formulário de tratamento, investigação, 6M, 5 Porquês, CAPA, evidências e relatório A4.
- `src/pages/QualidadeRPNCTratamento.tsx` — investigação e eficácia em painel separado.
- `src/pages/FileTreeGED.tsx` — árvore de evidências por cliente/RPNC.
- `src/types/qualidade.ts` — contrato TypeScript do Ishikawa 6M.
- `src/styles/quality-rpnc-form.css` — estilos e impressão do relatório RPNC.
- `src/tests/qualidade_fluxo.test.ts` — testes de integração existentes para RNC/8D/metrologia.

Migrations consultadas:
- `20260912160000_qms_controlled_documents_workflow_v1.sql`
- `20260927240000_sgq_documentos_editor_it.sql`
- `20261004100000_sgq_integrated_erp_v1.sql`
- `20261006170000_qms_recebimento_dimensional_ishikawa_v1.sql`
- `20261010120000_sgq_ged_revision_lifecycle.sql`
- `20261010130000_sgq_ged_revision_approval.sql`
- `20261010172051_sgq_documentos_revisao_anexos_workflow.sql`
- `20261010173456_documentos_qualidade_anexo_revision_rpc.sql`
- `20261011150000_erp_ged_revision_attachment_upload.sql`
- `20261011153000_erp_ged_require_original_before_approval.sql`
- `20261029170000_erp_qualidade_rpnc_ged_evidencias.sql`
- `20261029213000_sgq_rpnc_ishikawa_6m_unificado.sql`
- `20261029233000_sgq_rpnc_root_cause_effectiveness.sql`
- `20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql`

## 2. Rotas confirmadas no código

| Rota | Componente |
|---|---|
| `/pageprincipal/qualidade/rpnc` | `QualidadeRPNC` |
| `/pageprincipal/qualidade/rpnc-formulario` | `QualityRpncForm` |
| `/pageprincipal/qualidade/auditorias` | `QualityAuditsList` |
| `/pageprincipal/qualidade/ged` | `FileTreeGED` |
| `/qualidade/ged-documentos`, `/qualidade/documentos`, `/documentos-qualidade` | redirecionam para `/pageprincipal/qualidade/ged` |

A rota GED atualmente abre `FileTreeGED`, que é uma árvore de consulta de evidências das RPNCs. Não foi localizada, na árvore de arquivos da revisão, uma página dedicada de cadastro e gestão de documentos controlados com as sete abas solicitadas.

## 3. Achados confirmados

### 3.1 Ishikawa
- O formulário `QualityRpncForm.tsx` apresenta seis editores de causa em uma grade de campos separados.
- O desenho de espinha de peixe preenchível diretamente não está implementado no trecho de interface inspecionado.
- O contrato atual `Ishikawa6MData` contém seis arrays de strings: `Metodo`, `Maquina`, `Medida`, `MeioAmbiente`, `MaoDeObra` e `Material`.
- A migration `20261029213000_sgq_rpnc_ishikawa_6m_unificado.sql` valida os seis grupos como arrays JSON.
- A RPC `erp_sgq_salvar_analise_rpnc` valida strings nos arrays e cinco respostas de 5 Porquês. O contrato atual não representa, de forma estruturada, subcausas, metadados de prioridade, causa raiz marcada individualmente, evidência por causa ou categorias personalizadas.
- A reconstrução precisa manter compatibilidade de leitura com os dados 6M existentes e planejar uma evolução aditiva do payload/schema e da RPC.

### 3.2 RPNC e evidências
- A abertura de RPNC utiliza a RPC `erp_sgq_abrir_rpnc_formulario`, que verifica sessão, empresa e permissão, gera protocolo e prefixo de pasta privada.
- A migration `20261029170000_erp_qualidade_rpnc_ged_evidencias.sql` cria `erp_qualidade_rpnc_evidencias`, com FK composta por empresa/RPNC, RLS e bucket privado `qualidade-evidencias`.
- A migration `20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql` acrescenta `acao_id` e `finalidade` à tabela de evidências; portanto, esses campos não devem ser tratados como ausentes apenas com base na migration inicial.
- `QualityRpncForm.tsx` associa anexos de ações CAPA por `acao_id`, usa upload sem sobrescrita e URLs assinadas para abrir arquivos.
- A exclusão remove primeiro o registro de metadados e depois o objeto do Storage; se a remoção do objeto falhar, o código mostra aviso, mas exige reconciliação para evitar órfãos.

### 3.3 Controle de documentos — coexistência de modelos
Foram encontrados dois conjuntos documentais distintos:
1. `erp_documentos_qualidade` e tabelas relacionadas (`erp_documentos_qualidade_revisoes`, `erp_documentos_qualidade_aprovacoes`, `erp_documentos_qualidade_distribuicoes`, `erp_documentos_qualidade_leituras`, `erp_documentos_qualidade_anexos`), com workflow de revisão/aprovação/liberação, ciência, distribuição e auditoria.
2. `erp_qualidade_documentos_editor` e `erp_qualidade_documentos_revisoes`, com RPCs `erp_salvar_revisao_documento` e `erp_ativar_revisao_documento`.

Esses modelos não devem ser duplicados ou unidos por suposição. É necessário confirmar o schema atualmente aplicado e identificar quais tabelas possuem registros em produção antes de definir o modelo canônico. A UI GED atual não apresenta o cadastro completo pedido.

### 3.4 RLS e permissões
- Migrations existentes habilitam RLS em diversas tabelas do SGQ e aplicam políticas com `erp_current_empresa_id()` e permissões `erp_has_permission` ou `erp_qms_can`.
- Há funções históricas com `SECURITY DEFINER`; cada uma precisa de revisão específica de autorização, search_path, grants e validação de empresa/usuário antes de ser reutilizada.
- O código de UI usa sessão autenticada e consultas com escopo de empresa em várias operações; a segurança final depende também das políticas do banco e do Storage.
- A verificação ao vivo do schema, políticas e advisors não foi executada nesta etapa: a conexão de leitura do projeto Supabase retornou erro de permissão. Nenhuma migration foi aplicada.

### 3.5 Impressão
- `QualityRpncForm.tsx` contém uma seção de relatório própria `.qrf-report`, ativada em `@media print`.
- O CSS define tabelas, blocos de causa e campos de assinatura, mas a completude de todos os campos, paginação, cabeçalho institucional/logotipo, código/revisão do formulário, rodapé e versões retrato/paisagem ainda precisa ser testada em navegador e impressão real.
- Não foi realizada medição de dimensões computadas do DOM; não registrar alturas/larguras como verificadas até executar a aplicação no browser em resoluções definidas.

## 4. Lacunas de implementação frente à especificação

1. Ishikawa interativo no próprio desenho, com cabeça/efeito, ramos, causas e subcausas editáveis, raiz, prioridade, evidência e histórico.
2. Página única de Controle de Documentos com sete abas e cadastro dos metadados completos.
3. Definição e utilização de um único modelo documental canônico, sem perder dados dos dois conjuntos atuais.
4. Visualização/versões de anexos de documentos, distribuição por setor, ciência de leitura e lista mestra.
5. Bloqueio verificável de uso de revisão obsoleta em fluxos de produção.
6. Vínculo de documentos controlados existentes a RPNCs sem duplicação de arquivo.
7. Relatórios específicos de capa, histórico, aprovação, obsoletos, distribuição e anexos.
8. Auditoria global de todas as páginas do ERP, incluindo inventário de campos e botões.
9. Medições computadas de DOM, testes responsivos e homologação de impressão.
10. Testes autenticados de CRUD, isolamento entre empresas, permissões, Storage e reabertura dos registros.

## 5. Medições e validações ainda não executadas

| Validação | Resultado |
|---|---|
| Inspeção estática dos arquivos listados | Executada parcialmente |
| Inventário completo de todas as páginas do ERP | Pendente |
| Dimensões reais do DOM no browser | Pendente |
| Teste visual em desktop/tablet/mobile | Pendente |
| Teste real de impressão A4 retrato/paisagem | Pendente |
| Leitura ao vivo do schema Supabase | Bloqueada por permissão da conexão |
| Verificação de políticas RLS/Storage ao vivo | Pendente |
| CRUD com usuário autenticado por empresa | Pendente |
| Testes automatizados do projeto | Não executados |
| TypeScript, lint, build, rotas e CI | Não executados nesta etapa |
| Aplicação de migrations | Não executada |
| Deploy/produção | Não executado |

## 6. Próximas etapas obrigatórias

1. Restabelecer acesso de leitura ao projeto Supabase e inspecionar tabelas, colunas, FKs, policies, buckets, funções e migrations aplicadas.
2. Definir o modelo documental canônico com base nos dados existentes; não apagar nem migrar dados sem plano reversível.
3. Implementar o diagrama SVG interativo e persistência compatível, com validação transacional e histórico.
4. Construir a página de documentos em abas, reutilizando o workflow canônico e o Storage privado.
5. Integrar referências documentais às RPNCs e ações CAPA.
6. Inventariar todas as rotas e páginas do ERP; medir DOM em navegador e revisar cada formulário e botão.
7. Corrigir formulários específicos de impressão e executar testes autenticados, build, TypeScript, lint, rotas e CI.
8. Submeter PR em modo draft para revisão; não fazer merge nem publicar sem autorização.

## 7. Proteção de telas aprovadas

Nenhuma tela aprovada foi alterada nesta auditoria. A branch foi criada a partir de `main`; a implementação deve limitar alterações a Qualidade, rotas/integrações estritamente necessárias, migrations aditivas e testes correspondentes.
