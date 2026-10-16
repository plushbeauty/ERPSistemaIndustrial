# ERPSis — Auditoria contínua de arquitetura e telas

- **Data:** 2026-10-16
- **Revisão:** AUDIT-2026-10-16-R1
- **Repositório:** `plushbeauty/ERPSistemaIndustrial`
- **Branch inspecionada:** `main`
- **Referência arquitetural:** [Carbon ERP — arquitetura](https://docs.carbon.ms/docs/building/architecture) e [crbnos/carbon](https://github.com/crbnos/carbon)
- **Status desta rodada:** inventário parcial concluído; integração e validação de build pendentes.

## Evidências coletadas

1. A listagem GitHub de `src/pages` contém **158 arquivos de nível superior** e **7 diretórios de módulos** (`cadastro-produtos`, `configuracoes`, `estoque`, `financeiro`, `manutencao`, `pcp`, `qualidade`).
2. Foram encontrados 13 arquivos de menos de 150 bytes. A inspeção do conteúdo confirmou que são wrappers/re-exports de telas existentes, não prova isolada de funcionalidade ausente. Precisam ser mapeados às rotas antes de qualquer remoção.
3. `src/AppEntryV2.tsx` usa carregamento sob demanda por `lazyPage`/React.lazy e contém recuperação de chunk antigo; `src/AppBootstrap.tsx` possui boundary de inicialização e gate de acesso.
4. `package.json` define verificações para TypeScript, lint, rotas, imports lazy, segurança Supabase, contrato fiscal, tablet de qualidade e integridade do build. A existência desses scripts não equivale a uma execução aprovada.
5. A tela `src/pages/PedidoCompra.tsx` já possui operações Supabase, paginação, seleção de fornecedor/produto, salvamento por RPC, aprovação, edição restrita por status e impressão. Ela usa CSS local extenso com regras compactas sobrepostas; precisa ser comparada visualmente antes de substituir qualquer fluxo.
6. Existe também `src/pages/ComprasPedidoCompra.tsx`, com outro fluxo de pedido. É necessário confirmar o mapeamento de rotas e decidir se os dois fluxos são intencionais antes de unificá-los.
7. `src/components/compras/PedidoCompraForm.tsx` foi criado e agora importa as classes de `src/components/industrial/forms/industrialFormStyles.ts`. **O componente ainda não foi conectado à tela operacional nem teve type-check/build executado nesta rodada.**
8. `scripts/quality_audit_backlog.json` contém 13 erros históricos datados de 07/10/2026, inclusive erros de TypeScript antigos. Não devem ser tratados como erros atuais sem reexecutar os comandos.
9. A branch `main` está sem proteção de branch no GitHub (`protected: false`). O contrato `verify-approved-ui-lock` protege quatro arquivos somente quando seus gates executam; não substitui regras de branch nem revisão obrigatória.
10. O check Vercel dos commits desta rodada retornou `failure` com URL de limite de builds (`upgradeToPro=build-rate-limit`). A lista de deployments mostrava um deployment de produção em `BUILDING` para commit anterior (`3ee7d628...`) e um último `READY` visível para `7a055c9...`; nenhum desses estados comprova que o commit atual foi publicado com sucesso.

## Comparação de arquitetura com Carbon

Padrões úteis confirmados na documentação do Carbon:

- Separar UI, modelos/validação e acesso a dados por módulo.
- Centralizar componentes de formulário, tabelas e padrões de layout reutilizáveis.
- Usar schema/validação para impedir divergência entre formulário, serviço e persistência.
- Tratar PostgreSQL/RLS como limite de segurança multiempresa; a ocultação de botões no cliente não substitui autorização no banco.
- Usar migrations versionadas e tipos de banco gerados, sem inventar colunas ou editar tipos gerados manualmente.
- Carregar páginas sob demanda, com fallback de carregamento e recuperação segura para chunks antigos.
- Manter documentos controlados com revisão, autoria, estado de aprovação e evidência do original conforme o modelo de dados existente.

Carbon usa uma arquitetura e versões próprias (React Router em modo framework, Vite, Tailwind 4 e monorepo). O ERPSis usa Vite, React Router, Tailwind 3 e Supabase. A referência deve ser adaptada, não copiada mecanicamente.

## Pendências prioritárias — não marcar como concluídas até haver evidência

- [ ] Integrar `PedidoCompraForm` ao fluxo de tela correto sem perder salvamento, aprovação, edição, impressão, empresa ativa e permissões.
- [ ] Executar `npm run type-check`, `npm run lint:check`, `npm run audit:all`, `npm run verify:lazy-imports`, `npm run verify-routes` e `npm run build`; registrar os resultados reais.
- [ ] Verificar o status atual dos 13 erros históricos e atualizar o backlog com a saída de uma execução real, sem apagar histórico.
- [ ] Inventariar todas as rotas registradas versus arquivos existentes, wrappers/re-exports, telas órfãs, telas duplicadas e arquivos de tamanho suspeito.
- [ ] Auditar imports e uso efetivo dos componentes de `src/components`; identificar campos, datas, comboboxes/lupas, grids, botões, tabelas, gráficos, modais e impressão duplicados.
- [ ] Confrontar cada módulo (Compras, Estoque, Manutenção, PCP, Qualidade, Engenharia, Fiscal, Financeiro, RH e demais rotas) com schema/migrations/RLS e testes existentes.
- [ ] Confirmar no ambiente Supabase quais migrations foram aplicadas; presença de um arquivo SQL no GitHub não comprova execução em produção.
- [ ] Confirmar CI e deployment do commit final; não declarar “verde” sem checks concluídos.
- [ ] Resolver o limite de builds do Vercel ou aguardar cota; reexecutar e confirmar o deployment do HEAD atual.
- [ ] Ativar proteção da branch `main` com PR obrigatório e checks mínimos depois de verificar as permissões disponíveis e quais checks realmente são confiáveis.

## Regras de execução

- Não remover nem sobrescrever telas aprovadas sem diff e justificativa.
- Não inventar tabelas, colunas, RPCs, permissões, dados de exemplo ou estado de sucesso.
- Toda alteração de código novo deve registrar data, revisão e escopo no cabeçalho.
- Atualizar uma tela por vez, executar os gates disponíveis, corrigir falhas e só então avançar.
- O componente de formulário compartilhado é um primeiro passo, não um bloqueio global já aplicado a todas as telas.


## Segunda passagem — inventário real de rotas e limites de validação

**Data:** 2026-10-16  
**Revisão:** AUDIT-2026-10-16-R2

### Evidências adicionais

- A árvore versionada consultada contém **784 caminhos**; foram encontrados **195 arquivos TSX em `src/pages`** contando subpastas, e **247 declarações `<Route>`** no `src/AppEntryV2.tsx`. Esses números medem inventário estático, não funcionalidades concluídas.
- Compras tem rotas explícitas para `/compras`, `/compras/requisicoes`, `/compras/recebimentos`, `/compras/rfq`, `/compras/pedido`, `/compras/ordem-compra`, fornecedores, solicitação manual, análise de preços, relatórios e ajuda. `/compras/pedido` e `/compras/ordem-compra` apontam para `src/pages/PedidoCompra.tsx`.
- `src/pages/ComprasPedidoCompra.tsx` não aparece como import nem componente nas ocorrências de `src/AppEntryV2.tsx) consultadas. É **candidato a tela órfã**, não deve ser removido antes de uma busca global completa e revisão do histórico.
- A tela operacional `PedidoCompra.tsx` contém campos complementares gravados por um `update` após a RPC de salvamento. A migration de compras consultada declara parte do esquema-base, mas não prova o esquema atualmente aplicado nem confirma todas essas colunas. **Não executar alteração de banco nem declarar compatibilidade sem conferir migrations completas e schema remoto.**
- O check combinado do HEAD `123388c5690dbda353aca43f2653b9e57797e429` continua em **failure**, com destino Vercel de limite de builds (`upgradeToPro=build-rate-limit`). Não há evidência de build/deploy verde para esse HEAD.
- As ferramentas conectadas do Supabase responderam **sem permissão** ao listar tabelas e migrations do projeto. Portanto, esta rodada não verificou o schema remoto, RLS, migrations aplicadas, advisors ou logs de produção.
- Context7 foi consultado para React lazy/Suspense, Supabase RLS/migrations/types e Tailwind responsivo. Exa e Firecrawl localizaram e leram a documentação do Carbon. O padrão aproveitável é separar rota/UI, validação/serviço e persistência; o código Carbon não é plug-and-play no Vite/React Router atual do ERPSis.
- Figma está conectado, mas não foi fornecido um arquivo/frame de referência do ERP para auditar ou alterar. Product Design está disponível como skill de fluxo, sem uma ferramenta de execução de redesign visível nesta sessão. AI Fashion Designer é voltado a design de vestuário e não é apropriado para construir módulos ERP; não será acionado artificialmente para isso.

### Estado por camada — evidência, não suposição

| Camada | Estado observado | Próxima ação verificável |
|---|---|---|
| Rotas/lazy loading | Há roteador e lazy loader; 247 declarações de rota | Executar `verify-routes` e `verify:lazy-imports` no CI |
| UI Compras | Duas implementações de tela de pedido existem; rotas conhecidas apontam para `PedidoCompra` | Comparar fluxos, schema e screenshots antes de consolidar; não trocar por formulário simplificado |
| TypeScript/lint/build | Scripts estão definidos; execução atual não foi realizada por esta sessão | Rodar o pipeline completo em runner autorizado |
| Supabase/RLS | Migration de compras está no Git; leitura remota negada | Reconectar com permissões de leitura do projeto e comparar migrations, tipos, colunas, RPCs e policies |
| Vercel | Check do HEAD falhou por limite de builds | Resolver cota e verificar deployment do HEAD exato |
| Proteção de `main` | API reportou `protected: false` | Configurar regras de PR/checks com permissão administrativa disponível |
| Demais módulos | Há arquivos e rotas; isso não comprova completude funcional | Auditar módulo por módulo com matriz de CRUD, permissões, RLS, impressão, estados de erro e testes |

### Portão para declarar um módulo concluído

Só marcar como concluído quando todos forem comprovados: rota real; leitura e gravação com schema existente; isolamento multiempresa e autorização; estados loading/empty/error/success; validação e mensagens; UX compacta consistente; impressão/exportação quando aplicável; testes estáticos/funcionais relevantes; build e deployment do commit validado. Ausência de evidência fica marcada como **pendente**, nunca como concluída.


## Continuação — telas de Qualidade (16/10/2026)

### Alterações versionadas nesta rodada

- `src/pages/QualidadeInspecaoProcesso.tsx` — cabeçalho de revisão adicionado; inputs/selects passaram do padrão local de 54 px para o token compartilhado `fieldClass` (32 px); labels usam `labelClass`; ações Nova inspeção, Salvar laudo e Imprimir foram compactadas para 32 px; espaçamento externo reduzido. Consultas, validações, lógica de salvamento e impressão foram mantidas sem alteração intencional.
- `src/pages/QualidadeInspecoesIndustrial.tsx` — `fieldClass` e `labelClass` agora vêm de `src/components/industrial/forms/industrialFormStyles.ts`, removendo duplicação local. `buttonClass` local e operações funcionais foram preservados.
- Commits: `33e6415dd9925b693f60cfb807fb552440fb364c` (Inspeção em processo) e `fe529865b33a1892dc37c9acd0f8362e47807739` (Inspeção de lotes).

### Telas verificadas sem alterações

- `src/pages/QualidadeEspecificacoesTecnicas.tsx` já utiliza controles compactos (28–30 px) e ações pequenas; foi preservada para evitar alteração desnecessária.
- `src/pages/QualidadeTablet.tsx` lista as áreas de SGQ e mantém links para inspeções, especificações, lotes, RNC/CAPA, GED, CEP e calibração.
- `src/AppEntryV2.tsx` contém rotas de Qualidade protegidas por `QualityPlanGate`, incluindo `/qualidade/ged-documentos` e variantes por ID.

### Validação pendente

- A alteração mais recente disparou o workflow `ERP Industrial CI`, mas a consulta inicial ainda retornou status `pending` sem jobs disponibilizados. Não declarar os dois commits aprovados até que o workflow e o check Vercel terminem para o SHA atual.
- A conexão Supabase não permite consultar o schema remoto nesta sessão; nenhum schema, RPC ou dado foi inventado ou alterado.
- A página GED não foi modificada nesta rodada porque o componente real requer inspeção adicional do arquivo efetivamente mapeado na rota, para evitar atualizar o arquivo errado.

### Próximo ciclo da Qualidade

1. Resolver/confirmar o workflow do SHA atual.
2. Auditar o componente GED efetivamente usado na rota e seus uploads/storage/revisões.
3. Revisar liberação e quarentena de lotes para garantir o bloqueio transacional de lotes reprovados.
4. Revisar RNC/CAPA e instrumentos de calibração, com atenção a RLS, schema e status.
5. Rodar novamente os contratos de regressão e confirmar Vercel READY antes de marcar cada item concluído.

## Terceira passagem — qualidade, GED e validação transacional (16/10/2026)

**Revisão:** AUDIT-2026-10-16-R3

### Alterações adicionais versionadas

- `src/pages/QualidadeInspecoesIndustrial.tsx` — commit `10b55e95e224eb0ea9836c6a68cb3d76dcd754c5`: limites visuais de quantidade total e tamanho de amostra agora refletem as validações já existentes no formulário; a mensagem de ajuda foi corrigida para não contradizer o suporte a critérios documentais/não numéricos; linhas e cabeçalho da grade foram compactados para 32 px.
- `src/pages/QualidadeInspecoesIndustrial.tsx` — commit `24277652bb7d9f507115ae54b2334a1c01710947`: ajuste no seletor CSS do cabeçalho para que o padding compacto não seja sobrescrito por regra de maior especificidade.
- `src/pages/qualidade/GEDDocumentos.tsx` — commit `2b38894675eca860470f4e0e98d3529bfab08ea2`: padronização dos cantos dos controles de 4 px para 2 px; upload, armazenamento, revisão e aprovação não foram intencionalmente alterados.
- `supabase/migrations/20261016170000_harden_quality_inspection_validation.sql` — commit `ab18f01a2d4cae134f757085fef050c5e5e1ec89`: reforça a função RPC existente para rejeitar quantidade/amostra nulas ou não positivas e lista de medições ausente, inválida ou vazia. Reutiliza a assinatura e o corpo funcional da migration existente, sem adicionar tabela, coluna ou RPC com nome novo.

### Verificação e limites

- O workflow `ERP Industrial CI` do commit anterior `62eab8d366543eb129e892c21ae88d2109197933` concluiu com sucesso: TypeScript, ESLint, auditorias, contratos de rotas/imports e build de produção passaram naquele SHA.
- Isso **não valida automaticamente** os commits posteriores. O status Vercel do HEAD consultado continua em falha por limite de builds (`upgradeToPro=build-rate-limit`); não há confirmação de publicação do HEAD atual.
- A migration de endurecimento está versionada no Git, mas não foi aplicada nem testada contra o banco remoto nesta sessão. A conexão de leitura do Supabase continua indisponível; não declarar a função remota atualizada até confirmar execução da migration.
- O GED já recebeu ajuste de responsividade e agora a padronização de cantos; o histórico anterior que dizia que o GED não havia sido modificado fica supersedido por este adendo.
- Próximo portão: confirmar execução da migration no Supabase, rodar o CI para o HEAD atual, testar aprovação/reprovação/quarentena com sessão autenticada e validar o deployment de produção antes de fechar a pendência.

