# Procedimentos de conclusão do ERP SYNQRA

Esta pasta orienta a continuidade técnica do ERP e evita que uma nova sessão repita auditorias já registradas ou declare conclusão sem evidências.

## Ordem de leitura

1. `PLANO-CONCLUSAO-ERP.md` — roteiro, escopo e critérios de aceite.
2. `..\ERP-CENTRAL-ERROS-PENDENCIAS.md` — registro acumulativo dos problemas, correções, evidências e bloqueios.
3. `..\ARQUITETURA.md` e documentação específica do módulo antes de mudar contratos existentes.

## Como continuar em outra sessão

Abra o projeto na pasta existente e envie:

> Continue a execução do ERP conforme `docs/procedimentos/PLANO-CONCLUSAO-ERP.md`. Leia também `docs/ERP-CENTRAL-ERROS-PENDENCIAS.md`, valide o estado atual dos arquivos antes de editar e trabalhe até onde o ambiente permitir. Não assuma que uma correção documentada está validada. Não faça commit nem deploy. Atualize o registro central com evidências reais e não declare o ERP completo enquanto houver critérios pendentes.

O ambiente desta sessão é baseado em pasta e não possui Git configurado; portanto não existe worktree isolado disponível. Preserve os arquivos do projeto e não tente criar commit para contornar essa limitação.
