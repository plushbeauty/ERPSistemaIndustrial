# SYSNQRA ERP INDUSTRIAL — Restauração da Central de Compras

**Data/hora da revisão:** 2026-10-24 18:36:28 -03:00  
**Revisão:** APROV-COMPRAS-2026-10-24-R1  
**Fonte de referência:** deployment Vercel `EjPo9mBaQ`  
**Commit de referência:** `16060aad0fce987250586f6c7fb7bb2f20b003c7`  
**Escopo:** restaurar a Central aprovada em `/compras`, registrar revisão com data/hora e congelar o visual original sem alterações visuais.

## Diagnóstico comprovado

- O deployment `EjPo9mBaQ` está `READY` e foi criado a partir de `fix/cadastros-padrao-compras-aprovada`, commit `16060aad0fce987250586f6c7fb7bb2f20b003c7`.
- Na branch de referência, a Central aprovada é `src/pages/ComprasCentral.tsx` e usa as abas nativas `src/pages/ComprasAbaNativa.tsx`.
- No `main` auditado, `/compras` estava apontando para `ComprasIndustrial`; os dois arquivos da Central aprovada não existiam no `main`. Isso explica por que a tela antiga podia voltar.
- O verificador `scripts/verify-approved-ui-lock.mjs` não incluía `ComprasCentral.tsx` nem uma asserção garantindo o destino de `/compras`.

## Alterações nesta branch

1. Restaurados `ComprasCentral.tsx` e `ComprasAbaNativa.tsx` da referência aprovada.
2. Atualizada a rota `/compras` para renderizar `ComprasCentral` dentro do wrapper de acesso existente.
3. Preservado o visual da tela de referência sem alterações de CSS, cores, dimensões, padding, alinhamento ou tipografia.
4. Adicionados data/hora da revisão no componente e na declaração da rota.
5. Adicionado hash imutável da Central e contrato de rota ao verificador de UI aprovada.
6. Corrigido o bloqueio de build independente no shell: removido listener órfão que referenciava `setTabletOpen` inexistente; alteração sem efeito visual, documentada como `APROV-SHELL-2026-10-24-R1` e congelada no contrato.
7. Atualizado `docs/APPROVED_UI_LOCK.md` com a referência, escopo permitido e política de congelamento.

## Preservação

- Não redesenhar o cabeçalho azul-marinho, textos, cores, abas, espaçamentos gerais ou posicionamento das rotas.
- Não trocar as consultas reais do Supabase por dados fictícios.
- A Central obtém o tenant por `erp_current_empresa_id()` e filtra requisições, pedidos, RFQs e dados MRP por `empresa_id`.
- A auditoria de referências no repositório encontrou `ComprasIndustrial.tsx` referenciado somente pelo import antigo de `AppEntryV2.tsx` e pela própria busca do arquivo; removido o import e excluído o arquivo legado da branch. A rota `/compras` não usa mais a tela antiga.

## Validação e limitações

- A referência de deployment/commit foi confirmada pela API da Vercel.
- O status do commit de referência no GitHub registra sucesso do Vercel.
- Esta branch precisa concluir o workflow completo do CI: TypeScript, ESLint, auditorias, lock de telas aprovadas, rotas e build.
- A conexão lógica da tela foi inspecionada no código; **a conexão ao banco remoto e o schema/PostgREST não foram homologados nesta execução**, pois não há projeto Supabase conectado ao conector disponível. Não afirmar que os indicadores estão carregando em sessão autenticada até testar em ambiente real.
- Não considerar a correção implantada até o novo deployment da branch/PR ficar `READY` e a rota `/compras` ser conferida visualmente.

## Regra permanente

Qualquer alteração futura no visual de `ComprasCentral.tsx` é proibida sem autorização explícita. Revisões administrativas sem alteração visual devem atualizar data/hora e o contrato de hash deliberadamente. Alterações comuns em outros módulos não devem modificar esta tela nem atualizar automaticamente seu hash.
