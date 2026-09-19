# Auth reset status — 2026-09-19

- Browser login: Supabase Auth `signInWithPassword`.
- Master: `erp_usuarios.is_master=true`, `perfil=MASTER`, `nivel_admin=100`, `empresa_id=NULL`.
- Tenant users require `empresa_id` and `auth_user_id`.
- Legacy `erp-login` is frozen; provisioning uses `erp-master-bootstrap`.
- ERP Supabase project: `zsklkydlawgvwgnvxwwx`.
- Removed stale `hydratedTenant` references from `src/auth/AuthProvider.tsx` that could fail strict TypeScript compilation.
- This commit is an intentional Vercel rebuild trigger after the auth type fix.
