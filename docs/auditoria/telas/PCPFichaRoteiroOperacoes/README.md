# Auditoria — Roteiro de Operações / Ficha de Processo

- **Tela:** `src/features/pcp/FichaProcesso.tsx`
- **Revisão:** 2026-10-18
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — correções aplicadas; validações automatizadas e persistência autenticada pendentes.

## Causa raiz
A consulta de produtos, postos de trabalho e operações de roteiro não aplicava filtro explícito pelo tenant atual. O formulário também utilizava larguras rígidas para vários campos, o que prejudicava a adaptação em telas estreitas.

## Correções realizadas
- A carga resolve `erp_current_empresa_id` e interrompe o fluxo com erro explícito se a empresa da sessão não for identificada.
- As consultas de produtos, postos e roteiro filtram por `empresa_id`.
- O formulário passou a usar grid responsivo de 12 colunas, com controles de largura total e sem larguras fixas nos inputs.
- A inserção já envia `empresa_id`; o comportamento foi preservado.
- Não foram removidos campos, rotas, nem contratos de persistência.

## Validação
- [x] Revisão estática das consultas e do layout alterado.
- [ ] Type-check.
- [ ] Lint.
- [ ] Auditorias global, brutal e de interações.
- [ ] Rotas, imports lazy e approved UI lock.
- [ ] Build oficial de produção.
- [ ] Teste de leitura e inclusão com usuário autenticado/RLS e duas empresas.
- [ ] Conferência visual desktop/tablet.

## Limites
A estrutura das tabelas e políticas RLS não foi consultada diretamente no banco nesta execução. O filtro explícito por tenant reduz dependência de RLS implícita, mas não substitui a validação das policies. Não foram feitas alterações no banco.

## GitHub
- Commit do ajuste: `e3c6af2c892de9a2053857ab0a6f31dd6faa1521`
- Deploy desse commit: pendente de confirmação.
