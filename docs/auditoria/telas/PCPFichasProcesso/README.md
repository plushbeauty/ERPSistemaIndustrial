# Auditoria — Ficha de Processo PCP (parâmetros de máquina)

- **Tela:** `src/pages/PCPFichasProcesso.tsx`
- **Revisão:** 2026-10-19
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — ajustes de esquema registrados; build/preview e persistência remota ainda pendentes.

## Escopo e preservação

A rota canônica permanece `/pcp/fichas-processo`. Os atalhos do submenu usam a mesma rota com o parâmetro `tipo` para abrir Prensados, Injetados, Acabamento e Montagem/Embalagem. A ficha continua usando a empresa da sessão e os parâmetros específicos em `parametros_tecnicos`.

## Alterações registradas em 2026-10-19

- Commit `54281edca5a492177f5e1afed4f0fa56c70a3934`: incluído o parâmetro técnico `pressao_bomba_bar` no esquema de Prensados, com manômetro ilustrativo e controle numérico posicionado sobre o desenho.
- Commit `524eefa86d15c1c99aa0fc18bcbfde3c5029e34c`: removidas as leituras laterais que repetiam as temperaturas já editadas sobre os esquemas e excluída a pressão da bomba da lista genérica, evitando um segundo controle para o mesmo dado.
- O filtro por `empresa_id` na consulta de máquinas já está presente na branch.
- O parâmetro da bomba é persistido dentro do JSON `parametros_tecnicos`; não exige uma coluna SQL separada.

## Verificações estáticas realizadas

- Rota canônica e os quatro destinos de submenu conferidos no código.
- Campos de temperatura confirmados sobre os desenhos vetoriais de Injetados e Prensados.
- Controle da pressão da bomba confirmado sobre o esquema de Prensados.
- Controles laterais duplicados não encontrados no bloco de regulagem térmica.
- Categoria Acabamento e Montagem/Embalagem e sua migration versionada confirmadas.
- O vínculo da ficha liberada e revisão na programação PCP foi inspecionado no código; isto não é prova de execução ou persistência em banco remoto.

## Pendências obrigatórias

- [ ] Executar CI oficial completo no HEAD atual (type-check, lint, contrato de fichas, rotas, auditorias e build).
- [ ] Aguardar Vercel finalizar o deployment do commit `524eefa86d15c1c99aa0fc18bcbfde3c5029e34c`; status consultado: **QUEUED**, sem preview READY confirmado.
- [ ] Validar visualmente em desktop e tablet após o preview ficar READY.
- [ ] Confirmar as imagens de máquina/ferramental aprovadas pelo usuário. Os desenhos vetoriais atuais são esquemas ilustrativos; não foi comprovado que correspondem às imagens fotográficas aprovadas.
- [ ] Testar abrir, salvar e reabrir com sessão autenticada e duas empresas, verificando Storage/RLS e isolamento.
- [ ] Confirmar schema e migrations no Supabase remoto. Os arquivos de migration no Git não comprovam aplicação no banco; a integração ainda não expõe o projeto necessário.

## Estado de publicação

O PR #148 segue aberto em rascunho e não mesclado. O status do Vercel para o commit mais recente está pendente/na fila. Não considerar a ficha publicada em produção nem a persistência remota validada até concluir os testes acima.
