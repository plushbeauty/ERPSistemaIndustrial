# UI-002 — Cruzamento estático de rotas, imports e arquivos

- Data da inspeção: 2026-11-11
- Branch: `integration/solicitacoes-telas-20261111`
- HEAD inspecionado: `4349381fb144ce9a12f0cde9f99606ea8e677ee4`
- Árvore Git: `989234fbeca5bb8b97b0f8d55a45c3fb56f7955d`
- Roteador: `src/AppEntryV2.tsx`, blob `bea2a9d279cf6ff10a56e559372cdd7e3856a532`
- Shell/menu: `src/components/layout/ERPHorizontalShell.tsx`, blob `4f08c8ea2bc3a88bf9135821e57c389b0953ee5d`
- Método: leitura do roteador e da árvore Git recursiva; conferência estática dos imports lazy e dos elementos Route. Não equivale à execução de `npm run verify-routes` nem a navegação no navegador.

## Resultados

| Verificação estática | Resultado |
|---|---:|
| Declarações Route com path e element detectadas em AppEntryV2 | 341 |
| Imports lazy/lazyPage detectados | 197 |
| Imports lazy sem arquivo correspondente na árvore Git | 0 |
| Caminhos duplicados entre as declarações Route detectadas | 0 |
| Imports lazy sem referência JSX/Route detectável em AppEntryV2 | 1: `FichasProcesso` |

### Import sem uso direto: FichasProcesso

`FichasProcesso` está declarado como lazy import, mas não apareceu como elemento JSX nem como componente de rota no arquivo `AppEntryV2.tsx`. O arquivo `src/pages/FichasProcesso.tsx` existe e é listado como arquivo obrigatório no contrato `scripts/verify-approved-ui-lock.mjs`. Por isso, não removi o arquivo nem o import: a intenção funcional/compatibilidade precisa ser confirmada antes de qualquer remoção.

### Ficha de Montagem — conferência solicitada

- Arquivo existente: `src/pages/FichaMontagem.tsx`.
- Import lazy: linha 84 de `src/AppEntryV2.tsx`, nome `FichaMontagemPage`.
- Rota: linha 330, `pcp/ficha-montagem`, renderiza `<FichaMontagemPage />`.
- Menu: `src/components/layout/ERPHorizontalShell.tsx`, linha 67, item `Ficha de Montagem` aponta para `/pageprincipal/pcp/ficha-montagem`.
- Destaque âmbar: linha 385 aplica `border-amber-400 bg-amber-50 font-extrabold text-amber-800 shadow-sm` ao item cujo label é `Ficha de Montagem`.

A ligação estática menu → rota → import → arquivo e o destaque âmbar estão presentes no HEAD inspecionado. Isso não comprova a renderização/funcionamento no navegador.

## Pendências para fechar UI-002

1. Executar no checkout os comandos do LOOP: `npm run audit:ui-standardization`, `npm run audit:all`, `npm run verify:lazy-imports` e `npm run verify-routes`.
2. Conferir o resultado do workflow/CI disparado pelo commit desta evidência.
3. Testar navegação autenticada para rotas aninhadas, aliases, redirecionamentos e itens de menu.
4. Investigar o import sem uso direto `FichasProcesso` sem remover contratos protegidos.

## Limite de validação

Esta rodada não teve terminal/checkout local conectado. Nenhum comando npm foi declarado executado, e não houve teste visual ou funcional autenticado. O status de Vercel do HEAD consultado estava `failure` com descrição `Deployment rate limited — retry in 24 hours`; isso não é resultado do build local nem do workflow de qualidade.

**Conclusão:** evidência estática parcial registrada; UI-002 permanece pendente até os comandos e a navegação exigidos serem confirmados.
