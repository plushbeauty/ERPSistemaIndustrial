# Auditoria estática de rotas e componentes — 2026-10-16

## Escopo e método

Fontes abertas nesta revisão:
- [src/AppEntryV2.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/AppEntryV2.tsx)
- [src/pages/IndustrialDataWorkspace.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/pages/IndustrialDataWorkspace.tsx)
- [src/pages/ProdutosVendasIndustrial.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/pages/ProdutosVendasIndustrial.tsx)
- [Carbon JobProperties.tsx](https://github.com/crbnos/carbon/blob/main/apps/erp/app/modules/production/ui/Jobs/JobProperties.tsx)
- [Carbon QuantityModal.tsx](https://github.com/crbnos/carbon/blob/main/apps/mes/app/components/JobOperation/components/QuantityModal.tsx)

A análise abaixo foi feita sobre o conteúdo dos arquivos no GitHub e expressões regulares executadas sobre o código retornado. **Não** equivale a executar o script local, abrir a aplicação no browser, testar CRUD nem rodar type-check/build.

## Inventário do roteador

- 248 declarações `<Route>` identificadas em `src/AppEntryV2.tsx` (contagem estática, inclui rotas aninhadas e curingas).
- 156 imports dinâmicos identificados.
- 11 rotas direcionam explicitamente para o componente compartilhado `IndustrialDataWorkspace`.

## Rotas que usam o workspace genérico

| Rota | Arquivo renderizado | Configuração identificada |
|---|---|---|
| `/engenharia/produtos` | `src/pages/IndustrialDataWorkspace.tsx` | `engenharia-produtos` → `engenharia_produtos` |
| `/engenharia/bom` | mesmo componente | `engenharia-bom` → `engenharia_bom` |
| `/engenharia/roteiros` | mesmo componente | `engenharia-roteiros` → `pcp_roteiros` |
| `/estoque/enderecos` | mesmo componente | `estoque-enderecos` → `estoque_enderecos` |
| `/estoque/movimentacoes` | mesmo componente | `estoque-movimentacoes` → `estoque_movimentacoes` |
| `/fiscal/parametros` | mesmo componente | `fiscal-parametros` → configuração correspondente |
| `/fiscal/nfe-entradas` | mesmo componente | `fiscal-nfe-entradas` → configuração correspondente |
| `/rh/funcionarios` | mesmo componente | `rh-funcionarios` → configuração correspondente |
| `/rh/turnos` | mesmo componente | `rh-turnos` → configuração correspondente |
| `/rh/epis` | mesmo componente | `rh-epis` → configuração correspondente |
| `/rh/epis/entregas` | mesmo componente | `rh-entregas-epis` → configuração correspondente |

Um renderer compartilhado pode ser válido, mas não prova que as telas sejam completas. Cada rota ainda precisa ser comparada com os requisitos de negócio, campos, lookups, validações, permissões e comportamento de gravação.

## Configurações potencialmente obsoletas em IndustrialDataWorkspace

O mapa interno do workspace também contém seis caminhos que, no roteador atual, apontam para componentes diferentes ou redirecionamentos — portanto não entram no workspace pela rota direta:
- `/qualidade/cep`
- `/qualidade/especificacoes`
- `/qualidade/fmea`
- `/qualidade/rnc-capa`
- `/pcp/ordens-industriais`
- `/pcp/apontamentos`

Não removi essas configurações automaticamente: antes, é necessário confirmar se são legado intencional, fallback ou duplicação que deve ser retirada.

## Ponto de atenção de dados

A configuração de `/engenharia/produtos` usa `engenharia_produtos`. Há uma migration versionada que declara essa tabela em `supabase/migrations/20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql`, e outras páginas a consultam. Se o ambiente ativo retorna 404, é necessário verificar se a migration foi aplicada no Supabase correto; não trocar o nome da tabela nem inventar colunas para esconder o erro.

## Ajustes visuais adicionais feitos em Produtos

No commit `f441ef37c76d3f3f024228b20d549c7e0632b63d`:
- classe `edit-20`: largura de 22ch para 20ch;
- campo CEST: limite visual da classe alinhado a 7 caracteres, consistente com `maxLengthFor`.

Commits anteriores na mesma tela: `6905e28c764bf8fa9145a39c4b0a8d8f03d1dc6b` e `5e6939b74f5623fd1658c85d92ab496b47707e65`.

## Pendências obrigatórias

- Executar `npm run audit:ui-standardization` no checkout real e revisar o JSON gerado.
- Conferir existência e destino de cada import/rota, incluindo re-exports e aliases.
- Inspecionar cada uma das 11 rotas compartilhadas e decidir se o renderer atende a tela.
- Conferir a migration/tabela no projeto Supabase ativo se o 404 persistir.
- Executar type-check, lint, auditorias, verificação de rotas e build no HEAD final.
- Abrir telas no browser e testar dimensões, lookup, gravação, edição, validação, impressão e responsividade.
- Não marcar item concluído antes de evidência real.

## Referência de design

O Carbon usa componentes de formulário tipados/validados e tamanhos semânticos, como `InputControlled`, `NumberControlled` e `size="sm"`. Aplicamos apenas os princípios de composição e dimensionamento; não copiamos sua implementação. O repositório Carbon declara licença AGPL-3.0-only.

## Ciclo seguinte — telas do Cadastro Mestre de Produtos

Arquivos abertos e ajustados:
- [ListagemProdutos.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/pages/cadastro-produtos/ListagemProdutos.tsx): controles dos filtros agora têm 30 px; cabeçalho da tabela foi reduzido de 36 para 32 px; pesquisa limitada a 50 caracteres. Commit `240ac72724a10099376cc7e5f63492ffc301a8f5`.
- [FormFichaTecnica.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/pages/cadastro-produtos/FormFichaTecnica.tsx): rótulos reduzidos para 9 px em caixa alta, espaçamento vertical entre campos reduzido, nome/categoria/cliente limitados a 50 caracteres, unidade a 3 caracteres e ícone do botão alinhado ao tamanho do controle. Commits `54be4c22916af344f5bed61586b0a214d3a09d1c` e `f85728be813bfbeeeae2fcda780d509ef9693c3b`.
- [IndustrialDataWorkspace.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/pages/IndustrialDataWorkspace.tsx): texto comum limitado a 50; URL de desenho mantém até 2048; áreas de texto JSON estruturado até 4000 para não truncar payload técnico; pesquisa limitada a 50. Commit `ffd5a39167989d7aa679a67fdb41ab0ecccca929`.
- [ProdutosVendasIndustrial.tsx](https://github.com/plushbeauty/ERPSistemaIndustrial/blob/main/src/pages/ProdutosVendasIndustrial.tsx): quantidade/preço/custo e referências ajustados nos commits listados acima; observações limitadas a 50 no commit `bc88b13572777fdfcafdd1135609b7fc7d60876a`.

**Importante:** os commits foram gravados no GitHub, mas não há ainda prova de type-check, build nem inspeção visual renderizada. Nenhum desses módulos pode ser retirado do backlog até concluir essas verificações.

## Gate de entrega — status consultado após os commits

O status de commit retornado pelo GitHub para os commits de correção mais recentes mostra o check `Vercel: failure` com destino `https://vercel.com/plushbeauty?upgradeToPro=build-rate-limit`. A consulta de deployments não encontrou deployment associado aos commits de correção verificados. Portanto:
- as alterações estão gravadas no GitHub;
- não há confirmação de build Vercel aprovado para elas;
- não há confirmação de que foram publicadas em produção;
- type-check, lint, auditorias e inspeção visual seguem pendentes.


## Continuação — revisão do fluxo de parecer/liberação de lote (2026-10-22)

**Rota:** `/qualidade/liberacao-lote`  
**Componente:** `src/pages/qualidade/QualidadeLiberacaoLotes.tsx`  
**Revisão:** SGQ-REL-001

### Achado reproduzível

O formulário grava pareceres em `erp_qualidade_liberacao_lotes`, tabela documental com `codigo_lote` textual, `produto_id`, quantidade e `status_sgq`. A migration versionada `supabase/migrations/20261019150000_erp_qualidade_liberacao_lotes.sql` não vincula o registro ao UUID do lote operacional e não implementa uma RPC que altere o status do estoque de forma transacional. Logo, selecionar “APROVADO” não comprova nem executa a liberação operacional do lote.

### Correção aplicada

O título e as mensagens agora identificam a função como **registro de parecer SGQ**; a tela informa explicitamente que não altera o status operacional do estoque. Isso evita apresentar o registro documental como se fosse uma liberação física/transacional.

### Estado

**CORRIGIDO AGUARDANDO VALIDAÇÃO** — commit `952850269faa69bdbf906a31b4689ffcc3cc5186`. Foram inspecionados o componente e a migration versionada; não houve execução local de TypeScript/build, teste autenticado ou confirmação de schema/RLS remoto. O fluxo de liberação transacional continua **PENDENTE** até confirmar schema e autorização real. Não remover do backlog.
