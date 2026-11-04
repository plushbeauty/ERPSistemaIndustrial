# Contrato de aprovação visual do SYSNQRA ERP & SGQ INDUSTRIAL

- Revisão: UI-CONTRACT-003
- Data: 2026-11-04
- Branch de referência: main
- Verificadores obrigatórios: `npm run verify:approved-ui-lock` e `npm run verify:approved-regression-lock`
- Fonte executável: `scripts/verify-approved-ui-lock.mjs`

## Revisão autorizada — Cadastro Mestre de Produtos (2026-10-27)

O usuário autorizou explicitamente substituir a revisão visual anterior de `src/pages/ProdutosVendasIndustrial.tsx` pelo código atualizado já presente em `main` no commit `280d4e112a78574cdaa446c172c89d0729ddd236`. A revisão `REV-PRODUTO-UI-014` mantém os ajustes de campos compactos, limites de caracteres e descrições da lista limitadas a três linhas. A entrada correspondente no verificador foi atualizada deliberadamente para o hash Git do arquivo aprovado `dcc017c76f5664ebbf7f32540e74836afc5e65ff`. A aprovação é restrita a essa tela e não libera alterações em outros arquivos congelados. Type-check, lint, build e deployment continuam sujeitos a validação após a alteração.

## Regra de proteção

A barra inferior Windows 11 está removida e não pode ser reintroduzida. O menu superior horizontal permanece. Marcadores `isUpdated`, `is-updated-orange` e destaques laranja nos menus são proibidos. O ponto de entrada de Qualidade é **Sistema SGQ**, que abre `ModuleTabletMenuModal`; o modal antigo `PCPTabletMenuModal` não deve voltar.

Uma tela só é considerada congelada quando existe uma referência explícita no verificador e o comando `verify:approved-ui-lock` passa no commit avaliado. Não atualize hashes para fazer uma alteração não aprovada passar. Uma aprovação é específica aos arquivos e ao escopo registrados; não autoriza mudanças em outros módulos.

Antes de alterar CSS global, shell, navegação, tokens ou componentes compartilhados, identifique as telas dependentes e execute as verificações pertinentes. Se o bloqueio falhar, interrompa a publicação até restaurar a referência ou registrar uma revisão autorizada.

## Referências congeladas no verificador de regressão

O script `scripts/verify-approved-regression-lock.mjs` valida os hashes Git blob SHA-1 dos 27 arquivos abaixo e falha se qualquer conteúdo mudar sem revisão explícita:

1. `src/components/layout/PageIntroCard.tsx`
2. `src/components/layout/pageIntroCatalog.ts`
3. `src/pages/ProdutosVendasIndustrial.tsx`
4. `src/components/DigitalCaliper.tsx`
5. `src/components/IndustrialCommandDashboard.tsx`
6. `src/PublicIndustrialHome.tsx`
7. `src/IndustrialLoginDirect.tsx`
8. `src/styles/industrial-login.css`
9. `src/pages/ComprasWorkspace.tsx`
10. `src/pages/PCPWorkspace.tsx`
11. `src/components/PCPMoldPhotoPanel.tsx`
12. `src/features/pcp/FichaProcesso.tsx`
13. `src/pages/QualidadePaquimetroDigital.tsx`
14. `src/pages/PCPTabletOperador.tsx`
15. `src/pages/CertificadoQualidade.tsx`
16. `src/pages/CentraisIndustriais.tsx`
17. `src/hooks/useRealtimeAlerts.ts`
18. `src/pages/QualityRpncForm.tsx`
19. `src/pages/QualityAuditsList.tsx`
20. `src/styles/quality-rpnc-form.css`
21. `src/pages/AccessControlSettings.tsx`
22. `supabase/migrations/20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql`
23. `src/components/layout/ModuleTabletMenuModal.tsx`
24. `src/styles/module-tablet-panel.css`
25. `src/AppEntryV2.tsx`
26. `src/AppBootstrap.tsx`
27. `src/main.tsx`

Referências históricas como `VendasCentral.tsx`, `NovoPedido.tsx`, `PCPFichasProcesso.tsx` e `QualidadeInspecoesIndustrial.tsx` não existem nos caminhos documentados no branch avaliado e não aparecem como rotas ativas em `AppEntryV2.tsx`. Os equivalentes atuais são as páginas listadas acima; não recriar os caminhos antigos sem autorização.

## Estado honesto da cobertura

**Proteção parcial, não total.** A existência de 14 entradas não prova que todas as telas e rotas do sistema foram inventariadas, que todos os hashes correspondem ao conteúdo atual ou que o CI de branch esteja configurado como obrigatório no GitHub. O comando deve ser executado e seu resultado revisado para confirmar o estado atual.

## Inventário pendente

Antes de marcar qualquer tela adicional como aprovada, levantar as rotas de `src/AppEntryV2.tsx`, mapear o componente renderizado por cada rota, identificar estilos e dependências compartilhadas, obter referência visual aprovada e registrar arquivos, revisão, data e evidências. Telas sem evidência de aprovação ficam como `PENDENTE_DE_REFERENCIA`; não gerar hashes automaticamente para elas.

A expansão do bloqueio deve ser incremental. Cada nova referência só pode entrar após aprovação explícita do usuário para aquela tela e validação do hash inicial. As páginas congeladas não devem ser modificadas para acomodar a inclusão de outra página.
