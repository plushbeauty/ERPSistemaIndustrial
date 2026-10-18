# Auditoria de divergência entre o RAR aprovado e o GitHub

**Data:** 2026-10-18  
**Base comparada:** `main` no commit `9898f4d7ecf81ece0bab9d75c2b2977650b926e1`  
**Arquivo de referência:** `ERPSistemaIndustrial-main.rar` enviado nesta conversa  
**Regra:** páginas explicitamente aprovadas ficam congeladas; qualquer alteração futura exige autorização expressa.

## Resultado da comparação por hash

O RAR foi aberto e foram comparados os hashes Git dos arquivos de código, scripts, migrations e workflows extraídos com a árvore de arquivos do GitHub.

- 691 arquivos de fonte/documentação técnica foram indexados no RAR.
- A árvore do GitHub continha 736 arquivos versionados.
- Foram encontradas **25 divergências de conteúdo** entre arquivos existentes nos dois lados e **16 arquivos presentes no RAR que não existiam em `main`**.
- A lista abaixo registra o resultado inicial, antes das restaurações desta branch. Arquivos de evidência de auditoria não foram copiados automaticamente porque seus logs antigos não comprovam o estado atual do build.

## Restaurações nesta branch

- `src/components/IndustrialCommandDashboard.tsx`: restaurada a tela de comando industrial do RAR; é o componente realmente renderizado pelo dashboard de `/erp-industrial`.
- `src/PublicIndustrialHome.tsx`: restaurado o carrossel acessível, controles de pausa/teclado, respeito a movimento reduzido e link para o catálogo de planos.
- `src/pages/PCPFichasProcesso.tsx`: restaurada a versão do RAR com as categorias e os formulários especializados de Prensados, Injetados, Acabamento e Montagem/Embalagem.
- `src/components/PCPMoldPhotoPanel.tsx`: restaurado o painel de fotos usado dentro das fichas.
- `src/pages/PCPFichasProcessoIA.tsx` e `supabase/functions/erp-ai-process-sheet/index.ts`: restaurada a proposta de criação de rascunho com IA, com validação da sessão e da empresa, sem chave service-role.
- `src/AppEntryV2.tsx`: restaurada a rota `/pcp/fichas-processo/ia`.
- `supabase/migrations/20261017140000_pcp_fichas_acabamento_embalagem.sql`: adicionada ao repositório a migration que permite as duas categorias novas.
- `supabase/config.toml`: habilitado explicitamente `verify_jwt = true` para a Edge Function de IA.
- `src/components/PCPTabletMenuModal.tsx`: P09 agora abre o submenu aprovado com cinco opções: Fichas de Processo, Prensados, Injetados, Acabamento e Montagem. Os atalhos de processo usam a rota canônica `/pcp/fichas-processo?tipo=...`.
- `scripts/verify-process-sheet-submenu.mjs`: contrato de regressão para rótulos, rotas, categorias, migration e autenticação da Edge Function. O contrato foi ligado a `verify:production`, `verify:release` e ao workflow de CI.
- As restaurações aprovadas foram marcadas e incluídas no hash lock para falhar no CI se alguém as alterar sem autorização.

## Divergências iniciais que ainda precisam de revisão

Os seguintes arquivos diferiam do RAR na base `main`. Eles não foram substituídos automaticamente nesta rodada porque afetam o shell global, autenticação, estilos compartilhados ou módulos além do escopo imediato e precisam de comparação funcional antes de restaurar:

- `scripts/verify-routes.mjs`
- `src/IndustrialLoginDirect.tsx` — **mantido intencionalmente**: a versão atual preserva o texto de login aprovado (“GESTÃO INDUSTRIAL INTEGRADA”), enquanto a cópia do RAR traz outro texto e links adicionais.
- `src/components/InfrastructureTrust.tsx`
- `src/components/industrial/forms/industrialFormStyles.ts`
- `src/components/layout/ERPHorizontalShell.tsx`
- `src/main.tsx`
- `src/pages/IndustrialDashboardPremium.tsx` — não está ligado à rota principal; não trocar o dashboard ativo por este componente sem verificar os contratos.
- `src/pages/PCPAgendaMaquinas.tsx`
- `src/pages/PCPExecucaoIndustrial.tsx`
- `src/pages/PCPIndustrial.tsx`
- `src/pages/PlanosIndustrial.tsx`
- `src/pages/QualidadeInspecoesIndustrial.tsx`
- `src/pages/UsuariosAdmin.tsx`
- `src/styles/form-system-2026.css`
- `src/styles/industrial-hero-background.css`
- `src/styles/industrial-public-restoration.css`
- `src/styles/industrial-v2.css`
- `src/styles/public-modern.css`
- `src/styles/visual-lock-2026.css`
- `supabase/config.toml` — diferença original registrada; a entrada da Edge Function foi acrescentada nesta branch sem remover as demais configurações.

## Arquivos do RAR ausentes na base inicial

- `src/auth/erpPermissions.ts`
- `src/pages/PCPFichasProcessoIA.tsx` — restaurado nesta branch.
- `src/styles/synqra-premium-pages.css`
- `supabase/functions/erp-ai-process-sheet/index.ts` — restaurado nesta branch.
- `supabase/migrations/20261017110000_erp_quarantine_rbac_idempotency.sql`
- `supabase/migrations/20261017130000_pcp_programacao_ficha_processo.sql`
- `supabase/migrations/20261017140000_pcp_fichas_acabamento_embalagem.sql` — restaurada nesta branch.
- `docs/auditoria/evidencias/*` — evidências históricas presentes no RAR. Não são consideradas prova de validação atual; precisam ser regeneradas depois do CI.

## Telas aprovadas congeladas

Os sete arquivos do contrato existente continuam com os hashes aprovados do RAR:

- `src/pages/VendasCentral.tsx`
- `src/pages/NovoPedido.tsx`
- `src/pages/ProdutosVendasIndustrial.tsx`
- `src/styles/industrial-login.css`
- `src/pages/QualidadeCentralTablet.tsx`
- `src/components/TabletMenuModal.tsx`
- `src/pages/PCPTabletOperador.tsx`

Nenhum desses sete arquivos foi alterado nesta branch.

## Proteções contra regressão

1. Hash lock para as telas congeladas e para as telas restauradas nesta branch.
2. Teste de contrato de submenu/rotas executado em CI e na validação de produção.
3. Antes de promover a produção, exigir CI verde e teste do deploy candidato; nunca corrigir build com um revert amplo de páginas aprovadas.
4. Usar commits pequenos por área e revisão por diff. Um erro de build deve ser corrigido no arquivo que falhou, sem reverter o conjunto de melhorias.
5. Configurar no GitHub proteção de `main`: PR obrigatório, status checks obrigatórios, revisão para mudanças protegidas e bloqueio de force-push. Configurar no Vercel Deployment Checks para impedir promoção quando os checks exigidos falharem.
6. As migrations adicionadas ao repositório não foram aplicadas ao Supabase remoto nesta etapa. A aplicação no banco exige validação separada do schema e das políticas RLS.

**Estado:** auditoria comparativa iniciada e causa principal confirmada; esta branch restaura os componentes centrais e adiciona proteção de regressão. A revisão dos demais 25 arquivos divergentes ainda precisa ser concluída antes de declarar que todo o RAR foi sincronizado.
