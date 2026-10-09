# ERP authentication and authorization flow

This document describes the implementation currently present in the ERP repository. It is not a claim that remote Supabase policies or production checks have been executed.

## Components and responsibilities

- `src/IndustrialLoginDirect.tsx`: login screen; normalizes the email, calls Supabase Auth `signInWithPassword`, validates the matching ERP user and active company, applies the optional Master-only check, and redirects to the appropriate workspace. It also requests password recovery with `resetPasswordForEmail`.
- `src/lib/supabaseClient.ts`: creates the shared Supabase client; configures persistent sessions, automatic token refresh, URL-session detection, and the `erp-industrial-auth` storage key. Exposes helpers to require a usable access token, invoke Edge Functions with a Bearer token, and call authenticated RPC endpoints.
- `src/auth/AuthProvider.tsx`: restores the session with `getSession`, listens for `onAuthStateChange`, loads the operational profile from `erp_usuarios`, loads the associated company from `erp_empresas`, and clears the session if profile hydration fails.
- `src/auth/AuthProfile.ts`: narrows database rows to the application profile contract. The strict Master contract is `is_master = true`, `perfil = MASTER`, `nivel_admin = 100`, `empresa_id = null`, and no sector. Non-Master users must have an active company whose ID matches their `empresa_id`.
- `src/AppEntryV2.tsx`: central route registration and page loading. Its session gate also validates the ERP profile; Master requires the same strict tuple as `AuthProfile`, and tenant company identity must match `empresa_id`. Route declarations are not a substitute for authorization checks in database policies or protected server functions.

## Request flow

1. The user submits an email and password in `IndustrialLoginDirect`.
2. The browser calls `supabase.auth.signInWithPassword({ email, password })`. Supabase Auth validates the credentials and returns a session/user on success.
3. The app queries `erp_usuarios` by `auth_user_id = auth user.id`, requiring `ativo = true` and `deleted_at IS NULL`. The profile's identity is checked against the Auth user ID.
4. For a tenant user, the app loads `erp_empresas` by the profile's `empresa_id` and requires an active matching company. For Master, the exact Master tuple is checked and tenant/company fields must be null.
5. The app redirects the user to the appropriate workspace. The `AuthProvider` independently hydrates the application session/profile and clears access if profile validation fails.
6. Subsequent Supabase Data API/RPC calls use the Supabase client's current session. Secure Edge Function calls made through `invokeSecureEdgeFunction` send `Authorization: Bearer <access_token>`; `rpcAutenticado` sends both the public API key and the user's Bearer access token.

## Credentials, session and token handling

- The password is submitted to Supabase Auth; this code does not intentionally persist the password.
- Supabase JS is configured with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, and `storageKey: erp-industrial-auth`. In a browser, the configured storage is `window.localStorage`; the SDK uses it to persist the Auth session, not as an independent application authorization decision.
- `getValidSession` reads the SDK session and attempts a refresh when expiry is near. It throws if no usable access token/user exists.
- The publishable/anon key is a client key, not a secret and not a substitute for authorization. A service-role key must never be placed in Vite client environment variables or browser code.
- The client uses the session token as a Bearer token. Protected database access must still be enforced by Postgres RLS and server-side authorization. Hiding a route or checking a React profile alone does not secure data.
- Password recovery sends a link to `/recuperar-senha`. Master provisioning is separate from normal login; the legacy `erp-login` endpoint documents normal login as disabled.

## Audit notes / limitations

- The login component and `AuthProvider` contain overlapping profile-validation logic. Keep their Master and tenant contracts aligned; ideally consolidate validation so the rules cannot drift.
- Client-side `getSession` is for restoring the SDK session, not proof for a trusted server. Edge Functions must validate the Bearer token with Supabase Auth (for example, `auth.getUser()`) and apply authorization before privileged operations.
- RLS policies, database triggers, and remote database behavior cannot be proven from these React files alone. They must be inspected and tested against the actual deployed schema.
- The global rebuild PR now aligns the strict Master gate and adds direct horizontal navigation to PCP and SGQ/RPNC. The PCP OEE and sequencing queries are scoped through company-owned production orders. The WMS migration introduces lot-level physical balances, but migration execution and end-to-end quarantine validation still require CI/database evidence.
- The NF-e receipt RPC and the new weighted-average helper must be verified as one transaction. A standalone cost helper does not prove that receipt posting uses recoverable tax credits or allocated freight/insurance/other expenses. Do not mark fiscal costing or production gates GREEN without schema-backed integration and test evidence.
