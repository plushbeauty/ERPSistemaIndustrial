# Auditoria do Supabase remoto — 12/10/2026

Projeto consultado por referência: `zsklkydlawgvwgnvxwwx`.
Escopo desta rodada: leitura de catálogo, migrations, funções, constraints, políticas/grants e advisors. Nenhuma migration foi aplicada nesta auditoria.

## Estado confirmado

- Projeto Supabase: `ACTIVE_HEALTHY`.
- Catálogo remoto: 220 migrations registradas; a mais recente é `20261012193617 / align_master_auth_contract_20261012`.
- Schema `public`: 218 tabelas listadas.
- As tabelas `erp_usuarios`, `engenharia_produtos`, `pcp_apontamentos`, `fiscal_nfe_entradas`, `estoque_movimentacoes`, `estoque_saldos`, `estoque_lotes`, `estoque_enderecos`, `qualidade_inspecoes`, `qualidade_especificacoes`, `erp_qualidade_documentos_revisoes`, `erp_fichas_processo`, `erp_ordens_producao`, `erp_maquinas`, `erp_moldes` e `pcp_agenda_maquinas` existem.
- As duas assinaturas de `erp_has_permission` existem: `(p_code text)` e `(p_modulo text, p_acao text)`. Ambas têm `search_path = pg_catalog, public` e validam identidade ERP ativa; isso é compatível com as chamadas atuais do frontend.
- `erp_current_empresa_id()` existe como SECURITY DEFINER, com `search_path = pg_catalog, public`, e resolve a empresa a partir do usuário autenticado ativo.
- As tabelas operacionais consultadas têm RLS habilitado. Há grants amplos para `anon` em diversas tabelas; a política efetiva precisa continuar sendo avaliada junto dos grants, e não apenas pelo indicador RLS.
- `fiscal_nfe_entradas.status` aceita `rascunho`, `escriturada` e `cancelada`. A chave de acesso tem constraint de 44 dígitos. `estoque_saldos` possui chave única em `(empresa_id, produto_id, lote_id, endereco_id)`.

## Bloqueios funcionais e de segurança encontrados

### P0/P1 — helper de custo médio de entrada fiscal

A função remota `erp_registrar_custo_medio_nfe(uuid, uuid, uuid, numeric, numeric, text)` está instalada como SECURITY INVOKER, usa `search_path = public` e seu ACL atual permite EXECUTE a `anon` e `authenticated`. O corpo atual não valida explicitamente RBAC antes de alterar saldo e histórico de custo. Não encontrei outra função remota que a invoque, e `erp_escriturar_nfe_entrada(uuid)` não aparece no catálogo de funções remoto.

A migration da branch `20261013030000_harden_incoming_nfe_costing_rbac.sql` foi criada para endurecer esse helper e fornecer a RPC transacional, mas **não foi aplicada**. Antes de aplicá-la, falta fechar a compatibilidade funcional com o catálogo de produtos e a trilha de movimentos: o helper atualiza `estoque_saldos` diretamente e não registra um movimento em `estoque_movimentacoes`.

### P1 — dois catálogos de produto sem ponte operacional confirmada

- `erp_produtos`: 576 registros, distribuídos nos grupos `Cabos` (484), `Materia Prima` (75) e `Prensado` (17).
- `engenharia_produtos`: 0 registros.
- `estoque_lotes`, `estoque_saldos` e `estoque_movimentacoes`: 0 registros no catálogo consultado.
- As FKs de `estoque_lotes`, `estoque_saldos` e `estoque_movimentacoes` apontam para `engenharia_produtos`, não para `erp_produtos`.

Isso explica por que simplesmente trocar o UUID no frontend não resolve o fluxo de estoque: são catálogos distintos e não há trigger de sincronização instalado entre eles. Não foi feito backfill automático, pois classificar todos os produtos comprados como matéria-prima/componente/produto acabado sem uma regra aprovada alteraria a semântica industrial dos registros.

### Advisor do Supabase

Última leitura dos advisors:
- Segurança: 29 funções SECURITY DEFINER executáveis por `authenticated` (requer revisão por função; não são automaticamente vulnerabilidades), 2 extensões no schema `public` e proteção contra senhas vazadas desativada.
- Performance: 139 FKs sem índice de cobertura, 18 conjuntos de policies permissivas sobrepostas, 304 índices sem uso observado, 1 índice duplicado e 1 policy com initplan de RLS.

Os avisos foram registrados como backlog de auditoria. Nenhuma policy foi removida e nenhum grant foi alterado nesta rodada.

## Próximas ações seguras

1. Corrigir a migration de entrada fiscal para validar quarentena e garantir uma única contabilização do saldo junto de uma trilha de movimento idempotente.
2. Definir uma ponte explícita e rastreável entre `erp_produtos` e `engenharia_produtos`; não copiar registros sem classificação técnica aprovada.
3. Aplicar migrations somente depois de revisar a sequência completa e validar os efeitos sobre as funções/policies atuais.
4. Executar testes autenticados com uma sessão real e uma empresa de homologação; nenhum token ou dado de autenticação foi extraído ou armazenado por esta auditoria.

## Evidências e limites

- Consultas SQL foram somente de leitura.
- Não foram alterados dados de negócio nem políticas do banco.
- Não foi afirmado que migrations pendentes estejam aplicadas.
- A validação do schema não equivale a teste funcional com sessão autenticada.
