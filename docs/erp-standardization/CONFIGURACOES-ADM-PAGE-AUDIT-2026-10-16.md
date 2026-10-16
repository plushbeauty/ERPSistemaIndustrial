# Auditoria página por página — Configurações / Administração
Data: 2026-10-16
Branch: `main`
Primeiro recorte: inventário de rotas, componentes de página, contratos consultados e reconstrução do shell administrativo.
Status geral: **EM ANDAMENTO — não homologado em execução local nem contra Supabase remoto.**

## Escopo confirmado no roteador

`/configuracoes-adm/*` é entregue a `src/pages/configuracoes/ConfiguracoesADM.tsx`; `/configuracoes` redireciona para `/configuracoes-adm`. O shell não implementa, por si só, autorização: cada operação precisa de validação no banco/RLS e a rota precisa permanecer atrás do guard de autenticação existente.

## Achados P0/P1 do shell anterior

1. **Navegação desktop quebrada:** a sidebar recebia `transform: translateX(-105%)` como estilo inline em todos os tamanhos; a regra CSS de mobile não conseguia tornar a sidebar visível no desktop. A área principal mantinha margem esquerda de 220px, deixando uma faixa vazia.
2. **Shell e páginas com padrões visuais conflitantes:** o shell aplicava CSS genérico sobre inputs, botões, tabelas e classes de raio/sombra das páginas filhas, causando efeitos colaterais e tamanhos inconsistentes.
3. **Página inicial inchada:** dez cartões com descrições e navegação repetiam o menu lateral.
4. **Segurança era apenas aviso:** a rota `/seguranca` não gerenciava sessões, MFA ou política de senha; apenas informava a limitação.
5. **Integrações e parâmetros globais sem contrato confirmado:** o próprio código reconhecia ausência de catálogo persistido; não se deve criar falso status nem botão de salvar.
6. **Backups informativos:** a tela declara corretamente que o navegador não executa backup físico e não existe tabela ERP confirmada para registrar execuções. Não apresentar botão de “executar” sem API real.
7. **Perfis e permissões são páginas distintas com contratos a reconciliar:** a listagem de perfis consulta `erp_roles`; a matriz consulta `erp_roles`, `erp_permissions`, `erp_role_permissions` e RPCs. As migrations históricas exibem contratos de nomenclatura diferentes (`codigo/nome/modulo` e `code/name/description`) em pontos distintos; antes de alterar persistência, conferir a cadeia completa de migrations e o schema remoto.
8. **Empresa e identidade:** usa Supabase Auth, `erp_usuarios`, `erp_has_permission` e `erp_empresas`; a tela precisa continuar limitada ao tenant e exigir autorização no banco. O Master sem empresa vinculada não pode editar identidade como se fosse um usuário de tenant.
9. **Usuários:** filtra a lista pelo tenant do ator (ou empresas não nulas para Master) e consulta permissões criar/editar/desativar. Há leitura de empresas e perfis em consultas separadas; revisar autorização de cada dado e o contrato das operações de criação/convite/edição antes de mexer.
10. **Logs:** consulta `erp_audit_logs` com paginação e depende de RLS. A exibição de `old_data/new_data` precisa de cuidado com dados sensíveis; validar políticas, mascaramento e acesso por tenant.
11. **Codificação e áreas:** consulta `erp_codigos`, `erp_grupos`, `erp_areas`, `erp_historico_codigos` por `empresa_id`, mas recebe `profile={null}`; auditar dependências, RPC de geração e permissões antes de alterar.
12. **Master versus ADM do tenant:** manter fronteira explícita. Master exige o contrato documentado `is_master=true`, `perfil=MASTER`, `nivel_admin>=100`, `empresa_id=NULL`; não inferir Master apenas pelo nível.

## Matriz página por página

| Página/rota | Arquivo real | Estado observado no código | Próxima auditoria obrigatória |
|---|---|---|---|
| Visão geral `/configuracoes-adm` | `ConfiguracoesADM.tsx` | Shell refeito; navegação e resumo compactos | Type-check, responsividade e navegação real |
| Empresa e identidade | `CompanySettings.tsx` + shell | Leitura/edição direta de `erp_empresas`; guarda por Auth/RPC | Validar colunas atuais, RLS, permissões e atualização do tenant |
| Codificação e áreas | `ConfiguracaoCodificacaoAreas.tsx` | Consultas por empresa e RPC de geração | Confirmar todas as operações, perfil, autorização e concorrência da sequência |
| Perfis de usuários | `ConfiguracaoPerfis.tsx` | Lista perfis reais; a tela usa estilo legado distinto | Verificar escopo RLS, níveis e contrato de `erp_roles` |
| Permissões RBAC | `ConfiguracaoPermissoes.tsx` | Matriz por perfil e salvamento por `erp_admin_save_role` | Reconciliar nomes de colunas, RPC remota, política anti-escalada e atomicidade |
| Usuários | `UsuariosAdmin.tsx` | CRUD/convite com flags de permissão; fronteira Master/tenant implementada no cliente | Inspecionar restante do arquivo, Edge Functions/RPC, senhas, desativação e políticas RLS |
| Segurança e sessões | `ConfiguracoesADM.tsx` (seção indisponível) | Ainda não é um gestor funcional de sessões/MFA/senhas | Descobrir APIs existentes; implementar só operações suportadas |
| Logs e auditoria | `ConfiguracaoLogs.tsx` | Lista `erp_audit_logs` paginada | RLS real, tenant, campos sensíveis e trilha de leitura/exportação |
| Backups | `ConfiguracaoBackups.tsx` | Informativa, sem execução de backup | Confirmar política de backup/restore no provedor; não fingir execução |
| Integrações | seção indisponível | Sem catálogo ERP confirmado | Inventariar Edge Functions, secrets e configurações existentes |
| Parâmetros do sistema | seção indisponível | Sem contrato global confirmado | Inventariar tabelas de configuração reais e donos dos parâmetros |

## Reconstrução iniciada

Commit `00f9f12264f9e71b0f5525eaafaac48a4a8304dd` substitui o shell de `ConfiguracoesADM.tsx` por uma composição compacta e responsiva, corrigindo a sidebar desktop invisível e removendo estilos globais agressivos sobre componentes filhos. As páginas de dados foram mantidas neste primeiro corte para evitar reescrever contratos de banco antes da auditoria.

## Critérios de conclusão

- [ ] Auditar o arquivo completo de cada página e todas as RPCs/Edge Functions chamadas.
- [ ] Comparar cada consulta com migrations ordenadas e schema Supabase remoto.
- [ ] Validar políticas RLS para leitura/escrita, inclusive teste cross-tenant.
- [ ] Verificar que RBAC por ação não depende apenas de ocultar botões no frontend.
- [ ] Confirmar fronteira Master/tenant e proteção contra autoelevação.
- [ ] Confirmar MFA/sessões/senhas somente através de operações oficialmente suportadas.
- [ ] Definir execução real e restore de backups; sem indicadores fictícios.
- [ ] Executar `npm run type-check`, lint, auditorias e build em checkout local.
- [ ] Testar cada rota autenticada e verificar o deployment após CI; não declarar GREEN sem evidência.
