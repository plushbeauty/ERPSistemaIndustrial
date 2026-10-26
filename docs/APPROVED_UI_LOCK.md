# Contrato de telas aprovadas — ERP Industrial

**Data da revisão:** 2026-10-19  
**Revisão:** APROV-007  
**Regra:** telas aprovadas são imutáveis por padrão. Não alterar layout, conteúdo, geometria, comportamento ou estrutura sem autorização explícita do usuário para uma nova revisão.

| Tela/arquivo | Referência aprovada | Proteção |
|---|---|---|
| Vendas → Novo Pedido — `src/pages/NovoPedido.tsx` | APROV-005, controles compactos; revisão expressamente autorizada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Vendas → Status do pedido — `src/pages/VendasCentral.tsx` | APROV-006, alinhamento dos cards e legenda visível; revisão autorizada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Cadastro de Produtos — `src/pages/ProdutosVendasIndustrial.tsx` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Login institucional — `src/styles/industrial-login.css` | APROV-005, texto institucional branco com contorno escuro | Hash Git do arquivo verificado no CI |
| PCP → Submenu de fichas — `src/components/PCPTabletMenuModal.tsx` | Submenu de fichas aprovado em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Shell horizontal — `src/components/layout/ERPHorizontalShell.tsx` | APROV-014: menu SGQ direto e Paquímetro Digital visível; Central de Compras abre em `/compras` | Hash Git do arquivo verificado no CI |
| Dashboard industrial — `src/components/IndustrialCommandDashboard.tsx` | Restaurado da referência aprovada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| PCP → Fichas de Processo — `src/pages/PCPFichasProcesso.tsx` | Restaurada da referência aprovada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Página pública — `src/PublicIndustrialHome.tsx` | Carrossel acessível e planos da referência aprovada | Hash Git do arquivo verificado no CI |
| PCP → Fotos de processo — `src/components/PCPMoldPhotoPanel.tsx` | Painel de fotos da referência aprovada | Hash Git do arquivo verificado no CI |
| PCP Tablet do operador — `src/pages/PCPTabletOperador.tsx` | Padrão operacional aprovado; visual preservado | Hash Git do arquivo verificado no CI |

## Registro da revisão APROV-002 — 2026-10-16

- Agenda de máquinas PCP: legenda retirada da área superior e posicionada após a grade, no final da tela.
- Qualidade Tablet: mantido o componente aprovado, sem alterações visuais ou funcionais.
- PCP Tablet do operador: mantido o componente aprovado, sem alterações visuais ou funcionais.
- Proteção: hashes dos dois componentes Tablet adicionados ao verificador para falhar o CI se houver alteração sem autorização explícita.

## Registro da revisão APROV-COMPRAS-2026-10-24-R1 — 2026-10-24

- Central de Compras restaurada em `/compras` a partir da referência aprovada; cards, dimensões, espaçamentos, cores, tipografia, cabeçalho e abas preservados.
- A tela foi congelada no verificador de hashes.

## Registro da revisão APROV-014 — 2026-10-26

- Removida a centralização antiga em Tablet da Qualidade; `/qualidade` encaminha para Inspeções e os módulos SGQ ficam acessíveis diretamente pelo menu global.
- Incluído o atalho com ícone **Paquímetro Digital / Metrologia** em `/qualidade/paquimetro-digital`.
- O menu Compras abre a Central aprovada em `/compras`.

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


## Registro da revisão APROV-011 — 2026-10-21

- Navegação global: mantém uma única barra superior inspirada no Windows 11 em todas as rotas internas envolvidas pelo `ERPHorizontalShell`.
- Uniformiza a identidade textual do shell para `SYSNQRA ERP & SGQ INDUSTRIAL`, preservando o menu de módulos, pesquisa e navegação interna.
- Escopo restrito ao shell global e ao contrato de hash. Nenhuma página operacional aprovada foi editada.
- O verificador de UI aprovada congela o hash desta revisão; alterações futuras exigem nova autorização explícita.


## Registro da revisão APROV-012 — 2026-10-21

- Cadastro Mestre de Produtos: revisão autorizada para integrar campos técnicos de injeção (molde, cavidades, resina/cor, temperaturas e ciclo) e compactação dos campos do cadastro.
- A revisão fica congelada no verificador de UI aprovada; novas alterações exigem autorização explícita.
- Login, dashboard e Novo Pedido permanecem protegidos; as revisões dos tablets PCP e Qualidade são registradas separadamente em APROV-013.


## Registro da revisão APROV-013 — 2026-10-21

- Tablet SGQ: incorpora a revisão de alto contraste datada de 19/10, explicitamente incluída pelo usuário no pedido de consolidar os códigos enviados de 19 a 21/10.
- Tablet PCP do operador: registra a revisão do código operacional enviada em 20/10, sem substituir os fluxos reais de apontamento e sessão.
- Modal do PCP: registra a inclusão do atalho de Programação Gantt solicitada pelo usuário; os módulos e destinos permanecem congelados após esta revisão.
- O protótipo separado `/pcp/ficha-processo-teste` não substitui a ficha aprovada.
