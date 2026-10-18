# Contrato de telas aprovadas — ERP Industrial

**Data da revisão:** 2026-10-16  
**Revisão:** APROV-004  
**Regra:** telas aprovadas são imutáveis por padrão. Não alterar layout, conteúdo, geometria, comportamento ou estrutura sem autorização explícita do usuário para uma nova revisão.

| Tela/arquivo | Referência aprovada | Proteção |
|---|---|---|
| Vendas → Novo Pedido — `src/pages/NovoPedido.tsx` | Preview Vercel READY; commit `94da86b985c12801525661328577f7bd96188b85` | Hash Git do arquivo verificado no CI |
| Cadastro de Produtos — `src/pages/ProdutosVendasIndustrial.tsx` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Login institucional — `src/styles/industrial-login.css` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Qualidade Tablet — `src/pages/QualidadeCentralTablet.tsx` | Artefato histórico preservado; rota de tablet desativada pela revisão APROV-005 | Hash Git do arquivo verificado no CI |
| Qualidade Tablet padrão — `src/components/TabletMenuModal.tsx` | Artefato histórico preservado; launcher global removido pela revisão APROV-005 | Hash Git do arquivo verificado no CI |
| PCP Tablet do operador — `src/pages/PCPTabletOperador.tsx` | Artefato histórico preservado; rota desativada pela revisão APROV-005 | Hash Git do arquivo verificado no CI |

## Registro da revisão APROV-005 — 2026-10-18
- Autorização explícita do usuário para retirar a interface Tablet do uso do ERP.
- Removidos atalhos globais e do PCP; login não redireciona mais por tamanho/tipo de dispositivo.
- Usuários `OPERADOR_FABRIL` passam a `/pcp`; URLs antigas de tablet redirecionam às telas desktop correspondentes.
- Os componentes visuais aprovados do tablet permanecem sem alteração como artefatos históricos, mas não são mais carregados pelo roteador.

## Registro da revisão APROV-002 — 2026-10-16

- Agenda de máquinas PCP: legenda retirada da área superior e posicionada após a grade, no final da tela.
- Qualidade Tablet: mantido o componente aprovado, sem alterações visuais ou funcionais.
- PCP Tablet do operador: mantido o componente aprovado, sem alterações visuais ou funcionais.
- Proteção: hashes dos dois componentes Tablet adicionados ao verificador para falhar o CI se houver alteração sem autorização explícita.

## Como funciona o bloqueio

O workflow executa `npm run verify:approved-ui-lock`. Se qualquer byte de um arquivo congelado mudar, o CI falha e impede que a alteração passe pelo gate de validação. Uma mudança aprovada no futuro exige autorização explícita, nova data/revisão e atualização deliberada do contrato de hashes — nunca uma atualização automática dos hashes durante uma correção comum.

Este contrato protege os arquivos listados; ele não substitui a configuração de proteção da branch `main` no GitHub. Para impedir bypass também nas regras do repositório, o status de CI deve ser obrigatório nas regras de proteção da branch.


## Registro da revisão APROV-004 — 2026-10-16

- Vendas → Status do pedido: cards de filtro mais largos e altos, botões azuis `#2D8DB8` com texto branco e etapas coloridas alimentadas por registros reais de Pedido, Produção, Qualidade, Expedição e NF/Saída.
- As consultas das etapas são filtradas pela empresa atual (`empresa_id`) e os vínculos de qualidade são feitos pelas OPs existentes.
- Vendas → PDV: cards de produto ampliados para largura mínima de 260 px.
- Vendas → Catálogo Digital: menos colunas, cards e áreas de foto maiores, tipografia mais legível. As fotos continuam vindo do campo existente `erp_produtos.foto_url`; campo vazio exibe “Sem imagem”.
- Cadastro de Fornecedores já utiliza botão primário azul `#2D8DB8` com texto branco; permanece como referência visual.
- Status do pedido fica congelado novamente nesta revisão. Mudanças futuras exigem ordem expressa do usuário e nova revisão do hash.
- O contrato de lock também foi sincronizado com os hashes Git reais atuais de Produtos e Login, sem alterar o conteúdo dessas duas telas.


## Registro da revisão APROV-006 — 2026-10-18
- Autorização explícita para deixar “Bem-vindo à sua operação mais inteligente.” em branco, negrito e com contorno preto.
- O texto descritivo institucional também recebe branco, negrito e contorno/sombra escura para legibilidade sobre a imagem.
- Login, autenticação Supabase, recuperação de senha e validações de sessão não foram alterados.
- O hash do CSS foi atualizado deliberadamente no lock e o contrato visual passa a verificar o novo estilo.


## Registro da revisão APROV-007 — 2026-10-18
- Vendas → Novo Pedido (`src/pages/NovoPedido.tsx`): card Dados do Cliente ocupa toda a linha; Pedido e Entrega/Logística ficam lado a lado em desktop; campos de pedido e grade de itens usam colunas compactas.
- Preservados os carregamentos reais do Supabase, isolamento por empresa, busca de clientes/produtos/transportadoras, cálculo de custo industrial, validações, anexos, importação de e-mail e RPCs de gravação/finalização.
- A numeração do pedido continua sendo atribuída e confirmada pelo banco/RPC, evitando sequência calculada apenas no navegador e colisões entre usuários.
- O hash do Novo Pedido foi atualizado deliberadamente no lock e o contrato visual passa a verificar a nova geometria. Build/CI deve confirmar o JSX e a integridade final antes de considerar a revisão validada.
