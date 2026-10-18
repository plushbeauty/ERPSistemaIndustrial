# Procedimento obrigatório — telas aprovadas e prevenção de regressões

Revisão: 2026-10-18. Aplicação: qualquer melhoria, correção, refatoração ou atualização do ERP.

## Regra principal

Uma alteração localizada não pode restaurar uma página, componente ou estilo inteiro de um commit antigo. Antes de editar, consulte o arquivo atual na branch de trabalho, o diff e o histórico relevante. Preserve todos os comportamentos aprovados que não fazem parte do pedido.

## Fluxo obrigatório antes de concluir uma alteração

1. Identifique os arquivos estritamente necessários para o pedido.
2. Leia a versão atual na branch de trabalho; não use uma cópia antiga como base sem comparar diferenças.
3. Compare com o histórico e identifique os trechos aprovados que precisam permanecer.
4. Faça uma alteração mínima e localizada. Não sobrescreva arquivos inteiros para corrigir um detalhe.
5. Revise o diff completo para detectar exclusões ou regressões não solicitadas.
6. Execute o contrato específico da tela, `npm run type-check`, `npm run lint:check` e os gates de release relevantes.
7. O gate `verify:approved-ui-lock` deve passar. Se falhar, não atualize o hash para esconder a regressão: restaure a implementação aprovada ou solicite autorização explícita para uma nova revisão.
8. Atualize o hash de uma tela congelada somente depois de uma autorização explícita do usuário para aquela mudança; registre a revisão, a data e o motivo.
9. Confira o commit e o resultado do CI. Não declare publicação concluída sem evidência de deployment READY com o commit correto.

## Bloqueios automatizados

- `scripts/verify-approved-ui-lock.mjs` calcula o Git blob SHA-1 dos arquivos aprovados e falha se o conteúdo divergir.
- `verify:approved-ui-lock` verifica a sintaxe do próprio verificador antes de executá-lo.
- `verify:production` e `verify:release` executam o lock e o contrato de UI antes do build.
- O CI executa os mesmos gates. Uma falha deve bloquear a conclusão da validação.
- Os contratos de submenu, rotas, login e demais telas aprovadas devem ser ampliados quando uma regressão concreta for encontrada.

## Limite importante

O código e os workflows podem bloquear builds, mas não conseguem, sozinhos, impedir que alguém altere o próprio verificador ou force um deploy por fora do fluxo. Para proteção completa no GitHub, mantenha proteção da branch principal, PR obrigatório, checks obrigatórios e restrição de bypass; na Vercel, use deploy de produção apenas a partir da branch protegida.

## Registro de regressão de 2026-10-18

- Restaurado o stylesheet aprovado do login.
- Ocultados os controles de movimento do carrossel e ampliado o card da imagem na revisão APROV-006.
- Corrigida a sintaxe do verificador de UI congelada, que estava fazendo o CI falhar antes de avaliar os hashes.
- Os arquivos PCP de fichas de processo e o submenu permanecem congelados; qualquer alteração futura exige autorização explícita.
