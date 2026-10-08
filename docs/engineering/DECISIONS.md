# DECISIONS

## DEC-0001 — 2026-10-07
DECISÃO: Preservar Supabase Auth, sessão persistente, refresh e erp_usuarios como base de autenticação.
MOTIVO: O código atual usa signInWithPassword, getUser/getSession e refreshSession; não há motivo técnico para reconstrução.

## DEC-0002 — 2026-10-07
DECISÃO: Não usar localStorage como fonte de autenticação.
MOTIVO: A sessão é responsabilidade do Supabase Auth. Preferências visuais do Tablet não são autenticação.

## DEC-0003 — 2026-10-07
DECISÃO: Não normalizar erp_has_permission por suposição.
MOTIVO: Existem contratos concorrentes no histórico/código. A assinatura real do banco deve ser confirmada antes da migração.

## DEC-0004 — 2026-10-07
DECISÃO: Não recriar TabletDashboard.
MOTIVO: O checkpoint e o histórico registram implementação existente e correção anterior de erp_permissions.

## DEC-0005 — 2026-10-07
DECISÃO: Vercel não será usado como laboratório.
MOTIVO: O commit b8a9cde... apresenta status Vercel failure por build-rate-limit; validação local/CI deve preceder novo deploy.
