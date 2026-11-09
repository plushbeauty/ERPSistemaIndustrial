# CMP-003 — classificação das 11 rotas do IndustrialDataWorkspace

**Data:** 08/11/2026  
**Revisão:** CMP-003-20261108-01  
**Branch:** `prod-telas-novas`  
**Fontes:** `src/AppEntryV2.tsx`, `src/pages/IndustrialDataWorkspace.tsx`, `docs/erp-standardization/ROUTE-AUDIT-2026-10-16.md`.

## Resultado

O inventário de rotas identifica 248 declarações `<Route>` e 11 rotas que apontam efetivamente para `IndustrialDataWorkspace`. O componente oferece CRUD genérico com campos, busca, tabela, edição e uma ação específica de escrituração para NF-e de entrada. Isso cobre cadastros simples, mas não substitui fluxos transacionais industriais.

|Rota|Configuração / tabela|Classificação|Justificativa e decisão|
|---|---|---|---|
| `/engenharia/produtos` | `engenharia-produtos` → `engenharia_produtos` | **Coberta pelo genérico — escopo cadastral** | Cadastro técnico básico, busca e edição cabem no renderer. Desenhos, anexos e revisão técnica continuam dependendo de fluxos próprios quando exigidos. |
| `/engenharia/bom` | `engenharia-bom` → `engenharia_bom` | **Precisa tela própria / integração com BOM Mestre** | BOM multinível exige árvore, componentes, perdas, revisão, homologação e explosão; CRUD de uma linha não prova esses comportamentos. Há rota própria `/engenharia/bom-mestre`; não remover nem redirecionar até validar contratos e navegação. |
| `/engenharia/roteiros` | `engenharia-roteiros` → `pcp_roteiros` | **Precisa tela própria para operação completa** | Roteiro industrial exige sequência de operações, centros de trabalho, tempos, preparação, capacidade e vínculo com BOM/OP. O genérico pode servir como cadastro inicial, não como fluxo PCP concluído. |
| `/estoque/enderecos` | `estoque-enderecos` → `estoque_enderecos` | **Coberta pelo genérico — cadastro básico** | CRUD de endereço, tipo, rua, prateleira e nível. Mapa visual/localização física, se exigido, é evolução separada. |
| `/estoque/movimentacoes` | `estoque-movimentacoes` → `estoque_movimentacoes` | **Precisa tela própria transacional** | Movimento deve validar saldo, origem/destino, lote, unidade, custo e atualizar saldo atomicamente. CRUD genérico não é evidência de movimentação segura. |
| `/fiscal/parametros` | `fiscal-parametros` → `fiscal_parametros_tributarios` | **Coberta pelo genérico — cadastro base** | A matriz simples de CFOP/NCM/alíquotas cabe no renderer. Regras fiscais versionadas, validação por operação e liberação de pedido permanecem em contratos próprios. |
| `/fiscal/nfe-entradas` | `fiscal-nfe-entradas` → `fiscal_nfe_entradas` | **Parcial — manter ação transacional e evoluir** | O renderer tem ação explícita de escrituração; ainda é necessário provar importação/XML, mapeamento de itens, validação tributária, atualização de estoque e custo médio. Não classificar como concluída sem E2E. |
| `/rh/funcionarios` | `rh-funcionarios` → `rh_funcionarios` | **Coberta pelo genérico — cadastro básico** | Campos de matrícula, cargo, departamento, taxa horária e status são cadastrais. Onboarding de usuário/Auth e RBAC não são substituídos por este CRUD. |
| `/rh/turnos` | `rh-turnos` → `rh_turnos` | **Coberta pelo genérico — cadastro básico** | Cadastro de escala e jornada. Calendário de capacidade, exceções, feriados e integração com capacidade finita precisam de fluxo PCP próprio. |
| `/rh/epis` | `rh-epis` → `rh_epis` | **Coberta pelo genérico — cadastro básico** | Cadastro de EPI, CA, validade e periodicidade. Alertas e bloqueios de entrega exigem validação operacional adicional. |
| `/rh/epis/entregas` | `rh-entregas-epis` → `rh_entregas_epis` | **Parcial — cadastro coberto, evidência pendente** | Registro de entrega e próxima troca cabem no genérico; assinatura/ciência do funcionário, comprovante e trilha de auditoria precisam ser validados antes do aceite integral. |

## Configurações antigas não alcançadas pelo roteador

O mapa interno `routeConfigs` ainda contém seis chaves que o relatório de rotas não encontrou como rotas ativas do AppEntry:

- `/qualidade/cep`
- `/qualidade/especificacoes`
- `/qualidade/fmea`
- `/qualidade/rnc-capa`
- `/pcp/ordens-industriais`
- `/pcp/apontamentos`

As quatro primeiras têm hoje rotas próprias ou redirecionamentos no `AppEntryV2.tsx` (CEP, especificações, FMEA e RPNC). As duas de PCP precisam de confirmação contra as rotas oficiais de PCP. **Nenhuma configuração foi removida**, pois a ordem proíbe apagar código antigo sem prova de ausência de consumidores.

## Decisões de execução

1. Manter o renderer genérico para cadastros simples identificados como cobertos.
2. Criar/usar telas próprias para BOM, roteiros e movimentação de estoque; não transformar operação transacional em CRUD genérico.
3. Tratar NF-e de entrada como parcial até validar XML, itens, estoque e custo médio.
4. Preservar as seis configurações antigas até confirmar aliases, deep links e consumidores.
5. CMP-003 fica **classificado no nível de código**; não prova que banco remoto, RLS, menu e permissão estejam operacionais.
