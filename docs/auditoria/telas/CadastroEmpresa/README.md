# Auditoria de tela e contrato — CadastroEmpresa.tsx

- **Data da revisão:** 2026-10-18
- **Branch:** `fix/blog-portal-conhecimento-20261018`
- **Status:** **PARCIAL — correções de código gravadas; homologação live e segurança antiabuso pendentes**
- **Escopo:** cadastro público de empresa, Edge Function `erp-company-signup`, plano, documento fiscal, perfil inicial e rota POP.
- **Restrição:** não alterar `AtivarAcesso.tsx` nesta etapa.

## Contrato corrigido nesta revisão

1. **Administrador de tenant não é Master:** o provisionamento grava explicitamente `perfil='ADMIN'`, `nivel_admin=1`, `is_master=false`. O cadastro público não permite escolher nem enviar papel Master.
2. **Documento fiscal:** a função normaliza os dígitos, valida dígitos verificadores de CPF/CNPJ e persiste `documento` e `tipo_documento`. Mantém o campo legado `cnpj` preenchido para compatibilidade com consumidores antigos, pois o esquema versionado ainda o usa como campo obrigatório. A semântica legada precisa ser removida numa migração planejada, depois de auditar todos os leitores.
3. **Plano:** o código recebido é resolvido em `erp_planos_catalogo` e precisa estar ativo; a função persiste o código canônico em `erp_empresas.plano` e devolve o plano efetivamente gravado. Não confia em preço/descrição enviados pelo browser.
4. **Módulo:** o esquema observado não fornece um vínculo por empresa para a seleção isolada enviada pelo formulário. A resposta agora indica explicitamente `modulo_persistido=false`; a seleção não deve ser anunciada como contratada/persistida.
5. **Falhas e rollback:** erros de servidor devolvem mensagem pública genérica; detalhes ficam no log do servidor. O rollback compensatório continua tentando remover identidade Auth, setores e empresa criados pela requisição.
6. **Teste estático:** criado `scripts/verify-company-signup-contract.mjs` e registrado `npm run verify:company-signup-contract`.

## Riscos ainda abertos

- `verify_jwt=false` mantém o endpoint público. A função usa chave privilegiada apenas no servidor, mas ainda é necessário instalar/validar rate limit ou CAPTCHA server-side, proteção anti-automação e monitoramento antes de considerar o endpoint seguro para produção.
- A verificação de duplicidade é uma consulta prévia e **não substitui constraints únicas no banco**. Antes de adicionar índices únicos, é necessário inspecionar e reconciliar possíveis duplicatas existentes.
- A criação multi-etapas não está dentro de uma transação PostgreSQL única. O rollback é compensatório e pode falhar; os logs de rollback agora são explícitos.
- `cnpj` legado recebe o documento normalizado inclusive para CPF para satisfazer compatibilidade do esquema atual. Não interpretar esse campo isoladamente: usar `tipo_documento` e `documento`. Uma migração futura deve tornar o campo legado opcional após revisão dos consumidores.
- Não há prova nesta revisão de deploy da nova versão da Edge Function no projeto Supabase, de migração aplicada, de teste de Auth real, de RLS cross-tenant ou de proteção antiabuso live.

## Bateria de validação

| Verificação | Estado |
|---|---|
| Inspeção do contrato anterior, cadastro, esquema de planos e regra Master | Concluída |
| Correção de perfil inicial e separação Master | Código atualizado; teste live pendente |
| Validação de CPF/CNPJ com dígitos verificadores | Código atualizado; casos automatizados de execução pendentes |
| Persistência e validação do plano pelo catálogo ativo | Código atualizado; teste live pendente |
| Honestidade sobre seleção de módulo | Código atualizado; não persiste módulo isolado |
| Verificador estático do contrato | Criado e registrado no package.json; execução pendente |
| Type-check / lint / auditorias globais / rotas / imports / build | Pendente de execução no ambiente de CI |
| Teste válido de cadastro e login | Pendente |
| Documento inválido, plano inativo/desconhecido, e-mail duplicado | Pendente |
| Duplicidade concorrente e rollback de cada etapa | Pendente |
| RLS com duas empresas e tentativa de acesso cruzado | Pendente |
| Rate limit/CAPTCHA e abuso do endpoint público | Pendente |
| Deploy/versão ativa da Edge Function | Não confirmado |
| Homologação de produção | **Não aprovada** |

## Commits desta etapa

- Frontend: `4ab03e358ca1f2bd2278523770efb6d97aa7d254`
- POP: `bcd3e229b53fe62040ac32c0179be6a1a03814a6`
- Rota POP: `72336a6a1ab36c6854d51da0540e618dda8b0c43`
- Contrato da Edge Function: `b33350cf88f9903d74ab369b27b809c65cfa4b27`
- Verificador estático: `cdc8386d01a725cdc2e95b50ca44d0317515222d`
- Script registrado no package: `ab3826dfd07def3e77bd292b7e33261a1df9bfa8`

## Próximas ações obrigatórias

1. Executar `npm run verify:company-signup-contract`, `npm run type-check`, `npm run lint:check`, `npm run audit:all`, `npm run verify:lazy-imports`, `npm run verify-routes` e build em ambiente com dependências instaladas.
2. Revisar/implantar proteção antiabuso para a Edge Function pública e constraints de unicidade sem colidir com dados legados.
3. Implantar a Edge Function no Supabase somente após revisão do diff e de testes; verificar versão ativa depois.
4. Fazer testes em ambiente de homologação com documentos e e-mails de teste controlados, sem criar contas de produção fictícias.
5. Validar Auth, perfil ADMIN, vínculo `auth_user_id`, plano gravado e isolamento entre duas empresas.
6. Retomar as auditorias pendentes anteriores após a bateria global; manter `AtivarAcesso.tsx` aguardando.
