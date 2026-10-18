# Auditoria — Ficha de Processo Premium

- **Tela:** `src/pages/FichasProcesso.tsx`
- **Revisão:** 2026-10-18 — ajuste de densidade dos campos conforme padrão SGQERP.
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — ajuste de classes aplicado; validações automatizadas e teste autenticado ainda pendentes.

## Problema identificado
Os estilos base de campo e rótulo estavam fora do padrão compacto definido para telas ERP: campos com 54 px de altura, tipografia de 16 px e rótulos de 14 px. O cartão principal também usava padding de 20 px.

## Alteração aplicada
- Campo base: altura compacta `h-8`, tipografia de 11 px, padding horizontal reduzido e foco com a paleta industrial.
- Rótulo base: 9 px, caixa alta e espaçamento compacto.
- Cartão base: padding reduzido e `min-w-0` para ajudar no comportamento responsivo.
- Não foram removidos campos, handlers, chamadas Supabase, rotas ou regras de negócio.

## Critérios ainda não comprovados
- [ ] `type-check`
- [ ] `lint:check`
- [ ] `audit:global`, `audit:brutal`, `audit:interactions`
- [ ] `verify:routes`, `verify:lazy-imports`, `verify:approved-ui-lock`
- [ ] Build oficial de produção
- [ ] Teste autenticado de leitura, inclusão, edição e upload com RLS
- [ ] Conferência visual em desktop e tablet
- [ ] Verificação da estrutura real das tabelas e políticas RLS no Supabase

## Riscos e limites
O ajuste é restrito às classes base de apresentação. Como os testes não foram executados neste ambiente e não houve sessão autenticada disponível, esta tela não pode ser declarada concluída. Nenhuma alteração no banco de dados foi feita.

## Evidência GitHub
- Commit de código: `ab1ff124cb90305f102211957ccf4273fe3befb2`
- Deploy: ainda não verificado para este commit.
