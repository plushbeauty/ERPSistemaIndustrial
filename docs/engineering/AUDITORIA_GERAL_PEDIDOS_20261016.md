# Auditoria geral das solicitações — ERP Sistema Industrial

**Data:** 2026-10-16  
**Revisão:** AUDITORIA-GERAL-ERP-20261016-01  
**Repositório:** `plushbeauty/ERPSistemaIndustrial`  
**Branch revisada:** `fix/clientes-clone-fornecedores-producao`  
**Status geral:** **PARCIAL / NÃO HOMOLOGADO**

## Critério

Um commit comprova que houve uma gravação no GitHub; não comprova que a tela ficou correta, que o banco remoto recebeu a migration, que os testes passaram ou que a alteração está publicada. Esta auditoria separa código observado, validação e pendências.

## Matriz dos pedidos de hoje

| Área / tela | Evidência no código e commits | Estado comprovável | Pendência / próximo passo |
|---|---|---|---|
| Home pública SYNQRA `/` | `src/PublicIndustrialHome.tsx`; commits `54bb7ac`, `d417ed8`, `8354480`. CTA de teste de 14 dias, planos com alternância mensal/anual e 15% anual, hero com carrossel e Ajuda IA estão no código. | Parcialmente implementada; o CSS oculta `.sgq-stage-caption` e `.sgq-dots`, preservando rotação automática. | Não há confirmação visual de produção após a última alteração; validar layout desktop/mobile, links, dropdown e carrossel no deploy. |
| Cadastro de empresa `/cadastro-empresa` | `src/pages/CadastroEmpresa.tsx`: não importa `InfrastructureTrust`; há referências a `/logo/logo.png`. | Ajuste de código parcial observado. | A imagem/logo, bloco branco, layout dividido e fluxo real precisam de teste visual e de cadastro autenticado/Edge Function. A ausência da importação não prova que a tela esteja visualmente correta. |
| Cadastro de Produtos `/produtos-vendas` | `src/pages/ProdutosVendasIndustrial.tsx`; commits `bb2b7f0`, `7b86ea3`; contrato de regressão `dcb222f`. Campos, abas, consultas/lupas e dados de Produção/Qualidade estão no código. | Código alterado; homologação pendente. | Foram encontrados **dois blocos condicionais para `tab==='producao'`** na mesma tela: o conteúdo inline e o componente `AbaProducaoIndustrial`. Revisar a duplicidade antes de declarar a aba concluída. Executar type-check, lint, build e teste visual. |
| Ficha técnica / cadastro complementar de produtos | `src/pages/cadastro-produtos/FormFichaTecnica.tsx`; commit `0bfaca5`. | Campos e consulta fiscal aparecem no código. | Validar persistência, contratos de tabela, consultas reais e comportamento de salvar/editar; testes automatizados ainda não comprovados. |
| Produção / MRP e documentos de processo | `src/components/industrial/AbaProducaoIndustrial.tsx`; commit `b8dd0d4`, integração `7b86ea3`. | Há consultas implementadas para ficha, operações, máquinas/postos, roteiro e anexos. | Schema remoto, bucket/Storage, RLS por tenant, anexos e dados de sessão real não foram confirmados. |
| Configurações iniciais: Empresa/Endereço, Fiscal e PCP/Custos | `src/pages/configuracoes/AssistenteConfiguracaoInicial.tsx`; migration de configuração presente. | Wizard de três etapas e leituras de configuração estão no código. | Não há prova de gravação ponta a ponta nem de schema remoto aplicado. O histórico registrou erros de TypeScript no arquivo e uma correção posterior; não há check verde posterior comprovado. |
| RH / Administração de usuários | `src/pages/UsuariosAdmin.tsx`; commit `6f3c296`. | Alteração de interface e integração RBAC registrada. | Credenciais, matriz de permissões, RLS/RBAC remoto, bloqueio automático e impressão A4 não foram homologados nesta rodada. |
| Design system industrial compartilhado | `src/styles/industrial-core-ui.css`; commit `68d65d4`. | CSS de medidas compactas existe. | A migração global está incompleta; não se pode afirmar que todas as telas usem o padrão. Migrar por módulo, testar cada formulário e evitar regressão no login. |
| Gabarito de banco: Clientes, Fornecedores, Fiscal, PCP/MES e RH/ASO | `supabase/migrations/20261016121000_gabarito_campos_cadastros_fiscal_pcp_rh.sql`; commits `20f1916` e relacionados. | Migration versionada no repositório. | **Aplicação remota não comprovada.** Conferir tabelas-base, chaves compostas de tenant, constraints, RLS e ordem de migrations antes de aplicar. Não anunciar campos disponíveis em produção sem essa evidência. |
| Login aprovado / prevenção de regressões | `src/styles/industrial-login.css`, `src/pages/ProdutosVendasIndustrial.tsx`, script `scripts/verify-approved-ui-contract.mjs`; commits `39aa509`, `543ab87`, `9f6ea5c`, `dcb222f`. | Há código e contrato de regressão no repositório; um status Vercel foi reportado como sucesso para `dcb222f`. | Isso não valida o HEAD atual nem prova equivalência visual em produção. Rodar o contrato e validar login/produtos juntos. |

## Bloqueios e evidências de validação

1. O registro de auditoria anterior `docs/engineering/CHECKPOINT.md` informa que nenhum teste local foi executado naquele ambiente.
2. Foi reportada falha de TypeScript no commit `6f3c296` em `AssistenteConfiguracaoInicial.tsx`; a correção `8b50346` existe, mas o status observado para ela é Vercel `failure` com URL de limite de build/deploy. Isso não permite inferir que o código corrigido passou nem que falhou por TypeScript: o bloqueio exibido é de limite de deploy.
3. Foram observados checks Vercel em estados diferentes para commits diferentes. Um sucesso de commit anterior não valida commits posteriores.
4. Não foi possível confirmar acesso ao Supabase remoto, execução de migrations, RLS/RBAC real ou o resultado de um cadastro de ponta a ponta.
5. Não foi possível executar neste ambiente `npm run type-check`, lint ou `npm run build`; esses resultados ficam explicitamente pendentes.

## Cabeçalhos de auditoria

Foi registrado o padrão obrigatório em `docs/standards/PADRAO_REVISAO_AUDITORIA_CODIGO.md`. Nesta rodada foram acrescentados cabeçalhos datados/revisionados nos arquivos do escopo de hoje: CadastroEmpresa, AssistenteConfiguracaoInicial, FormFichaTecnica, UsuariosAdmin, industrial-core-ui.css, industrial-login.css, ProdutosVendasIndustrial, AbaProducaoIndustrial e migration do gabarito. A Home já possui cabeçalho padronizado.

**Importante:** cabeçalho adicionado é rastreabilidade documental, não implementação funcional nem validação. Os arquivos com status `IMPLEMENTED_PENDING_VALIDATION` continuam pendentes até executar testes e confirmar CI/deploy.

## Ordem de execução recomendada a partir desta auditoria

1. Obter um resultado de CI/build terminal do HEAD atual, sem inferir a partir de commits anteriores.
2. Corrigir erros reproduzidos por type-check antes de ampliar funcionalidade.
3. Eliminar/revisar a duplicidade da aba Produção em Produtos.
4. Validar o onboarding visual e fluxo real de cadastro.
5. Validar wizard, RH e lookups de produtos com sessão autenticada e schema real.
6. Validar a migration contra o banco e RLS remoto antes de aplicá-la.
7. Fazer teste visual por tela e atualizar o estado para `VALIDATED` somente com evidências.

