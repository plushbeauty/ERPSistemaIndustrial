-- Align the production ERP identity contract with Supabase Auth.
-- The current production database contains one ERP profile and one Auth user
-- with the same email but different UUIDs. No foreign keys reference
-- erp_usuarios.id in the current production schema.
begin;

alter table public.erp_usuarios add column if not exists role text;

update public.erp_usuarios
set role = case
  when coalesce(is_master, false) = true or coalesce(nivel_admin, 0) >= 9 then 'MASTER'
  when coalesce(nivel_admin, 0) >= 8 then 'ADMIN'
  else 'USER'
end
where role is null;

update public.erp_usuarios e
set id = u.id
from auth.users u
where lower(e.email) = lower(u.email)
  and e.id <> u.id;

alter table public.erp_usuarios
  add constraint erp_usuarios_id_auth_users_fk
  foreign key (id) references auth.users(id) on delete cascade;

create index if not exists erp_usuarios_empresa_id_idx on public.erp_usuarios(empresa_id);
create unique index if not exists erp_usuarios_email_lower_uidx on public.erp_usuarios(lower(email));

commit;
