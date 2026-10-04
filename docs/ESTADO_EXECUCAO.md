# ESTADO DE EXECUÇÃO — ERP Industrial

PROJETO: ERP Industrial
BLOCO: 02 — Login, sessão, permissões e segurança funcional

ÚLTIMO ITEM VALIDADO: 02.01 — Inventário/reconstrução do estado anterior e ambiente
PRÓXIMO ITEM: 02.02 — Validar cadastro público → empresa → setores → usuário administrador → Supabase Auth → vínculo `erp_usuarios.auth_user_id`
STATUS DO BLOCO: EM ANDAMENTO

## Evidências atuais
- Repositório: `plushbeauty/ERPSistemaIndustrial`, branch `main`.
- Supabase: projeto `zsklkydlawgvwgnvxwwx`, status ACTIVE_HEALTHY.
- Banco: PostgreSQL 17.
- `public.erp_empresas`: 1 empresa.
- `public.erp_usuarios`: 12 usuários cadastrados; na auditoria atual, 0 possuem `auth_user_id`.
- `public.erp_setores`: 12 registros.
- Edge Function `erp-login`: ACTIVE, versão 2.
- Edge Function `erp-company-signup`: criada e ACTIVE, versão 1.
- A tela de cadastro tinha uma falha estrutural: `erp_empresas.cnpj` é NOT NULL, mas o formulário não enviava CNPJ. Corrigido no commit `bbbadf70617e73f0233da7dc26aa86a67f42f3eb`.
- O cadastro agora envia CNPJ e usa o endpoint do projeto correto `zsklkydlawgvwgnvxwwx`.
- O novo fluxo de cadastro cria empresa, setores básicos, identidade Supabase Auth e usuário administrador vinculado, com limpeza compensatória em falhas.
- Último deploy Vercel observado: `dpl_DNf4SRFoDW1fi6nEEseq3kBvsBz5`, commit `bbbadf70617e73f0233da7dc26aa86a67f42f3eb`, ainda BUILDING no momento da verificação.

## ERROS ABERTOS
1. Fluxo de cadastro/login ainda não foi validado ponta a ponta com um cadastro de homologação real.
2. Os 12 usuários existentes continuam sem `auth_user_id`; portanto não considerar login existente como validado.
3. A Edge Function `erp-login` ainda possui provisionamento automático no primeiro login para usuário ERP sem vínculo Auth. Isso precisa ser submetido à validação de segurança antes de ser considerado aprovado.
4. O endpoint público de cadastro não foi submetido a teste real de duplicidade, campos inválidos e rollback.

## CORREÇÕES VÁLIDAS
- Criada `erp-company-signup` no Supabase.
- Corrigido formulário `src/pages/CadastroEmpresa.tsx` para exigir e enviar CNPJ.
- Corrigida URL do endpoint para o projeto Supabase Industrial correto.

## TESTES REALIZADOS
- Consulta direta ao catálogo do Supabase para confirmar schema de `erp_empresas`, `erp_usuarios` e `erp_setores`.
- Consulta de contagem/estado da empresa e usuários.
- Verificação da existência e status das Edge Functions.
- Inspeção do frontend de login e cadastro.
- Inspeção do script de auditoria estática de interações.
- Verificação do novo deploy Vercel: BUILDING; ainda não aprovado.

## TESTES PENDENTES
- Cadastro de nova empresa válido.
- Persistência de empresa/setores/usuário.
- Criação de `auth.users` e vínculo com `erp_usuarios.auth_user_id`.
- Login válido usando os dados recém-cadastrados.
- Senha inválida.
- Empresa inexistente.
- Setor inexistente.
- Usuário inativo.
- Logout e restauração de sessão.
- Rota protegida e `/master`.
- Recuperação de senha.
- Duplicidade de CNPJ/e-mail.
- Falhas de comunicação e rollback.
- Regressão após todos os testes.

## BLOQUEIO EXTERNO
Nenhum bloqueio externo definitivo neste momento. O deploy Vercel está em BUILDING e deve ser reconsultado antes de homologação.

## ARQUIVOS/COMPONENTES ALTERADOS
- `src/pages/CadastroEmpresa.tsx`
- Supabase Edge Function `erp-company-signup`
- `docs/ESTADO_EXECUCAO.md`

## PRÓXIMA AÇÃO OBRIGATÓRIA
1. Reconsultar o deploy `dpl_DNf4SRFoDW1fi6nEEseq3kBvsBz5` até obter READY ou ERROR.
2. Se ERROR, investigar logs e corrigir antes de qualquer avanço.
3. Validar a Edge Function `erp-company-signup` em cenários seguros de homologação sem expor credenciais.
4. Confirmar persistência e vínculo Auth/ERP.
5. Só então iniciar a bateria de testes do login e permissões.
