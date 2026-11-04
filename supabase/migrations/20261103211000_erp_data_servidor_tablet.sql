begin;
create or replace function public.erp_data_servidor()
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$ select now(); $$;
revoke all on function public.erp_data_servidor() from public, anon;
grant execute on function public.erp_data_servidor() to authenticated;
notify pgrst, 'reload schema';
commit;
