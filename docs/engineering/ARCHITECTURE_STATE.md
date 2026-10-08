# ARCHITECTURE STATE

## Aplicação
React + TypeScript + Vite + React Router + lazy loading.

## Segurança
Supabase Auth + erp_usuarios + empresa_id + role_id + is_master + nivel_admin + RBAC/RLS.

## Permissões
erp_permissions usa contrato real com id, code, name, description, created_at. erp_role_permissions relaciona role_id e permission_id.

## Tablet
TabletDashboard executa autenticação real e carrega permissões do banco. TabletMenuModal é uma central HMI flutuante e não deve substituir o background do ERP quando integrado ao launcher.

## Tenant
Consultas operacionais devem respeitar empresa_id quando o usuário não é Master; RLS permanece autoridade final.

## Build
Pipeline de produção inclui type-check, lint, auditorias, lazy-import verification, build e route verification.

## Pesquisa arquitetural
React SCADA HMI usa TypeScript, estado centralizado e componentes HMI orientados a dados; FUXA separa engenharia/visualização e trabalha com visualização industrial em tempo real. Essas referências orientam padrões, não são código para copiar.
