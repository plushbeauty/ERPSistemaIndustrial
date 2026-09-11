# Estado de Execução — ERP Industrial

**Última atualização:** 2026-09-11

## Projeto
ERP Industrial / SGQ ERP — `plushbeauty/ERPSistemaIndustrial`

## BLOCO ATUAL
**02 — Login, sessão, permissões e segurança funcional**

## ÚLTIMO ITEM CONCLUÍDO E VALIDADO
Estrutura base de autenticação e proteção de rotas: frontend chama a Edge Function `erp-login`, estabelece sessão Supabase e valida o vínculo do usuário ERP antes de liberar o sistema.

## ITEM ATUAL
Validar e corrigir o fluxo completo **cadastro de empresa → Supabase Auth → `erp_usuarios` → login → sessão → permissões**.

## PRÓXIMO ITEM OBRIGATÓRIO
Executar os cenários de autenticação e regressão antes de avançar para CRUD.

## ITENS CONCLUÍDOS E VALIDADOS
- Projeto e branch `main` identificados.
- Integração do frontend com o projeto Supabase Industrial identificada.
- Edge Function `erp-login` ativa e implementada.
- Edge Function `erp-company-signup` ativa e implementada.
- Cadastro de empresa passou a exigir CNPJ no frontend e backend.
- Cadastro cria empresa, setores iniciais, identidade Supabase Auth e `erp_usuarios` vinculado.
- Rotas protegidas usam validação de sessão e acesso.
- `/master` possui validação de administrador.

## ITENS PENDENTES
- Login real com usuário novo.
- Login inválido e usuário inexistente.
- Usuário inativo.
- Empresa bloqueada/expirada.
- Setor inválido.
- Persistência e revalidação da sessão após refresh.
- Logout.
- Recuperação de senha.
- Bloqueio de `/master` para não administrador.
- Auditoria dos usuários ERP existentes sem vínculo Auth.
- Regressão do cadastro após correção do CNPJ.
- Validação da implantação de produção mais recente.

## ERROS ABERTOS
1. Usuários ERP existentes sem `auth_user_id` não podem ser considerados autenticados até provisionamento/validação legítima.
2. O `erp-login` possui provisionamento automático de Auth quando `auth_user_id` está vazio; isso deve ser revisado como risco de segurança antes da aprovação final do bloco.
3. A implantação mais recente precisa ser confirmada como READY antes de homologação.

## ERROS CORRIGIDOS
- Cadastro de empresa não enviava CNPJ: corrigido.
- URL do cadastro apontava para projeto Supabase incorreto: corrigida para o projeto Industrial.

## TESTES REALIZADOS
- Inspeção do código de `AppEntryV2.tsx`.
- Inspeção da Edge Function `erp-login`.
- Inspeção da Edge Function `erp-company-signup`.
- Verificação da existência das tabelas públicas do projeto.
- Verificação das Edge Functions ativas.

## TESTES PENDENTES
- Testes ponta a ponta reais com credenciais válidas e inválidas.
- Persistência Auth/ERP.
- Sessão/refresh/logout.
- Permissões por nível.
- Cadastro real e regressão.

## BLOQUEIOS EXTERNOS
Nenhum bloqueio externo definitivo registrado neste estado. A indisponibilidade de credenciais de usuários antigos impede somente a homologação desses acessos específicos; não autoriza mascarar a falha.

## ARQUIVOS/COMPONENTES RELEVANTES
- `src/AppEntryV2.tsx`
- `src/pages/CadastroEmpresa.tsx`
- `supabase/functions/erp-login/index.ts`
- `supabase/functions/erp-company-signup/index.ts`
- `docs/EXECUTION-STATE.md`

## PRÓXIMA AÇÃO EXATA
1. Reauditar o fluxo de login/cadastro contra o banco e Auth.
2. Corrigir qualquer defeito encontrado antes de avançar.
3. Executar cenários normal, inválido, inativo, empresa bloqueada, sessão, logout e permissões.
4. Confirmar regressão e estado da implantação.
5. Só então atualizar este arquivo e avançar para o próximo item do Bloco 02.
