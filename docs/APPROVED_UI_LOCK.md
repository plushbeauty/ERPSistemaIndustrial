# Contrato de telas aprovadas — ERP Industrial

**Data da revisão:** 2026-10-16  
**Revisão:** APROV-004  
**Regra:** telas aprovadas são imutáveis por padrão. Não alterar layout, conteúdo, geometria, comportamento ou estrutura sem autorização explícita do usuário para uma nova revisão.

| Tela/arquivo | Referência aprovada | Proteção |
|---|---|---|
| Vendas → Novo Pedido — `src/pages/NovoPedido.tsx` | Revisão geométrica APROV-003 autorizada pelo usuário em 2026-10-16 | Hash Git do arquivo verificado no CI |
| Vendas → Status do pedido — `src/pages/VendasCentral.tsx` | Cards ampliados e etapas industriais APROV-004; congelada novamente após esta autorização expressa | Hash Git do arquivo verificado no CI |
| Cadastro de Produtos — `src/pages/ProdutosVendasIndustrial.tsx` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Login institucional — `src/styles/industrial-login.css` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Qualidade Tablet — `src/pages/QualidadeCentralTablet.tsx` | Tablet aprovado pelo usuário | Hash Git do arquivo verificado no CI |
| Qualidade Tablet padrão — `src/components/TabletMenuModal.tsx` | Modal central, 22 módulos; visual aprovado preservado | Hash Git do arquivo verificado no CI |
| PCP Tablet do operador — `src/pages/PCPTabletOperador.tsx` | Padrão operacional aprovado; visual preservado | Hash Git do arquivo verificado no CI |

## Registro da revisão APROV-002 — 2026-10-16

- Agenda de máquinas PCP: legenda retirada da área superior e posicionada após a grade, no final da tela.
- Qualidade Tablet: mantido o componente aprovado, sem alterações visuais ou funcionais.
- PCP Tablet do operador: mantido o componente aprovado, sem alterações visuais ou funcionais.
- Proteção: hashes dos dois componentes Tablet adicionados ao verificador para falhar o CI se houver alteração sem autorização explícita.

## Como funciona o bloqueio

O workflow executa `npm run verify:approved-ui-lock`. Se qualquer byte de um arquivo congelado mudar, o CI falha e impede que a alteração passe pelo gate de validação. Uma mudança aprovada no futuro exige autorização explícita, nova data/revisão e atualização deliberada do contrato de hashes — nunca uma atualização automática dos hashes durante uma correção comum.

Este contrato protege os arquivos listados; ele não substitui a configuração de proteção da branch `main` no GitHub. Para impedir bypass também nas regras do repositório, o status de CI deve ser obrigatório nas regras de proteção da branch.


## Registro da revisão APROV-003 — 2026-10-16

- Vendas → Status do pedido: cards de status aprovados e congelados. Qualquer mudança visual ou funcional exige ordem expressa do usuário; o verificador bloqueia alterações de hash.
- Vendas → Novo Pedido: geometria dos campos, alturas de controles e alinhamento dos três cards principais revisados mediante autorização explícita. Fluxos de gravação, consultas, validações e regras de negócio permanecem protegidos; o arquivo volta a ficar congelado nesta revisão.


## Registro da revisão APROV-004 — 2026-10-16

- Vendas → Status do pedido: cards de filtro ampliados; botões primários padronizados em azul institucional `#2D8DB8` com texto branco. A tabela agora mostra etapas reais vinculadas ao pedido: Pedido, Produção (OP e quantidade produzida/planejada), Expedição e NF/Saída, com cores por estado e isolamento por `empresa_id`.
- Vendas → PDV: cards de produtos aumentados de largura mínima de 185 px para 260 px (aproximadamente +40%), com mais altura e legibilidade.
- Vendas → Catálogo Digital: menos colunas por linha, cards e área de foto maiores, texto e preço mais legíveis; botões azuis mantêm texto branco.
- Origem das fotos do catálogo: campo existente `erp_produtos.foto_url` consultado do Supabase. Quando está vazio, o card mostra “Sem imagem”; esta revisão visual não inventa URL, foto ou storage path.
- Fornecedores: mantém o padrão primário já existente de botão azul `#2D8DB8` e texto branco; nenhuma alteração no schema ou nas rotinas de cadastro.
- Proteção: `VendasCentral.tsx` foi alterado sob ordem expressa e volta a ficar congelado nesta revisão, com hash verificado no CI. Consultas de etapas filtram a empresa atual e os vínculos usam tabelas já existentes.
