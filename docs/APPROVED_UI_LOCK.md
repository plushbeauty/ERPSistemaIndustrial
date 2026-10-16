# Contrato de telas aprovadas — ERP Industrial

**Data da revisão:** 2026-10-16  
**Revisão:** APROV-003  
**Regra:** telas aprovadas são imutáveis por padrão. Não alterar layout, conteúdo, geometria, comportamento ou estrutura sem autorização explícita do usuário para uma nova revisão.

| Tela/arquivo | Referência aprovada | Proteção |
|---|---|---|
| Vendas → Novo Pedido — `src/pages/NovoPedido.tsx` | Revisão geométrica APROV-003 autorizada pelo usuário em 2026-10-16 | Hash Git do arquivo verificado no CI |
| Vendas → Status do pedido — `src/pages/VendasCentral.tsx` | Cards de status APROV-003; nenhuma alteração sem ordem expressa do usuário | Hash Git do arquivo verificado no CI |
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
