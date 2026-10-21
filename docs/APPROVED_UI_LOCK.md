# Contrato de telas aprovadas — ERP Industrial

**Data da revisão:** 2026-10-20  
**Revisão:** APROV-009  
**Regra:** telas aprovadas são imutáveis por padrão. Não alterar layout, conteúdo, geometria, comportamento ou estrutura sem autorização explícita do usuário para uma nova revisão.

| Tela/arquivo | Referência aprovada | Proteção |
|---|---|---|
| Vendas → Novo Pedido — `src/pages/NovoPedido.tsx` | APROV-005, controles compactos; revisão expressamente autorizada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Vendas → Status do pedido — `src/pages/VendasCentral.tsx` | APROV-006, alinhamento dos cards e legenda visível; revisão autorizada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Cadastro de Produtos — `src/pages/ProdutosVendasIndustrial.tsx` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Login institucional — `src/styles/industrial-login.css` | APROV-005, texto institucional branco com contorno escuro | Hash Git do arquivo verificado no CI |
| Qualidade Tablet — `src/pages/QualidadeCentralTablet.tsx` | Tablet aprovado pelo usuário | Hash Git do arquivo verificado no CI |
| Qualidade Tablet padrão — `src/components/TabletMenuModal.tsx` | Modal central, 22 módulos; visual aprovado preservado | Hash Git do arquivo verificado no CI |
| PCP → Submenu de fichas — `src/components/PCPTabletMenuModal.tsx` | Submenu de fichas aprovado em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Shell global — `src/components/layout/ERPHorizontalShell.tsx` | APROV-009: barra lateral azul industrial recolhível; sessão autenticada, ajuda, configurações, saída e acessos tablet preservados | Hash Git do arquivo verificado no CI |
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


## Registro da revisão APROV-009 — 2026-10-20

- Shell global: barra lateral vertical azul industrial, recolhível, com trilho de ícones persistente e gaveta de módulos/submódulos.
- PCP expõe Central PCP, Ordens de produção, Capacidade/Gantt, Agenda de máquinas, Fichas de processo e Auditoria PCP usando rotas declaradas em `src/AppEntryV2.tsx`; rotas do menu foram comparadas com as declarações existentes e `/relatorios` foi substituída por `/vendas/relatorios`.
- Cabeçalho usa nome/e-mail da sessão Supabase atual, reagindo a alterações de autenticação; não fixa identidade de usuário.
- Configurações navega para `/configuracoes-adm`; saída chama `supabase.auth.signOut()` e retorna ao login.
- Ajuda contextual e modais/atalhos existentes de tablet PCP e Qualidade são preservados. O conteúdo das telas operacionais e os arquivos de tablet congelados não foram alterados.
- A revisão foi autorizada expressamente pelo usuário; o verificador de hashes foi atualizado deliberadamente para o novo hash do shell.


## Registro da revisão APROV-010 — 2026-10-20

- Correção expressamente solicitada: a barra de módulos fica FIXA NO LADO DIREITO, com ícones de todos os módulos visíveis, e não à esquerda nem como menu Iniciar estilo Windows 11.
- O trilho recolhido mantém os ícones; ao selecionar um módulo com rotinas, abre a gaveta lateral para acessar seus submenus. O conteúdo operacional permanece à esquerda e não precisa retornar à página inicial para navegar.
- Removido o menu Iniciar/pesquisa superior estilo Windows do JSX. Cabeçalho contextual, usuário/sessão Supabase, data/hora, ajuda, configurações e saída permanecem.
- Escopo exclusivo: `src/components/layout/ERPHorizontalShell.tsx`, mais a atualização deliberada do hash do lock. Nenhuma tela operacional aprovada foi modificada.
