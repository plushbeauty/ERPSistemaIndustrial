# Auditoria integral de completude — SYSNQRA ERP INDUSTRIAL

**Data:** 10/11/2026  
**Revisão:** REV-AUDITORIA-INTEGRAL-20261110-01  
**Base examinada:** `main` — `e509cf634f155cb41c0c8a6d05364fe8f71f7d33`  
**Supabase:** `zsklkydlawgvwgnvxwwx`  
**Escopo:** telas, rotas, manifesto aprovado, contratos do banco, segurança/RLS e benchmark de mercado.

## 1. Resultado da verificação atual

| Verificação | Resultado |
|---|---:|
| Arquivos no Git tree | 1.085 |
| Rotas literais encontradas em `AppEntryV2.tsx` | 325 |
| Imports lazy identificados | 191 |
| Telas protegidas no manifesto oficial | 222 |
| Divergências de hash entre manifesto e `main` | **0** |
| Tabelas públicas no Supabase | 267 |
| Registros de migrations no Supabase | 244 |
| Tabelas de contratos críticos verificadas nesta auditoria | 30 |
| Contratos de tabela ausentes entre os 30 verificados | **23** |

**Importante:** 325 é a contagem das declarações literais de rota encontradas no arquivo atual, não uma prova de que todas as rotas tenham menu, autorização por ação e fluxo de gravação. O CMP-002 continua exigindo essa classificação.

O manifesto está coerente com os arquivos atuais de `main`: nenhum hash divergente foi encontrado nas 222 entradas. Isso é positivo e deve ser preservado. Não atualizar hashes para mascarar regressões.

## 2. Bloqueios comprovados no Supabase

As seguintes tabelas referenciadas pela matriz de telas não existem no schema público consultado:

| Módulo/telas afetadas | Contratos ausentes |
|---|---|
| Engenharia — BOM e revisões | `erp_engenharia_bom`, `erp_engenharia_bom_itens`, `erp_bom_revisoes` |
| Financeiro — configuração de notas de débito | `erp_clientes_dn_config` |
| SGQ — documentos controlados | `erp_documentos_qualidade_revisoes`, `erp_documentos_qualidade_aprovacoes`, `erp_documentos_qualidade_solicitacoes`, `erp_documentos_qualidade_distribuicoes`, `erp_permissoes_modulos` |
| Estoque — separação | `erp_estoque_separacoes` |
| Logística — expedição NF-e | `erp_expedicao_nfe` |
| Fiscal — liberação por item | `erp_fiscal_liberacoes_pedido_item` |
| Qualidade — genealogia, refugo e evidências RPNC | `erp_qualidade_genealogia_lotes`, `erp_qualidade_refugos`, `erp_qualidade_rpnc_evidencias` |
| Qualidade — auditorias | `erp_qualidade_auditorias_planta`, `erp_sgq_auditorias` |
| Fiscal — regras tributárias | `erp_regras_fiscais` |
| Qualidade — FMEA e Plano de Controle | `erp_fmea_cabecalho`, `erp_plano_controle` |
| Qualidade — templates versionados | `erp_qualidade_inspecao_templates`, `erp_qualidade_inspecao_template_itens` |
| Qualidade — liberação/bloqueio de lote | `erp_qualidade_liberacao_lotes`, `erp_qualidade_liberacao_lotes_auditoria` |
| PCP — capacidade finita | `erp_pcp_programacao_capacidade` |

### Contratos presentes que ainda exigem teste funcional

- `erp_financeiro_apuracao_custos` existe; não declarar o fechamento por OP concluído sem executar o fluxo real de consumo, mão de obra, indiretos, idempotência e reconciliação com a OP.
- `erp_mrp_runs` e `erp_mrp_necessidades` existem; conferir assinatura da RPC e a ligação entre necessidade líquida, capacidade e emissão de OP.
- `erp_producao_paradas` existe; testar abertura, encerramento, vínculo com máquina/OP e reflexo no OEE.
- `erp_qualidade_calibracoes_historico` existe; testar cálculo de vencimento, bloqueio de instrumento vencido e evidência de calibração.

**Não executar DDL improvisado.** Antes de aplicar migrations, reconciliar o histórico: há 279 arquivos SQL no repositório e 244 registros no Supabase, mas os identificadores/timestamps históricos não correspondem diretamente aos prefixos dos arquivos. A diferença numérica não deve ser tratada como quantidade de migrations pendentes. Cada migration deve ser conferida por conteúdo, dependências, histórico e idempotência.

## 3. Tela de templates de inspeção: código existe, banco não

A tela `src/pages/qualidade/QualidadeTemplatesInspecao.tsx` está registrada no código e a migration `20261108200000_qualidade_templates_inspecao_versionados.sql` existe no repositório. As duas tabelas usadas pela tela não existem no Supabase consultado.

**Classificação atual: BLOQUEADA PARA USO REAL.** Não é suficiente a rota abrir; cadastro, itens, revisão, publicação e snapshot na inspeção dependem da migration e de teste autenticado por empresa.

A central de Metrologia já contém o componente de alerta de calibração vencida/a vencer. O benchmark de 08/11 que marcava esses dois incrementos como ausentes está desatualizado no código; a validação de runtime e do banco continua pendente.

## 4. Segurança e desempenho — avisos atuais do Advisor

| Achado | Quantidade | Tratamento |
|---|---:|---|
| Funções `SECURITY DEFINER` executáveis por `authenticated` | 41 | Revisão individual de autenticação, tenant, RBAC, grants e search_path; não revogar em massa |
| Políticas RLS permissivas duplicadas/sobrepostas | 22 | Consolidar somente após provar equivalência de acesso |
| Tabela com RLS sem policy (`rh.turnos`) | 1 | Confirmar se deve ser privada/inacessível; definir policy mínima antes de liberar |
| Chaves estrangeiras sem índice de cobertura | 229 | Priorizar tabelas e consultas de maior volume |
| Índices não utilizados | 321 | Não remover sem medir; alguns podem atender relatórios/rotinas raras |
| Índice duplicado | 1 | Revisar duplicidade em `erp_pedidos_venda_itens` |
| Proteção de senha comprometida no Auth | 1 aviso | Habilitar após validar configuração de Auth |

Os avisos do Advisor não significam, isoladamente, que cada função ou policy seja vulnerável. A revisão precisa considerar o corpo da função e a autorização real; nenhuma policy será enfraquecida para fazer a tela funcionar.

## 5. Benchmark funcional — recursos que devem ser cobrados das telas

O benchmark não é cópia visual. É uma régua de cobertura funcional:

- **SoftExpert QMS/Inspection:** ciclo de vida documental, revisão/aprovação/distribuição, RNC, CAPA, auditoria, evidências, workflows, inspeção móvel, amostragem configurável e análise de resultados.
- **Senior Gestão Empresarial:** inspeção de recebimento/processo, avaliação e bloqueio de fornecedor, lote/validade, rastreabilidade e controle de instrumentos/calibração.
- **Sankhya Controle de Qualidade:** tratamento estruturado de não conformidade, documentos, qualificação de fornecedor, mudanças e formulários padronizados.
- **TOTVS Gestão da Qualidade:** auditoria, documentos, não conformidades, inspeção de entradas/processos e metrologia.
- **Qualiex e Zeev:** manter no comparativo original solicitado; completar a verificação atual por módulo antes de marcar paridade.
- **Odoo, ERPNext, OFBiz, iDempiere, Dolibarr, Carbon ERP, MyCompany, Nomus e MRPeasy:** usar a matriz de 08/11 como referência inicial, atualizando cada lacuna com evidência do código e do banco atuais.

Fontes oficiais consultadas nesta revisão:
- SoftExpert Manufatura: https://www.softexpert.com/pt-BR/industrias/manufatura/
- SoftExpert QMS: https://www.softexpert.com/pt-BR/produtos/gestao-qualidade-empresarial-qms/
- SoftExpert Inspection: https://www.softexpert.com/pt-BR/modulos/inspection/
- Senior — Gestão da Qualidade: https://documentacao.senior.com.br/gestaoempresarialerp/5.10.4/manual-processos/qualidade/gestao-de-qualidade.htm
- Sankhya — Controle de Qualidade: https://ajuda.sankhya.com.br/hc/pt-br/articles/43326564085399-Controle-de-Qualidade
- TOTVS — central de Qualidade: https://centraldeatendimento.totvs.com/hc/pt-br/sections/360005876594-Qualidade

## 6. Telas e famílias que devem permanecer no backlog P0/P1

| Prioridade | Família de telas | Falha/entrega exigida |
|---|---|---|
| P0 | BOM, revisões e engenharia | Restaurar contratos reais, revisão/vigência, explosão e vínculo com roteiro/OP |
| P0 | GED/documentos controlados | Revisão, aprovação, distribuição, leitura/ciência, histórico e bloqueio de documento obsoleto |
| P0 | Estoque/separação e expedição | Separação transacional, lote, origem/destino, reserva, NF-e e auditoria |
| P0 | Qualidade — genealogia, evidências RPNC, refugo e liberação de lote | Rastreabilidade de ponta a ponta, bloqueios e evidências em Storage |
| P0 | Fiscal — regras e liberação por item | Regras por operação/UF/NCM/CFOP, vigência, validação e trilha de aprovação |
| P0 | FMEA/Plano de Controle/templates | Integração produto → processo → característica → inspeção e histórico imutável |
| P1 | 325 rotas — CMP-002 | Classificar rota, menu, permissão por ação, leitura e escrita; aliases/subrotas não são órfãos automaticamente |
| P1 | IndustrialDataWorkspace — CMP-003 | Substituir CRUD genérico por fluxo transacional nas rotas de engenharia, movimentação, fiscal, RH e entregas de EPI |
| P1 | Financeiro — custo real por OP | Validar materiais, MOD, máquina/energia/terceiros/refugo, custo unitário, fechamento e reprocessamento idempotente |
| P1 | Fiscal | NFS-e/DPS não aparece como tela no código; desenhar módulo separado e escolher integração/provedor antes de emissão real |
| P1 | SGQ | Consolidar painel único de RNC, refugo, auditorias e calibração; validar alertas existentes |
| P2 | Impressões e relatórios | Padronizar impressão A4 e evidências sem quebrar telas congeladas |

## 7. PRs abertas que não devem ser integradas sem rebase

Na comparação com o `main` atual, as branches abaixo estão divergentes:

| PR | Tema | Branch à frente | Main à frente | Situação |
|---|---|---:|---:|---|
| #306 | Comissões / lucratividade | 21 commits | 4 commits | Aberta, draft; rebase e gates necessários |
| #307 | Razão Geral GL | 4 commits | 4 commits | Aberta, draft; rebase e validação de schema |
| #308 | Cadastro de Decimais | 5 commits | 2 commits | Aberta, draft; rebase e gates necessários |

Não fazer merge automático dessas branches. Comparar novamente cada diff contra o `main` atual, preservar mudanças concorrentes, executar CI e validar Preview antes de integração.

## 8. Plano de execução

1. Fechar o inventário rota × menu × RBAC × tabela/RPC × leitura/escrita, sem apagar rotas válidas.
2. Corrigir primeiro os contratos P0 com migrations já existentes e dependências conferidas; verificar Supabase após cada lote.
3. Corrigir as telas bloqueadas por tabela ausente e adicionar testes de contrato por tela.
4. Implementar as lacunas funcionais P1 sem esperar wireframes, mantendo o visual e as dimensões aprovadas.
5. Revisar as 41 funções SECURITY DEFINER e as policies RLS individualmente.
6. Executar gates: type-check, lint, auditorias, contratos SQL, manifesto, rotas, build e Preview real.
7. Validar sessão autenticada, tenant, RBAC e persistência em cada fluxo crítico.
8. Só marcar concluído após PR integrado e deployment READY; produção não é alterada por esta auditoria.

**Estado desta revisão:** auditoria estática do repositório e leitura do schema/Advisors concluídas parcialmente; bloqueios documentados. Nenhuma migration remota foi aplicada, nenhuma tela foi declarada funcional sem teste e nenhuma tela aprovada foi alterada.


## 9. Publicação e bloqueios Vercel verificados

- Projeto Vercel: `erp-sistema-industrial`; domínio oficial `erp-sistema-industrial.vercel.app` verificado.
- Último deployment READY com alvo production encontrado nesta consulta: commit `754384368db3d862cd2ebd414961d6b49fa8e4a3`.
- O `main` atual (`e509cf634f155cb41c0c8a6d05364fe8f71f7d33`) está 25 commits à frente desse deployment READY.
- O deployment production do commit `97d1a779e465d775ddfea8796f256a1faa0597b9` falhou no gate `verify:official-screens-lock`: a rota alcançava `src/pages/CustomerDnFinanceList.tsx`, que ainda não estava no manifesto naquele commit.
- A comparação Git confirma que o `main` atual avançou dois commits após `97d1a77`; o arquivo atual já está no manifesto com o hash correspondente (`a92cefeea2d72a65e6ad72fcfdfc2efa8b824de0`). Portanto, o bloqueio daquele deployment foi corrigido no código atual, mas ainda falta um build bem-sucedido do `main` atual para provar a correção em Vercel.
- A execução do audit `audit:ui-standardization` no build registrou: 243 arquivos fonte examinados, 325 declarações de rota, somente 3 arquivos usando tokens compartilhados de formulário, 92 arquivos com indícios de estilo local e 207 arquivos com controles sem altura estática detectada. São sinais para revisão por tela; não autorizam alterar dimensões automaticamente.

**Regra de publicação:** não promover deployment antigo nem disparar publicação de produção enquanto o `main` atual não passar por todos os gates e o Preview não for validado.
