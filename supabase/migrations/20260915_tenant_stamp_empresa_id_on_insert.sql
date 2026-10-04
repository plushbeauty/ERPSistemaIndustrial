-- Mantém o tenant no banco: se o frontend não enviar empresa_id,
-- o PostgreSQL usa a empresa do usuário autenticado. O RLS continua
-- responsável por validar o tenant e bloquear IDs de outra empresa.
create or replace function public.erp_stamp_empresa_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.empresa_id is null then
    new.empresa_id := public.erp_current_empresa_id();
  end if;
  return new;
end;
$$;

comment on function public.erp_stamp_empresa_id() is
'Preenche empresa_id no INSERT quando o cliente autenticado nao o informa; RLS continua validando o tenant.';

do $$
declare
  r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name like 'erp_%'
      and c.column_name = 'empresa_id'
      and c.is_nullable = 'NO'
      and c.table_name <> 'erp_empresas'
  loop
    execute format('drop trigger if exists trg_erp_stamp_empresa_id on public.%I', r.table_name);
    execute format(
      'create trigger trg_erp_stamp_empresa_id before insert on public.%I for each row execute function public.erp_stamp_empresa_id()',
      r.table_name
    );
  end loop;
end $$;
