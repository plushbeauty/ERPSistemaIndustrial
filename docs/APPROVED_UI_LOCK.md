# Contrato de telas aprovadas — ERP Industrial

**Data da revisão:** 2026-10-19  
**Revisão:** APROV-007  
**Regra:** telas aprovadas são imutáveis por padrão. Não alterar layout, conteúdo, geometria, comportamento ou estrutura sem autorização explícita do usuário para uma nova revisão.

| Tela/arquivo | Referência aprovada | Proteção |
|---|---|---|
| Vendas → Novo Pedido — `src/pages/NovoPedido.tsx` | APROV-005, controles compactos; revisão expressamente autorizada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Vendas → Status do pedido — `src/pages/VendasCentral.tsx` | APROV-006, alinhamento dos cards e legenda visível; revisão autorizada em 2026-10-18 | Hash Git do arquivo verificado no CI |
| Cadastro de Produtos — `src/pages/ProdutosVendasIndustrial.tsx` | Referência aprovada anterior | Hash Git do arquivo verificado no CI |
| Login institucional — `src/styles/industrial-login.css` | APROV-005 / REV-LOGIN-BLOCO-DIREITA-20261102-02: campos brancos com texto preto, caixa estreita encostada à direita na trilha 2 do shell | Hash Git do arquivo verificado no CI |
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
- Incluído o atalho com ícone **Paquímetro Digital / Metrologia** em `/qualidade/paquimetro-digital`, conectado à tela `QualidadePaquimetroDigital.tsx` e ao componente `DigitalCaliper.tsx` recuperados do código enviado pelo usuário.
- O componente valida a calibração e persiste o histórico em `erp_inspecoes`; o cursor da interface é demonstrativo e não representa leitura automática de sensor físico.
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


## Registro da revisão REV-LOGIN-CAMPOS-PRETOS-20261102-01 — 2026-11-02

- Ordem explícita do proprietário (tarefa #82): texto preto nos campos da tela de login, caixa mais estreita, bloco encostado à direita e escala de abertura menor.
- `src/styles/industrial-login.css`: campos passam de vidro translúcido com texto branco para fundo branco com texto `#0B1F2A` (inclusive autofill), ícones e alternador de senha escuros; coluna do cartão reduzida de `380–452px` para `300–360px`, conteúdo interno de 396px para 312px, `justify-self: end`; título de 24–29px para 18–21px, campos de 52px para 42px e alturas/margens das pilares, avisos e botões secundários reduzidos.
- `src/IndustrialLoginDirect.tsx` permanece com o mesmo hash: nenhum markup nem contrato de autenticação mudou — só o CSS.
- `src/components/auth/FloatingLoginModal.css` recebeu as cores escuras do cartão branco que faltavam (título, labels, pilares, divisor, botões secundários e avisos estavam em texto claro sobre fundo branco no modal).
- Abaixo de 1040px o cartão volta a ser centralizado, com largura máxima de 380px.

## Registro da revisão REV-LOGIN-BLOCO-DIREITA-20261102-02 — 2026-11-02

- Medição da tela real (1440×900) provou que a revisão anterior não encostava o bloco à direita: o cartão media 582px e deixava 398px à esquerda e 459px à direita, porque `.auth-brand` fica `display:none` na tela cheia e `.auth-panel`, em auto-place, ocupava a trilha larga do grid.
- Correção em `src/styles/industrial-login.css`: `grid-column: 2` + `justify-self: stretch` no painel e `grid-column: 1` no empilhamento de 1040px. Na medição seguinte o cartão ficou com 360px a 56px da borda (1150px de largura: 340px a 46px).
- O texto dos campos é escuro sobre branco: a cor final medida é `#17333F` e a fonte 16px, ambas impostas pelas regras globais de legibilidade/anti-zoom de tablet (`src/styles/index.css`), que não foram combatidas para não regredir as demais telas.
- `IndustrialLoginDirect.tsx` continua com hash `556ae8ec` — nenhuma alteração de markup ou autenticação.

## Registro da revisão REV-OPERADOR-MAQUINAS-CPP-20261108-01 e REV-COMPRAS-VALIDACAO-PEDIDO-20261108-01 — 2026-11-08

- Ordem do proprietário para aplicar os códigos de referência e colocar as páginas novas em funcionamento.
- Área do Funcionário / Chão de Fábrica: painel responsivo passa a listar cada programação real por máquina/OP, sem esconder OPs concorrentes no mesmo equipamento; seleção leva ao CPP e mantém autenticação, programação e apontamentos por RPC do servidor.
- Central de Compras / Pedido: todas as linhas são validadas, sem descarte silencioso; referências precisam carregar; NCM é normalizado e exige 8 dígitos; frete/desconto não negativos; ICMS permanece informativo e não é somado novamente ao total estimado.
- Atualizados os hashes somente dessas duas telas no manifesto scripts/telas-oficiais-manifest.json; nenhuma proteção de telas aprovadas foi desativada.
- A revisão não altera migrations remotas, permissões do Supabase nem publica diretamente em produção.

## Registro da revisão REV-FLUXO-CAIXA-PAGINACAO-20261108-01 e REV-SGQ-RPNC-EFICACIA-20261108-01 — 2026-11-08

- Fluxo de Caixa: substituída a listagem limitada pela leitura paginada completa, escopo da empresa da sessão e extrato com paginação; CSS isolado no padrão industrial compacto.
- RPNC: integrada a versão completa com análise de causa, eficácia, transições de workflow, decisão CAPA e rastreabilidade de cliente/lote/auditoria.
- Incluída a migration de política de upload e trilha de auditoria das evidências no bucket qualidade-evidencias.
- O manifesto e o hash manual do RPNC foram atualizados deliberadamente; os gates de telas oficiais continuam ativos.
- A migration transacional de Compras agora valida a requisição no tenant no servidor, exige NCM de 8 dígitos e calcula total-base sem somar ICMS novamente. IPI/ICMS ficam informativos até a implantação das regras fiscais por NCM, CFOP, UF e regime.
- As migrations estão versionadas no repositório, mas ainda não foram aplicadas ao Supabase remoto; a validação autenticada do banco permanece pendente.


## Registro da revisão REV-VENDAS-TABELA-PRECO-CLIENTE-20261110-01 e REV-COR-DIALOGOS-CLAROS-20261110-01 — 2026-11-10

- Lista de Preços por Cliente movida do menu Financeiro para Vendas; a rota antiga redireciona para a nova rota de Vendas para preservar links existentes.
- A tela foi refeita para explicar sua finalidade, importar/atualizar preços por cliente e produto, listar preços vigentes/vencidos e validar o tenant da sessão. A importação atualiza a combinação empresa/cliente/produto em vez de tentar inserir duplicatas.
- O Novo Pedido já chama erp_calcular_preco_sugerido_venda ao selecionar cliente e produto; a função consulta erp_preco_especial_cliente e usa o preço especial vigente, mantendo o cálculo padrão quando não há preço especial válido.
- CSS global dos diálogos Radix reforça superfície branca, texto escuro e campos claros em todas as páginas, sem remover o scrim atrás da janela.
- Nenhuma migration remota ou cadastro de banco foi alterado nesta revisão.


## Registro da revisão APROV-015 — 2026-11-11

- Página pública `src/PublicIndustrialHome.tsx`: mantidas as cinco artes oficiais de `public/images/carrossel/`, a proporção 16:9, dimensões, composição e transição de 0,9 s aprovadas.
- O carrossel agora pré-carrega as cinco artes antes de iniciar a rotação automática; o intervalo permanece em 7 segundos. `onerror` também conclui a etapa de pré-carregamento, evitando que uma imagem indisponível congele a rotação.
- O hash da tela pública foi atualizado deliberadamente no `scripts/telas-oficiais-manifest.json`, conforme autorização explícita do proprietário para esta nova revisão.
- Varredura de texto do código-fonte não encontrou a marca “PLUSH BEAUTY” nas telas; referências em documentação histórica/repositório não foram tratadas como texto de interface.


## Registro da revisão APROV-016 — 2026-11-11

- Varredura do código-fonte das telas não encontrou mais a marca antiga `MOLDPLÁS`; as telas de Quarentena, Central Tablet da Qualidade, Inspeções, Controle de Processo da Injetora e Genealogia de Lote foram padronizadas para `SYSNQRA ERP INDUSTRIAL`.
- A busca por `PLUSH BEAUTY` em `src/` não encontrou ocorrências em telas. Referências históricas/documentais e identificadores técnicos do repositório foram preservados.
- Os hashes das telas presentes no manifesto foram atualizados deliberadamente nesta revisão autorizada.
