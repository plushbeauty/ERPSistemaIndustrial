# Homologação local do ERP

**Situação: build local verificável; homologação completa e produção não comprovadas.**

## Correções realizadas

- O bootstrap e o roteador agora mantêm cadastro, planos, ativação de convite e páginas públicas de módulos acessíveis sem sessão, sem liberar rotas de operação.
- Removidos dois desvios que renderizavam Configurações ADM antes da validação do perfil e da empresa.
- Corrigidos os erros de sintaxe nos arquivos `AnoFiscal.tsx`, `PainelOrdensProducao.tsx`, `NFeEmissao.tsx` e `PCPIndustrial.tsx`, além dos erros de tipagem descobertos após o parser voltar a compilar.
- O XLSX de comissões agora monta os cabeçalhos ZIP corretamente e entrega partes `ArrayBuffer` ao navegador.
- Incluída a migration `20261004220000_fix_erp_master_null_tenant_authorization.sql`. A auditoria das migrations mostrou que o helper `erp_is_master()` fazia `JOIN` obrigatório com `erp_empresas`, incompatível com o Master criado pelo bootstrap, cujo `empresa_id` é nulo. A migration passa a exigir a identidade autenticada e os mesmos atributos estritos de Master verificados pelo frontend. Ela não altera grants nem policies e **não foi aplicada remotamente**.
- Confirmado o helper canônico `erp_current_empresa_id()`. A migration de compatibilidade `20260921140500_erp_nfe_legacy_tenant_helper_compatibility.sql`, colocada antes da policy histórica que a referencia em instalações limpas, delega a ele sem criar outra fonte de tenant. A migration `20261005130000_erp_nfe_draft_tenant_permission_hardening.sql` substitui a RPC e policies fiscais, sem alterar migrations históricas; seed de permissão limitado a ADMIN/MANAGER para emitir e SUPERVISOR para consultar; exige sessão, usuário ativo, tenant/master explícito, `fiscal.emitir` para gravar, item consistente, produto no mesmo tenant e documento pai NF-e em rascunho. Também habilita RLS e usa guardas restritivas para impedir que policies permissivas anteriores ampliem acesso. As migrations não foram aplicadas remotamente.
- A migration de compatibilidade é ordenada antes da migration histórica que ainda a referencia; antes de aplicar em uma instalação existente, conferir o histórico remoto de migrations e resolver explicitamente qualquer versão fora de ordem.
- Adicionado `npm run verify:nfe-contract` ao gate de release para impedir regressão de helper de tenant, permissão, RPC transacional, autoria e confirmação da emissão.
- Os gates estáticos de rotas e interações foram ajustados para não marcar elementos HTML embutidos, tipos `Link[]` ou o texto `TODOS` como ações ausentes/placeholders.

## Diagnóstico Supabase

O `401 permission denied` informado para leitura anônima de `erp_empresas` é compatível com as migrations versionadas: as policies de leitura dessa tabela são `TO authenticated` e limitam linhas à empresa da sessão ou ao Master. Isso não demonstra falha do endpoint Auth nem justifica abrir leitura para `anon`. Nenhuma policy ou dado remoto foi alterado.

O gate local `verify:supabase-env` valida o contrato estrutural, mas reportou que as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` não estão definidas neste ambiente. Nenhuma credencial foi criada ou presumida. Não foi possível autenticar um usuário real, conferir o helper já instalado no Supabase, validar isolamento entre dois tenants, nem confirmar CRUDs remotos. A nova migration precisa ser revisada e aplicada pelo responsável antes de considerar o acesso Master homologado no ambiente remoto.

## Validações e limites

`npm run verify:release` terminou com código 0 neste ambiente: type-check, gates de configuração/lockfile/CI, lint sem erros bloqueadores, auditoria global sem findings, auditoria estrutural sem falhas, auditoria de interações sem bloqueios, imports lazy, build Vite e verificação do diretório `dist` (228 assets; 159 rotas verificadas). O arquivo XLSX também foi gerado e extraído localmente para confirmar a estrutura ZIP. Essas provas não demonstram funcionamento de Auth, RLS, integrações fiscais ou produção. O projeto exige Node 24.x, mas o runtime disponível foi Node 22.14.0. O deploy atual da Vercel não foi consultado e nenhum deploy foi feito.

Antes de marcar o ERP como pronto, ainda é necessário repetir a homologação em Node 24 e, com credenciais já configuradas e usuários de teste autorizados, validar login/sessão, Master, CRUD crítico e isolamento multiempresa no Supabase canônico. Confirmar também a migration pendente no ambiente alvo e executar os testes de navegador e produção. **Não declarar GREEN/READY até essas verificações serem concluídas.**
