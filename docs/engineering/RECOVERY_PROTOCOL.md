# RECOVERY PROTOCOL

Ao iniciar qualquer sessão:

1. Ler CHECKPOINT.md.
2. Ler ERROR_QUEUE.md.
3. Ler WORK_QUEUE.md.
4. Ler ARCHITECTURE_STATE.md.
5. Verificar branch main e HEAD.
6. Verificar último commit e alterações.
7. Reproduzir o primeiro P0.
8. Corrigir causa, não mascarar sintoma.
9. Executar validações.
10. Atualizar filas e checkpoint.
11. Commitar somente após evidência.
12. Retomar a próxima tarefa.

Em interrupção por contexto, tempo ou ferramenta: salvar CURRENT_FILE, CURRENT_ROUTE, CURRENT_ERROR, LAST_SUCCESSFUL_TEST, LAST_COMMIT, NEXT_ACTION, BLOCKERS e DO_NOT_REPEAT antes de encerrar.

Nunca perguntar ao usuário onde continuar; o checkpoint é a fonte operacional.
