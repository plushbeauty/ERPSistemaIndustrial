# Auditoria — Acompanhamento de Não Conformidade (RNC)

- **Tela:** `src/pages/AcompanhamentoNaoConformidade.tsx`
- **Revisão:** 2026-10-18
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — filtros explícitos de tenant implementados; políticas RLS e fluxo autenticado precisam de teste.

## Causa raiz
As consultas iniciais de RPNC, ações corretivas, usuários e Ishikawa não filtravam explicitamente por `empresa_id`. Atualizações de status das RPNCs e ações também usavam somente o identificador do registro.

## Correções
- O carregamento resolve `erp_current_empresa_id` e falha de forma explícita quando a empresa da sessão não é identificada.
- RPNCs, ações, usuários ativos e análises de Ishikawa filtram pela empresa atual.
- Atualização de status da RPNC e das ações inclui `empresa_id` e `id` na condição.
- Inclusões de RPNC, ação e Ishikawa continuam enviando `empresa_id`.

## Preservação
Não foi substituído o arquivo por um snippet externo. Foram mantidos os tipos, componentes, formulários, handlers e fluxo existentes. A alteração não removeu funcionalidades nem alterou migrations.

## Validação pendente
- [ ] Confirmar schema/policies RLS das quatro tabelas no Supabase remoto.
- [ ] Teste de leitura e atualização autenticada em duas empresas.
- [ ] Type-check, lint, auditorias globais/interações, rotas, imports lazy, approved UI lock e build.
- [ ] Auditoria visual compacta e responsiva (a tela ainda contém estilos inline).
- [ ] Confirmar deploy do commit final.

## Limites
O projeto Supabase não apareceu na listagem do conector nesta execução. Nenhum teste de banco real foi executado; a tela permanece parcial.
