begin;

-- Approval of technical process sheets is a controlled action. The authenticated
-- tenant write policy remains in place for ordinary draft/review edits, while
-- status promotion or edits to an approved sheet require an explicit RBAC grant.
insert into public.erp_permissions (codigo, nome, modulo, ativo)
values (
  'producao.fichas.aprovar',
  'Aprovar fichas de processo',
  'producao',
  true
)
on conflict (codigo) do update
set nome = excluded.nome,
    modulo = excluded.modulo,
    ativo = excluded.ativo;

-- The current schema uses `codigo`; an earlier replacement referred to a
-- nonexistent `code` column and made this shared authorization RPC unusable.
create or replace function public.erp_has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select public.erp_is_master()
  or exists (
    select 1
    from public.erp_usuarios u
    join public.erp_role_permissions rp on rp.role_id = u.role_id
    join public.erp_permissions p on p.id = rp.permission_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and u.deleted_at is null
      and p.codigo = lower(btrim(p_code))
      and p.ativo = true
  )
$function$;
revoke execute on function public.erp_has_permission(text) from anon, public;
grant execute on function public.erp_has_permission(text) to authenticated;

create or replace function public.erp_guard_ficha_processo_approval()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_requires_approval boolean := false;
begin
  if tg_op = 'INSERT' then
    v_requires_approval := new.status in ('APROVADA', 'LIBERADA', 'OBSOLETA');
  else
    v_requires_approval :=
      (old.status in ('APROVADA', 'LIBERADA', 'OBSOLETA')
        or new.status in ('APROVADA', 'LIBERADA', 'OBSOLETA'))
      and (to_jsonb(new) - 'atualizado_em' - 'updated_at' - 'atualizado_por' - 'updated_by')
          is distinct from
          (to_jsonb(old) - 'atualizado_em' - 'updated_at' - 'atualizado_por' - 'updated_by');
  end if;

  if v_requires_approval and not public.erp_has_permission('producao.fichas.aprovar') then
    raise exception 'Permissão necessária para aprovar ou alterar ficha de processo homologada.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_erp_guard_ficha_processo_approval on public.erp_fichas_processo;
create trigger trg_erp_guard_ficha_processo_approval
before insert or update on public.erp_fichas_processo
for each row execute function public.erp_guard_ficha_processo_approval();

revoke all on function public.erp_guard_ficha_processo_approval() from public, anon, authenticated;

commit;
