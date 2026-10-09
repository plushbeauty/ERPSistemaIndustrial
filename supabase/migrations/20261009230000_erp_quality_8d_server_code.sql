-- Server-side unique code generator for 8D protocols, scoped to the active company.
create or replace function public.erp_sgq_novo_codigo_8d()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_ano text := to_char(current_date, 'YYYY');
  v_numero bigint;
  v_codigo text;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória para gerar protocolo 8D.';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if not coalesce(public.erp_has_permission('qualidade', 'criar'), false) then
    raise exception 'Permissão Qualidade/Criar necessária para gerar protocolo 8D.';
  end if;

  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
  values (v_empresa, '8D-' || v_ano, 1)
  on conflict (empresa_id, chave)
  do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
  returning proximo_valor into v_numero;

  loop
    v_codigo := '8D-' || v_ano || '-' || lpad(v_numero::text, 6, '0');
    exit when not exists (
      select 1
      from public.erp_qualidade_8d
      where empresa_id = v_empresa and codigo = v_codigo
    );

    update public.erp_sgq_contadores
    set proximo_valor = proximo_valor + 1
    where empresa_id = v_empresa and chave = '8D-' || v_ano
    returning proximo_valor into v_numero;
  end loop;

  return v_codigo;
end;
$$;

revoke all on function public.erp_sgq_novo_codigo_8d() from public, anon;
grant execute on function public.erp_sgq_novo_codigo_8d() to authenticated;
