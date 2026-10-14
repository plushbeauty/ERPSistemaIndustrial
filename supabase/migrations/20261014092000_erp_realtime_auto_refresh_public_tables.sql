-- Habilita eventos Realtime para as tabelas operacionais públicas existentes.
-- A publicação respeita as políticas RLS na entrega dos eventos aos clientes.
do $$
declare
  t record;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'A publicação supabase_realtime não existe neste projeto.';
  end if;

  for t in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  loop
    if not exists (
      select 1
      from pg_publication_tables p
      where p.pubname = 'supabase_realtime'
        and p.schemaname = t.schemaname
        and p.tablename = t.tablename
    ) then
      execute format('alter publication supabase_realtime add table %I.%I', t.schemaname, t.tablename);
    end if;
  end loop;
end
$$;
