# ARCHITECTURE STATE

## Aplicação
React + TypeScript + Vite + React Router + lazy loading.

## Segurança
Supabase Auth + erp_usuarios + empresa_id + role_id + is_master + nivel_admin + RBAC/RLS.

## Autenticação
Login usa Supabase Auth signInWithPassword. Sessão é persistida e renovada pelo cliente Supabase; o ERP vincula auth.uid() ao erp_usuarios.auth_user_id. Não usar localStorage como fonte de autorização.

## Permissões
erp_permissions usa contrato real com id, code, name, description, created_at. erp_role_permissions relaciona role_id e permission_id.

## RPC RBAC
O repositório possui overloads de erp_has_permission: p_code text e p_modulo text, p_acao text. Isso é permitido pelo PostgreSQL. O bloqueador atual é provar que a função/assinatura necessária está aplicada no Supabase remoto e que os grants correspondem ao uso autenticado.

## Master
Contrato documentado: is_master=true, perfil=MASTER, nivel_admin>=100 e empresa_id=NULL. RLS e funções de tenant precisam ser verificadas contra o banco remoto antes de GREEN.

## Tablet
TabletDashboard executa autenticação real e carrega permissões do banco. TabletMenuModal é uma central HMI flutuante e não deve substituir o background do ERP quando integrado ao launcher. M01-M22 são catálogo real de trabalho; módulo sem rota comprovada permanece bloqueado/não publicado.

## Tenant
Consultas operacionais devem respeitar empresa_id quando o usuário não é Master; RLS permanece autoridade final.

## Build
Pipeline de produção inclui type-check, lint, auditorias, lazy-import verification, build e route verification. No estado atual não há evidência local executada nesta sessão; não declarar GREEN por código apenas.

## Deploy
Vercel project erp-sistema-industrial está acessível. O deployment dpl_GQ8r2nVa2PxBBm6LsuAYFHEdcusT (950c056) está ERROR e o status reportado é build-rate-limit. Há deployments READY anteriores, mas eles não validam o HEAD atual.

## Pesquisa arquitetural
FUXA é referência para arquitetura SCADA/HMI web, visualização orientada a dados e operação industrial; React SCADA HMI/OpenWebHMI são referências para HMI touch e estado operacional. Essas referências orientam padrões, não código para copiar.
