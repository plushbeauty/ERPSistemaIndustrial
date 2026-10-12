# Registro de referências técnicas — ERP Industrial

Data da consulta: 12/10/2026  
Repositório de destino: `plushbeauty/ERPSistemaIndustrial`  
Branch de trabalho: `fix/qualidade-padrao-formularios-dashboard`

## Carbon — ERP/MES/QMS de manufatura

- Origem: https://github.com/crbnos/carbon
- Documentação do produto: https://docs.carbon.ms
- README consultado: https://github.com/crbnos/carbon/blob/main/README.md
- Licença consultada: https://github.com/crbnos/carbon/blob/main/LICENSE
- Áreas concretas identificadas no repositório:
  - `apps/mes/app/services/models.ts`: enumerações e modelos de domínio do MES; a busca encontrou estados/severidade de manutenção e comentários relacionados à rastreabilidade por unidade/operação.
  - `.ai/research/2026-09-22-app-feature-surface.md`: inventário de superfícies funcionais; a busca encontrou manutenção (despacho, estados, prioridades, severidade, origem, frequência e impacto no OEE) e rastreabilidade.
  - README: manufatura, ERP/MRP/MES/QMS, BOM multinível e revisões, fluxo de cotação/pedido/ordem, rastreabilidade por lote/série, chão de fábrica, API e MCP.
- Licença: o arquivo `LICENSE` informa AGPL-3.0 para o repositório em geral, mas exclui `packages/ee/**` e arquivos cujo nome contém `.ee.`, sujeitos à licença comercial Carbon; componentes de terceiros mantêm suas próprias licenças. O campo SPDX da API não esclarece a licença, portanto prevalece a leitura do arquivo LICENSE.
- Regra de reutilização: **não copiar código, componentes ou arquivos do Carbon nesta etapa**. Usar como referência funcional e implementar de forma independente no ERP Industrial. Qualquer incorporação futura exige análise jurídica/licença por arquivo, dependências e avaliação das obrigações AGPL, especialmente para software oferecido pela rede.
- Aplicação no ERP Industrial:
  1. Manutenção: estados explícitos de despacho, prioridade, severidade, origem e periodicidade; validar compatibilidade com as tabelas/RPCs já existentes antes de alterar o modelo.
  2. PCP/MES: preservar vínculos entre ordem, operações, unidade/lote, apontamentos e rastreabilidade; evitar introduzir um segundo banco ou serviço sem necessidade demonstrada.
  3. SGQ: conectar inspeção e não conformidade ao registro real de lote/operação quando esses vínculos existirem no schema atual.
  4. Segurança de automações: usar a API/MCP do Carbon apenas como referência; nenhuma automação poderá contornar autenticação, tenant, RLS, RBAC ou aprovações humanas.
- Critérios de teste derivados: transições válidas/inválidas de estado; segregação por empresa; rastreabilidade de ida e volta entre ordem/operação/lote; manutenção preventiva vs. corretiva; reprocessamento idempotente; ausência de baixa de estoque sem transação confirmada.
- Limitação desta consulta: a busca verificou README, LICENSE, metadados e trechos de arquivos específicos; **não equivale a uma auditoria linha a linha de todo o Carbon**. Os itens acima são pistas verificadas para priorizar inspeção, não afirmação de que todos os fluxos estão completos ou podem ser transplantados.

## Outros repositórios já listados na ordem de execução

- Docxtemplater — https://github.com/open-xml-templating/docxtemplater
- Templater — https://github.com/SilentVoid13/Templater
- TableTool — https://github.com/jakob/TableTool
- Python CEQ M5 — https://github.com/gustavouhlein/python-ceq-m5
- SigeprodPCP — https://github.com/JpMarinoto/SigeprodPCP
- Agent Control — https://github.com/agentcontrol/agent-control
- ERPNext — https://github.com/frappe/erpnext

Para cada um, registrar arquivo/caminho efetivamente verificado, licença, funcionalidade demonstrada, decisão (referência independente / dependência / código incorporado) e testes. Não presumir licença ou funcionalidade a partir do nome do repositório.

## Estado da implementação e da liberação

- Este registro documenta a análise inicial da referência Carbon; **não marca nenhum módulo como concluído**.
- A tela `/manutencao/plano-mestre` ainda contém linhas de cronograma estáticas e checklist/observações locais não persistidos. Isso permanece uma pendência funcional explícita.
- O fluxo oficial de ordens usa a RPC existente `erp_registrar_parada_manutencao` para abertura e `erp_concluir_manutencao` para conclusão. Antes de persistir itens detalhados do checklist, inspecionar o contrato completo dessas RPCs, a estrutura real de `erp_manutencao_ordens`, as políticas RLS e os vínculos de estoque.
- Não houve alteração do banco, RLS, autenticação ou permissões por causa desta análise.
- A validação visual autenticada das rotas e a confirmação de deploy de produção continuam separadas da aprovação de CI.


## Comparação inicial de ERPs oficiais — 12/10/2026

Esta seção registra somente arquivos e diretórios que foram efetivamente consultados nesta rodada. É uma comparação estrutural de escopo, não uma auditoria linha a linha nem certificação de que o ERP Industrial atende todos os requisitos.

### ERPNext — Manufacturing e Quality Management
- Repositório: https://github.com/frappe/erpnext
- Ref consultada: `version-15`.
- README: https://github.com/frappe/erpnext/blob/version-15/README.md
- Licença: https://github.com/frappe/erpnext/blob/version-15/license.txt — GPL-3.0.
- Diretórios consultados:
  - https://github.com/frappe/erpnext/tree/version-15/erpnext/manufacturing/doctype
  - https://github.com/frappe/erpnext/tree/version-15/erpnext/quality_management/doctype
- Evidência concreta no inventário de diretórios: `bom`, `bom_item`, `bom_operation`, `production_plan`, `work_order`, `work_order_operation`, `workstation`, `routing`; em qualidade, `quality_action`, `quality_action_resolution`, `quality_feedback`, `quality_feedback_template`, `quality_goal`, `quality_procedure` e `quality_review`.
- Aplicação comparativa: conferir se Engenharia/BOM representa componentes e operações; se PCP distingue plano de produção, ordem, operações e centro de trabalho; e se SGQ conecta ações, procedimentos, objetivos e revisão com registros persistidos e rastreabilidade.
- Limitação: os diretórios foram listados e o README/licença foram lidos; formulários individuais e lógica de negócio ainda precisam ser inspecionados antes de derivar requisitos campo a campo.
- Reutilização: não copiar código GPL-3.0 para o produto sem análise de compatibilidade/licenciamento e aprovação.

### Odoo Community — Manufacturing (MRP)
- Repositório: https://github.com/odoo/odoo
- Ref consultada: `18.0`.
- Licença: https://github.com/odoo/odoo/blob/18.0/LICENSE — LGPLv3 declarada pelo repositório, com bibliotecas externas possivelmente sob licenças próprias.
- Diretórios/arquivos consultados:
  - https://github.com/odoo/odoo/tree/18.0/addons/mrp/models
  - https://github.com/odoo/odoo/tree/18.0/addons/mrp/views
  - Arquivos identificados: `mrp_bom.py`, `mrp_production.py`, `mrp_routing.py`, `mrp_workcenter.py`, `mrp_workorder.py`; views correspondentes de BOM, produção, routing, workcenter, workorder e menus.
- Aplicação comparativa: usar como lista de verificação para coerência entre BOM, ordem de produção, roteiros, centros de trabalho, ordens de operação e navegação/menus; comparar estados e ações com as telas de Engenharia e PCP.
- Limitação: somente os diretórios e nomes de arquivos foram consultados nesta etapa; conteúdo interno, testes e comportamento visual ainda não foram auditados.
- Pesquisa de `addons/quality` na ref consultada retornou 404; portanto não atribuir ao Odoo Community os formulários de qualidade sem localizar a fonte correta. Módulos Enterprise e extensões de terceiros não foram presumidos como disponíveis.
- Reutilização: avaliar LGPLv3 e dependências arquivo a arquivo antes de incorporar código.

### Dolibarr — MRP
- Repositório: https://github.com/Dolibarr/dolibarr
- Ref consultada: `develop`.
- Licença: https://github.com/Dolibarr/dolibarr/blob/develop/COPYING — GPL-3.0.
- Diretório consultado: https://github.com/Dolibarr/dolibarr/tree/develop/htdocs/mrp
- Arquivos identificados: `mo_agenda.php`, `mo_card.php`, `mo_document.php`, `mo_list.php`, `mo_movements.php`, `mo_note.php`, `mo_production.php`.
- Aplicação comparativa: avaliar separadamente lista/cadastro de ordem, agenda, movimentos, documentos e produção; garantir que o ERP Industrial não esconda esses fluxos em uma única tela sem estados claros, histórico e permissões.
- Limitação: a inspeção atual confirmou nomes/estrutura de arquivos e licença; o conteúdo de cada arquivo ainda não foi revisado.
- Reutilização: não incorporar código GPL-3.0 sem análise de compatibilidade e obrigações de distribuição.

### Matriz de comparação inicial (não é aprovação funcional)
| Domínio | Referência verificada | Pontos para comparar no ERP Industrial | Status |
|---|---|---|---|
| Engenharia/BOM | ERPNext `bom`, `bom_item`, `bom_operation`; Odoo `mrp_bom.py` e view de BOM | Componentes, quantidades, unidades, operações, revisão e integridade | INCOMPLETO |
| PCP/MRP | ERPNext `production_plan`, `work_order`, `workstation`; Odoo production/workorder/workcenter; Dolibarr `mo_production.php`, `mo_agenda.php` | Plano vs. ordem, roteiro, capacidade, estados, apontamentos e agenda | INCOMPLETO |
| Documentos de produção | Dolibarr `mo_document.php`; estrutura de Work Order em ERPNext | Ficha imprimível, versão, itens, operações e rastreabilidade | INCOMPLETO |
| Qualidade/SGQ | ERPNext `quality_action`, `quality_procedure`, `quality_review` | Ações, procedimentos, revisão, evidência, vínculo com lote/operação | INCOMPLETO |
| Segurança/licenças | GPL-3.0 ERPNext/Dolibarr; LGPLv3 Odoo | Compatibilidade legal antes de copiar qualquer código | REVISÃO OBRIGATÓRIA |

### Próxima rodada de pesquisa
1. Abrir o conteúdo dos arquivos individuais de BOM, produção, roteiro e centro de trabalho e registrar campos/estados reais.
2. Inspecionar os DocTypes de qualidade do ERPNext, inclusive seus JSON/Python e testes relevantes.
3. Localizar a implementação de qualidade comunitária correta do Odoo, se existir na edição/ref em uso; não inferir com base em documentação Enterprise.
4. Inspecionar os arquivos de agenda, ficha e movimentos do Dolibarr para comparar operações e impressão.
5. Mapear cada observação para uma rota/componente/schema existente do ERP Industrial e registrar evidência; somente então abrir correções funcionais específicas.
