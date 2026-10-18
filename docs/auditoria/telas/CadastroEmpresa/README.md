# Auditoria de tela — CadastroEmpresa.tsx

- **Data:** 2026-10-18
- **Arquivos:** `src/pages/CadastroEmpresa.tsx`, `src/pages/HelpCadastroEmpresa.tsx`, `src/AppEntryV2.tsx`
- **Status:** **PARCIAL — layout ajustado; onboarding e contrato de segurança ainda exigem homologação**
- **Branch:** `fix/blog-portal-conhecimento-20261018`

## Achados verificados no código

1. A tela usava classes antigas `company-signup-page`, `company-signup-card`, `selected-plan-signup`, entre outras. O formulário foi migrado para Tailwind com grid responsivo de 12 colunas e controles de 32 px.
2. A tela chama a Edge Function existente `erp-company-signup`; o nome da função foi preservado para evitar quebra do contrato.
3. A rota pública `/ajuda/cadastro-empresa` foi adicionada no roteador principal, e a página contém o POP operacional.

## Riscos P1/P0 identificados no contrato atual do backend

1. **Não é provisionamento Master:** `supabase/functions/erp-company-signup/index.ts` cria `erp_usuarios.perfil='ADMIN'`, `nivel_admin=1`, `is_master=false`. O POP e a tela não prometem acesso Master global.
2. **CPF incompatível com o armazenamento atual:** a função insere o documento recebido em `erp_empresas.cnpj`, independentemente de `tipo_documento`. A opção CPF no formulário não deve ser considerada operacional até haver contrato de banco separado e validação fiscal adequada.
3. **Plano/módulo não persistidos:** a função atualmente grava `plano: 'Essencial'` e não utiliza o módulo enviado. Os parâmetros `plano`/`modulo` exibidos pelo formulário não alteram por si só o plano contratado no banco.
4. **Endpoint público privilegiado:** a Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` no servidor e `verify_jwt = false` conforme configuração do projeto. Não há neste código uma defesa visível de rate limit/CAPTCHA/anti-automação. Antes de produção, é necessária proteção contra abuso e criação concorrente duplicada, além de revisar CORS e monitoramento.
5. A busca prévia de duplicidade de documento/e-mail não é uma garantia contra duas requisições concorrentes; constraints únicas no banco e tratamento de conflito devem ser verificados.

## Alterações desta revisão

- Substituídas as classes CSS específicas da página por classes Tailwind locais, grid responsivo e campos compactos.
- Preservado `InfrastructureTrust` e a chamada à Edge Function existente.
- Mantidos os campos enviados no contrato atual; sem mudanças na Edge Function nem nas permissões de provisionamento.
- Adicionada página `HelpCadastroEmpresa.tsx` e rota pública `/ajuda/cadastro-empresa`.
- Documentado no POP que o fluxo cria administrador de tenant, não Master global, e que CPF/plano/módulo precisam de correção de backend.

## Validação

| Verificação | Resultado |
|---|---|
| Leitura do componente e Edge Function | Concluída |
| Refatoração Tailwind | Gravada no branch; inspeção visual real pendente |
| Rota do POP | Gravada no roteador; verificação automatizada pendente |
| Type-check / lint | Pendente |
| Auditorias globais/interações | Pendente |
| Verificação de rotas/imports | Pendente |
| Build | Pendente; status Vercel pode ser bloqueado por limite de build |
| Teste real de onboarding | Pendente |
| Verificação de duplicidade / rollback transacional | Pendente |
| Testes de segurança do endpoint público | Pendente |
| Deploy de produção | Não confirmado |

## Commits

- Tela: `4ab03e358ca1f2bd2278523770efb6d97aa7d254`
- POP: `bcd3e229b53fe62040ac32c0179be6a1a03814a6`
- Rota: `72336a6a1ab36c6854d51da0540e618dda8b0c43`
